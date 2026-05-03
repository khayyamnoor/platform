import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeFile, sendChatMessage } from './services/geminiService';
// FIXED: Use relative path ./ instead of @/ to prevent module resolution errors
import { processFileForAnalysis } from './services/fileProcessing';
import { AnalysisResult, ChatMessage, HistoryItem, SupplierAnalysisData } from './types';
import { ContractDashboard } from './components/ContractDashboard';
import { ChatInterface } from './components/ChatInterface';
import { HistorySidebar } from './components/HistorySidebar';
import { SupplierComparison } from './components/SupplierComparison';
import { addToHistory, getHistory, clearHistory } from './services/historyService';
import { LEGAL_AGENT_INSTRUCTION, SOURCING_AGENT_INSTRUCTION } from './constants';
import { useLanguage } from './LanguageContext';
import { Language } from './translations';
import { 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2, 
  FileType, 
  Cpu, 
  ShieldCheck,
  Binary,
  Scale,
  MessageSquare,
  Layout,
  History,
  ShoppingCart,
  Briefcase,
  ExternalLink,
  Search,
  FileSpreadsheet,
  Globe
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  base64: string; 
  mimeType: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  result?: AnalysisResult;
  errorMessage?: string;
}

type Tab = 'ANALYZER' | 'LEGAL' | 'SOURCING';

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [activeTab, setActiveTab] = useState<Tab>('ANALYZER');
  
  // State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Analyzer Mode State
  const [analysisMode, setAnalysisMode] = useState<'CONTRACT' | 'SUPPLIER'>('SUPPLIER');
  const [sourcingQuery, setSourcingQuery] = useState('');
  const [legalQuery, setLegalQuery] = useState('');
  const [sourcingView, setSourcingView] = useState<'CHAT' | 'COMPARE'>('CHAT');

  // Chat Histories
  const [legalMessages, setLegalMessages] = useState<ChatMessage[]>([]);
  const [sourcingMessages, setSourcingMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);

  // History Sidebar State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);

  // Load History on Mount
  useEffect(() => {
    setSearchHistory(getHistory());
  }, []);

  // --- History Helpers ---
  const saveToHistory = (item: HistoryItem) => {
    const updated = addToHistory(item);
    setSearchHistory(updated);
  };

  const handleClearHistory = () => {
    clearHistory();
    setSearchHistory([]);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.type === 'ANALYSIS') {
      setActiveTab('ANALYZER');
    } else if (item.type === 'LAWYER_QUERY') {
      setActiveTab('LEGAL');
    } else if (item.type === 'AGENT_QUERY') {
      setActiveTab('SOURCING');
    }
    setIsHistoryOpen(false);
  };

  // --- File Handling ---
  const handleFiles = async (newFiles: File[]) => {
    const processedFiles: UploadedFile[] = [];
    for (const file of newFiles) {
      try {
        // Use central processing service for extracting text/base64
        const { data, mimeType } = await processFileForAnalysis(file);
        
        processedFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          base64: data, // Stores Base64 for PDF/Images, OR Raw Text for Docx/Excel
          mimeType: mimeType,
          status: 'pending'
        });
      } catch (err) {
        console.error("Error processing file", err);
        alert(`Failed to process ${file.name}. Please try another file.`);
      }
    }
    setFiles(prev => [...prev, ...processedFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    await handleFiles(droppedFiles);
  }, []);

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleAnalyzeAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setFiles(prev => prev.map(f => (f.status === 'pending' || f.status === 'error') ? { ...f, status: 'analyzing', errorMessage: undefined } : f));

    for (const fileItem of pendingFiles) {
      try {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'analyzing' } : f));
        // Use the selected analysis mode
        const data = await analyzeFile(fileItem.base64, fileItem.mimeType, analysisMode, fileItem.file.name);
        
        // Save to History
        saveToHistory({
          id: Date.now().toString(),
          type: 'ANALYSIS',
          query: fileItem.file.name,
          timestamp: new Date().toISOString(),
          details: analysisMode === 'CONTRACT' ? t.legalReview : t.supplierAnalysis
        });

        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'done', result: data } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', errorMessage: err.message } : f));
      }
    }
  };

  // --- Chat Handling ---
  const handleSendMessage = async (text: string, mode: 'LEGAL' | 'SOURCING') => {
    setIsChatProcessing(true);
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    if (mode === 'LEGAL') setLegalMessages(prev => [...prev, newMessage]);
    else setSourcingMessages(prev => [...prev, newMessage]);

    // Save Query to History
    saveToHistory({
      id: Date.now().toString(),
      type: mode === 'LEGAL' ? 'LAWYER_QUERY' : 'AGENT_QUERY',
      query: text,
      timestamp: new Date().toISOString()
    });

    try {
      // Prepare context files (pass name to help context)
      const contextFiles = files.map(f => ({ 
        base64: f.base64, 
        mimeType: f.mimeType,
        name: f.file.name
      }));
      const history = mode === 'LEGAL' ? legalMessages : sourcingMessages;
      const systemPrompt = mode === 'LEGAL' ? LEGAL_AGENT_INSTRUCTION : SOURCING_AGENT_INSTRUCTION;

      const responseText = await sendChatMessage(text, history, systemPrompt, contextFiles);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: new Date()
      };

      if (mode === 'LEGAL') setLegalMessages(prev => [...prev, botMessage]);
      else setSourcingMessages(prev => [...prev, botMessage]);

    } catch (err) {
      console.error(err);
    } finally {
      setIsChatProcessing(false);
    }
  };

  const handleQuickSourcing = () => {
    if (!sourcingQuery.trim()) return;
    setActiveTab('SOURCING');
    // We send a specially crafted prompt to the sourcing agent
    handleSendMessage(`Find verified Tunisian suppliers for: ${sourcingQuery}. Provide a structured list.`, 'SOURCING');
    setSourcingQuery('');
  };

  const handleQuickLegal = () => {
    if (!legalQuery.trim()) return;
    setActiveTab('LEGAL');
    handleSendMessage(legalQuery, 'LEGAL');
    setLegalQuery('');
  };

  // --- Render Views ---
  const renderAnalyzer = () => {
    const completedFiles = files.filter(f => f.status === 'done' && f.result);
    
    // Only show the dashboard if there are completed files and NO pending or analyzing files
    if (completedFiles.length > 0 && files.filter(f => f.status === 'pending' || f.status === 'analyzing').length === 0) {
      return (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layout className="w-5 h-5 text-brand-400" /> {t.dashboardTitle}
             </h2>
             <div className="flex gap-4">
               <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-brand-400 hover:text-brand-300">+ {t.addPdf}</button>
               <button onClick={() => setFiles([])} className="text-sm text-slate-400 hover:text-white">{t.reset}</button>
             </div>
          </div>
          <ContractDashboard results={completedFiles.map(f => f.result!)} onReset={() => setFiles([])} onAddMore={() => fileInputRef.current?.click()} />
          
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx,.xls,.csv"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(Array.from(e.target.files));
            }}
          />
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto pt-10 animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-brand-400 to-brand-600 mb-4 drop-shadow-sm">
            {t.appSubtitle}
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed tracking-wide">
             {t.appTitle} • {t.tagline}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center mb-8">
           <div className="bg-slate-900 p-1 rounded-xl border border-white/10 inline-flex shadow-lg shadow-black/40">
              <button
                onClick={() => setAnalysisMode('SUPPLIER')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                   analysisMode === 'SUPPLIER' 
                   ? 'bg-brand-600 text-white shadow-lg' 
                   : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                 <ShoppingCart className="w-4 h-4" />
                 {t.supplierAnalysis}
              </button>
              <button
                onClick={() => setAnalysisMode('CONTRACT')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                   analysisMode === 'CONTRACT' 
                   ? 'bg-blue-600 text-white shadow-lg' 
                   : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                 <Briefcase className="w-4 h-4" />
                 {t.legalReview}
              </button>
           </div>
        </div>

        {/* Drop Zone */}
        <div 
          className={`relative group rounded-2xl transition-all duration-300 ease-out border-2 border-dashed
            ${isDragging 
              ? 'border-brand-500 bg-brand-500/10 scale-[1.01] shadow-2xl shadow-brand-500/20' 
              : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx,.xls,.csv"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(Array.from(e.target.files));
            }}
          />

          <div className="h-48 flex flex-col items-center justify-center p-8 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className={`p-4 rounded-full mb-4 transition-all duration-300 ${isDragging ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-slate-300 font-medium mb-1">
               {analysisMode === 'SUPPLIER' ? t.uploadSupplierDesc : t.uploadContractDesc}
            </p>
            <p className="text-slate-500 text-xs">{t.supportedFiles}</p>
          </div>
        </div>

        {/* Description-Based Sourcing Input (Mode B) */}
        {analysisMode === 'SUPPLIER' && (
          <div className="mt-8 max-w-xl mx-auto animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-px bg-slate-800 flex-1" />
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.orSourceDesc}</span>
               <div className="h-px bg-slate-800 flex-1" />
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-brand-500/10 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass-card p-1.5 rounded-xl flex items-center gap-2 border border-brand-500/20">
                <div className="p-3 bg-slate-900 rounded-lg text-brand-400">
                   <Search className="w-5 h-5" />
                </div>
                <input 
                   type="text" 
                   value={sourcingQuery}
                   onChange={(e) => setSourcingQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleQuickSourcing()}
                   placeholder={t.sourcePlaceholder}
                   className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600 focus:outline-none px-2"
                />
                <button 
                   onClick={handleQuickSourcing}
                   disabled={!sourcingQuery.trim()}
                   className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg transition-all shadow-lg shadow-brand-500/20"
                >
                   {t.findBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Description-Based Legal Input (Mode A) */}
        {analysisMode === 'CONTRACT' && (
          <div className="mt-8 max-w-xl mx-auto animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-px bg-slate-800 flex-1" />
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.orAskLegal}</span>
               <div className="h-px bg-slate-800 flex-1" />
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass-card p-1.5 rounded-xl flex items-center gap-2 border border-indigo-500/20">
                <div className="p-3 bg-slate-900 rounded-lg text-indigo-400">
                   <MessageSquare className="w-5 h-5" />
                </div>
                <input 
                   type="text" 
                   value={legalQuery}
                   onChange={(e) => setLegalQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleQuickLegal()}
                   placeholder={t.askLegalPlaceholder}
                   className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600 focus:outline-none px-2"
                />
                <button 
                   onClick={handleQuickLegal}
                   disabled={!legalQuery.trim()}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                   {t.askBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-3 pb-20">
            {files.map((file) => (
              <div key={file.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  file.mimeType.includes('pdf') ? 'bg-red-500/10 text-red-400' : 
                  file.mimeType.includes('word') || file.file.name.endsWith('.docx') ? 'bg-blue-500/10 text-blue-400' :
                  file.mimeType.includes('sheet') || file.file.name.endsWith('.xlsx') ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-slate-700/50 text-slate-400'
                }`}>
                  {file.mimeType.includes('pdf') ? <FileType className="w-5 h-5" /> : 
                   file.file.name.endsWith('.xlsx') ? <FileSpreadsheet className="w-5 h-5" /> :
                   file.file.name.endsWith('.docx') ? <FileText className="w-5 h-5" /> :
                   <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-200 truncate text-sm">{file.file.name}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   {file.status === 'analyzing' && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
                   {file.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                   {file.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                   {file.status === 'pending' && (
                      <button onClick={() => removeFile(file.id)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                   )}
                </div>
              </div>
            ))}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={handleAnalyzeAll}
                disabled={files.some(f => f.status === 'analyzing') || files.every(f => f.status === 'done')}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {files.some(f => f.status === 'analyzing') ? <Loader2 className="w-4 h-4 animate-spin"/> : <Cpu className="w-4 h-4" />}
                {analysisMode === 'SUPPLIER' ? t.runSupplierAnalysis : t.runContractAnalysis}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-hidden font-sans" dir={dir}>
      
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-600/5 blur-[100px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
      </div>

      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={searchHistory}
        onClear={handleClearHistory}
        onSelect={handleHistorySelect}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 glass-panel border-b border-brand-500/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-tr from-brand-600 to-yellow-500 p-2 rounded shadow-lg shadow-brand-500/20">
              <Binary className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-white font-serif">{t.appTitle}</h1>
              <span className="text-[9px] text-brand-400 uppercase tracking-widest font-mono">{t.appSubtitle}</span>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTab('ANALYZER')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'ANALYZER' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layout className="w-4 h-4" />
              {t.intelligence}
            </button>
            <button
              onClick={() => setActiveTab('LEGAL')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'LEGAL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4" />
              {t.legalGuardian}
            </button>
            <button
              onClick={() => setActiveTab('SOURCING')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'SOURCING' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {t.sourcing}
            </button>
            <a
              href="https://procureai-web-eevq.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              {t.launchpad}
            </a>
            
            {/* Language Selector */}
            <div className="relative group ml-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-all bg-slate-800/50">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{language}</span>
              </button>
              <div className="absolute right-0 mt-1 w-24 bg-slate-800 border border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => setLanguage('en')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${language === 'en' ? 'text-brand-400' : 'text-slate-300'}`}>English</button>
                <button onClick={() => setLanguage('fr')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${language === 'fr' ? 'text-brand-400' : 'text-slate-300'}`}>Français</button>
                <button onClick={() => setLanguage('ar')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${language === 'ar' ? 'text-brand-400' : 'text-slate-300'}`}>العربية</button>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsHistoryOpen(true)}
               className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
               title={t.historyTitle}
             >
               <History className="w-5 h-5" />
               <span className="hidden md:inline text-xs font-mono">{t.history}</span>
             </button>
             <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 border-l border-white/10 pl-3">
                <span>{t.poweredBy}</span>
                <span className="text-brand-400 font-bold">{t.creators}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* Global File Context Indicator */}
        {files.length > 0 && activeTab !== 'ANALYZER' && (
          <div className="mb-6 p-3 bg-slate-900/50 border border-brand-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                 {files.slice(0, 3).map(f => (
                   <div key={f.id} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 relative z-0">
                      <FileText className="w-4 h-4" />
                   </div>
                 ))}
              </div>
              <div className="text-sm text-slate-300">
                <span className="font-bold text-white">{files.length}</span> {t.filesLoaded}
              </div>
            </div>
            <button onClick={() => setActiveTab('ANALYZER')} className="text-xs text-brand-400 hover:text-brand-300 underline">{t.manageFiles}</button>
          </div>
        )}

        {/* Views */}
        {activeTab === 'ANALYZER' && renderAnalyzer()}

        {activeTab === 'LEGAL' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
             <ChatInterface 
                mode="LAWYER"
                messages={legalMessages}
                onSendMessage={(txt) => handleSendMessage(txt, 'LEGAL')}
                isProcessing={isChatProcessing}
                hasFiles={files.length > 0}
             />
          </div>
        )}

        {activeTab === 'SOURCING' && (() => {
          const supplierResults = files.filter(f => f.status === 'done' && f.result?.type === 'SUPPLIER').map(f => f.result as SupplierAnalysisData);

          return (
            <div className="animate-fade-in max-w-5xl mx-auto">
              {supplierResults.length > 0 && (
                <div className="flex justify-center mb-6">
                  <div className="bg-slate-900 p-1 rounded-xl border border-white/10 inline-flex shadow-lg shadow-black/40">
                    <button
                      onClick={() => setSourcingView('CHAT')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        sourcingView === 'CHAT' 
                        ? 'bg-brand-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {t.chatAgent}
                    </button>
                    <button
                      onClick={() => setSourcingView('COMPARE')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        sourcingView === 'COMPARE' 
                        ? 'bg-emerald-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Layout className="w-4 h-4" />
                      {t.compareSuppliers}
                    </button>
                  </div>
                </div>
              )}

              {sourcingView === 'CHAT' || supplierResults.length === 0 ? (
                <div className="max-w-4xl mx-auto">
                  <ChatInterface 
                    mode="AGENT"
                    messages={sourcingMessages}
                    onSendMessage={(txt) => handleSendMessage(txt, 'SOURCING')}
                    isProcessing={isChatProcessing}
                    hasFiles={files.length > 0}
                  />
                </div>
              ) : (
                <SupplierComparison suppliers={supplierResults} />
              )}
            </div>
          );
        })()}

      </main>
    </div>
  );
}