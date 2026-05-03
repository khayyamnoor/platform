
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BusinessFields, 
  ChatMessage, 
  REQUIRED_FIELD_LABELS,
  RadarDataPoint
} from './types';
import { gemini } from './geminiService';
import { 
  CheckCircle2, 
  Circle, 
  Send, 
  FileText, 
  BarChart3, 
  Info, 
  AlertCircle,
  Loader2,
  Paperclip,
  X,
  TrendingUp,
  DollarSign,
  Cpu,
  Layers,
  ArrowRight,
  Zap,
  Target,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  Download,
  Fingerprint,
  Search,
  Activity,
  ShieldCheck,
  Globe,
  Compass,
  Swords,
  Scale,
  Lock,
  Gavel,
  ShieldEllipsis
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const INITIAL_FIELDS: BusinessFields = {
  businessIdea: null,
  productService: null,
  targetCustomer: null,
  problemSolved: null,
  location: null,
  revenueModel: null,
  competitors: null,
  uniqueAdvantage: null,
  monthlyCosts: null,
  monthlyRevenue: null,
};

interface ReportSection {
  title: string;
  content: string[];
}

const App: React.FC = () => {
  const [fields, setFields] = useState<BusinessFields>(INITIAL_FIELDS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi Sophie, what are your studies today?\n\nForensic Core Engaged. I am your Strategic Audit Interface. To execute a deep-tissue feasibility synthesis, I require verification of 10 mission-critical vectors.\n\nInitiate Protocol: Please define the core thesis of your enterprise.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [radarData, setRadarData] = useState<RadarDataPoint[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{title: string, detail: string} | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMsg = input.trim() || (selectedFile ? `VECTOR INGESTED: ${selectedFile.name}` : "");
    const currentInput = input;
    const currentFile = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
      let filePayload = undefined;
      if (currentFile) {
        const base64 = await fileToBase64(currentFile);
        filePayload = { data: base64, mimeType: currentFile.type };
      }

      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const result = await gemini.processInput(currentInput, history, fields, filePayload);
      
      setFields(result.fields);
      setMessages(prev => [...prev, { role: 'assistant', content: result.message, timestamp: Date.now() }]);
      
      if (result.isReadyForAnalysis && result.analysisReport) {
        setReport(result.analysisReport);
        setRadarData(result.radarData || [
          { subject: 'Entry Barriers', A: 88, B: 35, fullMark: 100 },
          { subject: 'Regulatory Moat', A: 75, B: 20, fullMark: 100 },
          { subject: 'Innovation', A: 90, B: 40, fullMark: 100 },
          { subject: 'Scalability', A: 95, B: 55, fullMark: 100 },
          { subject: 'Compliance Cap', A: 65, B: 30, fullMark: 100 },
          { subject: 'Unit Economics', A: 82, B: 50, fullMark: 100 },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "CRITICAL FAULT: Logic sequence interrupted in forensic engine. Re-initialize input vector.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (title: string, detail: string) => {
    setIsScanning(true);
    setSelectedItem({ title, detail });
    setTimeout(() => setIsScanning(false), 800);
  };

  const handleExportPDF = async () => {
    if (!reportContainerRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(reportContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#020617',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Forensic_Deep_Market_Audit_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Forensic Export failed", err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const reportSections = useMemo(() => {
    if (!report) return [];
    const lines = report.split('\n');
    const sections: ReportSection[] = [];
    let currentSection: ReportSection | null = null;

    lines.forEach(line => {
      if (line.startsWith('### ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: line.replace('### ', '').trim(), content: [] };
      } else if (currentSection && line.trim()) {
        currentSection.content.push(line);
      }
    });
    if (currentSection) sections.push(currentSection);
    return sections;
  }, [report]);

  const completedCount = Object.values(fields).filter(val => val !== null).length;
  const progressPercent = (completedCount / 10) * 100;

  const revenue = fields.monthlyRevenue || 0;
  const costs = fields.monthlyCosts || 0;
  const profit = revenue - costs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const summaryBarData = [
    { name: 'Audit Topology', Revenue: revenue, Costs: costs }
  ];

  const pieData = [
    { name: 'Regulatory Burn', value: costs * 0.15, color: '#f43f5e' }, // Hypothesized regulatory cost %
    { name: 'Core Operations', value: costs * 0.85, color: '#6366f1' },
    { name: 'Capital Yield', value: Math.max(0, profit), color: '#22d3ee' }
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden text-slate-200">
      
      {/* Sidebar - Forensic Status */}
      <aside className="w-full lg:w-96 glass-panel border-r border-white/5 flex flex-col h-auto lg:h-full z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <Fingerprint size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tighter text-white uppercase leading-none text-glow">INTELLIFEASIBLE</h1>
              <span className="text-[10px] font-bold text-cyan-400/80 tracking-widest uppercase">Forensic Audit Unit v7.0</span>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Logic Vector Verification</span>
              <span className="text-sm font-black text-white">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-1.5 p-0.5 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-4 custom-scrollbar overflow-y-auto pr-2" style={{ maxHeight: '40vh' }}>
            {(Object.keys(REQUIRED_FIELD_LABELS) as Array<keyof BusinessFields>).map((key) => (
              <div key={key} className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${fields[key] !== null ? 'bg-white/5 border border-white/10' : 'opacity-40'}`}>
                <div className="mt-0.5">
                  {fields[key] !== null ? (
                    <CheckCircle2 size={16} className="text-cyan-400" />
                  ) : (
                    <Circle size={16} className="text-slate-600" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {REQUIRED_FIELD_LABELS[key]}
                  </span>
                  <span className={`text-xs mt-1 truncate font-medium ${fields[key] !== null ? 'text-white' : 'text-slate-600 italic'}`}>
                    {fields[key] !== null ? (typeof fields[key] === 'number' ? `$${fields[key].toLocaleString()}` : fields[key]) : 'Verification Required'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(fields.monthlyCosts !== null && fields.monthlyRevenue !== null) && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Friction IQ</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-400/10 text-indigo-400`}>
                  HIGH MOAT
                </span>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Terminal Area */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Intelligence Feed */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] lg:max-w-[70%] group relative ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl rounded-tr-none shadow-xl shadow-indigo-900/20' 
                  : 'glass-panel rounded-2xl rounded-tl-none p-5'
              } p-5 transition-all duration-500 hover:shadow-2xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${msg.role === 'user' ? 'bg-white' : 'bg-cyan-400 animate-pulse'}`}></div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${msg.role === 'user' ? 'text-white/70' : 'text-cyan-400/80'}`}>
                    {msg.role === 'user' ? 'VECTOR TRANSMISSION' : 'ANALYTIC RESPONSE'}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'font-medium' : 'font-light text-slate-300'}`}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="glass-panel rounded-2xl p-5 rounded-tl-none flex items-center gap-4">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executing Forensic Pipeline...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Deep Forensic Audit Synthesis Overlay */}
        {report && (
          <div className="absolute inset-0 bg-[#020617]/99 backdrop-blur-3xl z-50 overflow-y-auto p-4 lg:p-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
              
              <div className="flex-1 space-y-12 pb-32" id="report-main-content" ref={reportContainerRef}>
                <div className="flex justify-between items-center border-b border-white/10 pb-12">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)] relative">
                       <Activity size={40} className="text-white animate-pulse" />
                       <div className="absolute inset-0 rounded-[32px] border-2 border-white/20 animate-ping"></div>
                    </div>
                    <div>
                      <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">STRATEGIC FORENSIC AUDIT</h2>
                      <p className="text-cyan-400 font-bold text-xs tracking-[0.4em] uppercase mt-3 italic">Market Barriers // Regulatory Compliance // Systemic Risk</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setReport(null); setSelectedItem(null); setFocusedSection(null); }}
                    className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 rounded-2xl border border-white/10 transition-all text-white no-print"
                  >
                    <X size={28} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div 
                    onClick={() => setFocusedSection('Financial Stress-Test & Sensitivity')}
                    className={`glass-panel p-6 rounded-3xl transition-all cursor-pointer hover:bg-white/10 ${focusedSection?.includes('Financial') ? 'ring-2 ring-cyan-400 bg-white/10' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency IQ</span>
                      <TrendingUp className="text-cyan-400" size={14} />
                    </div>
                    <div className="text-4xl font-black text-white mb-1">{margin.toFixed(0)}%</div>
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Burn Durability</div>
                  </div>
                  <div 
                    onClick={() => setFocusedSection('Barriers to Entry')}
                    className={`glass-panel p-6 rounded-3xl transition-all cursor-pointer hover:bg-white/10 ${focusedSection?.toLowerCase().includes('barriers') ? 'ring-2 ring-amber-400 bg-white/10' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Friction</span>
                      <Lock className="text-amber-400" size={14} />
                    </div>
                    <div className="text-4xl font-black text-white mb-1">CRITICAL</div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Moat Density</div>
                  </div>
                  <div 
                    onClick={() => setFocusedSection('Regulatory Considerations')}
                    className={`glass-panel p-6 rounded-3xl transition-all cursor-pointer hover:bg-white/10 ${focusedSection?.toLowerCase().includes('regulatory') ? 'ring-2 ring-rose-400 bg-white/10' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Risk</span>
                      <Scale className="text-rose-400" size={14} />
                    </div>
                    <div className="text-4xl font-black text-white mb-1">AUDIT+</div>
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Legal Hardness</div>
                  </div>
                  <div 
                    onClick={() => setFocusedSection('Final Audit Verdict')}
                    className={`glass-panel p-6 rounded-3xl transition-all cursor-pointer hover:bg-white/10 ${focusedSection?.includes('Verdict') ? 'ring-2 ring-violet-400 bg-white/10' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Survival Score</span>
                      <ShieldCheck className="text-violet-400" size={14} />
                    </div>
                    <div className="text-4xl font-black text-white mb-1">08/10</div>
                    <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Moat Rating</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="glass-panel p-10 rounded-[40px] h-96 relative overflow-hidden group">
                      <h4 className="text-[10px] font-black text-white mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-cyan-400"></div> Economic Sensitivity & Burn Analysis
                      </h4>
                      <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={summaryBarData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" hide />
                          <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                          <Bar dataKey="Revenue" fill="url(#blueGradient)" radius={[10, 10, 0, 0]} barSize={50} />
                          <Bar dataKey="Costs" fill="url(#redGradient)" radius={[10, 10, 0, 0]} barSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="glass-panel p-10 rounded-[40px] h-96 relative group">
                      <h4 className="text-[10px] font-black text-white mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-rose-400"></div> Regulatory Cost Allocation
                      </h4>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                         <Gavel size={240} className="animate-spin-slow" />
                      </div>
                      <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={10}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="space-y-10">
                  {reportSections.map((section, sIdx) => {
                    const isCompetitiveAnalysis = section.title.toLowerCase().includes('competitive') || section.title.toLowerCase().includes('moat') || section.title.toLowerCase().includes('barriers');
                    const isRegulatory = section.title.toLowerCase().includes('regulatory') || section.title.toLowerCase().includes('compliance');
                    
                    return (
                      <div 
                        key={sIdx} 
                        className={`glass-panel p-10 lg:p-14 rounded-[48px] transition-all duration-700 border border-white/5 ${focusedSection === section.title ? 'ring-2 ring-cyan-500 bg-white/5 scale-[1.01] shadow-[0_0_80px_rgba(34,211,238,0.1)]' : 'hover:border-white/20'}`}
                        onClick={() => setFocusedSection(section.title)}
                      >
                        <h3 className="text-2xl font-black text-white mb-12 border-l-8 border-cyan-400 pl-8 uppercase tracking-[0.2em] flex items-center justify-between italic">
                          <span className="flex items-center gap-4">
                             {isRegulatory && <Scale className="text-rose-400" size={24} />}
                             {isCompetitiveAnalysis && !isRegulatory && <Lock className="text-amber-400" size={24} />}
                             {section.title}
                          </span>
                          {focusedSection === section.title && <Zap size={20} className="text-cyan-400 animate-pulse no-print" />}
                        </h3>
                        
                        <div className="flex flex-col lg:flex-row gap-12">
                          <div className="flex-1 space-y-6">
                            {section.content.map((item, iIdx) => {
                              const isListItem = item.trim().startsWith('-');
                              if (isListItem) {
                                const cleanItem = item.replace('-', '').trim();
                                const [title, ...rest] = cleanItem.split(':');
                                const detail = rest.join(':').trim();
                                
                                return (
                                  <div 
                                    key={iIdx} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleItemClick(title.trim(), detail || "Deep-tissue logic extraction required for this forensic vector.");
                                    }}
                                    className={`flex gap-6 p-6 rounded-3xl transition-all cursor-pointer group ${selectedItem?.title === title.trim() ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50' : 'hover:bg-white/5'}`}
                                  >
                                    <div className="mt-1 shrink-0 no-print">
                                      <Compass size={20} className={`transition-all duration-500 group-hover:rotate-45 ${selectedItem?.title === title.trim() ? 'text-cyan-400 scale-125' : 'text-slate-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-md font-black text-white uppercase tracking-[0.2em] block mb-2 italic">
                                        {title.trim()}
                                      </span>
                                      {detail && <p className="text-sm text-slate-400 line-clamp-2 font-light italic leading-relaxed">{detail}</p>}
                                    </div>
                                  </div>
                                );
                              }
                              return <p key={iIdx} className="text-slate-300 text-xl leading-relaxed font-light mb-8 max-w-4xl">{item}</p>;
                            })}
                          </div>

                          {/* Visualization for Competitive or Regulatory Sections */}
                          {isCompetitiveAnalysis && radarData && (
                            <div className="w-full lg:w-[450px] h-[450px] glass-panel rounded-[40px] p-8 border border-white/10 animate-in fade-in zoom-in duration-1000">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                  <div className="w-3 h-0.5 bg-cyan-400"></div> Moat Hardness Matrix
                               </h4>
                               <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                      name="Our Position"
                                      dataKey="A"
                                      stroke="#22d3ee"
                                      fill="#22d3ee"
                                      fillOpacity={0.5}
                                    />
                                    <Radar
                                      name="Market Average"
                                      dataKey="B"
                                      stroke="#f43f5e"
                                      fill="#f43f5e"
                                      fillOpacity={0.3}
                                    />
                                    <RechartsTooltip 
                                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Legend iconType="circle" />
                                  </RadarChart>
                               </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auditor's Deep Intelligence Panel */}
              <aside className="w-full lg:w-[400px] shrink-0 lg:sticky lg:top-16 h-fit z-30 no-print">
                <div className="glass-panel p-10 rounded-[48px] border border-white/10 shadow-2xl overflow-hidden relative group">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 transition-all duration-[1500ms] ${isScanning ? 'opacity-100 translate-y-[600px]' : ''}`}></div>

                  <div className="flex items-center gap-4 mb-12">
                    <div className={`w-12 h-12 rounded-2xl bg-cyan-400/20 flex items-center justify-center text-cyan-400 transition-all duration-500 ${isScanning ? 'scale-110 rotate-90' : ''}`}>
                      <ShieldEllipsis size={24} />
                    </div>
                    <div>
                       <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Audit Intelligence</h4>
                       <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Logic Extraction Core</span>
                    </div>
                  </div>
                  
                  {selectedItem ? (
                    <div className={`space-y-10 transition-all duration-700 ${isScanning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                      <div>
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] block mb-2">Second-Order Logic Matrix</span>
                        <h5 className="text-2xl font-black text-white uppercase italic leading-tight">{selectedItem.title}</h5>
                      </div>
                      
                      <div className="p-8 bg-slate-900/50 rounded-[32px] border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400/50"></div>
                        <p className="text-md text-slate-300 leading-loose font-light italic">
                          {selectedItem.detail}
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-start gap-4 p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20">
                          <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-1" />
                          <div>
                             <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Systemic Vulnerability</span>
                             <p className="text-[12px] text-slate-400 font-medium italic">High sensitivity to regulatory shifts or structural barrier erosion detected in this vector.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center mb-10 animate-float">
                        <Search size={40} className="text-slate-700" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-loose max-w-[200px]">
                        Select a forensic vector to extract deep-tissue strategic intelligence.
                      </p>
                    </div>
                  )}

                  <div className="mt-16 pt-10 border-t border-white/5 flex flex-col gap-4">
                    <button 
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-4 p-6 bg-white text-slate-950 rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] hover:scale-[0.98] transition-all shadow-[0_0_50px_rgba(255,255,255,0.15)] disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />} 
                      {isExporting ? 'Synthesizing PDF...' : 'Finalize Audit Report'}
                    </button>
                  </div>
                </div>
              </aside>

            </div>
          </div>
        )}

        {/* Forensic Input Deck */}
        <div className="p-8 lg:p-14 border-t border-white/5 z-40 bg-slate-950/80 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto relative">
            <div className="flex gap-6 items-center glass-panel p-3 rounded-[32px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,image/*,text/*"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded-full transition-all shrink-0"
              >
                <Paperclip size={24} />
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={completedCount < 10 ? "TRANSMIT MARKET VECTOR..." : "EXECUTE FORENSIC AUDIT?"}
                className="flex-1 bg-transparent border-none px-6 py-5 text-white placeholder:text-slate-700 font-mono text-lg focus:ring-0 outline-none italic tracking-tighter"
              />
              
              <button 
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedFile)}
                className="w-16 h-16 flex items-center justify-center bg-cyan-400 text-slate-950 rounded-full hover:bg-white hover:scale-110 disabled:opacity-20 disabled:scale-100 transition-all shadow-[0_0_30px_rgba(34,211,238,0.5)]"
              >
                {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
              </button>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-12 opacity-30">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                 Forensic Pipeline v7.0
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                 Barrier & Regulatory Matrix Enabled
              </div>
            </div>
          </form>
        </div>

      </main>

      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
            <stop offset="100%" stopColor="#881337" stopOpacity={0.8} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default App;
