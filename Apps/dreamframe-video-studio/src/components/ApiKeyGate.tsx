import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface ApiKeyGateProps {
  children: React.ReactNode;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkKey = async () => {
    try {
      const result = await window.aistudio.hasSelectedApiKey();
      setHasKey(result);
    } catch (e) {
      console.error("Failed to check API key status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // As per instructions, assume success or just re-check
      setHasKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-blue-500"></div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sleek-bg p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-sleek-sidebar rounded-2xl p-8 border border-sleek-border shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-sleek-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-sleek-accent" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">API Access Required</h2>
          <p className="text-sleek-text-dim text-sm mb-8">
            To generate cinema-grade AI videos with Veo, you need to authenticate with a valid Google AI Studio API key.
          </p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={handleSelectKey}
              className="w-full bg-sleek-accent hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sleek-accent/20"
            >
              Select API Key
            </button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sleek-text-muted hover:text-sleek-text-dim text-xs flex items-center justify-center gap-1 mt-2"
            >
              Configure Billing <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="mt-8 p-4 bg-amber-500/10 rounded-lg flex gap-3 text-left border border-amber-500/10">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              Video generation is an enterprise-tier feature and requires a paid Google Cloud project. Free tier keys are strictly prohibited from using the neural engine.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
