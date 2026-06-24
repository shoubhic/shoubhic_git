import { useState, useEffect, useMemo } from 'react';
import { AgentExecutionLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  Play, 
  Trash2, 
  RotateCcw, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  Server, 
  Info, 
  Terminal, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Sliders, 
  Check, 
  Search, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Brain, 
  TrendingUp, 
  ShoppingBag, 
  ShieldAlert 
} from 'lucide-react';

interface OrchestrationViewProps {
  logs: AgentExecutionLog[];
  onAddLog: (newLog: AgentExecutionLog) => void;
  onClearLogs: () => void;
  onResetLogs: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  refreshLogs: () => void;
}

interface RegistryAgent {
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  matchedPattern: string;
}

const REGISTRY_AGENTS: RegistryAgent[] = [
  {
    name: 'Customer Service Router',
    role: 'Primary Orchestrator',
    description: 'Classifies conversational state and determines optimal downstream capability mappings based on semantic intent rules.',
    capabilities: ['Query classification', 'Execution sequence planning', 'Dynamic routing'],
    matchedPattern: 'order, delivery, shipping, delay, refund, courier, tracking'
  },
  {
    name: 'Transactional Database Agent',
    role: 'Core Database Executor',
    description: 'Interfaces securely with order logs, customer history databases, and carrier status logs to retrieve status payloads.',
    capabilities: ['Order status retrieval', 'Carrier log querying', 'Historical logs lookups'],
    matchedPattern: 'ORD-, status, database, log, table, record, lookup'
  },
  {
    name: 'Precision Calculator Agent',
    role: 'Mathematical & Financial Executor',
    description: 'Performs precise floating-point arithmetic and compound interest calculations to prevent LLM hallucinations.',
    capabilities: ['Compound interest calculations', 'Precision arithmetic', 'Financial metric aggregation'],
    matchedPattern: 'calculate, math, rate, compound, interest, multiplier, arithmetic'
  },
  {
    name: 'Knowledge RAG Retriever',
    role: 'Semantic Searcher',
    description: 'Searches customer resource policy documents and guidelines to ground agent responses in verified rules.',
    capabilities: ['Policy grounding', 'Vector query retrieval', 'Compliance matching'],
    matchedPattern: 'policy, guidelines, rules, document, compensation, RAG, clauses'
  },
  {
    name: 'Web Harvester Agent',
    role: 'Real-time Data Retriever',
    description: 'Polls live external search indexes to extract current interest rates, competitor pricing, and market statistics.',
    capabilities: ['Competitor pricing scraping', 'Live search indexing', 'Real-time harvesting'],
    matchedPattern: 'search, web, index, external, poll, live, competitor'
  },
  {
    name: 'Sourcing Specialist',
    role: 'Supply Chain & Market Analyst',
    description: 'Queries inventory databases, pulls competitor pricing arrays, and extracts financial metrics.',
    capabilities: ['Inventory database querying', 'Pricing array analysis', 'Profit margins computing'],
    matchedPattern: 'margins, profit, sourcing, cost, pricing, retail, grocery'
  },
  {
    name: 'Synthesis Agent',
    role: 'Response Summarization',
    description: 'Aggregates multi-source inputs, runs guardrail compliance checks, and drafts client-facing summaries.',
    capabilities: ['Multi-source aggregation', 'Guardrail compliance checks', 'Drafting client-facing summaries'],
    matchedPattern: 'draft, summarize, plan, synthesize, report, compile, executive'
  }
];

// Helper to determine tailwind background and text classes for different agent types
const agentTypeColorMap: Record<string, string> = {
  orchestrator: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400',
  planner: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-400',
  retriever: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400',
  coder: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-400',
  executor: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400',
};

