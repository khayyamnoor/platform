import React, { useState, useRef } from 'react';
import { AnalysisResult, ContractData, SupplierAnalysisData } from '../types';
import { exportToExcel } from '../services/excelService';
import { exportHtmlToPdf } from '../services/pdfService';
import { useLanguage } from '../LanguageContext';
import { 
  CalendarDays, 
  DollarSign, 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileJson,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Download,
  Table as TableIcon,
  ChevronRight,
  ArrowLeft,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ShoppingCart,
  Award,
  BarChart4,
  Target,
  ShieldAlert,
  ScanLine,
  ScanSearch,
  Building2,
  MapPin,
  Phone,
  Hash
} from 'lucide-react';

interface Props {
  results: AnalysisResult[];
  onReset: () => void;
  onAddMore?: () => void;
}

// Helper: Contract Badge
const StatusBadge: React.FC<{ status: string; compact?: boolean }> = ({ status, compact = false }) => {
  const normalized = (status || "UNKNOWN").toUpperCase();
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
  let dotClass = "bg-slate-400";

  if (normalized === "ACTIVE") {
    colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    dotClass = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]";
  } else if (normalized === "EXPIRED") {
    colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    dotClass = "bg-red-400";
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full font-mono border ${colorClass} ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs tracking-wider'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
      {status || "UNKNOWN"}
    </span>
  );
};

// Helper: Supplier Risk Badge
const RiskBadge: React.FC<{ risk: string; trend?: string; t: any }> = ({ risk, trend, t }) => {
  const r = (risk || "UNKNOWN").toUpperCase();
  const tr = (trend || "UNKNOWN").toUpperCase();

  let TrendIcon = null;
  let trendColor = "text-slate-500";
  let trendText = "";
  
  if (tr === 'IMPROVING') { TrendIcon = TrendingUp; trendColor = "text-emerald-400"; trendText = t.trendImproving; }
  else if (tr === 'DECLINING') { TrendIcon = TrendingDown; trendColor = "text-red-400"; trendText = t.trendDeclining; }
  else if (tr === 'STABLE') { TrendIcon = Minus; trendColor = "text-slate-400"; trendText = t.trendStable; }

  let badge = null;
  if (r === 'HIGH') badge = <span className="text-red-400 font-bold text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {t.riskHigh}</span>;
  else if (r === 'MEDIUM') badge = <span className="text-brand-400 font-bold text-xs">{t.riskMedium}</span>;
  else badge = <span className="text-emerald-400 font-bold text-xs">{t.riskLow}</span>;

  return (
    <div className="flex items-center gap-2">
      {badge}
      {TrendIcon && (
        <span className={`flex items-center gap-1 text-[10px] font-bold ${trendColor} bg-white/5 px-1.5 py-0.5 rounded border border-white/5`}>
          <TrendIcon className="w-3 h-3" /> {trendText}
        </span>
      )}
    </div>
  );
};

