import fs from 'fs';
import path from 'path';
import { AgentExecutionLog, RagDocument, RagQueryLog, ToolDefinition, RetrievedChunk } from '../types';

const DB_FILE = path.join(process.cwd(), 'database.json');

interface DatabaseSchema {
  agent_execution_logs: AgentExecutionLog[];
  rag_documents: RagDocument[];
  rag_query_logs: RagQueryLog[];
  tools: ToolDefinition[];
}

const SEED_TOOLS: ToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Queries the external web for real-time information or news articles.',
    parameters: JSON.stringify({ query: 'string (search query)' }, null, 2),
    status: 'active',
    executionsCount: 24,
  },
  {
    name: 'query_order_database',
    description: 'Retrieves current delivery, shipping, and transaction status for a user order ID.',
    parameters: JSON.stringify({ orderId: 'string (e.g. ORD-2026-993)', userId: 'string' }, null, 2),
    status: 'active',
    executionsCount: 15,
  },
  {
    name: 'calculator',
    description: 'Performs precise mathematical evaluations and arithmetic calculations.',
    parameters: JSON.stringify({ expression: 'string (e.g. "34.5 * 1.08")' }, null, 2),
    status: 'active',
    executionsCount: 8,
  },
  {
    name: 'knowledge_retriever',
    description: 'Retrieves semantically relevant document chunks from the uploaded knowledge base.',
    parameters: JSON.stringify({ query: 'string (semantic query)' }, null, 2),
    status: 'active',
    executionsCount: 42,
  },
  {
    name: 'send_email_notification',
    description: 'Triggers an automated customer notification email about status updates.',
    parameters: JSON.stringify({ to: 'string', subject: 'string', body: 'string' }, null, 2),
    status: 'inactive',
    executionsCount: 3,
  },
];

const SEED_DOCUMENTS: RagDocument[] = [
  {
    id: 'doc-1',
    title: 'Customer Refund & Returns Policy 2026',
    content: 'All items purchased within 30 days are eligible for a full refund if they are in original packaging. Shipping delays exceeding 5 standard business days qualify for a $10 discount coupon. For delayed deliveries, support agents should verify the order tracking status using the query_order_database tool first. If the package is lost, initiate a reshipment immediately and log a report.',
    chunks: [
      'All items purchased within 30 days are eligible for a full refund if they are in original packaging.',
      'Shipping delays exceeding 5 standard business days qualify for a $10 discount coupon.',
      'For delayed deliveries, support agents should verify the order tracking status using the query_order_database tool first.',
      'If the package is lost, initiate a reshipment immediately and log a report.'
    ],
    embeddingsCount: 4,
    createdAt: new Date('2026-05-12T09:30:00Z').toISOString(),
  },
  {
    id: 'doc-2',
    title: 'Agent Orchestration Guidelines',
    content: 'Standard multi-agent orchestration follows a three-layer pipeline: Router/Planner, Specialist Retriever, and Tool Executor. The Router receives the query, classifies intent, and delegates to either RAG (for general queries) or Tool Executor (for transactional lookups). The final answer is synthesized by the Orchestrator with references to source document IDs.',
    chunks: [
      'Standard multi-agent orchestration follows a three-layer pipeline: Router/Planner, Specialist Retriever, and Tool Executor.',
      'The Router receives the query, classifies intent, and delegates to either RAG (for general queries) or Tool Executor (for transactional lookups).',
      'The final answer is synthesized by the Orchestrator with references to source document IDs.'
    ],
    embeddingsCount: 3,
    createdAt: new Date('2026-06-01T14:15:00Z').toISOString(),
  },
];

const SEED_LOGS: AgentExecutionLog[] = [
  {
    id: 'log-1',
    agent_name: 'Customer Service Router',
    step_number: 1,
    prompt_tokens: 420,
    tool_called: null,
    execution_status: 'success',
    timestamp: new Date('2026-06-23T10:00:00-07:00').toISOString(),
    message: 'User query classified as DELAYED_SHIPPING. Intended flow: RAG Shipping Policy check followed by Database Order Lookup.',
    input_prompt: 'I ordered a widget last week (Order ORD-9011) but it hasn\'t arrived yet. Can you check my shipping status?',
    response_time_ms: 180,
    agent_type: 'orchestrator',
  },
  {
    id: 'log-2',
    agent_name: 'Semantic Retriever',
    step_number: 2,
    prompt_tokens: 580,
    tool_called: 'knowledge_retriever',
    execution_status: 'success',
    timestamp: new Date('2026-06-23T10:00:01-07:00').toISOString(),
    message: 'Retrieved 2 relevant chunks on shipping delay coupon criteria and order reshipments with high confidence (score > 0.88).',
    input_prompt: 'Search knowledge base for "delayed delivery policy and refunds"',
    response_time_ms: 320,
    agent_type: 'retriever',
  },
  {
    id: 'log-3',
    agent_name: 'Database Agent',
    step_number: 3,
    prompt_tokens: 310,
    tool_called: 'query_order_database',
    execution_status: 'success',
    timestamp: new Date('2026-06-23T10:00:02-07:00').toISOString(),
    message: 'Successfully located Order ORD-9011 in PostgreSQL DB. Status: "In Transit" (delayed at Distribution Hub C). Est. delivery: June 26, 2026.',
    input_prompt: 'Query transactional database for order ID "ORD-9011"',
    response_time_ms: 240,
    agent_type: 'executor',
  },
  {
    id: 'log-4',
    agent_name: 'Synthesis Orchestrator',
    step_number: 4,
    prompt_tokens: 890,
    tool_called: null,
    execution_status: 'success',
    timestamp: new Date('2026-06-23T10:00:03-07:00').toISOString(),
    message: 'Formulated final response combining database status and coupon policy. Generated $10 delayed delivery voucher code DELAY-WIDG-10.',
    input_prompt: 'Synthesize Order ORD-9011 tracking results with Delayed Shipping Policy discount guidelines.',
    response_time_ms: 450,
    agent_type: 'orchestrator',
  },
];

