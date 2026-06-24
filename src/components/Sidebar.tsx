import { Cpu, Database, Wrench, RefreshCw, Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  serverStatus: 'connected' | 'error' | 'connecting';
  onReset: () => void;
  logsCount: number;
}

export default function Sidebar({ currentView, setView, serverStatus, onReset, logsCount }: SidebarProps) {
  const menuItems = [
    { id: 'orchestration', label: 'Orchestration', icon: Cpu, desc: 'Multi-agent simulator' },
    { id: 'rag_studio', label: 'RAG Studio', icon: Database, desc: 'Semantic search & chunks' },
    { id: 'tool_monitor', label: 'Tool Monitor', icon: Wrench, desc: 'System integrations' },
  ];

  return (
    <div id="sidebar" className="w-80 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-900/30">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              RAG & Agent Studio
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              Meta-Sandbox v1.0
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-3 mb-2">
          Studio Views
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate leading-none mb-1">{item.label}</p>
                <p className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {item.desc}
                </p>
              </div>
              {item.id === 'orchestration' && logsCount > 0 && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {logsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status / Controls */}
      <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-950/40">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2.5 w-2.5">
              {serverStatus === 'connected' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : serverStatus === 'connecting' ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight text-slate-200">
                {serverStatus === 'connected' ? 'Core Server Live' : serverStatus === 'connecting' ? 'Connecting...' : 'Server Offline'}
              </p>
              <p className="text-[10px] text-slate-500">
                Local Port: 3000
              </p>
            </div>
          </div>
          <button
            id="reset-studio-btn"
            onClick={onReset}
            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all duration-150"
            title="Reset Database to Baseline seeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            BUILD SYSTEM STATUS: ACTIVE
          </p>
        </div>
      </div>
    </div>
  );
}
