import React, { useRef, useEffect } from 'react';
import { ImageWorkspaceState, Layer } from '../types';

interface Props {
  state: ImageWorkspaceState;
  onUpload: (file: File) => void;
  onUpdateState: (newState: Partial<ImageWorkspaceState>) => void;
  onRequestEdit: (prompt: string) => void;
  onOpenVideo: () => void;
}

const ImageWorkspace: React.FC<Props> = ({ state, onUpload, onUpdateState, onRequestEdit, onOpenVideo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to compile all active layers into a single prompt
  const getCompiledPrompt = () => {
    return state.layers
      .filter(l => l.isActive && l.prompt.trim().length > 0)
      .map(l => `${l.type === 'subject' ? 'Subject modification: ' : l.type === 'background' ? 'Background: ' : ''}${l.prompt}`)
      .join('. ');
  };

  const handleLayerChange = (id: string, newPrompt: string) => {
    const newLayers = state.layers.map(l => l.id === id ? { ...l, prompt: newPrompt } : l);
    onUpdateState({ layers: newLayers });
  };

  const toggleLayer = (id: string) => {
    const newLayers = state.layers.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l);
    onUpdateState({ layers: newLayers });
  };

  const handleApplyChanges = () => {
    const prompt = getCompiledPrompt();
    if (prompt) onRequestEdit(prompt);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  // Scroll to bottom of chat/history not needed, but nice to auto-focus inputs
  
  if (!state.file) {
    return (
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="h-full w-full min-h-[400px] border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-6 transition-all hover:border-cyan-500/50 hover:bg-slate-900/50 cursor-pointer group relative overflow-hidden"
      >
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform neon-glow">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <h3 className="text-lg font-medium text-slate-300">Drop Image Here</h3>
        <p className="text-sm text-slate-500 mt-2 text-center">Auto-analysis & enhancement active</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col glass-panel rounded-xl overflow-hidden border border-white/5 shadow-2xl">
      {/* Top Bar: Controls */}
      <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {state.status === 'analyzing' ? 'Analyzing...' : state.status === 'processing' ? 'Processing...' : state.analysisData?.type || 'Image'}
            </span>
        </div>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-700 text-slate-400"
                title="Upload New Image"
            >
                New
            </button>
            <button 
                onClick={onOpenVideo}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 transition-colors"
                title="Create Video"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </button>
            <button 
                onClick={() => onUpdateState({ currentPreviewUrl: state.originalPreviewUrl })} 
                className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-700 text-slate-400"
                title="Revert to Original"
            >
                Reset
            </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="relative flex-1 bg-black/50 overflow-hidden group">
        <img 
            src={state.currentPreviewUrl || ''} 
            alt="Workspace" 
            className={`w-full h-full object-contain transition-opacity duration-500 ${state.status === 'processing' ? 'opacity-50 blur-sm' : 'opacity-100'}`} 
        />
        
        {state.status === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        )}

        {/* Comparison toggle on hover */}
        {state.currentPreviewUrl !== state.originalPreviewUrl && state.originalPreviewUrl && (
             <button 
             className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
             onMouseEnter={(e) => {
                const img = e.currentTarget.parentElement?.querySelector('img');
                if(img && state.originalPreviewUrl) img.src = state.originalPreviewUrl;
             }}
             onMouseLeave={(e) => {
                const img = e.currentTarget.parentElement?.querySelector('img');
                if(img && state.currentPreviewUrl) img.src = state.currentPreviewUrl;
             }}
           >
             Hold for Original
           </button>
        )}
      </div>

      {/* Bottom Panel: Layers & Suggestions */}
      <div className="h-1/3 min-h-[250px] bg-slate-900/80 backdrop-blur border-t border-white/5 flex flex-col">
        
        {/* Tabs / suggestions */}
        {state.analysisData?.suggestions && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-white/5 no-scrollbar">
                {state.analysisData.suggestions.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => onRequestEdit(s.prompt)}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors whitespace-nowrap"
                    >
                        ✨ {s.label}
                    </button>
                ))}
            </div>
        )}

        {/* Layers Editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {state.layers.map(layer => (
                <div key={layer.id} className={`p-3 rounded-lg border transition-all ${layer.isActive ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900 border-transparent opacity-60'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={layer.isActive} 
                                onChange={() => toggleLayer(layer.id)}
                                className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{layer.type}</span>
                        </div>
                    </div>
                    <textarea 
                        value={layer.prompt}
                        onChange={(e) => handleLayerChange(layer.id, e.target.value)}
                        placeholder={`Describe ${layer.type} adjustments...`}
                        disabled={!layer.isActive}
                        className="w-full bg-slate-950/50 border border-slate-700/50 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none h-16 disabled:opacity-50"
                    />
                </div>
            ))}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-white/5 bg-black/20">
            <button 
                onClick={handleApplyChanges}
                disabled={state.status === 'processing'}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {state.status === 'processing' ? 'Enhancing...' : 'Apply Enhancements'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageWorkspace;
