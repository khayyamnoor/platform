import React, { useState } from 'react';
import { VideoGenerationState } from '../types';
import { generateVideoSequence, fileToBase64 } from '../services/geminiService';

interface Props {
  selectedImage: string | null; // Base64 or URL
  onClose: () => void;
}

const VideoGenerator: React.FC<Props> = ({ selectedImage, onClose }) => {
  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false,
    progress: 0,
    resultUrl: null,
    error: null
  });
  const [prompt, setPrompt] = useState("Cinematic slow pan, atmospheric lighting, 4k detail");

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null, progress: 10 }));
    
    try {
      // If selectedImage is a blob URL, we need to fetch it to get base64
      let base64Data = selectedImage;
      if (selectedImage.startsWith('blob:') || selectedImage.startsWith('http')) {
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        base64Data = await fileToBase64(blob);
      } else if (selectedImage.startsWith('data:')) {
        base64Data = selectedImage.split(',')[1];
      }

      setState(prev => ({ ...prev, progress: 30 }));
      
      const videoUrl = await generateVideoSequence(base64Data, prompt);
      
      setState(prev => ({ ...prev, isGenerating: false, progress: 100, resultUrl: videoUrl }));
    } catch (e: any) {
      setState(prev => ({ ...prev, isGenerating: false, error: e.message || "Failed to generate video" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 relative flex flex-col gap-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Veo Video Sequence
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Source Preview */}
          <div className="w-full md:w-1/3 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative group">
             {selectedImage ? (
               <img src={selectedImage} alt="Source" className="w-full h-full object-cover" />
             ) : (
               <div className="flex items-center justify-center h-full text-xs text-slate-500">No Source</div>
             )}
             <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">Source</div>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Motion Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none h-24"
                placeholder="Describe camera movement and scene action..."
              />
            </div>
            
            {state.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                {state.error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={state.isGenerating || !selectedImage}
              className={`w-full py-3 rounded-lg font-semibold tracking-wide transition-all duration-300 ${
                state.isGenerating 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-cyan-500/25'
              }`}
            >
              {state.isGenerating ? 'Generating Sequence...' : 'Generate Video'}
            </button>
          </div>
        </div>

        {/* Result Area */}
        {state.resultUrl && (
          <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Generation Complete
             </div>
             <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                <video src={state.resultUrl} controls className="w-full h-full object-contain" autoPlay loop />
             </div>
             <a href={state.resultUrl} download="sequence.mp4" className="block text-center text-xs text-cyan-400 hover:underline">Download Video</a>
          </div>
        )}

        {state.isGenerating && (
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-pulse w-full"></div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;