export const ContractDashboard: React.FC<Props> = ({ results, onReset, onAddMore }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'json'>('dashboard');
  const [selectedContractIndex, setSelectedContractIndex] = useState<number | null>(results.length === 1 ? 0 : null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const handleExportExcel = () => {
    exportToExcel(results);
  };

  const handleExportPdf = () => {
    if (dashboardRef.current) {
      exportHtmlToPdf(dashboardRef.current, "Hissene_Report");
    }
  };

  // --- INDEX VIEW ---
  if (selectedContractIndex === null) {
    return (
      <div ref={dashboardRef} className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-6 font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-xl border-t border-brand-500/20">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {t.dashboardTitle.split(' ')[0]} {t.dashboardTitle.split(' ')[1]} <span className="text-brand-400">{t.dashboardTitle.split(' ').slice(2).join(' ')}</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <Activity className="w-4 h-4 text-brand-400" />
               <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">{t.processedDocs} {results.length}</p>
            </div>
          </div>
          <div className="flex gap-3 no-print">
             <div className="relative group">
               <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors text-sm font-medium">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.export || 'Export'}</span>
               </button>
               <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                 <button onClick={handleExportPdf} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">📄 As PDF</button>
                 <button onClick={handleExportExcel} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">📊 As Excel</button>
               </div>
             </div>
             <button onClick={toggleFullScreen} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
               {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
             </button>
            {onAddMore && (
              <button onClick={onAddMore} className="px-4 py-2 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/20 rounded-lg transition-colors text-sm font-bold">
                + {t.addPdf}
              </button>
            )}
            <button onClick={onReset} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors text-sm font-medium">
              {t.reset}
            </button>
          </div>
        </div>

        {/* Index Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-brand-400" />
            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">{t.docIndex}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.type}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.entitySupplier}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.summaryRisk}</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedContractIndex(idx)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {res.type === 'CONTRACT' ? (
                        <span className="flex items-center gap-2 text-blue-400 text-xs font-bold"><FileText className="w-3 h-3"/> {t.contract}</span>
                      ) : (
                        <span className="flex items-center gap-2 text-brand-400 text-xs font-bold"><ScanSearch className="w-3 h-3"/> {t.supplierOcr}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {res.type === 'CONTRACT' ? (
                        <>
                          <div className="text-sm font-bold text-white line-clamp-1">{res.company_name}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{t.vs} {res.counterparty_name}</div>
                        </>
                      ) : (
                        <>
                           <div className="text-sm font-bold text-white line-clamp-1">{res.supplier_name}</div>
                           <div className="text-xs text-slate-500">{res.document_type}</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {res.type === 'CONTRACT' ? (
                        <div className="flex gap-2">
                           <StatusBadge status={res.contract_status} compact />
                           {res.expiration_alert?.is_within_2_months === 'YES' && <span className="text-[10px] text-red-400 font-bold">EXPIRING</span>}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                           <RiskBadge risk={res.supplier_evaluation?.risk_level} trend={res.supplier_evaluation?.trend} t={t} />
                           <span className="text-xs text-brand-400 font-mono">{t.score}: {res.supplier_evaluation?.score}/100</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-slate-500 group-hover:text-brand-400 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  const data = results[selectedContractIndex];
  
  const isArabic = language === 'ar';

  return (
    <div ref={dashboardRef} className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-6 font-sans text-slate-200 relative">
      
      {/* Detail Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-panel p-6 rounded-xl border-t border-brand-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
        <div>
          <button 
            onClick={() => setSelectedContractIndex(null)}
            className="group mb-2 text-slate-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-wider font-mono transition-colors no-print"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t.backToIndex}
          </button>

          {data.type === 'CONTRACT' ? (
            <>
              <h2 className="text-3xl font-bold text-white leading-tight mb-2">
                {data.company_name} <span className="font-light text-slate-600 px-2">/</span> {data.counterparty_name}
              </h2>
              <div className="flex items-center gap-3">
                 <span className="text-blue-400 font-mono text-xs uppercase tracking-widest">{data.contract_type}</span>
                 <StatusBadge status={data.contract_status} />
              </div>
            </>
          ) : (
            <>
               <h2 className="text-3xl font-bold text-brand-400 leading-tight mb-2">
                {data.supplier_name}
              </h2>
              <div className="flex items-center gap-3">
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{data.document_type}</span>
                 <RiskBadge risk={data.supplier_evaluation.risk_level} trend={data.supplier_evaluation.trend} t={t} />
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <ScanLine className="w-3 h-3" /> {t.ocrActive}
                 </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 flex-wrap items-center no-print">
             <div className="relative group">
               <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider">
                  <Download className="w-4 h-4" />
                  {t.export || 'Export'}
               </button>
               <div className="absolute left-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                 <button onClick={handleExportPdf} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">📄 As PDF</button>
                 <button onClick={handleExportExcel} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">📊 As Excel</button>
               </div>
             </div>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-white/10">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{t.visual}</button>
              <button onClick={() => setActiveTab('json')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase ${activeTab === 'json' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{t.rawData}</button>
            </div>
            {onAddMore && (
              <button onClick={onAddMore} className="px-5 py-2.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/20 rounded-lg font-bold text-sm">
                + {t.addPdf}
              </button>
            )}
            <button onClick={onReset} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-brand-500/20">{t.newAnalysis}</button>
        </div>
      </div>

      {activeTab === 'json' ? (
        <div className="glass-card p-6 rounded-xl font-mono text-xs text-brand-400 overflow-auto max-h-[70vh] border border-brand-500/20 bg-slate-950/80">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          <div className="glass-card p-0 rounded-xl overflow-hidden relative border border-white/10">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[80px] pointer-events-none"></div>
             <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-500/20 rounded-lg text-brand-400"><FileText className="w-5 h-5" /></div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t.execSummary}</h3>
                </div>
             </div>
             <div className={`p-8 space-y-6 ${isArabic ? 'text-right font-serif' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
               <p className="text-slate-300 leading-relaxed text-base font-light">
                 {data.executive_brief?.summary || t.summaryNotAvail}
               </p>
               
               {data.executive_brief?.key_decisions && data.executive_brief.key_decisions.length > 0 && (
                 <div>
                   <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">{t.keyDecisions}</h4>
                   <ul className="space-y-2">
                     {data.executive_brief.key_decisions.map((decision, idx) => (
                       <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                         <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> {decision}
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               {data.executive_brief?.critical_data_points && data.executive_brief.critical_data_points.length > 0 && (
                 <div>
                   <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">{t.criticalDataPoints}</h4>
                   <ul className="space-y-2">
                     {data.executive_brief.critical_data_points.map((point, idx) => (
                       <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                         <AlertOctagon className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" /> {point}
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
             </div>
          </div>

          {/* === CONTENT SPLIT BASED ON TYPE === */}

          {data.type === 'CONTRACT' ? (
            /* --- CONTRACT VIEW --- */
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Financials */}
                <div className="glass-card p-6 rounded-xl border border-white/5 flex flex-col justify-between relative overflow-hidden">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> {t.valuation}
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">{t.totalValue}</span>
                      <div className="text-3xl font-bold text-white mt-1 font-mono">{data.amounts.total_contract_amount} <span className="text-lg font-normal text-slate-500">{data.currency}</span></div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="glass-card p-6 rounded-xl border border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> {t.term}
                  </h3>
                   <div className="relative border-l border-slate-700 ml-2 pl-6 space-y-6 py-2">
                      <div className="relative">
                        <div className="absolute -left-[29px] w-3 h-3 rounded-full bg-slate-800 border border-brand-500"></div>
                        <div className="text-xs text-slate-500 uppercase">{t.effective}</div>
                        <div className="text-sm font-bold text-white font-mono">{data.contract_start_date}</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[29px] w-3 h-3 rounded-full bg-slate-800 border border-red-400"></div>
                        <div className="text-xs text-slate-500 uppercase">{t.end}</div>
                        <div className="text-sm font-bold text-white font-mono">{data.contract_end_date}</div>
                      </div>
                   </div>
                </div>

                 {/* Payment Schedule */}
                 <div className="md:col-span-3 glass-card p-6 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4"><TrendingUp className="w-4 h-4 inline mr-2"/> {t.payments}</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-slate-900/50">
                          <tr>
                             <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase">{t.date}</th>
                             <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase">{t.amount}</th>
                             <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase">{t.description}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.payment_schedule.map((ev, i) => (
                             <tr key={i} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-sm font-mono text-brand-400">{ev.payment_date}</td>
                                <td className="px-4 py-3 text-sm font-bold text-white">{ev.payment_amount}</td>
                                <td className="px-4 py-3 text-sm text-slate-400">{ev.payment_description}</td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
             </div>
          ) : (
             /* --- SUPPLIER VIEW --- */
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Scoring Card */}
                <div className="md:col-span-1 glass-card p-6 rounded-xl border border-brand-500/20 bg-brand-500/5">
                   <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Award className="w-4 h-4" /> {t.supplierScorecard}
                   </h3>
                   <div className="flex items-center justify-center mb-6">
                      <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-brand-500/20">
                         <div className="text-4xl font-bold text-white">{data.supplier_evaluation.score}</div>
                         <div className="absolute top-0 right-0 bg-brand-500 text-black text-xs font-bold px-2 py-1 rounded-full">#{data.supplier_evaluation.rank}</div>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{t.productMatch}</span>
                        <span className="text-white font-mono">{data.supplier_evaluation.dimensions.product_match_accuracy}/30</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="bg-brand-500 h-1.5 rounded-full" style={{width: `${(data.supplier_evaluation.dimensions.product_match_accuracy/30)*100}%`}}></div></div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{t.priceComp}</span>
                        <span className="text-white font-mono">{data.supplier_evaluation.dimensions.price_competitiveness}/25</span>
                      </div>
                       <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${(data.supplier_evaluation.dimensions.price_competitiveness/25)*100}%`}}></div></div>
                   </div>
                </div>

                {/* Negotiation Card */}
                <div className="md:col-span-2 glass-card p-6 rounded-xl border border-white/5">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Target className="w-4 h-4" /> {t.negIntel}
                   </h3>
                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
                         <div className="text-[10px] text-slate-500 uppercase">{t.recAsk}</div>
                         <div className="text-lg font-bold text-emerald-400 mt-1">{data.negotiation_guidance.recommended_ask}</div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
                         <div className="text-[10px] text-slate-500 uppercase">{t.walkAway}</div>
                         <div className="text-lg font-bold text-red-400 mt-1">{data.negotiation_guidance.walk_away_point}</div>
                      </div>
                   </div>
                   <div>
                     <span className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">{t.leveragePoints}</span>
                     <ul className="space-y-2">
                        {data.negotiation_guidance.leverage_points.map((pt, i) => (
                           <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                             <CheckCircle className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" /> {pt}
                           </li>
                        ))}
                     </ul>
                   </div>
                </div>

                {/* Supplier Identity Card (OCR) - NEW */}
                <div className="md:col-span-3 glass-card p-6 rounded-xl border border-brand-500/20 bg-slate-900/50 relative overflow-hidden">
                   <div className="absolute right-0 top-0 p-32 bg-brand-500/5 rounded-full blur-[60px] pointer-events-none"></div>
                   <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                     <Building2 className="w-4 h-4"/> {t.supplierIdentity}
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><Building2 className="w-4 h-4"/></div>
                         <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.legalName}</span>
                            <div className="text-sm font-bold text-white leading-tight">{data.supplier_name}</div>
                            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {t.verified}</div>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><Hash className="w-4 h-4"/></div>
                         <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.taxId}</span>
                            <div className="text-sm font-mono text-brand-400 tracking-wider bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 inline-block">
                               {data.supplier_metadata?.tax_id && data.supplier_metadata.tax_id !== 'N/A' ? data.supplier_metadata.tax_id : 'N/A'}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><Phone className="w-4 h-4"/></div>
                         <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.contactInfo}</span>
                            <div className="text-sm text-slate-300">{data.supplier_metadata?.phone && data.supplier_metadata.phone !== 'N/A' ? data.supplier_metadata.phone : 'N/A'}</div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">{data.supplier_metadata?.email && data.supplier_metadata.email !== 'N/A' ? data.supplier_metadata.email : 'N/A'}</div>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><MapPin className="w-4 h-4"/></div>
                         <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.address}</span>
                            <div className="text-xs text-slate-400 leading-relaxed max-w-[200px]">{data.supplier_metadata?.address && data.supplier_metadata.address !== 'N/A' ? data.supplier_metadata.address : 'N/A'}</div>
                         </div>
                      </div>
                      
                      {/* NEW METADATA */}
                      {data.supplier_metadata?.bank_details && data.supplier_metadata.bank_details !== 'N/A' && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><FileText className="w-4 h-4"/></div>
                          <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.bankDetails}</span>
                              <div className="text-xs text-slate-300 font-mono leading-relaxed max-w-[200px]">{data.supplier_metadata.bank_details}</div>
                          </div>
                        </div>
                      )}
                      {data.supplier_metadata?.payment_terms && data.supplier_metadata.payment_terms !== 'N/A' && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><CalendarDays className="w-4 h-4"/></div>
                          <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.paymentTerms}</span>
                              <div className="text-sm text-brand-400 font-bold">{data.supplier_metadata.payment_terms}</div>
                          </div>
                        </div>
                      )}
                      {data.supplier_metadata?.delivery_terms && data.supplier_metadata.delivery_terms !== 'N/A' && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0"><ShoppingCart className="w-4 h-4"/></div>
                          <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">{t.deliveryTerms}</span>
                              <div className="text-sm text-slate-300 font-medium">{data.supplier_metadata.delivery_terms}</div>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                {/* Products Table (OCR) */}
                 <div className="md:col-span-3 glass-card p-6 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ScanLine className="w-4 h-4"/> {t.lineItems}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-slate-900/50">
                          <tr>
                             <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.refSku}</th>
                             <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.prodDesc}</th>
                             <th className="px-4 py-2 text-right text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.qty}</th>
                             <th className="px-4 py-2 text-right text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.unitPrice}</th>
                             <th className="px-4 py-2 text-right text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.total}</th>
                             <th className="px-4 py-2 text-right text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.scanConf}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.products.map((p, i) => (
                             <tr key={i} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{p.product_id || '-'}</td>
                                <td className="px-4 py-3">
                                   <div className="text-sm font-bold text-white">{p.product_name}</div>
                                   <div className="text-xs text-slate-500 max-w-[250px] truncate">{p.description}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300 font-mono text-right">{p.quantity}</td>
                                <td className="px-4 py-3 text-sm text-slate-300 font-mono text-right">{p.unit_price}</td>
                                <td className="px-4 py-3 text-sm text-brand-400 font-bold font-mono text-right">{p.total_price || '-'}</td>
                                <td className="px-4 py-3 text-right">
                                   <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${p.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                     {p.confidence}
                                   </span>
                                </td>
                             </tr>
                          ))}
                        </tbody>
                        {data.amounts && (
                          <tfoot className="bg-slate-900/80 border-t-2 border-white/10">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right text-xs text-slate-400 font-bold uppercase">{t.subtotal}:</td>
                              <td className="px-4 py-3 text-right text-sm text-white font-mono">{data.amounts.subtotal || '-'}</td>
                              <td></td>
                            </tr>
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400 font-bold uppercase">{t.taxAmt}:</td>
                              <td className="px-4 py-2 text-right text-sm text-white font-mono">{data.amounts.tax_amount || '-'}</td>
                              <td></td>
                            </tr>
                            {data.amounts.discount && data.amounts.discount !== 'N/A' && data.amounts.discount !== '-' && (
                              <tr>
                                <td colSpan={4} className="px-4 py-2 text-right text-xs text-brand-500 font-bold uppercase">{t.discountAmt}:</td>
                                <td className="px-4 py-2 text-right text-sm text-brand-400 font-mono">{data.amounts.discount}</td>
                                <td></td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan={4} className="px-4 py-4 text-right text-sm text-emerald-500 font-bold uppercase">{t.grandTotal}:</td>
                              <td className="px-4 py-4 text-right text-lg text-emerald-400 font-bold font-mono">{data.amounts.grand_total || '-'}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                 </div>

             </div>
          )}

        </>
      )}
    </div>
  );
};