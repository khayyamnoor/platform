import React from 'react';
import { HistoryItem } from '../types';
import { X, Search, FileText, Scale, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClear: () => void;
  onSelect: (item: HistoryItem) => void;
}

export const HistorySidebar: React.FC<Props> = ({ isOpen, onClose, history, onClear, onSelect }) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`fixed top-0 ${isArabic ? 'left-0' : 'right-0'} h-full w-80 bg-slate-900 ${isArabic ? 'border-r' : 'border-l'} border-white/10 shadow-2xl z-50 transform transition-transform animate-in ${isArabic ? 'slide-in-from-left' : 'slide-in-from-right'} duration-300`} dir={dir}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              {t.recentActivity}
            </h3>
            <button 
              onClick={onClose} 
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                {t.noHistory}
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelect(item)}
                  className="group p-3 rounded-lg bg-white/5 border border-white/5 hover:border-brand-500/30 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 ${
                      item.type === 'ANALYSIS' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.type === 'LAWYER_QUERY' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-brand-500/10 text-brand-400'
                    }`}>
                      {item.type === 'ANALYSIS' && <FileText className="w-3 h-3" />}
                      {item.type === 'LAWYER_QUERY' && <Scale className="w-3 h-3" />}
                      {item.type === 'AGENT_QUERY' && <MessageSquare className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-slate-500 mb-0.5 flex justify-between">
                         <span>
                           {item.type === 'ANALYSIS' ? t.docScan : item.type === 'LAWYER_QUERY' ? t.legalQuery : t.aiChat}
                         </span>
                         <span className="opacity-50">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium truncate leading-tight">
                        {item.query}
                      </p>
                      {item.details && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-900/50">
            <button 
              onClick={onClear}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Trash2 className="w-3 h-3" /> {t.clearHistory}
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
};
