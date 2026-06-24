import { ToolDefinition, AgentExecutionLog } from '../types';
import { motion } from 'motion/react';
import { ToggleLeft, ToggleRight, Wrench, Terminal, Cpu, Clock, RefreshCw, Layers } from 'lucide-react';

interface ToolMonitorViewProps {
  tools: ToolDefinition[];
  logs: AgentExecutionLog[];
  onToggleTool: (name: string) => Promise<void>;
  isLoading: boolean;
}

export default function ToolMonitorView({
  tools,
  logs,
  onToggleTool,
  isLoading,
}: ToolMonitorViewProps) {
  // Extract execution logs that actually invoked a tool
  const toolExecutions = logs.filter(log => log.tool_called !== null);

  return (
    <div id="tool-monitor-view" className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Execution Logs Tool-Use Sync
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Function Registry & Tool Monitor</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Inspect and toggle agent tool schemas that are compiled and exposed to the LLM as executable functions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Registered Function schemas (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              Registered Functional Integration Schema
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded border border-amber-100 font-bold uppercase tracking-wider">
              Tool schemas exposed
            </span>
          </div>

          <div className="space-y-4">
            {tools.map((tool) => (
              <div
                key={tool.name}
                id={`tool-card-${tool.name}`}
                className="p-4 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-150 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        {tool.name}()
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        tool.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {tool.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      {tool.description}
                    </p>
                  </div>

                  <button
                    id={`toggle-tool-${tool.name}`}
                    onClick={() => onToggleTool(tool.name)}
                    disabled={isLoading}
                    className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-colors duration-150"
                  >
                    {tool.status === 'active' ? (
                      <ToggleRight className="w-8 h-8 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Schema Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Expected Parameters Map (JSON Schema)
                  </span>
                  <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto whitespace-pre leading-relaxed">
                    {tool.parameters}
                  </pre>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span>Usage telemetry count:</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {tool.executionsCount} runs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive terminal executions (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col h-full min-h-[35rem]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                System Integration Console Logs
              </h3>
            </div>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              STDOUT
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] pr-1 leading-normal">
            {toolExecutions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-24 text-center">
                <Cpu className="w-8 h-8 text-slate-800 mb-2" />
                <p className="text-xs font-semibold">Terminal stream is idle</p>
                <p className="text-[9px] text-slate-600 mt-0.5 max-w-xs leading-normal">
                  No logs in agent_execution_logs have invoked tools yet. Run simulations calling tools to populate.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {toolExecutions.map((exec, idx) => (
                  <div key={exec.id || idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-[9px] border-b border-slate-800/60 pb-1 mb-1">
                      <span className="text-emerald-400 font-bold">
                        [CALL_SUCCESS]
                      </span>
                      <span className="text-slate-500">
                        {new Date(exec.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Agent:</span> {exec.agent_name}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Called:</span> {exec.tool_called}()
                    </p>
                    <p className="text-amber-400">
                      <span className="text-slate-500">Trace:</span> {exec.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[8px] text-slate-500 border-t border-slate-800/40 mt-1">
                      <span>Tokens: {exec.prompt_tokens}</span>
                      <span>Latency: {exec.response_time_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-800 pt-4 mt-4 flex items-center justify-between shrink-0">
            <span>Terminal: Sync active</span>
            <span>Count: {toolExecutions.length} tool executions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
