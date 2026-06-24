import { useState, useEffect } from 'react';
import { AgentExecutionLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Play, Trash2, RotateCcw, Cpu, CheckCircle2, XCircle, Clock, Database, Server, Info, Terminal, Sparkles, Loader2, BookOpen, Sliders } from 'lucide-react';

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
  matchScoreText: string;
}

const REGISTRY_AGENTS: RegistryAgent[] = [
  {
    name: 'Customer Service Router',
    role: 'Primary Orchestrator',
    description: 'Classifies conversational state and determines optimal downstream capability mappings based on semantic intent rules.',
    capabilities: [
      'Query classification',
      'Execution sequence planning',
      'Dynamic routing'
    ],
    matchedPattern: 'order, delivery, shipping, delay',
    matchScoreText: "Query includes 'delivery' &rarr; 94% Semantic match"
  },
  {
    name: 'Sourcing Specialist',
    role: 'Database & Market Intelligence',
    description: 'Capable of querying inventory databases, pulling competitor pricing arrays, and extracting financial metrics.',
    capabilities: [
      'querying inventory databases',
      'pulling competitor pricing arrays',
      'extracting financial metrics'
    ],
    matchedPattern: 'margins, profit, cost, retail, price, calculate',
    matchScoreText: "Query includes 'margins' &rarr; 96% Semantic match"
  },
  {
    name: 'Synthesis Agent',
    role: 'Response Summarization',
    description: 'Capable of aggregating multi-source inputs, running guardrail compliance checks, and drafting client-facing summaries.',
    capabilities: [
      'aggregating multi-source inputs',
      'running guardrail compliance checks',
      'drafting client-facing summaries'
    ],
    matchedPattern: 'draft, competitor response plan, plan, summarize',
    matchScoreText: "Query includes 'draft' &rarr; 91% Semantic match"
  }
];

const getMatchingAgentName = (query: string): { agentName: string; patternUsed: string; score: number; category: string } => {
  const q = query.toLowerCase();
  if (q.includes('margin') || q.includes('price') || q.includes('sourcing') || q.includes('cost') || q.includes('grocery') || q.includes('calculate') || q.includes('index')) {
    return {
      agentName: 'Sourcing Specialist',
      patternUsed: q.includes('margin') ? 'margins' : q.includes('price') ? 'price' : q.includes('grocery') ? 'grocery' : 'cost',
      score: 96,
      category: 'Supply Chain / Financials'
    };
  }
  if (q.includes('delivery') || q.includes('order') || q.includes('ship') || q.includes('delay') || q.includes('refund')) {
    return {
      agentName: 'Customer Service Router',
      patternUsed: q.includes('delivery') ? 'delivery' : q.includes('delay') ? 'delay' : 'order',
      score: 94,
      category: 'Customer Operations'
    };
  }
  if (q.includes('draft') || q.includes('summarize') || q.includes('plan') || q.includes('synthesize')) {
    return {
      agentName: 'Synthesis Agent',
      patternUsed: q.includes('draft') ? 'draft' : q.includes('plan') ? 'plan' : 'summarize',
      score: 91,
      category: 'Corporate Synthesis / Reporting'
    };
  }
  // Default fallback
  return {
    agentName: 'Sourcing Specialist',
    patternUsed: 'margins',
    score: 96,
    category: 'Supply Chain / Financials'
  };
};

