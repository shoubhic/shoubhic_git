export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed';

export interface AgentExecutionLog {
  id: string;
  agent_name: string;
  step_number: number;
  prompt_tokens: number;
  tool_called: string | null;
  execution_status: ExecutionStatus;
  timestamp: string;
  message: string;
  input_prompt: string;
  response_time_ms: number;
  agent_type: 'orchestrator' | 'planner' | 'retriever' | 'coder' | 'executor';
}

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  chunks: string[];
  embeddingsCount: number;
  createdAt: string;
}

export interface RetrievedChunk {
  id: string;
  documentTitle: string;
  content: string;
  score: number;
}

export interface RagQueryLog {
  id: string;
  query: string;
  retrievedChunks: RetrievedChunk[];
  generatedResponse: string;
  timestamp: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: string;
  status: 'active' | 'inactive';
  executionsCount: number;
}