export default function OrchestrationView({
  logs,
  onClearLogs,
  onResetLogs,
  isLoading,
  setIsLoading,
  refreshLogs,
}: OrchestrationViewProps) {
  // Unified Prompt & Control Deck State
  const [promptInput, setPromptInput] = useState('My order ORD-9011 is delayed. Can you find where it is and apply our discount policies?');
  const [scenario, setScenario] = useState('delivery_lookup');
  const [selectedLog, setSelectedLog] = useState<AgentExecutionLog | null>(null);

  // Side Deck Tabs: 'matcher' (Dynamic Agent Match Registry) | 'rules' (agents.md)
  const [sideTab, setSideTab] = useState<'matcher' | 'rules'>('matcher');

  // Animation & Execution States
  const [activePipelineSteps, setActivePipelineSteps] = useState<AgentExecutionLog[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentAnimStep, setCurrentAnimStep] = useState<number>(0); // 0: idle, 1..N: active step, N+1: completed and output ready

  // agents.md File Content State
  const [agentsMd, setAgentsMd] = useState<string>('');
  const [loadingMd, setLoadingMd] = useState<boolean>(true);

  // Load agents.md file
  useEffect(() => {
    const fetchAgentsMd = async () => {
      try {
        const response = await fetch('/api/agents-md');
        if (response.ok) {
          const data = await response.json();
          setAgentsMd(data.content);
        }
      } catch (err) {
        console.error('Failed to load agents.md specification:', err);
      } finally {
        setLoadingMd(false);
      }
    };
    fetchAgentsMd();
  }, []);

  // Compute On-the-Fly Dynamic Agent Match Scores
  const agentMatchScores = useMemo(() => {
    const q = promptInput.toLowerCase().trim();
    if (!q) {
      return REGISTRY_AGENTS.map(agent => ({
        ...agent,
        score: 10,
        matchedKeywords: [] as string[]
      }));
    }

    const rules = [
      {
        name: 'Customer Service Router',
        keywords: ['order', 'delivery', 'shipping', 'delay', 'refund', 'courier', 'shipped', 'tracking', 'fedex', 'ups', 'delayed', 'compensation']
      },
      {
        name: 'Transactional Database Agent',
        keywords: ['ord-', 'order', 'database', 'log', 'status', 'carrier', 'tracker', 'dispatch', 'table', 'record', 'lookup']
      },
      {
        name: 'Precision Calculator Agent',
        keywords: ['calculate', 'math', 'rate', 'compound', 'interest', 'multiplier', 'precision', 'multipliers', 'arithmetic', 'tax', 'percentage']
      },
      {
        name: 'Knowledge RAG Retriever',
        keywords: ['policy', 'guidelines', 'rules', 'document', 'compensation', 'rag', 'clause', 'legal', 'grounding', 'terms']
      },
      {
        name: 'Web Harvester Agent',
        keywords: ['search', 'web', 'index', 'external', 'poll', 'live', 'competitor', 'scrape', 'internet', 'updates']
      },
      {
        name: 'Sourcing Specialist',
        keywords: ['margins', 'profit', 'sourcing', 'cost', 'pricing', 'retail', 'inventory', 'grocery', 'calculate']
      },
      {
        name: 'Synthesis Agent',
        keywords: ['draft', 'summarize', 'plan', 'synthesize', 'report', 'compile', 'response', 'executive', 'summary', 'coordinating']
      }
    ];

    return REGISTRY_AGENTS.map(agent => {
      const rule = rules.find(r => r.name === agent.name);
      let score = 10;
      const matchedKeywords: string[] = [];

      if (rule) {
        rule.keywords.forEach(kw => {
          if (q.includes(kw)) {
            score += 25;
            matchedKeywords.push(kw);
          }
        });
      }

      // Caps score at 98% for realism, and normalize base noise
      const finalScore = matchedKeywords.length > 0 
        ? Math.min(98, score + Math.floor((q.length % 5))) 
        : Math.max(5, 12 - Math.floor((agent.name.length % 5)));

      return {
        ...agent,
        score: finalScore,
        matchedKeywords
      };
    }).sort((a, b) => b.score - a.score);
  }, [promptInput]);

  // Derive Global Metrics from History
  const totalSteps = logs.length;
  const totalTokens = logs.reduce((sum, log) => sum + log.prompt_tokens, 0);
  const avgResponseTime = totalSteps > 0 ? Math.round(logs.reduce((sum, log) => sum + log.response_time_ms, 0) / totalSteps) : 0;
  const successRate = totalSteps > 0 ? Math.round((logs.filter(log => log.execution_status === 'success').length / totalSteps) * 100) : 100;

  // Unified Agent Pipeline Simulation & Animation Trigger
  const handleExecutePipeline = async () => {
    if (!promptInput.trim() || isSimulating) return;

    setIsLoading(true);
    setIsSimulating(true);
    setCurrentAnimStep(1); // Evaluation begins
    setActivePipelineSteps([]);

    try {
      const response = await fetch('/api/simulate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          scenario,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run agent simulation');
      }

      const newSteps: AgentExecutionLog[] = await response.json();
      setActivePipelineSteps(newSteps);

      // Trigger high-fidelity staggered sequential animation
      let stepIdx = 1;
      const interval = setInterval(() => {
        if (stepIdx <= newSteps.length) {
          setCurrentAnimStep(stepIdx + 1); // Move to active step
          stepIdx++;
        } else {
          clearInterval(interval);
          setCurrentAnimStep(newSteps.length + 2); // Show final compilation & output
          setIsSimulating(false);
          setIsLoading(false);
          refreshLogs(); // Update historical schema table at bottom
        }
      }, 1800);

    } catch (error) {
      console.error(error);
      setIsSimulating(false);
      setIsLoading(false);
    }
  };

  // Pre-load Scenarios Helpers
  const SCENARIOS = [
    {
      id: 'delivery_lookup',
      title: 'Customer Delivery Delay',
      icon: ShoppingBag,
      prompt: 'My order ORD-9011 is delayed. Can you find where it is and apply our discount policies?',
      desc: 'Classifies transaction request ➔ database tracking lookup ➔ RAG refund terms ➔ compiles refund draft.'
    },
    {
      id: 'web_search_math',
      title: 'Research & Calculation',
      icon: TrendingUp,
      prompt: 'Search web for current financial rates and calculate compound interest multipliers for base index: 3.12',
      desc: 'Formulates planner ➔ harvests web rates ➔ performs precision float calculation ➔ synthesizes report.'
    },
    {
      id: 'general_agent',
      title: 'Semantic Policy Inquiry',
      icon: Brain,
      prompt: 'Explain how the agent standard orchestration guideline retrieves source document IDs and matches context.',
      desc: 'Triggers conversational router ➔ indexes vector policy database ➔ returns direct semantic summary.'
    },
    {
      id: 'custom_margin',
      title: 'Grocery Margin Response',
      icon: Sliders,
      prompt: 'Analyze our Q2 grocery margins, query inventory databases, and draft an executive competitor response plan.',
      desc: 'Activates Sourcing Specialist ➔ pulls competitive arrays ➔ triggers Synthesis Agent for executive layout.'
    },
    {
      id: 'sla_triage',
      title: 'SLA Support Triage',
      icon: Clock,
      prompt: 'Our Tier 1 support team had a 3-hour SLA breach on ticket 405. Determine the escalation path and technical rules.',
      desc: 'Classifies support query ➔ retrieves technical support tiering documentation ➔ flags SLA breaches.'
    },
    {
      id: 'travel_expense',
      title: 'Travel Expense Audit',
      icon: FileText,
      prompt: 'Audit an international travel expense claim of $350 lodging per night and meal receipts of $120. Check guidelines.',
      desc: 'Routes expense inquiry ➔ fetches corporate travel reimbursement limits ➔ checks compliance rules.'
    },
    {
      id: 'security_pii',
      title: 'Security & PII Audit',
      icon: ShieldAlert,
      prompt: 'A sub-agent log has unmasked customer billing details. What GDPR/CCPA rules apply and how to audit logs?',
      desc: 'Identifies privacy concern ➔ searches GDPR compliance rules ➔ details access auditor routines.'
    },
    {
      id: 'vendor_framework',
      title: 'Vendor Price Audit',
      icon: Server,
      prompt: 'Our grocery supplier wants a 6.5% price hike. Check vendor performance scoring and price hike rules.',
      desc: 'Triggers supplier matrix lookup ➔ retrieves price hike limits (4.5%) ➔ suggests sourcing specialist tools.'
    },
    {
      id: 'disaster_recovery',
      title: 'Disaster Failover Protocol',
      icon: Database,
      prompt: 'Our primary database went offline 10 minutes ago. What is our RTO target and failover procedure?',
      desc: 'Routes system continuity inquiry ➔ queries disaster recovery rules (RPO/RTO) ➔ plans backup recovery.'
    },
    {
      id: 'remote_equipment',
      title: 'Remote Equip Stipend',
      icon: Sliders,
      prompt: 'Remote employee requests replacement laptop and screen. What remote work equipment stipend rules apply?',
      desc: 'Identifies employee query ➔ searches equipment allocation policy ➔ validates replacement deadlines.'
    }
  ];

  return (
    <div id="orchestration-view" className="space-y-8 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Unified Agent Sandbox
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Routing Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Agent Orchestration Sandbox</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Simulate, trace, and audit the sequential execution and real-time semantic routing of modular agent configurations.
          </p>
        </div>
      </div>

      {/* Main Consolidated Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Pipeline Configurator & Semantic Registry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Panel 1: Configuration Deck */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Pipeline Configurator
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold">STU_SIM_2</span>
            </div>

            {/* Quick Scenario Templates */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Select Predefined Orchestration Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCENARIOS.map((scen) => {
                  const Icon = scen.icon;
                  return (
                    <button
                      key={scen.id}
                      id={`scen-selector-${scen.id}`}
                      onClick={() => {
                        setScenario(scen.id);
                        setPromptInput(scen.prompt);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        scenario === scen.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/5'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${scenario === scen.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">{scen.title}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-snug line-clamp-2">{scen.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Text Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                User Input / Complex Goal
              </label>
              <div className="relative">
                <textarea
                  id="prompt-input"
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  className="w-full text-xs p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-normal leading-relaxed resize-none bg-slate-50/30"
                  placeholder="Specify a complex task or ask a question to evaluate router decisions..."
                  disabled={isSimulating}
                />
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[9px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-100 shadow-2xs">
                  <span>Length:</span>
                  <span className="font-semibold text-slate-600">{promptInput.length} chars</span>
                </div>
              </div>
            </div>

            {/* Run Action Button */}
            <div className="pt-2">
              <button
                id="run-simulation-btn"
                onClick={handleExecutePipeline}
                disabled={isSimulating || !promptInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Orchestrating Pipeline Nodes...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Execute Agent Pipeline</span>
                  </>
                )}
              </button>
            </div>

            {/* Final Synthesized Output - Instant UX impact */}
            <AnimatePresence>
              {currentAnimStep > activePipelineSteps.length + 1 && activePipelineSteps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  className="border border-emerald-200 bg-emerald-50/60 rounded-2xl p-5 shadow-sm relative overflow-hidden mt-2"
                >
                  {/* Subtle Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966906_1px,transparent_1px),linear-gradient(to_bottom,#05966906_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none"></div>
                  
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Final Synthesized Output (Outcome)
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded">
                        COMPLETED
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed font-sans max-h-72 overflow-y-auto pr-1 space-y-2">
                      <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Definite Answer (Grounded Output):
                      </p>
                      
                      <div className="text-slate-800 bg-white p-4 rounded-xl border border-emerald-100 leading-relaxed font-sans text-xs shadow-inner">
                        <Markdown
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-slate-700 leading-relaxed font-normal" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 font-normal" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 font-normal" {...props} />,
                            li: ({node, ...props}) => <li className="text-slate-700 font-normal" {...props} />,
                            strong: ({node, ...props}) => <strong className="text-emerald-900 font-bold" {...props} />,
                            code: ({node, ...props}) => <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600 border border-slate-200" {...props} />,
                          }}
                        >
                          {activePipelineSteps[activePipelineSteps.length - 1]?.message || ''}
                        </Markdown>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-[9px] text-slate-500 font-mono pt-2 border-t border-emerald-200/50">
                      <span>Cumulative Cost: <strong className="text-slate-700 font-semibold">{activePipelineSteps.reduce((sum, s) => sum + s.prompt_tokens, 0)} tokens</strong></span>
                      <span>•</span>
                      <span>Total Steps: <strong className="text-slate-700 font-semibold">{activePipelineSteps.length + 1}</strong></span>
                      <span>•</span>
                      <span>Execution Success: <strong className="text-emerald-600 font-bold">100%</strong></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Panel 2: Interactive Registry & Matcher (Side Tab Deck) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[420px]">
            {/* Side Tabs Selector */}
            <div className="flex border-b border-slate-100 pb-1.5 gap-4 mb-4">
              <button
                id="tab-matcher"
                onClick={() => setSideTab('matcher')}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  sideTab === 'matcher'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Active Agent Matcher
              </button>
              <button
                id="tab-rules"
                onClick={() => setSideTab('rules')}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  sideTab === 'rules'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Router Intent rules (agents.md)
              </button>
            </div>

            {sideTab === 'matcher' ? (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pr-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    On-The-Fly Semantic Evaluator
                  </p>
                  <span className="text-[9px] text-indigo-500 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                    Active Matches
                  </span>
                </div>

                <div className="space-y-3">
                  {agentMatchScores.map((agent) => {
                    const isHighlyRelevant = agent.score >= 35;
                    return (
                      <motion.div
                        key={agent.name}
                        layoutId={`agent-card-${agent.name}`}
                        className={`p-3 rounded-xl border transition-all ${
                          isHighlyRelevant
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                            : 'bg-slate-50/50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-800">{agent.name}</h4>
                              {isHighlyRelevant && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-full">
                                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                  Activated
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium tracking-wide font-mono block mt-0.5">{agent.role}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[11px] font-bold font-mono ${
                              isHighlyRelevant ? 'text-indigo-600' : 'text-slate-400'
                            }`}>
                              {agent.score}% match
                            </span>
                          </div>
                        </div>

                        {/* Match Progress mini bar */}
                        <div className="w-full bg-slate-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isHighlyRelevant ? 'bg-indigo-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${agent.score}%` }}
                          />
                        </div>

                        {/* Matched Keywords triggers */}
                        {isHighlyRelevant && agent.matchedKeywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 items-center">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">Triggers:</span>
                            {agent.matchedKeywords.map((kw) => (
                              <span key={kw} className="text-[8px] font-mono font-bold bg-white text-indigo-600 border border-indigo-150 px-1.5 py-0.2 rounded">
                                '{kw}'
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto max-h-[350px] space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Live Router Intent Specification
                    </p>
                  </div>
                  {loadingMd ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <p className="text-xs text-slate-400 font-medium">Parsing agents.md...</p>
                    </div>
                  ) : (
                    <div className="markdown-body">
                      <Markdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xs font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200 uppercase tracking-wide" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-[11px] font-bold text-slate-800 mt-3 mb-1.5 uppercase tracking-wide text-indigo-700" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-[10px] font-bold text-slate-700 mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="text-[11px] text-slate-600 leading-relaxed mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-[11px] text-slate-600" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-[11px] text-slate-600" {...props} />,
                          li: ({node, ...props}) => <li className="text-[11px]" {...props} />,
                          table: ({node, ...props}) => <div className="overflow-x-auto my-2 border border-slate-200 rounded-lg"><table className="min-w-full text-left border-collapse" {...props} /></div>,
                          thead: ({node, ...props}) => <thead className="bg-slate-100 border-b border-slate-200" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200 text-[10px]" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-slate-50/50" {...props} />,
                          th: ({node, ...props}) => <th className="p-1.5 font-bold text-[9px] text-slate-500 uppercase tracking-wider" {...props} />,
                          td: ({node, ...props}) => <td className="p-1.5 text-slate-700" {...props} />,
                          code: ({node, ...props}) => <code className="bg-white px-1 py-0.5 rounded font-mono text-[9px] text-indigo-600 border border-slate-200" {...props} />,
                          hr: () => <hr className="my-2 border-slate-250" />,
                        }}
                      >
                        {agentsMd}
                      </Markdown>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 text-center">
                  <p className="text-[9px] text-slate-400 leading-normal">
                    This specification file (<code>/agents.md</code>) defines user intents and manages routing criteria for specialized sub-agents.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Visual Execution Graph & Pipeline Outcomes (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between min-h-[810px]">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Visual Execution Graph
                </h3>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                Live State Stack
              </span>
            </div>

            {/* If pipeline is completely idle (currentAnimStep === 0) */}
            {currentAnimStep === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl my-auto py-16">
                <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl mb-4 text-indigo-400">
                  <Cpu className="w-10 h-10 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Sandbox Pipeline Idle</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Select a predefined scenario or enter any custom prompt goal, then click "Execute Agent Pipeline" to visualize the multi-agent sequencing.
                </p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Intent Evaluation Status Box */}
                {currentAnimStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-indigo-950/40 border border-indigo-900/50 rounded-2xl flex items-center gap-3 shadow-sm"
                  >
                    <div className="p-2 bg-indigo-900/60 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                          Intent Evaluation Phase
                        </p>
                      </div>
                      <p className="text-xs text-indigo-200 mt-1 font-medium animate-pulse leading-snug">
                        Orchestrator analyzing semantics against agents.md intent specifications...
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Staggered Pipeline Graph Nodes */}
                <div className="relative space-y-5 max-w-xl mx-auto py-4 w-full">
                  
                  {/* Supervisor/Router Step Node */}
                  <div className="relative">
                    <motion.div
                      animate={
                        currentAnimStep === 2
                          ? { scale: 1.02, borderColor: '#6366f1', backgroundColor: '#1e1b4b' }
                          : currentAnimStep > 2
                          ? { scale: 1, borderColor: '#10b981', backgroundColor: '#022c22' }
                          : { scale: 1, borderColor: '#334155', backgroundColor: '#0f172a' }
                      }
                      transition={{ duration: 0.3 }}
                      className="p-4 border rounded-xl flex items-start gap-4 relative z-10 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-mono font-bold ${
                        currentAnimStep === 2
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-800 animate-pulse'
                          : currentAnimStep > 2
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {currentAnimStep > 2 ? <Check className="w-4 h-4 text-emerald-400" /> : '1'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${
                            currentAnimStep >= 2 ? 'text-slate-100' : 'text-slate-500'
                          }`}>
                            Supervisor / Router Agent
                          </h4>
                          <span className="text-[9px] font-mono text-slate-500">Step 1</span>
                        </div>
                        
                        <p className={`text-[11px] mt-1 font-mono leading-relaxed ${
                          currentAnimStep >= 2 ? 'text-indigo-300' : 'text-slate-500'
                        }`}>
                          {currentAnimStep >= 2 ? (
                            <span>
                              Decision: <strong className="text-slate-100">"Analyzing incoming query semantics. Routing to matched specialist targets."</strong>
                            </span>
                          ) : (
                            <span>Awaiting intent semantic classification...</span>
                          )}
                        </p>
                      </div>
                    </motion.div>

                    {/* Connecting progress line 1 -> 2 */}
                    <div className="w-0.5 h-5 mx-8 bg-slate-800 relative z-0">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={currentAnimStep > 2 ? { height: '100%' } : { height: 0 }}
                        className="absolute inset-x-0 top-0 bg-emerald-500"
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Sub-Agent Specialist Pipeline Execution Nodes */}
                  {activePipelineSteps.map((step, idx) => {
                    const nodeStepNum = idx + 2; // Router is step 1, sub-agents are 2, 3...
                    const isActive = currentAnimStep === nodeStepNum;
                    const isCompleted = currentAnimStep > nodeStepNum;

                    return (
                      <div key={step.id || idx} className="relative">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={
                            isActive
                              ? { opacity: 1, scale: 1.02, borderColor: '#6366f1', backgroundColor: '#1e1b4b' }
                              : isCompleted
                              ? { opacity: 1, scale: 1, borderColor: '#10b981', backgroundColor: '#022c22' }
                              : { opacity: 0.7, scale: 1, borderColor: '#334155', backgroundColor: '#0f172a' }
                          }
                          transition={{ duration: 0.3 }}
                          className="p-4 border rounded-xl flex items-start gap-4 relative z-10 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-mono font-bold ${
                            isActive
                              ? 'bg-indigo-950 text-indigo-400 border-indigo-800 animate-pulse'
                              : isCompleted
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}>
                            {isCompleted ? <Check className="w-4 h-4 text-emerald-400" /> : nodeStepNum}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-xs font-bold uppercase tracking-wider ${
                                currentAnimStep >= nodeStepNum ? 'text-slate-100' : 'text-slate-500'
                              }`}>
                                {step.agent_name}
                              </h4>
                              <span className="text-[9px] font-mono text-slate-500">Step {nodeStepNum}</span>
                            </div>

                            <p className={`text-[11px] mt-1.5 leading-relaxed ${
                              currentAnimStep >= nodeStepNum ? 'text-indigo-200' : 'text-slate-500'
                            }`}>
                              {currentAnimStep >= nodeStepNum ? (
                                step.message
                              ) : (
                                <span>Awaiting agent execution sequence trigger...</span>
                              )}
                            </p>

                            {/* Tool invocation tag */}
                            {currentAnimStep >= nodeStepNum && step.tool_called && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-amber-300 font-mono bg-amber-950/40 border border-amber-900/50 rounded px-2 py-0.5 w-fit">
                                <span>🛠️ Invoked:</span>
                                <span>{step.tool_called}()</span>
                              </div>
                            )}

                            {currentAnimStep >= nodeStepNum && (
                              <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400 font-mono">
                                <span>Tokens: {step.prompt_tokens}</span>
                                <span>•</span>
                                <span>Latency: {step.response_time_ms}ms</span>
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* Connecting line between sub-agents */}
                        {idx < activePipelineSteps.length - 1 && (
                          <div className="w-0.5 h-5 mx-8 bg-slate-800 relative z-0">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={currentAnimStep > nodeStepNum ? { height: '100%' } : { height: 0 }}
                              className="absolute inset-x-0 top-0 bg-emerald-500"
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>

                {/* FINAL SYNTHESIS PANEL (Reveals once execution is complete) */}
                <AnimatePresence>
                  {currentAnimStep > activePipelineSteps.length + 1 && activePipelineSteps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="border border-emerald-800 bg-emerald-950/25 rounded-2xl p-5 shadow-lg relative overflow-hidden mt-auto"
                    >
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#04785710_1px,transparent_1px),linear-gradient(to_bottom,#04785710_1px,transparent_1px)] bg-[size:14px_14px]"></div>
                      
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                              Final Synthesized Output (Outcome)
                            </h4>
                          </div>
                          <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/45 px-2 py-0.5 rounded">
                            COMPLETED
                          </span>
                        </div>

                        {/* Rich Compiled Response Output */}
                        <div className="text-xs text-slate-200 leading-relaxed font-sans max-h-60 overflow-y-auto pr-1 space-y-2">
                          <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Definite Answer (Grounded Output):
                          </p>
                          <div className="text-slate-100 bg-slate-950/60 p-4 rounded-xl border border-emerald-800/60 leading-relaxed font-sans text-xs shadow-inner">
                            <Markdown
                              components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-200" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-200" {...props} />,
                                li: ({node, ...props}) => <li className="text-slate-200" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-emerald-300 font-bold" {...props} />,
                                code: ({node, ...props}) => <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-300 border border-slate-800" {...props} />,
                              }}
                            >
                              {activePipelineSteps[activePipelineSteps.length - 1]?.message || ''}
                            </Markdown>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-[9px] text-slate-400 font-mono pt-2 border-t border-emerald-900/20">
                          <span>Cumulative Cost: <strong className="text-slate-200">{activePipelineSteps.reduce((sum, s) => sum + s.prompt_tokens, 0)} tokens</strong></span>
                          <span>•</span>
                          <span>Total Steps: <strong className="text-slate-200">{activePipelineSteps.length + 1}</strong></span>
                          <span>•</span>
                          <span>Execution Success: <strong className="text-emerald-400">100%</strong></span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
            <span>Graph Engine: Framer Motion Reactive Stepper</span>
            <span>Total Steps Rendered: {activePipelineSteps.length > 0 ? activePipelineSteps.length + 1 : 0} nodes</span>
          </div>
        </div>

      </div>

      {/* GLOBAL METRICS COUNTER HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cumulative Prompt Tokens', value: totalTokens.toLocaleString(), sub: 'Database aggregate overhead', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Orchestration Steps', value: totalSteps, sub: 'Logs schema entry rows', icon: Cpu, color: 'text-sky-600 bg-sky-50 border-sky-100' },
          { label: 'Average Pipeline Latency', value: `${avgResponseTime}ms`, sub: 'Server roundtrip average', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Agent Success Rate', value: `${successRate}%`, sub: 'Reliability success ratio', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
        ].map((met, idx) => {
          const Icon = met.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{met.label}</p>
                  <p className="text-2xl font-bold text-slate-800 tracking-tight mt-1">{met.value}</p>
                </div>
                <div className={`p-2 rounded-xl border ${met.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">{met.sub}</p>
            </div>
          );
        })}
      </div>

      {/* DATABASE HISTORICAL EXECUTION LOGS SCHEMA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-600" />
              Database Execution Logs Schema: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs">agent_execution_logs</code>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The primary datastore tracks individual execution nodes of agents for monitoring, tracing, and auditing.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="reset-baseline-btn"
              onClick={onResetLogs}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              title="Reset Database to baseline seed data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seeds</span>
            </button>
            <button
              id="clear-logs-btn"
              onClick={onClearLogs}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              title="Wipe database execution logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe Schema</span>
            </button>
          </div>
        </div>

        {/* Database Grid Logs */}
        {logs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl">
            <Terminal className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No records found in agent_execution_logs</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
              Try executing an agent pipeline from the Configurator or load baseline seeds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-6">Step</th>
                  <th className="py-3 px-6">Agent Name</th>
                  <th className="py-3 px-6">Agent Class</th>
                  <th className="py-3 px-6">Prompt Tokens</th>
                  <th className="py-3 px-6">Tool Called</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Latency</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    id={`log-row-${log.id}`}
                    className="hover:bg-slate-50/60 transition-all"
                  >
                    <td className="py-3 px-6 font-mono font-semibold text-slate-500">{log.step_number}</td>
                    <td className="py-3 px-6 font-semibold text-slate-800">{log.agent_name}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wide ${agentTypeColorMap[log.agent_type] || 'bg-slate-50 text-slate-600'}`}>
                        {log.agent_type}
                      </span>
                    </td>
                    <td className="py-3 px-6 font-mono text-slate-600">{log.prompt_tokens} tokens</td>
                    <td className="py-3 px-6 font-mono">
                      {log.tool_called ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-bold">
                          {log.tool_called}()
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">none</span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {log.execution_status === 'success' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-emerald-700">Success</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span className="text-rose-700">Failed</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 font-mono text-slate-500">{log.response_time_ms}ms</td>
                    <td className="py-3 px-6 text-right">
                      <button
                        id={`inspect-log-${log.id}`}
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs hover:underline flex items-center gap-0.5 justify-end w-full cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Trace Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div id="log-inspector-modal" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Node Trace Inspector
                  </h4>
                </div>
                <button
                  id="close-modal-btn"
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Agent Name</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedLog.agent_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Agent Type</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wide inline-block mt-0.5 ${agentTypeColorMap[selectedLog.agent_type] || 'bg-slate-50 text-slate-600'}`}>
                      {selectedLog.agent_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Prompt Cost (Tokens)</span>
                    <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{selectedLog.prompt_tokens} tokens</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Response Latency</span>
                    <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{selectedLog.response_time_ms}ms</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Target Prompt Input / Action query</span>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-mono text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedLog.input_prompt}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Execution Output Message</span>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-normal text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                    {selectedLog.message}
                  </div>
                </div>

                {selectedLog.tool_called && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Invoked Tool Integration</span>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 font-mono">
                      🛠️ {selectedLog.tool_called}()
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  id="modal-close-action"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close Trace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
