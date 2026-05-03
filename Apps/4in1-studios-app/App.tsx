import React, { useState, useCallback } from 'react';
import ImageWorkspace from './components/ImageWorkspace';
import VideoGenerator from './components/VideoGenerator';
import { ImageWorkspaceState, Layer, EnhancementSuggestion } from './types';
import { analyzeImage, editImage, fileToBase64 } from './services/geminiService';

const INITIAL_LAYERS: Layer[] = [
  { id: '1', name: 'Subject', type: 'subject', prompt: 'Enhance detail and sharpness', isActive: true },
  { id: '2', name: 'Background', type: 'background', prompt: '', isActive: true },
  { id: '3', name: 'Effects', type: 'effect', prompt: 'Cinematic color grading', isActive: true },
];

export default function App() {
  const [workspaces, setWorkspaces] = useState<ImageWorkspaceState[]>([
    { id: 'w1', file: null, originalPreviewUrl: null, currentPreviewUrl: null, history: [], historyIndex: -1, status: 'idle', layers: [...INITIAL_LAYERS], selectedLayerId: null },
    { id: 'w2', file: null, originalPreviewUrl: null, currentPreviewUrl: null, history: [], historyIndex: -1, status: 'idle', layers: [...INITIAL_LAYERS], selectedLayerId: null },
    { id: 'w3', file: null, originalPreviewUrl: null, currentPreviewUrl: null, history: [], historyIndex: -1, status: 'idle', layers: [...INITIAL_LAYERS], selectedLayerId: null },
    { id: 'w4', file: null, originalPreviewUrl: null, currentPreviewUrl: null, history: [], historyIndex: -1, status: 'idle', layers: [...INITIAL_LAYERS], selectedLayerId: null },
  ]);

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoSource, setSelectedVideoSource] = useState<string | null>(null);

  const updateWorkspace = (id: string, updates: Partial<ImageWorkspaceState>) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleUpload = async (id: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    
    updateWorkspace(id, {
      file,
      originalPreviewUrl: previewUrl,
      currentPreviewUrl: previewUrl,
      status: 'analyzing',
      history: [previewUrl],
      historyIndex: 0
    });

    try {
      // 1. Analyze
      const analysis = await analyzeImage(file);
      
      const newLayers = [...INITIAL_LAYERS];
      // Inject smart default prompts based on analysis
      if (analysis.subject) newLayers[0].prompt = `Enhance ${analysis.subject}, hyper-realistic texture`;
      if (analysis.mood) newLayers[2].prompt = `${analysis.mood} cinematic lighting, 8k resolution`;

      updateWorkspace(id, {
        status: 'idle',
        analysisData: analysis,
        layers: newLayers
      });

      // 2. Auto-Enhance immediately
      // We trigger the edit function with the newly populated layers
      await handleRequestEdit(id, newLayers, previewUrl);

    } catch (error) {
      console.error("Analysis failed:", error);
      updateWorkspace(id, { status: 'error', statusMessage: 'Analysis failed' });
    }
  };

  const handleRequestEdit = async (id: string, layersOrPrompt: Layer[] | string, sourceUrlOverride?: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (!workspace) return;
    
    // Determine prompt
    let promptString = "";
    if (typeof layersOrPrompt === 'string') {
        promptString = layersOrPrompt;
    } else {
        promptString = layersOrPrompt
            .filter(l => l.isActive && l.prompt)
            .map(l => l.prompt)
            .join('. ');
    }

    if (!promptString) return;

    updateWorkspace(id, { status: 'processing' });

    try {
      const sourceUrl = sourceUrlOverride || workspace.currentPreviewUrl || workspace.originalPreviewUrl;
      if (!sourceUrl) throw new Error("No source image");
      
      let base64 = "";
      if (sourceUrl.startsWith('data:')) {
         base64 = sourceUrl.split(',')[1];
      } else {
         const resp = await fetch(sourceUrl);
         const blob = await resp.blob();
         base64 = await fileToBase64(blob);
      }

      const newImageUrl = await editImage(base64, promptString);
      
      // Update state with new image
      setWorkspaces(prev => {
        const currentW = prev.find(w => w.id === id);
        if(!currentW) return prev;
        
        const newHistory = [...currentW.history.slice(0, currentW.historyIndex + 1), newImageUrl];
        
        return prev.map(w => w.id === id ? {
            ...w,
            currentPreviewUrl: newImageUrl,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            status: 'done'
        } : w);
      });

    } catch (error) {
       console.error("Edit failed:", error);
       updateWorkspace(id, { status: 'error', statusMessage: 'Generation failed' });
    }
  };

  const handleOpenVideo = (id: string) => {
    const w = workspaces.find(w => w.id === id);
    if (w && w.currentPreviewUrl) {
      setSelectedVideoSource(w.currentPreviewUrl);
      setVideoModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
               4in1
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
               4in1 <span className="text-cyan-500 font-light">Studios App</span>
            </h1>
         </div>
         <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                API CONNECTED
            </span>
         </div>
      </header>

      {/* Main Grid */}
      <main className="p-4 md:p-6 h-[calc(100vh-64px)]">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {workspaces.map(workspace => (
                <div key={workspace.id} className="h-full min-h-[500px]">
                    <ImageWorkspace 
                        state={workspace}
                        onUpload={(f) => handleUpload(workspace.id, f)}
                        onUpdateState={(updates) => updateWorkspace(workspace.id, updates)}
                        onRequestEdit={(prompt) => handleRequestEdit(workspace.id, prompt)}
                        onOpenVideo={() => handleOpenVideo(workspace.id)}
                    />
                </div>
            ))}
         </div>
      </main>

      {/* Video Modal */}
      {videoModalOpen && (
        <VideoGenerator 
           selectedImage={selectedVideoSource}
           onClose={() => setVideoModalOpen(false)}
        />
      )}

    </div>
  );
}