export default function OrchestrationView({
  logs,
  onClearLogs,
  onResetLogs,
  isLoading,
  setIsLoading,
  refreshLogs,
}: OrchestrationViewProps) {
  const [promptInput, setPromptInput] = useState('My order ORD-9011 is delayed. Can you find where it is and apply our discount policies?');
  const [scenario, setScenario] = useState('delivery_lookup');
  const [selectedLog, setSelectedLog] = useState<AgentExecutionLog | null>(null);

  // Phase 2 states
  const [complexGoal, setComplexGoal] = useState('Analyze our Q2 grocery margins and draft a competitor response plan.');
  const [currentAnimStep, setCurrentAnimStep] = useState<number>(0); // 0: idle, 1: Step 1, 2: Step 2, 3: Step 3, 4: Complete
  const [simulatedLogs, setSimulatedLogs] = useState<AgentExecutionLog[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // live agents.md states
  const [agentsMd, setAgentsMd] = useState<string>('');
  const [loadingMd, setLoadingMd] = useState<boolean>(true);
  const [configTab, setConfigTab] = useState<'run' | 'rules'>('run');

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

  // Derive metrics
  const totalSteps = logs.length;
  const totalTokens = logs.reduce((sum, log) => sum + log.prompt_tokens, 0);
  const avgResponseTime = totalSteps > 0 ? Math.round(logs.reduce((sum, log) => sum + log.response_time_ms, 0) / totalSteps) : 0;
  const successRate = totalSteps > 0 ? Math.round((logs.filter(log => log.execution_status === 'success').length / totalSteps) * 100) : 100;

  const handleSimulate = async () => {
    if (!promptInput.trim()) return;
    setIsLoading(true);
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

      await refreshLogs();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2 step-by-step sequencing runner
  const handlePhase2SimulateRun = async () => {
    if (!complexGoal.trim() || isSimulating) return;
    setIsSimulating(true);
    setCurrentAnimStep(1); // 1 is "Intent Evaluation"
    setSimulatedLogs([]);

    const matchInfo = getMatchingAgentName(complexGoal);

    const stepsData = [
      {
        agent_name: 'Supervisor/Router Agent',
        step_number: 1,
        prompt_tokens: 450,
        tool_called: null,
        execution_status: 'success' as const,
        message: `Intent categorized as '${matchInfo.category}'. Activating ${matchInfo.agentName} based on registry capability match.`,
        input_prompt: complexGoal,
        response_time_ms: 180,
        agent_type: 'orchestrator' as const,
      },
      {
        agent_name: matchInfo.agentName,
        step_number: 2,
        prompt_tokens: 520,
        tool_called: matchInfo.agentName === 'Sourcing Specialist' ? 'web_search' : null,
        execution_status: 'success' as const,
        message: matchInfo.agentName === 'Sourcing Specialist'
          ? 'Querying inventory database indices, pulling competitor pricing arrays, and calculating profit margins.'
          : matchInfo.agentName === 'Customer Service Router'
          ? 'Parsing customer transaction records and querying regional order dispatch logs.'
          : 'Aggregating system-wide input records, performing strict compliance guardrail checks, and drafting summaries.',
        input_prompt: complexGoal,
        response_time_ms: 320,
        agent_type: 'executor' as const,
      },
      {
        agent_name: matchInfo.agentName === 'Synthesis Agent' ? 'Response Coordinator' : 'Synthesis Agent',
        step_number: 3,
        prompt_tokens: 890,
        tool_called: null,
        execution_status: 'success' as const,
        message: matchInfo.agentName === 'Synthesis Agent'
          ? 'Formulating final customer response based on strict corporate refund policies and dispatch status.'
          : 'Aggregating multi-source analyst inputs and compiling a clean client-facing markdown summary.',
        input_prompt: 'Synthesize pricing statistics and outline hedging responses.',
        response_time_ms: 450,
        agent_type: 'orchestrator' as const,
      }
    ];

    // Phase 1: Intent Evaluation (1800ms) - let the loader flash and matching registry item highlight
    setTimeout(async () => {
      // Phase 2: Supervisor/Router Agent (Step 1 of execution)
      setCurrentAnimStep(2);
      try {
        const res = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stepsData[0]),
        });
        if (res.ok) {
          const newLog = await res.json();
          setSimulatedLogs(prev => [...prev, newLog]);
        }
      } catch (err) {
        console.error(err);
      }

      // Phase 3: Active Sub-Agent (Step 2 of execution)
      setTimeout(async () => {
        setCurrentAnimStep(3);
        try {
          const res = await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stepsData[1]),
          });
          if (res.ok) {
            const newLog = await res.json();
            setSimulatedLogs(prev => [...prev, newLog]);
          }
        } catch (err) {
          console.error(err);
        }

        // Phase 4: Synthesis / Coordinator (Step 3 of execution)
        setTimeout(async () => {
          setCurrentAnimStep(4);
          try {
            const res = await fetch('/api/logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stepsData[2]),
            });
            if (res.ok) {
              const newLog = await res.json();
              setSimulatedLogs(prev => [...prev, newLog]);
            }
          } catch (err) {
            console.error(err);
          }
          
          // Phase 5: Complete
          setTimeout(async () => {
            setCurrentAnimStep(5);
            setIsSimulating(false);
            await refreshLogs();
          }, 1500);

        }, 1500);

      }, 1500);

    }, 1800);
  };

  const agentTypeColorMap = {
    orchestrator: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400',
    planner: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-400',
    retriever: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400',
    coder: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-400',
    executor: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400',
  };

  return (
    <div id="orchestration-view" className="space-y-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Multi-Agent Sandbox Active
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Phase 2 Enabled
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Agent Orchestration Sandbox</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Simulate, trace, and audit the sequential thinking and tool selection of multi-agent orchestrator pipelines.
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PHASE 2: INTERACTIVE MOCK PLAYGROUND */}
      {/* ---------------------------------------------------- */}
      <div id="mock-execution-playground" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Multi-Agent Pipeline Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Visualize step-by-step thinking traces and sequential interactions of modular agent configurations.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
            Interactive Agent Loop
          </span>
        </div>

        {/* Main split grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN: System Agent Registry (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  📖 System Agent Registry (agents.md)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                The router uses semantic profiles in <code>agents.md</code> to dynamically evaluate incoming goals and delegate to matched sub-agents.
              </p>
              
              <div className="space-y-4">
                {REGISTRY_AGENTS.map((agent) => {
                  const activeMatch = getMatchingAgentName(complexGoal);
                  const isMatched = activeMatch.agentName === agent.name;
                  const showMatchBadge = isMatched && isSimulating && currentAnimStep >= 1;

                  return (
                    <div
                      key={agent.name}
                      className={`p-3.5 rounded-xl border transition-all duration-300 relative ${
                        showMatchBadge
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-sm ring-2 ring-emerald-500/10'
                          : 'bg-white border-slate-150'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{agent.name}</span>
                            {showMatchBadge && (
                              <span className="text-[8px] font-mono font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                                Matched Agent
                              </span>
                            )}
                          </h5>
                          <span className="text-[9px] font-mono font-medium text-indigo-600 uppercase tracking-wide">
                            {agent.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        {agent.description}
                      </p>
                      
                      {/* Capabilities list */}
                      <ul className="mt-2 pl-4 list-disc text-[10px] text-slate-500 space-y-0.5">
                        {agent.capabilities.map((cap, i) => (
                          <li key={i}>{cap}</li>
                        ))}
                      </ul>

                      {/* Green match badge with details */}
                      {showMatchBadge && (
                        <div className="mt-3 p-2 bg-emerald-100/40 border border-emerald-200 rounded-lg text-[9px] font-mono text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Query includes '{activeMatch.patternUsed}' &rarr; {activeMatch.score}% match</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-200 text-center">
              <span className="text-[9px] text-slate-400 font-mono">
                Source: /agents.md System Spec
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Pipeline Simulator (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Goal Input form */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Enter a complex goal
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="complex-goal-input"
                  type="text"
                  value={complexGoal}
                  onChange={(e) => setComplexGoal(e.target.value)}
                  placeholder="e.g. Analyze our Q2 grocery margins and draft a competitor response plan."
                  className="flex-1 text-sm p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 bg-slate-50/50"
                />
                <button
                  id="simulate-run-btn"
                  onClick={handlePhase2SimulateRun}
                  disabled={isSimulating || !complexGoal.trim()}
                  className="sm:w-48 flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all duration-150 shadow-md shadow-indigo-600/10 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sequencing Run...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Simulate Run</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Dynamic Intent Evaluation Phase Box */}
            <AnimatePresence>
              {isSimulating && currentAnimStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3.5 shadow-sm"
                >
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                      <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                        Intent Evaluation Phase
                      </p>
                    </div>
                    <p className="text-xs text-indigo-700 mt-1 font-medium animate-pulse">
                      Router analyzing query semantics against agents.md definitions...
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Keyword found: '{getMatchingAgentName(complexGoal).patternUsed}' &rarr; Mapping to {getMatchingAgentName(complexGoal).agentName}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Node Animation Timeline Graph */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              <div className="relative space-y-6 max-w-xl mx-auto py-2">
                
                {/* CARD 1: Supervisor/Router Agent */}
                {(() => {
                  const activeMatch = getMatchingAgentName(complexGoal);
                  return (
                    <div className="relative">
                      <motion.div
                        animate={
                          currentAnimStep === 2
                            ? { scale: 1.02, borderColor: '#6366f1', backgroundColor: '#f5f3ff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)' }
                            : currentAnimStep > 2
                            ? { scale: 1, borderColor: '#10b981', backgroundColor: '#f0fdf4' }
                            : { scale: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
                        }
                        transition={{ duration: 0.3 }}
                        className="p-4 border rounded-xl shadow-xs flex items-start gap-4 transition-all relative z-10"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                          currentAnimStep === 2
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse'
                            : currentAnimStep > 2
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {currentAnimStep > 2 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : currentAnimStep === 2 ? (
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-500">1</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${
                              currentAnimStep >= 2 ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              Supervisor/Router Agent
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 font-medium">Step 1</span>
                          </div>
                          
                          {/* Reasoning description dynamically matches the intent-rules */}
                          <p className={`text-xs mt-1.5 leading-relaxed font-mono ${
                            currentAnimStep >= 2 ? 'text-indigo-600' : 'text-slate-400'
                          }`}>
                            {currentAnimStep >= 2 ? (
                              <span>
                                Router explicit reasoning: <strong className="text-slate-800">"Intent categorized as '{activeMatch.category}'. Activating {activeMatch.agentName} based on registry capability match."</strong>
                              </span>
                            ) : (
                              <span>Awaiting Router semantics analysis...</span>
                            )}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                            <span>Tokens: 450</span>
                            <span>•</span>
                            <span>Status: {currentAnimStep > 2 ? 'Completed' : currentAnimStep === 2 ? 'Thinking' : 'Pending'}</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Connected Progress Line 1 -> 2 */}
                      <div className="w-0.5 h-6 mx-9 bg-slate-200 relative z-0">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={
                            currentAnimStep > 2 ? { height: '100%' } : { height: 0 }
                          }
                          className="absolute inset-x-0 top-0 bg-emerald-500"
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 2: Dynamic Executing Specialist */}
                {(() => {
                  const activeMatch = getMatchingAgentName(complexGoal);
                  return (
                    <div className="relative">
                      <motion.div
                        animate={
                          currentAnimStep === 3
                            ? { scale: 1.02, borderColor: '#6366f1', backgroundColor: '#f5f3ff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)' }
                            : currentAnimStep > 3
                            ? { scale: 1, borderColor: '#10b981', backgroundColor: '#f0fdf4' }
                            : { scale: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
                        }
                        transition={{ duration: 0.3 }}
                        className="p-4 border rounded-xl shadow-xs flex items-start gap-4 transition-all relative z-10"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                          currentAnimStep === 3
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse'
                            : currentAnimStep > 3
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {currentAnimStep > 3 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : currentAnimStep === 3 ? (
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-500">2</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${
                              currentAnimStep >= 3 ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {activeMatch.agentName}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 font-medium">Step 2</span>
                          </div>
                          
                          <p className={`text-xs mt-1.5 leading-relaxed ${
                            currentAnimStep >= 3 ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                          }`}>
                            {currentAnimStep >= 3 ? (
                              activeMatch.agentName === 'Sourcing Specialist'
                                ? 'Thinking trace: "Querying inventory database indices, pulling competitor pricing arrays, and calculating profit margins."'
                                : activeMatch.agentName === 'Customer Service Router'
                                ? 'Thinking trace: "Parsing customer transaction records and querying regional order dispatch logs."'
                                : 'Thinking trace: "Aggregating system-wide input records, performing strict compliance guardrail checks, and drafting summaries."'
                            ) : (
                              'Thinking trace: "Awaiting activation..."'
                            )}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                            <span>Tokens: 520</span>
                            <span>•</span>
                            <span>Status: {currentAnimStep > 3 ? 'Completed' : currentAnimStep === 3 ? 'Thinking' : 'Pending'}</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Connected Progress Line 2 -> 3 */}
                      <div className="w-0.5 h-6 mx-9 bg-slate-200 relative z-0">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={
                            currentAnimStep > 3 ? { height: '100%' } : { height: 0 }
                          }
                          className="absolute inset-x-0 top-0 bg-emerald-500"
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 3: Synthesis / Coordinating Agent */}
                {(() => {
                  const activeMatch = getMatchingAgentName(complexGoal);
                  const cardTitle = activeMatch.agentName === 'Synthesis Agent' ? 'Response Coordinator' : 'Synthesis Agent';
                  return (
                    <div className="relative">
                      <motion.div
                        animate={
                          currentAnimStep === 4
                            ? { scale: 1.02, borderColor: '#6366f1', backgroundColor: '#f5f3ff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)' }
                            : currentAnimStep > 4
                            ? { scale: 1, borderColor: '#10b981', backgroundColor: '#f0fdf4' }
                            : { scale: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
                        }
                        transition={{ duration: 0.3 }}
                        className="p-4 border rounded-xl shadow-xs flex items-start gap-4 transition-all relative z-10"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                          currentAnimStep === 4
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse'
                            : currentAnimStep > 4
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {currentAnimStep > 4 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : currentAnimStep === 4 ? (
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-500">3</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${
                              currentAnimStep >= 4 ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {cardTitle}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 font-medium">Step 3</span>
                          </div>
                          
                          <p className={`text-xs mt-1.5 leading-relaxed ${
                            currentAnimStep >= 4 ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                          }`}>
                            {currentAnimStep >= 4 ? (
                              activeMatch.agentName === 'Synthesis Agent'
                                ? 'Thinking trace: "Formulating final customer response based on strict corporate refund policies and dispatch status."'
                                : 'Thinking trace: "Aggregating multi-source analyst inputs and compiling a clean client-facing markdown summary."'
                            ) : (
                              'Thinking trace: "Awaiting activation..."'
                            )}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                            <span>Tokens: 890</span>
                            <span>•</span>
                            <span>Status: {currentAnimStep > 4 ? 'Completed' : currentAnimStep === 4 ? 'Thinking' : 'Pending'}</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        </div>

        {/* Simulated Run Table Display */}
        {simulatedLogs.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Run Database Logs (saved to 'agent_execution_logs')
              </h4>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-250">
                    <th className="py-3 px-4">Step</th>
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Prompt Tokens</th>
                    <th className="py-3 px-4">Execution Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {simulatedLogs.map((simLog) => (
                    <tr key={simLog.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{simLog.step_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{simLog.agent_name}</td>
                      <td className="py-3 px-4 font-mono">{simLog.prompt_tokens} tokens</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Success
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {new Date(simLog.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Simulator Controls & Visual Pipeline Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Simulator Form (Left - 5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[520px]">
          <div className="space-y-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Pipeline Configurator
              </h3>
              <span className="text-xs text-slate-400 font-mono">STU_SIM_1</span>
            </div>

            {/* Custom Tab Selector */}
            <div className="flex border-b border-slate-100 pb-1 gap-4">
              <button
                id="tab-configurator-run"
                onClick={() => setConfigTab('run')}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  configTab === 'run'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Run Simulator
              </button>
              <button
                id="tab-configurator-rules"
                onClick={() => setConfigTab('rules')}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  configTab === 'rules'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Router Intent Rules (AGENTS.md)
              </button>
            </div>

            {configTab === 'run' ? (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Scenarios selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Agent Orchestration Scenario
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          id: 'delivery_lookup',
                          title: 'Customer Delivery Lookup',
                          desc: 'Router ➔ Database status ➔ RAG refund policies ➔ Synthesize response.',
                        },
                        {
                          id: 'web_search_math',
                          title: 'Research & Calculation',
                          desc: 'Router ➔ Web index search ➔ Mathematical calculation ➔ Report formulation.',
                        },
                        {
                          id: 'general_agent',
                          title: 'Semantic Context Lookup',
                          desc: 'Conversational agent ➔ Semantic context retriever ➔ Direct synthesis.',
                        },
                      ].map((scen) => (
                        <button
                          key={scen.id}
                          id={`scen-${scen.id}`}
                          onClick={() => {
                            setScenario(scen.id);
                            if (scen.id === 'delivery_lookup') {
                              setPromptInput('My order ORD-9011 is delayed. Can you find where it is and apply our discount policies?');
                            } else if (scen.id === 'web_search_math') {
                              setPromptInput('Search web for interest rates and calculate precision compound multipliers for index: 3.12');
                            } else {
                              setPromptInput('Explain how the agent standard orchestration guideline retrieves source document IDs.');
                            }
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                            scenario === scen.id
                              ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/10'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-800">{scen.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">{scen.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      User Initial Prompt Input
                    </label>
                    <textarea
                      id="prompt-input"
                      rows={3}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      className="w-full text-sm p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-normal leading-relaxed resize-none bg-slate-50/50"
                      placeholder="Type some intent or user request..."
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    id="run-simulation-btn"
                    onClick={handleSimulate}
                    disabled={isLoading || !promptInput.trim()}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all duration-150 shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Orchestrating Agents...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Execute Agent Pipeline</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto max-h-[380px] space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
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
                          h1: ({node, ...props}) => <h1 className="text-sm font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200 uppercase tracking-wide" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xs font-bold text-slate-800 mt-3 mb-1.5 uppercase tracking-wide text-indigo-700" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-[11px] font-bold text-slate-700 mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="text-xs text-slate-600 leading-relaxed mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-xs text-slate-600" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-xs text-slate-600" {...props} />,
                          li: ({node, ...props}) => <li className="text-xs" {...props} />,
                          table: ({node, ...props}) => <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg"><table className="min-w-full text-left border-collapse" {...props} /></div>,
                          thead: ({node, ...props}) => <thead className="bg-slate-100 border-b border-slate-200" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200 text-[10px]" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-slate-50/50" {...props} />,
                          th: ({node, ...props}) => <th className="p-2 font-bold text-[9px] text-slate-500 uppercase tracking-wider" {...props} />,
                          td: ({node, ...props}) => <td className="p-2 text-slate-700" {...props} />,
                          code: ({node, ...props}) => <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600 border border-slate-200" {...props} />,
                          hr: () => <hr className="my-3 border-slate-250" />,
                        }}
                      >
                        {agentsMd}
                      </Markdown>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    This specification file (<code>/agents.md</code>) defines user intents and manages routing criteria for specialized sub-agents.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Animated Timeline (Right - 7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Visual Execution Graph
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                LIVE STACK
              </span>
            </div>

            {/* Stack Graph Node list */}
            {logs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
                <Cpu className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Sandbox stack is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Run a simulation pipeline from the Configurator to visualize the agent step-by-step executions.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {logs.map((log, idx) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.1 }}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3.5"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center border border-slate-700">
                          {log.step_number}
                        </div>
                        {idx < logs.length - 1 && (
                          <div className="w-0.5 h-6 bg-slate-800 my-1"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-200">{log.agent_name}</p>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded">
                            {log.prompt_tokens} tokens
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-normal leading-normal">{log.message}</p>
                        
                        {log.tool_called && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono bg-amber-950/20 border border-amber-900/40 rounded px-2 py-0.5 w-fit">
                            <span>🛠️ Tool:</span>
                            <span>{log.tool_called}()</span>
                          </div>
                        )}
                      </div>
                      <div>
                        {log.execution_status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
            <span>Graph Renderer: Framer Motion Engine</span>
            <span>Logs Count: {logs.length} items</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cumulative Prompt Tokens', value: totalTokens.toLocaleString(), sub: 'API Billing weight', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Orchestration Steps', value: totalSteps, sub: 'Log sequence list count', icon: Cpu, color: 'text-sky-600 bg-sky-50 border-sky-100' },
          { label: 'Average Pipeline Latency', value: `${avgResponseTime}ms`, sub: 'Server-side execute duration', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Agent Success Rate', value: `${successRate}%`, sub: 'Reliability factor', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
        ].map((met, idx) => {
          const Icon = met.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{met.label}</p>
                  <p className="text-2xl font-bold text-slate-800 tracking-tight mt-1">{met.value}</p>
                </div>
                <div className={`p-2 rounded-xl border ${met.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">{met.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Execution logs table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-600" />
              Database Execution Logs Schema: agent_execution_logs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The primary datastore tracks individual execution nodes of agents for monitoring and debugging.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="reset-baseline-btn"
              onClick={onResetLogs}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all duration-150"
              title="Reset Database to baseline seed data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seeds</span>
            </button>
            <button
              id="clear-logs-btn"
              onClick={onClearLogs}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-lg transition-all duration-150"
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
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
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
                    className="hover:bg-slate-50/60 transition-all duration-100"
                  >
                    <td className="py-3 px-6 font-mono font-semibold text-slate-500">{log.step_number}</td>
                    <td className="py-3 px-6 font-semibold text-slate-800">{log.agent_name}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide ${agentTypeColorMap[log.agent_type] || 'bg-slate-50 text-slate-600'}`}>
                        {log.agent_type}
                      </span>
                    </td>
                    <td className="py-3 px-6 font-mono text-slate-600">{log.prompt_tokens} tokens</td>
                    <td className="py-3 px-6 font-mono">
                      {log.tool_called ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-semibold">
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
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs hover:underline flex items-center gap-0.5 justify-end w-full"
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

      {/* Log Detail Modal */}
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
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    Node Trace Inspector
                  </h4>
                </div>
                <button
                  id="close-modal-btn"
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-150"
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
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all duration-150"
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
