import { useState, FormEvent, useEffect } from 'react';
import { RagDocument, RagQueryLog, RetrievedChunk } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Database,
  Search,
  Sparkles,
  AlertCircle,
  FileText,
  CheckCircle,
  HelpCircle,
  Layers,
  Sliders,
  Cpu,
  Info,
  RefreshCw,
  ArrowRight,
  Gauge,
  BookOpen
} from 'lucide-react';

interface RagStudioViewProps {
  documents: RagDocument[];
  queryLogs: RagQueryLog[];
  onAddDocument: (title: string, content: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onExecuteQuery: (query: string) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

interface VisualChunk {
  id: number;
  prevOverlap: string;
  mainText: string;
  nextOverlap: string;
  fullText: string;
  start: number;
  end: number;
}

const DEFAULT_TEXT = `Our Q2 grocery margin targets are set at 32% for standard inventory, with premium organic goods aiming for a 45% margin to offset lower-yield fresh staples which are limited to a 15% margin. To counter competitor wholesale discount campaigns, we have activated active pricing hedges and localized discount matrices. Under our service SLA agreement, customer delivery delays exceeding 5 working days qualify for a full refund and a 20% future purchase voucher. All perishable grocery assets require temperature-controlled warehousing, maintaining standard fresh zones at 4 degrees Celsius and deep-freeze compartments at -18 degrees Celsius. Compliance parameters are monitored continuously via smart thermal sensors. In order to scale logistics operations, regional delivery hubs must authorize priority staging for organic dairy and fresh produce shipments within 30 minutes of arrivals. Discount policies apply dynamically during checkout; loyalty tier members (Silver, Gold, and Platinum tiers) receive incremental 5%, 10%, and 15% reductions respectively on non-staple indices. All refund applications must route through the automated billing service with an associated carrier failure token.`;

export default function RagStudioView({
  documents,
  queryLogs,
  onAddDocument,
  onDeleteDocument,
  onExecuteQuery,
  isLoading,
  setIsLoading,
}: RagStudioViewProps) {
  // Input fields state
  const [sourceText, setSourceText] = useState(DEFAULT_TEXT);
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [docTitle, setDocTitle] = useState('Grocery Margin & Refund SOP');

  // Query Playground state
  const [searchQuery, setSearchQuery] = useState('What are our grocery margin targets?');
  const [simulatedResults, setSimulatedResults] = useState<RetrievedChunk[]>([]);
  const [hasQueried, setHasQueried] = useState(false);

  // Computed chunks list
  const [processedChunks, setProcessedChunks] = useState<VisualChunk[]>([]);

  // Persistent doc forms state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [corpusTitle, setCorpusTitle] = useState('');
  const [corpusContent, setCorpusContent] = useState('');

  // 1. Core visual chunking process helper
  const calculateChunks = (textToProcess: string, size: number, overlap: number) => {
    if (!textToProcess.trim()) return;
    const chunksList: VisualChunk[] = [];
    const effectiveOverlap = Math.min(overlap, Math.floor(size / 2.5));
    let start = 0;

    while (start < textToProcess.length) {
      let end = start + size;
      if (end > textToProcess.length) {
        end = textToProcess.length;
      }

      const chunkText = textToProcess.substring(start, end);
      const hasPrevOverlap = start > 0;
      const hasNextOverlap = end < textToProcess.length;

      let prevOverlap = '';
      let mainText = '';
      let nextOverlap = '';

      if (hasPrevOverlap && hasNextOverlap) {
        prevOverlap = textToProcess.substring(start, start + effectiveOverlap);
        mainText = textToProcess.substring(start + effectiveOverlap, end - effectiveOverlap);
        nextOverlap = textToProcess.substring(end - effectiveOverlap, end);
      } else if (hasPrevOverlap) {
        prevOverlap = textToProcess.substring(start, start + effectiveOverlap);
        mainText = textToProcess.substring(start + effectiveOverlap, end);
      } else if (hasNextOverlap) {
        mainText = textToProcess.substring(start, end - effectiveOverlap);
        nextOverlap = textToProcess.substring(end - effectiveOverlap, end);
      } else {
        mainText = chunkText;
      }

      chunksList.push({
        id: chunksList.length + 1,
        prevOverlap,
        mainText,
        nextOverlap,
        fullText: chunkText,
        start,
        end,
      });

      if (end >= textToProcess.length) break;
      start = end - effectiveOverlap;

      // Anti-infinite-loop guard
      if (effectiveOverlap === 0 && start === end) {
        break;
      }
      if (start >= textToProcess.length) break;
    }

    setProcessedChunks(chunksList);
  };

  // Run initial chunking on mount
  useEffect(() => {
    calculateChunks(DEFAULT_TEXT, 500, 50);
  }, []);

  const handleProcessDocument = () => {
    calculateChunks(sourceText, chunkSize, chunkOverlap);
  };

  // 2. Mock vector retrieval search scoring helper
  const calculateMockSimilarity = (chunkText: string, queryText: string): number => {
    const queryWords = queryText.toLowerCase().match(/\b\w{3,}\b/g) || [];
    if (queryWords.length === 0) return 0.5;

    let matches = 0;
    queryWords.forEach((word) => {
      if (chunkText.toLowerCase().includes(word)) {
        matches += 1;
      }
    });

    const baseScore = matches / queryWords.length;
    // Normalize similarity between [0.65, 0.98] if matches found, or default to a baseline based on text length
    const variance = (chunkText.length % 7) * 0.01;
    const score = matches > 0 ? 0.65 + baseScore * 0.3 + variance : 0.45 + variance;
    return Math.min(0.99, Math.max(0.2, parseFloat(score.toFixed(2))));
  };

  const handleSearchQuerySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);

    try {
      // 1. Submit the query to the server database backend logs
      await onExecuteQuery(searchQuery);

      // 2. Perform local matching with visual chunks for state visualizer
      const results: RetrievedChunk[] = processedChunks.map((chunk) => {
        const score = calculateMockSimilarity(chunk.fullText, searchQuery);
        return {
          id: `chunk-${chunk.id.toString().padStart(2, '0')}`,
          documentTitle: docTitle || 'Ingested Workspace Source',
          content: chunk.fullText,
          score,
        };
      });

      // Sort by similarity score descending
      results.sort((a, b) => b.score - a.score);

      // Take Top-K target neighbors (e.g. max 3)
      setSimulatedResults(results.slice(0, 3));
      setHasQueried(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load a document from the real database knowledge base into the active chunker workspace
  const handleLoadDocumentToWorkspace = (doc: RagDocument) => {
    setSourceText(doc.content);
    setDocTitle(doc.title);
    calculateChunks(doc.content, chunkSize, chunkOverlap);
  };

  // Action to save the current workspace source text as a permanent document in the database
  const handleSaveWorkspaceToDatabase = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    try {
      const generatedTitle = docTitle.trim() || `Workspace_${Date.now().toString().slice(-4)}`;
      await onAddDocument(generatedTitle, sourceText);
      setIsAddingDoc(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Traditional Ingest File submission from Knowledge Base Corpus
  const handleIndexCorpusDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!corpusTitle.trim() || !corpusContent.trim()) return;
    setIsLoading(true);
    try {
      await onAddDocument(corpusTitle, corpusContent);
      setCorpusTitle('');
      setCorpusContent('');
      setIsAddingDoc(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Grounded context highlight generator
  const renderHighlightedGroundedExcerpt = (text: string, query: string) => {
    if (!query) return <span>"{text}"</span>;
    const words: string[] = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
    if (words.length === 0) return <span>"{text}"</span>;

    const escapedWords = words.map((w) => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
      <span className="text-slate-700 leading-relaxed text-xs">
        "
        {parts.map((part, i) => {
          const isMatch = words.some((w) => w.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={i} className="bg-emerald-100 text-emerald-900 border-b border-emerald-300 px-0.5 rounded font-medium">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
        "
      </span>
    );
  };

  // Token calculations
  const estTokensPerChunk = Math.ceil(chunkSize / 4);
  const topKPayload = estTokensPerChunk * 3;
  const budgetCapacity = 8192;
  const budgetPercentage = Math.min(100, Math.round((topKPayload / budgetCapacity) * 100));

  // Visual background alternates for adjacent chunks
  const borderColors = [
    'border-indigo-200 dark:border-indigo-900',
    'border-sky-200 dark:border-sky-900',
    'border-teal-200 dark:border-teal-900',
    'border-purple-200 dark:border-purple-900',
  ];

  const dotColors = [
    'bg-indigo-500',
    'bg-sky-500',
    'bg-teal-500',
    'bg-purple-500',
  ];

  return (
    <div id="rag-studio-view" className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            RAG Transparency Engine
          </span>
          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Developer Sandbox
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">RAG Studio & Vector Visualizer</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Step-by-step document parsing, sliding-window chunk overlap traces, and real-time semantic Top-K neighbors scoring.
        </p>
      </div>

      {/* RAG Dual Panel Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Ingestion & Chunking (5 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Ingestion & Chunking
                  </h3>
                  <p className="text-[10px] text-slate-500">Slice raw document strings into token chunks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase">
                  Sliding Window
                </span>
              </div>
            </div>

            {/* Document Title input for reference */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Workspace Source Document Title
              </label>
              <input
                id="workspace-doc-title"
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Title (e.g. Grocery Margin SOP)"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 font-semibold bg-slate-50/50"
              />
            </div>

            {/* Ingestion Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Raw Source Text Content
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sourceText.length} characters
                </span>
              </div>
              <textarea
                id="chunking-source-textarea"
                rows={8}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste raw guidelines, policy articles or documentation strings here..."
                className="w-full text-xs p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 bg-slate-50/50 font-normal leading-relaxed resize-none"
              />
            </div>

            {/* Sliders Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              {/* Chunk Size Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                  <span className="uppercase tracking-wider">Chunk Size</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                    {chunkSize} chars
                  </span>
                </div>
                <input
                  id="chunk-size-slider"
                  type="range"
                  min="100"
                  max="1000"
                  value={chunkSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setChunkSize(val);
                    // Automatically clamp overlap to fit safely inside the chunk size
                    if (chunkOverlap > Math.floor(val / 2.5)) {
                      setChunkOverlap(Math.floor(val / 2.5));
                    }
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-slate-400 leading-none">
                  Character split size per block.
                </p>
              </div>

              {/* Chunk Overlap Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                  <span className="uppercase tracking-wider">Chunk Overlap</span>
                  <span className="font-mono text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                    {chunkOverlap} chars
                  </span>
                </div>
                <input
                  id="chunk-overlap-slider"
                  type="range"
                  min="0"
                  max="200"
                  value={chunkOverlap}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    // Prevent overlap from matching or exceeding chunk size boundary limits
                    const maxOverlap = Math.floor(chunkSize / 2.5);
                    setChunkOverlap(Math.min(val, maxOverlap));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[9px] text-slate-400 leading-none">
                  Overlap with surrounding blocks.
                </p>
              </div>
            </div>

            {/* Process Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="process-document-btn"
                onClick={handleProcessDocument}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all duration-150 shadow-md shadow-indigo-600/10"
              >
                <Cpu className="w-4 h-4" />
                <span>Process Document</span>
              </button>
              <button
                id="save-to-corpus-btn"
                onClick={handleSaveWorkspaceToDatabase}
                disabled={isLoading || !sourceText.trim()}
                title="Save this workspace text permanently to the database Knowledge Base"
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all duration-150 bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
              >
                <Database className="w-4 h-4 text-slate-500" />
                <span>Save to Corpus</span>
              </button>
            </div>
          </div>

          {/* Visual Chunk Slices Output Section */}
          <div className="pt-6 border-t border-slate-100 mt-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Computed Segmented Blocks ({processedChunks.length} Chunks)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                Overlap: {Math.min(chunkOverlap, Math.floor(chunkSize / 2.5))} chars
              </span>
            </div>

            {processedChunks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl p-4">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-semibold text-slate-600">No chunks calculated</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click "Process Document" to slice text content.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
                {processedChunks.map((chunk, idx) => {
                  const bColor = borderColors[idx % borderColors.length];
                  const dColor = dotColors[idx % dotColors.length];
                  return (
                    <div
                      key={chunk.id}
                      id={`visual-chunk-card-${chunk.id}`}
                      className={`border ${bColor} rounded-xl p-4 space-y-3.5 bg-white shadow-xs hover:shadow-sm transition-all duration-150 relative overflow-hidden`}
                    >
                      {/* Chunk Header bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dColor}`}></span>
                          <span className="text-xs font-bold text-slate-800">Chunk #{chunk.id.toString().padStart(2, '0')}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                          chars {chunk.start} – {chunk.end}
                        </span>
                      </div>

                      {/* Code-like visual highlights box */}
                      <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 text-[11px] font-mono leading-relaxed whitespace-pre-wrap select-text">
                        {/* Overlap Preceding segment indicator */}
                        {chunk.prevOverlap && (
                          <span
                            className="bg-amber-50 text-amber-800 border border-dashed border-amber-200 rounded px-1 py-0.5 inline-block mr-1 my-0.5 cursor-help"
                            title={`Overlap matching Chunk #${(chunk.id - 1).toString().padStart(2, '0')} suffix`}
                          >
                            <span className="text-[7.5px] font-sans font-bold uppercase tracking-wider block text-amber-500 mb-0.5 leading-none">
                              Prev Overlap
                            </span>
                            {chunk.prevOverlap}
                          </span>
                        )}

                        {/* Middle unique text block */}
                        {chunk.mainText && (
                          <span className="text-slate-800 text-[11px] leading-relaxed">
                            {chunk.mainText}
                          </span>
                        )}

                        {/* Overlap Succeeding segment indicator */}
                        {chunk.nextOverlap && (
                          <span
                            className="bg-amber-50 text-amber-800 border border-dashed border-amber-200 rounded px-1 py-0.5 inline-block ml-1 my-0.5 cursor-help"
                            title={`Overlap matching Chunk #${(chunk.id + 1).toString().padStart(2, '0')} prefix`}
                          >
                            <span className="text-[7.5px] font-sans font-bold uppercase tracking-wider block text-amber-500 mb-0.5 leading-none">
                              Next Overlap
                            </span>
                            {chunk.nextOverlap}
                          </span>
                        )}
                      </div>

                      {/* Segment Stats indicator */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Segment length: {chunk.fullText.length} chars</span>
                        <span>Estimated tokens: {Math.ceil(chunk.fullText.length / 4)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Vector Retrieval & Grounding (7 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Vector Retrieval & Grounding
                  </h3>
                  <p className="text-[10px] text-slate-500">Query and isolate top matching contexts</p>
                </div>
              </div>
              <span className="text-[9px] font-mono bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 rounded-md uppercase font-bold">
                Semantic Match
              </span>
            </div>

            {/* Query Form */}
            <form onSubmit={handleSearchQuerySubmit} className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Query the Knowledge Base
              </label>
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="query-kb-input"
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Query standard pricing policies, SLA hours..."
                    className="w-full text-xs pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 bg-slate-50/50 font-medium"
                  />
                </div>
                <button
                  id="query-kb-submit-btn"
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="flex items-center justify-center gap-1.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all duration-150 disabled:opacity-50 shrink-0"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 fill-current text-indigo-400" />
                  )}
                  <span>Query</span>
                </button>
              </div>
            </form>

            {/* Simulated Retrieval Metrics Block */}
            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-3.5 font-mono text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="font-bold text-slate-300">Retrieval Engine Status</span>
                </div>
                <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900">
                  ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vector Dimension:</span>
                  <span className="text-slate-300">1536 (Float32)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score Metric:</span>
                  <span className="text-slate-300">Cosine Dist</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Similarity Cutoff:</span>
                  <span className="text-emerald-400">0.70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Search Strategy:</span>
                  <span className="text-indigo-400">HNSW Index</span>
                </div>
                <div className="flex justify-between col-span-2 border-t border-slate-800/60 pt-2 mt-1">
                  <span className="text-slate-500">Query Retrieval Latency:</span>
                  <span className="text-amber-400 font-semibold">12.4 ms (Simulated)</span>
                </div>
              </div>
            </div>

            {/* Top-K Nearest Neighbors Results List */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                Top-K Nearest Neighbors Result List (Sorted by Similarity)
              </span>

              {!hasQueried ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Playground Query Idle</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Type a phrase (e.g. "margins" or "SLA SLA refund") above and click Query to compute top visual matches.
                  </p>
                </div>
              ) : simulatedResults.length === 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center text-xs text-rose-700 italic">
                  No matching visual chunks computed. Please process some source document text first!
                </div>
              ) : (
                <div className="space-y-3 max-h-[16rem] overflow-y-auto pr-1">
                  {simulatedResults.map((res, index) => (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl space-y-2.5 hover:bg-emerald-50/50 transition-all duration-100 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold rounded-md">
                            #{res.id}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-600 truncate max-w-[12rem]">
                            {res.documentTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                            Sim Score: {res.score.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Excerpt with Grounded Highlights inside Green container */}
                      <div className="p-3 bg-white border border-emerald-100/60 rounded-lg text-xs leading-normal">
                        <div className="text-[8.5px] font-sans font-bold uppercase tracking-wider text-emerald-600 mb-1 leading-none">
                          🌱 Grounded Context Excerpt
                        </div>
                        {renderHighlightedGroundedExcerpt(res.content, searchQuery)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Budget Indicator Capacity Section */}
          <div className="pt-6 border-t border-slate-100 mt-6 space-y-3.5 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                Total Context Window Token Budget
              </span>
              <span className="font-mono text-indigo-600">
                {budgetPercentage}% Utilized
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  budgetPercentage > 60
                    ? 'bg-amber-500'
                    : budgetPercentage > 85
                    ? 'bg-rose-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-slate-500 font-mono text-[9.5px]">
              <div className="p-2 bg-white rounded-lg border border-slate-200/50">
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wide text-[8px]">Chunk Avg</span>
                <span className="font-bold text-slate-800">{estTokensPerChunk} tokens</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/50">
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wide text-[8px]">Top-3 Payload</span>
                <span className="font-bold text-slate-800">{topKPayload} tokens</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/50">
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wide text-[8px]">Max Capacity</span>
                <span className="font-bold text-indigo-600">{budgetCapacity} tokens</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Persistent Documents Database Section */}
      <div id="persistent-corpus-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Persistent Knowledge Base Registry
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical document files synchronized with the backend Vector Store and Cloud Firestore corpus index.
            </p>
          </div>

          <button
            id="toggle-corpus-add-btn"
            onClick={() => setIsAddingDoc(!isAddingDoc)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all duration-150 border border-indigo-100"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Document to DB</span>
          </button>
        </div>

        {/* Database Ingest Form */}
        <AnimatePresence>
          {isAddingDoc && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleIndexCorpusDocument}
              className="space-y-4 overflow-hidden mb-6 pb-6 border-b border-slate-100 bg-slate-50/50 p-4 rounded-xl border border-slate-200"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Index New File in permanent datastore</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    File Title
                  </label>
                  <input
                    id="corpus-doc-title"
                    type="text"
                    required
                    value={corpusTitle}
                    onChange={(e) => setCorpusTitle(e.target.value)}
                    placeholder="e.g. Refund policy parameters"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    File Content Text
                  </label>
                  <textarea
                    id="corpus-doc-content"
                    required
                    rows={2}
                    value={corpusContent}
                    onChange={(e) => setCorpusContent(e.target.value)}
                    placeholder="Provide full text corpus paragraphs to build embeddings database..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 bg-white font-normal leading-relaxed resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  id="cancel-corpus-add-btn"
                  type="button"
                  onClick={() => setIsAddingDoc(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  id="submit-corpus-add-btn"
                  type="submit"
                  disabled={isLoading || !corpusTitle.trim() || !corpusContent.trim()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Index & Chunk Now</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Database List layout */}
        {documents.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl p-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Knowledge Base Corpus is empty</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Use the "Save to Corpus" button or ingest a custom file to save items permanently.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                id={`corpus-card-${doc.id}`}
                className="p-4 border border-slate-200 rounded-xl space-y-3 hover:border-indigo-200 hover:shadow-xs transition-all duration-150 bg-slate-50/30 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-800 truncate">{doc.title}</h4>
                    </div>
                    <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                      Sync OK
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-3">
                    {doc.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                    <span>{doc.chunks?.length || 0} chunks</span>
                    <span>•</span>
                    <span>1,536 dims</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`load-doc-${doc.id}`}
                      onClick={() => handleLoadDocumentToWorkspace(doc)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline"
                      title="Load into Sandbox Chunking view"
                    >
                      <span>Load into Visualizer</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      id={`delete-corpus-doc-${doc.id}`}
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-all duration-150"
                      title="Delete permanent index"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
