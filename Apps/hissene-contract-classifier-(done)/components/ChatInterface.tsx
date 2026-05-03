import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Bot, User, Scale, Sparkles, Loader2, FileText } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Markdown from 'react-markdown';

interface Props {
  mode: 'LAWYER' | 'AGENT';
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  hasFiles: boolean;
}

export const ChatInterface: React.FC<Props> = ({ mode, messages, onSendMessage, isProcessing, hasFiles }) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const isLawyer = mode === 'LAWYER';
  const ThemeIcon = isLawyer ? Scale : Sparkles;
  const themeColor = isLawyer ? 'text-indigo-400' : 'text-brand-400';
  const bgColor = isLawyer ? 'bg-indigo-950/30' : 'bg-brand-950/30';

  return (
    <div className="flex flex-col h-[700px] glass-panel rounded-xl overflow-hidden border border-white/10" dir={dir}>
      
      {/* Chat Header */}
      <div className={`p-4 border-b border-white/5 flex items-center justify-between ${bgColor}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 ${themeColor}`}>
            <ThemeIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">
              {isLawyer ? t.lawyerMode : t.aiAgent}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              {isLawyer ? t.askLawyerDesc : t.askAgentDesc}
            </p>
          </div>
        </div>
        {hasFiles && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
            <FileText className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-slate-400">{t.contextActive}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
            <ThemeIcon className="w-12 h-12 mb-4" />
            <p className="text-sm">
              {isLawyer 
                ? t.askLawyerDesc 
                : t.askAgentDesc}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-slate-700 text-slate-300' : `${isLawyer ? 'bg-indigo-600' : 'bg-brand-600'} text-white`
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? `bg-slate-800 text-slate-200 ${isArabic ? 'rounded-tl-none' : 'rounded-tr-none'}` 
                : `glass-card border border-white/5 text-slate-300 ${isArabic ? 'rounded-tr-none' : 'rounded-tl-none'}`
            }`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown>{msg.content}</Markdown>
              </div>
              <div className={`mt-2 text-[10px] opacity-40 font-mono ${isArabic ? 'text-left' : 'text-right'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-4">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isLawyer ? 'bg-indigo-600' : 'bg-brand-600'} text-white`}>
              <Bot className="w-4 h-4" />
            </div>
            <div className={`glass-card px-4 py-3 rounded-2xl ${isArabic ? 'rounded-tr-none' : 'rounded-tl-none'} border border-white/5 flex items-center gap-2 text-slate-400`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-mono animate-pulse">{t.thinking}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900/50 border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLawyer ? t.reqClause : t.askQuestion}
            className={`w-full bg-slate-950 border border-slate-700 rounded-xl py-4 ${isArabic ? 'pr-5 pl-12' : 'pl-5 pr-12'} text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600`}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`absolute ${isArabic ? 'left-2' : 'right-2'} top-2 p-2 bg-slate-800 hover:bg-brand-600 text-slate-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className={`w-4 h-4 ${isArabic ? 'transform rotate-180' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
};
