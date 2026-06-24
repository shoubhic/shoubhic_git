import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import OrchestrationView from './components/OrchestrationView';
import RagStudioView from './components/RagStudioView';
import ToolMonitorView from './components/ToolMonitorView';
import { AgentExecutionLog, RagDocument, RagQueryLog, ToolDefinition } from './types';

export default function App() {
  const [currentView, setView] = useState<string>('orchestration');
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [queryLogs, setQueryLogs] = useState<RagQueryLog[]>([]);
  const [serverStatus, setServerStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch all state from full-stack Express API endpoints
  const fetchAllData = useCallback(async () => {
    try {
      const [logsRes, docsRes, toolsRes, queriesRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/documents'),
        fetch('/api/tools'),
        fetch('/api/rag-queries'),
      ]);

      if (logsRes.ok && docsRes.ok && toolsRes.ok && queriesRes.ok) {
        const [logsData, docsData, toolsData, queriesData] = await Promise.all([
          logsRes.json(),
          docsRes.json(),
          toolsRes.json(),
          queriesRes.json(),
        ]);

        setLogs(logsData);
        setDocuments(docsData);
        setTools(toolsData);
        setQueryLogs(queriesData);
        setServerStatus('connected');
      } else {
        setServerStatus('error');
      }
    } catch (error) {
      console.error('Failed to connect to the Express server:', error);
      setServerStatus('error');
    }
  }, []);

  // Poll server state initially and connect
  useEffect(() => {
    fetchAllData();
    // Poll logs every 5 seconds to show updates
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Actions
  const handleAddLog = (newLog: AgentExecutionLog) => {
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleClearLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs/clear', { method: 'POST' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs/reset', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTool = async (name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tools/${name}/toggle`, { method: 'POST' });
      if (res.ok) {
        const updatedTool = await res.json();
        setTools((prev) => prev.map((t) => (t.name === name ? updatedTool : t)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDocument = async (title: string, content: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments((prev) => [...prev, newDoc]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rag-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const newQueryLog = await res.json();
        setQueryLogs((prev) => [...prev, newQueryLog]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="app-root" className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        serverStatus={serverStatus}
        onReset={handleResetLogs}
        logsCount={logs.length}
      />

      {/* Main Sandbox Dashboard Workspace */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {serverStatus === 'error' && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-sm text-rose-800 animate-pulse">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><strong>Connection Lost:</strong> Cannot reach the full-stack server backend. Make sure the development server is running.</span>
            </div>
            <button
              onClick={fetchAllData}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg text-xs font-semibold transition-all duration-150"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Dynamic workspace views */}
        {currentView === 'orchestration' && (
          <OrchestrationView
            logs={logs}
            onAddLog={handleAddLog}
            onClearLogs={handleClearLogs}
            onResetLogs={handleResetLogs}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            refreshLogs={fetchAllData}
          />
        )}

        {currentView === 'rag_studio' && (
          <RagStudioView
            documents={documents}
            queryLogs={queryLogs}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onExecuteQuery={handleExecuteQuery}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentView === 'tool_monitor' && (
          <ToolMonitorView
            tools={tools}
            logs={logs}
            onToggleTool={handleToggleTool}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
