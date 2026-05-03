/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Sparkles, Download, X, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// API Key Gate Component
function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        try {
          const res = await window.aistudio.hasSelectedApiKey();
          setHasKey(res);
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      } else {
        // Fallback for environments without window.aistudio
        setHasKey(true); 
      }
      setChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } else {
        alert("API Key selection is only available in AI Studio.");
        setHasKey(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-50 p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3 font-display">API Key Required</h1>
          <p className="mb-8 text-neutral-400 text-sm leading-relaxed">
            This application uses the advanced <span className="text-neutral-200 font-medium">gemini-3.1-flash-image-preview</span> model to generate high-quality logo variations. You must select your own Google Cloud project API key to continue.
          </p>
          <button 
            onClick={handleSelectKey} 
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Main Workspace Component
function MainWorkspace() {
  const [selectedImage, setSelectedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [imageResults, setImageResults] = useState<{ prompt: string; url?: string; error?: string; loading: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setSelectedImage({
        url: base64String,
        base64: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !userPrompt) return;
    
    setIsGeneratingPrompts(true);
    setImageResults([]);

    try {
      // Step 1: Generate 10 distinct prompts using Gemini 3.1 Pro
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: {
              data: selectedImage.base64,
              mimeType: selectedImage.mimeType
            }
          },
          `Analyze this logo. The user wants to redesign or modify it with this goal: "${userPrompt}". 
          Generate exactly 10 distinct, highly creative, and detailed image generation prompts to create variations of this logo. 
          Each prompt should be a descriptive instruction for an image generation model to edit the provided logo.
          Make them diverse in style, mood, and concept, while keeping the core identity if possible.
          Return ONLY a JSON array of 10 strings.`
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("No response from model");
      
      const prompts: string[] = JSON.parse(text);
      
      // Initialize results array
      const initialResults = prompts.map(p => ({ prompt: p, loading: true }));
      setImageResults(initialResults);
      setIsGeneratingPrompts(false); // Prompts are ready, start generating images
      
      // Step 2: Process images with concurrency limit
      const concurrency = 3;
      let currentIndex = 0;
      
      const processNext = async (): Promise<void> => {
        if (currentIndex >= prompts.length) return;
        const index = currentIndex++;
        const prompt = prompts[index];
        
        try {
          // Create a new instance for each call to ensure fresh API key if changed
          const aiImage = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
          const imgRes = await aiImage.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: selectedImage.base64,
                    mimeType: selectedImage.mimeType,
                  },
                },
                { text: prompt },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
              }
            }
          });
          
          let imageUrl = '';
          for (const part of imgRes.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
          
          if (!imageUrl) throw new Error("No image data in response");
          
          setImageResults(prev => {
            const next = [...prev];
            next[index] = { ...next[index], url: imageUrl, loading: false };
            return next;
          });
        } catch (err: any) {
          console.error(`Error generating image ${index}:`, err);
          setImageResults(prev => {
            const next = [...prev];
            next[index] = { ...next[index], error: err.message || "Failed to generate", loading: false };
            return next;
          });
        }
        
        await processNext();
      };
      
      const workers = Array(Math.min(concurrency, prompts.length)).fill(0).map(() => processNext());
      await Promise.all(workers);
      
    } catch (err: any) {
      console.error("Error generating prompts:", err);
      alert("Error generating prompts: " + err.message);
      setIsGeneratingPrompts(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-r border-neutral-800 bg-neutral-900 p-6 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-display">LogoIdeator</h1>
        </div>
        
        <div className="space-y-8 flex-1">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-3">1. Upload Base Logo</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${selectedImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50'}`}
            >
              {selectedImage ? (
                <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-neutral-950 shadow-inner">
                  <img src={selectedImage.url} alt="Selected" className="w-full h-full object-contain p-2" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-neutral-500">
                  <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-300">Click or drag image here</p>
                  <p className="text-xs mt-1.5">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" accept="image/*" />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-3">2. Creative Direction</label>
            <textarea 
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g., Make it look cyberpunk, add neon lights, make it minimalist and elegant..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none h-32 shadow-inner"
            />
          </div>
        </div>

        {/* Action */}
        <div className="pt-8 mt-auto">
          <button 
            onClick={handleGenerate}
            disabled={!selectedImage || !userPrompt || isGeneratingPrompts || imageResults.some(r => r.loading)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
          >
            {isGeneratingPrompts ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Brainstorming Ideas...</>
            ) : imageResults.some(r => r.loading) ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating Logos...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate 10 Ideas</>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto bg-neutral-950 p-6 md:p-8 lg:p-12">
        {isGeneratingPrompts ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 max-w-md mx-auto text-center">
            <Loader2 className="w-12 h-12 animate-spin mb-6 text-indigo-500" />
            <h2 className="text-xl font-medium text-neutral-200 mb-2 font-display">Analyzing your logo...</h2>
            <p className="text-sm">Gemini 3.1 Pro is brainstorming 10 unique, creative prompts based on your direction.</p>
          </div>
        ) : imageResults.length > 0 ? (
          <div className="space-y-8 max-w-7xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2 font-display">Generated Ideas</h2>
              <p className="text-neutral-400">10 unique variations based on your creative direction.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {imageResults.map((result, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-neutral-700 transition-all duration-300"
                  >
                    <div className="aspect-square w-full bg-neutral-950 relative">
                      {result.loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 p-6 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500/50" />
                          <p className="text-xs font-mono line-clamp-3 opacity-60">{result.prompt}</p>
                        </div>
                      ) : result.error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center bg-red-950/10">
                          <p className="text-sm font-medium mb-2">Failed to generate</p>
                          <p className="text-xs opacity-80">{result.error}</p>
                        </div>
                      ) : result.url ? (
                        <>
                          <img src={result.url} alt={`Idea ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                            <a 
                              href={result.url} 
                              download={`logo-idea-${idx + 1}.png`}
                              className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="p-4 border-t border-neutral-800 flex-1 bg-neutral-900/50">
                      <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed" title={result.prompt}>
                        {result.prompt}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 max-w-md mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-inner">
              <ImageIcon className="w-10 h-10 text-neutral-600" />
            </div>
            <h2 className="text-xl font-medium text-neutral-300 mb-2 font-display">No ideas generated yet</h2>
            <p className="text-sm leading-relaxed">Upload a base logo and provide a creative direction on the left to generate 10 unique variations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ApiKeyGate>
      <MainWorkspace />
    </ApiKeyGate>
  );
}
