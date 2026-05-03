import React, { useEffect, useState } from 'react';
import { getUsageHistory, UsageRecord, calculateTotalCost, calculateTotalTokens, clearUsageHistory } from '../services/usageTracker';
import { Activity, DollarSign, Database, Clock, Trash2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [history, setHistory] = useState<UsageRecord[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const loadData = () => {
    const data = getUsageHistory();
    setHistory(data);
    setTotalCost(calculateTotalCost(data));
    setTotalTokens(calculateTotalTokens(data));
  };

  useEffect(() => {
    loadData();
    
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('usage-updated', handleUpdate);
    return () => window.removeEventListener('usage-updated', handleUpdate);
  }, []);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all usage history?')) {
      clearUsageHistory();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-bold text-slate-800 flex items-center gap-3">
          <Activity className="text-rose-500" size={32} />
          API Usage Dashboard
        </h2>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 size={16} />
          Clear History
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Est. Cost</p>
            <p className="text-3xl font-bold text-slate-900">${totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tokens Used</p>
            <p className="text-3xl font-bold text-slate-900">{totalTokens.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">API Calls</p>
            <p className="text-3xl font-bold text-slate-900">{history.length}</p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            Request History
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3 text-right">Tokens</th>
                <th className="px-6 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No API usage recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.type === 'image' ? 'bg-blue-100 text-blue-700' :
                        record.type === 'video' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {record.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                      {record.model}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={record.details}>
                      {record.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-700">
                      {record.tokensUsed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-900">
                      ${record.cost.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
