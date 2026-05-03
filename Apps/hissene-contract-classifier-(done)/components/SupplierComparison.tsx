import React, { useState } from 'react';
import { SupplierAnalysisData } from '../types';
import { useLanguage } from '../LanguageContext';
import { Check, X, BarChart2, ShieldAlert, TrendingUp, TrendingDown, Minus, Award, DollarSign, MapPin, Search } from 'lucide-react';

interface Props {
  suppliers: SupplierAnalysisData[];
}

export const SupplierComparison: React.FC<Props> = ({ suppliers }) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (supplierName: string) => {
    setSelectedIds(prev => 
      prev.includes(supplierName) 
        ? prev.filter(id => id !== supplierName)
        : [...prev, supplierName]
    );
  };

  const selectedSuppliers = suppliers.filter(s => selectedIds.includes(s.supplier_name));

  if (suppliers.length === 0) {
    return (
      <div className="glass-card p-8 text-center rounded-xl border border-white/5">
        <p className="text-slate-400">{t.noSuppliers}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Selection Area */}
      <div className="glass-card p-6 rounded-xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-brand-400" />
          {t.compareSuppliers}
        </h3>
        <p className="text-sm text-slate-400 mb-4">{t.compareDesc}</p>
        
        <div className="flex flex-wrap gap-3">
          {suppliers.map(supplier => {
            const isSelected = selectedIds.includes(supplier.supplier_name);
            return (
              <button
                key={supplier.supplier_name}
                onClick={() => toggleSelection(supplier.supplier_name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isSelected 
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' 
                    : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-500" />}
                {supplier.supplier_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison View */}
      {selectedSuppliers.length >= 2 && (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-48">{t.metric}</th>
                  {selectedSuppliers.map(s => (
                    <th key={s.supplier_name} className="px-6 py-4 text-left text-sm font-bold text-white min-w-[200px]">
                      {s.supplier_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {/* Score */}
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Award className="w-4 h-4" /> {t.score}
                  </td>
                  {selectedSuppliers.map(s => (
                    <td key={s.supplier_name} className="px-6 py-4">
                      <div className="text-2xl font-bold text-brand-400">{s.supplier_evaluation.score}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{t.rank} #{s.supplier_evaluation.rank}</div>
                    </td>
                  ))}
                </tr>

                {/* Risk Level */}
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> {t.summaryRisk.split('/')[1].trim()}
                  </td>
                  {selectedSuppliers.map(s => {
                    const risk = s.supplier_evaluation.risk_level;
                    const color = risk === 'HIGH' ? 'text-red-400' : risk === 'MEDIUM' ? 'text-brand-400' : 'text-emerald-400';
                    const translatedRisk = risk === 'HIGH' ? t.riskHigh : risk === 'MEDIUM' ? t.riskMedium : risk === 'LOW' ? t.riskLow : risk;
                    return (
                      <td key={s.supplier_name} className="px-6 py-4">
                        <span className={`font-bold text-sm ${color}`}>{translatedRisk}</span>
                        {s.supplier_evaluation.trend && (
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            {s.supplier_evaluation.trend === 'IMPROVING' && <><TrendingUp className="w-3 h-3 text-emerald-400" /> {t.trendImproving}</>}
                            {s.supplier_evaluation.trend === 'DECLINING' && <><TrendingDown className="w-3 h-3 text-red-400" /> {t.trendDeclining}</>}
                            {s.supplier_evaluation.trend === 'STABLE' && <><Minus className="w-3 h-3 text-slate-400" /> {t.trendStable}</>}
                            {(!['IMPROVING', 'DECLINING', 'STABLE'].includes(s.supplier_evaluation.trend)) && s.supplier_evaluation.trend}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Dimensions */}
                <tr className="bg-slate-900/30">
                  <td colSpan={selectedSuppliers.length + 1} className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t.dimensions}
                  </td>
                </tr>

                {/* Price Competitiveness */}
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> {t.priceComp}
                  </td>
                  {selectedSuppliers.map(s => (
                    <td key={s.supplier_name} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full max-w-[100px]">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${(s.supplier_evaluation.dimensions.price_competitiveness/25)*100}%`}}></div>
                        </div>
                        <span className="text-xs text-white font-mono">{s.supplier_evaluation.dimensions.price_competitiveness}/25</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Product Match */}
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Search className="w-4 h-4" /> {t.productMatch}
                  </td>
                  {selectedSuppliers.map(s => (
                    <td key={s.supplier_name} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full max-w-[100px]">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{width: `${(s.supplier_evaluation.dimensions.product_match_accuracy/30)*100}%`}}></div>
                        </div>
                        <span className="text-xs text-white font-mono">{s.supplier_evaluation.dimensions.product_match_accuracy}/30</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Local Presence */}
                <tr className="hover:bg-white/5">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {t.localPresence}
                  </td>
                  {selectedSuppliers.map(s => (
                    <td key={s.supplier_name} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full max-w-[100px]">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${(s.supplier_evaluation.dimensions.local_presence/20)*100}%`}}></div>
                        </div>
                        <span className="text-xs text-white font-mono">{s.supplier_evaluation.dimensions.local_presence}/20</span>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
