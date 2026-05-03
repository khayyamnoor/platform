/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Loader2, Download, RefreshCcw, Video, Film, Wand2 } from 'lucide-react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { FrameUploader } from './components/FrameUploader';
import { generateDreamVideo } from './services/gemini';

export default function App() {
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [middleFrame, setMiddleFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!firstFrame || !prompt) {
      setError("Please provide at least a first frame and a prompt.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStatus("Preparing your prompt...");
    setVideoUrl(null);

    try {
      const apiKey = process.env.API_KEY || "";
      const url = await generateDreamVideo({
        prompt,
        firstFrame,
        middleFrame: middleFrame || undefined,
        lastFrame: lastFrame || undefined,
        apiKey,
        onStatusUpdate: setStatus
      });
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  };

  const reset = () => {
    setVideoUrl(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-sleek-bg text-sleek-text font-sans overflow-hidden">
      <ApiKeyGate>
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-sleek-border flex items-center justify-between px-6 bg-sleek-bg z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sleek-accent to-indigo-600 rounded-md shadow-lg shadow-sleek-accent/20"></div>
            <span className="font-bold tracking-tight text-lg text-white">FLUX.VIDEO</span>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-bold text-sleek-text-dim">
            <span className="hover:text-white cursor-pointer transition-colors">My Projects</span>
            <span className="hover:text-white cursor-pointer transition-colors">Community</span>
            <div className="w-8 h-8 rounded-full bg-sleek-border border border-sleek-border-alt flex items-center justify-center text-[10px] text-white">
              JD
            </div>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-80 shrink-0 border-r border-sleek-border bg-sleek-sidebar p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-sleek-text-muted">Sequence Framework</span>
              <div className="flex flex-col gap-4">
                <FrameUploader label="Frame 01 (Start)" onImageChange={setFirstFrame} required />
                <FrameUploader label="Frame 02 (Middle)" onImageChange={setMiddleFrame} />
                <FrameUploader label="Frame 03 (End)" onImageChange={setLastFrame} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-sleek-text-muted">AI Interpolation Prompt</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the transition..."
                className="w-full h-32 bg-sleek-card border border-sleek-border rounded-lg p-3 text-sleek-text text-sm resize-none focus:ring-1 focus:ring-sleek-accent transition-all outline-none placeholder:text-sleek-text-muted/50"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-sleek-text-muted">Target Duration</span>
              <div className="flex bg-sleek-card border border-sleek-border rounded-lg p-1 w-fit">
                <button className="px-4 py-1 text-[11px] font-bold text-sleek-text rounded-md bg-sleek-border">12s</button>
                <button className="px-4 py-1 text-[11px] font-bold text-sleek-text-muted hover:text-white transition-colors">24s</button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !firstFrame || !prompt}
              className="w-full h-11 bg-sleek-accent hover:bg-blue-500 disabled:bg-sleek-border disabled:text-sleek-text-muted rounded-lg font-bold text-sm text-white transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-sleek-accent/20"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Cinema Sequence'}
            </button>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-lg">
                {error}
              </div>
            )}
          </aside>

          {/* Preview Area */}
          <section className="flex-1 bg-sleek-preview p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!videoUrl ? (
                <motion.div 
                  key="preview-placeholder"
                  className="w-full max-w-3xl aspect-video bg-[#111] rounded-xl border border-sleek-border flex flex-col items-center justify-center gap-4 relative shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="absolute top-5 left-5 bg-black/50 backdrop-blur-md px-3 py-1 rounded border border-sleek-border text-[9px] uppercase font-bold tracking-widest text-sleek-text-dim">
                    Preview Mode: High-Fidelity
                  </div>
                  
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4 w-60">
                      <div className="text-sm font-medium text-sleek-text-dim mb-2">{status || 'Generating frames...'}</div>
                      <div className="w-full h-1 bg-sleek-card rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-sleek-accent"
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                      <Video className="w-12 h-12 text-sleek-border-alt mb-2" />
                      <p className="text-sm font-medium text-sleek-text-dim">Sequence Preview</p>
                      <p className="text-[11px] text-sleek-text-muted">Start by adding your keyframes</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="video-result"
                  className="w-full max-w-4xl flex flex-col gap-8"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="relative group">
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-sleek-border ring-1 ring-white/5">
                      <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="absolute -top-4 -right-4 flex gap-2">
                       <button onClick={reset} className="w-10 h-10 bg-sleek-card border border-sleek-border hover:border-sleek-accent rounded-full flex items-center justify-center text-white transition-all shadow-xl backdrop-blur-lg">
                        <RefreshCcw className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex gap-4">
                      {firstFrame && <img src={firstFrame} className="w-24 aspect-video object-cover rounded border border-sleek-border opacity-60 hover:opacity-100 transition-opacity" alt="Ref 1" />}
                      {middleFrame && <img src={middleFrame} className="w-24 aspect-video object-cover rounded border border-sleek-border opacity-20 transition-opacity" alt="Ref 2" />}
                      {lastFrame && <img src={lastFrame} className="w-24 aspect-video object-cover rounded border border-sleek-border opacity-60 hover:opacity-100 transition-opacity" alt="Ref 3" />}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold tracking-tight">00:15 <span className="text-sleek-border-alt">/ 00:20</span></div>
                      <div className="text-[10px] text-sleek-text-muted font-bold tracking-widest uppercase mt-1">24 FPS • 720P HD VEO ENGINE</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Actions */}
            <div className="absolute bottom-6 right-6 flex gap-2">
              {videoUrl && (
                <a 
                  href={videoUrl} 
                  download="dreamframe_export.mp4"
                  className="bg-sleek-card border border-sleek-border hover:border-sleek-accent text-sleek-text px-4 py-2 rounded-lg text-xs font-bold transition-all backdrop-blur-md flex items-center gap-2 shadow-xl"
                >
                  <Download className="w-3.5 h-3.5" /> Export MP4
                </a>
              )}
              <button className="bg-sleek-card border border-sleek-border hover:border-sleek-text-muted text-sleek-text px-4 py-2 rounded-lg text-xs font-bold transition-all backdrop-blur-md shadow-xl">
                Settings
              </button>
            </div>
          </section>
        </main>
      </ApiKeyGate>
    </div>
  );
}