const SEED_QUERY_LOGS: RagQueryLog[] = [
  {
    id: 'query-1',
    query: 'What is the refund policy for delayed packages?',
    retrievedChunks: [
      {
        id: 'chunk-1-1',
        documentTitle: 'Customer Refund & Returns Policy 2026',
        content: 'Shipping delays exceeding 5 standard business days qualify for a $10 discount coupon.',
        score: 0.94,
      },
      {
        id: 'chunk-1-2',
        documentTitle: 'Customer Refund & Returns Policy 2026',
        content: 'All items purchased within 30 days are eligible for a full refund if they are in original packaging.',
        score: 0.72,
      },
    ],
    generatedResponse: 'According to the Customer Refund & Returns Policy 2026, purchases are eligible for a full refund within 30 days if in original packaging. Additionally, shipping delays exceeding 5 standard business days qualify for a $10 discount coupon.',
    timestamp: new Date('2026-06-23T09:45:00-07:00').toISOString(),
  },
];

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read database, falling back to seed data:', error);
  }

  // Create file with seed data
  const defaultDb: DatabaseSchema = {
    agent_execution_logs: SEED_LOGS,
    rag_documents: SEED_DOCUMENTS,
    rag_query_logs: SEED_QUERY_LOGS,
    tools: SEED_TOOLS,
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write database:', error);
  }
}

export const dbStore = {
  getLogs: (): AgentExecutionLog[] => {
    return loadDatabase().agent_execution_logs;
  },

  addLog: (log: Omit<AgentExecutionLog, 'id' | 'timestamp'>): AgentExecutionLog => {
    const db = loadDatabase();
    const newLog: AgentExecutionLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    db.agent_execution_logs.push(newLog);
    
    // Update tools executionsCount if a tool was called
    if (log.tool_called) {
      const tool = db.tools.find(t => t.name === log.tool_called);
      if (tool) {
        tool.executionsCount += 1;
      }
    }

    saveDatabase(db);
    return newLog;
  },

  clearLogs: (): void => {
    const db = loadDatabase();
    db.agent_execution_logs = [];
    saveDatabase(db);
  },

  resetToSeed: (): void => {
    const defaultDb: DatabaseSchema = {
      agent_execution_logs: SEED_LOGS,
      rag_documents: SEED_DOCUMENTS,
      rag_query_logs: SEED_QUERY_LOGS,
      tools: SEED_TOOLS,
    };
    saveDatabase(defaultDb);
  },

  getDocuments: (): RagDocument[] => {
    return loadDatabase().rag_documents;
  },

  addDocument: (title: string, content: string): RagDocument => {
    const db = loadDatabase();
    
    // Simple naive chunking for simulation purposes
    const sentences = content.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
    const chunks = sentences.map(s => s.trim() + '.');

    const newDoc: RagDocument = {
      id: `doc-${Date.now()}`,
      title,
      content,
      chunks,
      embeddingsCount: chunks.length,
      createdAt: new Date().toISOString(),
    };

    db.rag_documents.push(newDoc);
    saveDatabase(db);
    return newDoc;
  },

  deleteDocument: (id: string): void => {
    const db = loadDatabase();
    db.rag_documents = db.rag_documents.filter(doc => doc.id !== id);
    saveDatabase(db);
  },

  getTools: (): ToolDefinition[] => {
    return loadDatabase().tools;
  },

  toggleToolStatus: (name: string): ToolDefinition | null => {
    const db = loadDatabase();
    const tool = db.tools.find(t => t.name === name);
    if (tool) {
      tool.status = tool.status === 'active' ? 'inactive' : 'active';
      saveDatabase(db);
      return tool;
    }
    return null;
  },

  getQueryLogs: (): RagQueryLog[] => {
    return loadDatabase().rag_query_logs;
  },

  addQueryLog: (query: string, retrievedChunks: RetrievedChunk[], generatedResponse: string): RagQueryLog => {
    const db = loadDatabase();
    const newQueryLog: RagQueryLog = {
      id: `query-${Date.now()}`,
      query,
      retrievedChunks,
      generatedResponse,
      timestamp: new Date().toISOString(),
    };
    db.rag_query_logs.push(newQueryLog);
    saveDatabase(db);
    return newQueryLog;
  },
};
