import React, { useState, useEffect } from 'react';
import { Upload, Sparkles, SlidersHorizontal, Download, X, Loader2, User, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processProductImage, processProductVideo } from '../services/geminiService';
import { ProductImage, EditingSettings } from '../types';

// Declare global for window.aistudio
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function Workspace() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [prompt, setPrompt] = useState('Convert this into a hyper-realistic luxury product photo. Use cinematic studio lighting, soft shadows, a minimal white background, realistic reflections, and ultra detailed texture.');
  const [settings, setSettings] = useState<EditingSettings>({
    mode: 'studio',
    lighting: 80,
    background: 'Minimal white infinity',
    realism: 95,
    texture: 90,
    location: 'Urban city street during golden hour',
    country: 'France',
    area: 'Paris',
    modelSide: 'front',
    selectedModel: 'model1',
    modelDescription: '',
    modelInteraction: 'Wearing the item naturally',
    videoScript: 'Showcase the product in a dynamic lifestyle UGC ad format.',
    modelPose: 'candid lifestyle',
    customBackground: '',
    videoCameraMovement: 'Slow pan around the product',
    videoTransition: 'Smooth fade',
    videoFocusPoint: 'Product details and texture',
  });
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (window.aistudio?.hasSelectedApiKey) {
      window.aistudio.hasSelectedApiKey().then(setHasApiKey);
    }
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const getErrorMessage = (error: any) => {
    const errorString = error?.message || String(error);
    try {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(errorString);
      if (parsed.error && parsed.error.code === 429) {
        return "Rate limit exceeded. Please wait a moment and try again, or check your API key billing details.";
      }
      return parsed.error?.message || errorString;
    } catch (e) {
      // If not JSON, check for keywords
      if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
        return "Rate limit exceeded. Please wait a moment and try again, or check your API key billing details.";
      }
      return errorString || "An unknown error occurred.";
    }
  };

  const handleGenerateVideoFromImage = async (sourceImg: ProductImage) => {
    if (!hasApiKey) {
      alert("Please connect your Google Cloud API Key first to generate videos.");
      handleConnectKey();
      return;
    }

    const newId = Math.random().toString(36).substring(7);
    const newVideoImg: ProductImage = {
      id: newId,
      originalUrl: sourceImg.processedUrl!,
      mimeType: 'image/png',
      isVideo: true,
      status: 'processing'
    };

    // Add the new video processing card to the beginning of the list
    setImages(prev => [newVideoImg, ...prev]);

    try {
      const base64Data = sourceImg.processedUrl!.split(',')[1];
      const videoUrl = await processProductVideo(base64Data, 'image/png', prompt, settings);
      
      setImages(prev => prev.map(i => i.id === newId ? { ...i, processedUrl: videoUrl, status: 'done' } : i));
    } catch (error: any) {
      console.error("Video generation error:", error);
      setImages(prev => prev.map(i => i.id === newId ? { ...i, status: 'error', error: getErrorMessage(error) } : i));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      alert('Maximum 10 images allowed per batch.');
      return;
    }

    const newImages = files.map(file => {
      const id = Math.random().toString(36).substring(7);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        setImages(prev => prev.map(img => 
          img.id === id ? { ...img, originalUrl: event.target?.result as string, mimeType: file.type } : img
        ));
      };
      reader.readAsDataURL(file);

      return {
        id,
        originalUrl: '', // Will be updated when reader finishes
        mimeType: file.type,
        status: 'idle' as const
      };
    });

    setImages(prev => [...prev, ...newImages]);
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const processBatch = async () => {
    setIsProcessingBatch(true);
    
    // Mark all idle/error images as processing
    setImages(prev => prev.map(img => 
      img.status === 'idle' || img.status === 'error' ? { ...img, status: 'processing', error: undefined } : img
    ));

    const processPromises = images.map(async (img) => {
      if (img.status === 'done' || !img.originalUrl) return;

      try {
        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64Data = img.originalUrl.split(',')[1];
        
        const processedUrl = settings.mode === 'video'
          ? await processProductVideo(base64Data, img.mimeType || 'image/jpeg', prompt, settings)
          : await processProductImage(base64Data, img.mimeType || 'image/jpeg', prompt, settings);
        
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, processedUrl, isVideo: settings.mode === 'video', status: 'done' } : i));
      } catch (error: any) {
        console.error(`Error processing image ${img.id}:`, error);
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error', error: getErrorMessage(error) } : i));
      }
    });

    await Promise.all(processPromises);
    setIsProcessingBatch(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold text-xl">
            C
          </div>
          <h1 className="font-semibold tracking-tight text-lg">Challenge Me</h1>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium text-white/70 ml-2">PRO</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-white/60 hover:text-white transition-colors">Presets</button>
          <button className="text-sm font-medium text-white/60 hover:text-white transition-colors">Export All</button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Main Workspace */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          
          {/* Top: Upload Area */}
          <section className="bg-[#111] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
              <Upload className="w-6 h-6 text-white/70" />
            </div>
            <h3 className="text-lg font-medium mb-2">Upload Product Images</h3>
            <p className="text-sm text-white/40 max-w-md">
              Drag and drop up to 10 images. We support PNG, JPEG, and WebP.
            </p>
          </section>

          {/* Middle: Prompt Input */}
          <section className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Art Direction Prompt
              </h3>
              <button 
                onClick={() => setPrompt('Convert this into a hyper-realistic luxury product photo. Use cinematic studio lighting, soft shadows, a minimal white background, realistic reflections, and ultra detailed texture.')}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                Reset to Default
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              placeholder="Describe how you want your product to look..."
            />
          </section>

          {/* Bottom: Preview Grid */}
          <section className="flex-1 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                Batch Preview ({images.length}/10)
              </h3>
              {images.length > 0 && (
                <button 
                  onClick={() => setImages([])}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {images.length === 0 ? (
              <div className="h-full min-h-[300px] border border-white/5 border-dashed rounded-2xl flex items-center justify-center text-white/20">
                No images uploaded yet
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {images.map((img) => (
                    <motion.div 
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-[#111] border border-white/10 group"
                    >
                      {img.originalUrl && !img.processedUrl && (
                        <img 
                          src={img.originalUrl} 
                          alt="Product" 
                          className={`w-full h-full object-cover transition-opacity duration-500 ${img.status === 'processing' ? 'opacity-40 blur-sm' : 'opacity-100'}`}
                        />
                      )}
                      
                      {img.processedUrl && img.isVideo && (
                        <video 
                          src={img.processedUrl} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          className="w-full h-full object-cover transition-opacity duration-500"
                        />
                      )}
                      
                      {img.processedUrl && !img.isVideo && (
                        <img 
                          src={img.processedUrl} 
                          alt="Product" 
                          className="w-full h-full object-cover transition-opacity duration-500"
                        />
                      )}
                      
                      {/* Status Overlay */}
                      {img.status === 'processing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                          <span className="text-xs font-medium">Processing...</span>
                        </div>
                      )}
                      {img.status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 p-4 text-center">
                          <X className="w-6 h-6 text-red-500 mb-2 shrink-0" />
                          <span className="text-xs text-red-200 overflow-y-auto max-h-24 px-1">{img.error || 'Failed to process'}</span>
                          <button 
                            onClick={() => setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'idle', error: undefined } : i))}
                            className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] transition-colors shrink-0"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {img.processedUrl && !img.isVideo && (
                          <button 
                            onClick={() => handleGenerateVideoFromImage(img)}
                            className="w-8 h-8 rounded-full bg-blue-600/90 backdrop-blur flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                            title="Generate UGC Video Ad from this image"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        )}
                        {img.processedUrl && (
                          <button 
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = img.processedUrl!;
                              a.download = `challenge-me-${img.id}.${img.isVideo ? 'mp4' : 'png'}`;
                              a.click();
                            }}
                            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Before/After Label */}
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[10px] font-medium uppercase tracking-wider">
                        {img.processedUrl ? 'Processed' : 'Original'}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

        </div>

        {/* Right Column - Settings Panel */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24 flex flex-col gap-8">
            
            <div>
              <div className="flex bg-black/50 p-1 rounded-xl mb-6 border border-white/10">
                <button
                  onClick={() => setSettings({...settings, mode: 'studio'})}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${settings.mode === 'studio' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Studio
                </button>
                <button
                  onClick={() => setSettings({...settings, mode: 'model'})}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${settings.mode === 'model' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                >
                  <User className="w-3.5 h-3.5" />
                  On-Model
                </button>
                <button
                  onClick={() => setSettings({...settings, mode: 'video'})}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${settings.mode === 'video' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                >
                  <Video className="w-3.5 h-3.5" />
                  UGC Video
                </button>
              </div>
              
              <div className="space-y-6">
                {settings.mode === 'video' && !hasApiKey && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-4">
                    <p className="text-xs text-blue-200 mb-3">UGC Video generation requires a connected Google Cloud API Key.</p>
                    <button onClick={handleConnectKey} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                      Connect API Key
                    </button>
                  </div>
                )}

                {settings.mode === 'studio' ? (
                  <>
                    {/* Background Select */}
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-white/60 flex justify-between">
                        Environment
                      </label>
                      <select 
                        value={settings.background}
                        onChange={(e) => setSettings({...settings, background: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
                      >
                        <option value="Minimal white infinity">Minimal White Infinity</option>
                        <option value="Luxury marble table">Luxury Marble Table</option>
                        <option value="Dark cinematic background">Dark Cinematic</option>
                        <option value="Fashion editorial background">Fashion Editorial</option>
                        <option value="Glossy reflective surface">Glossy Reflective</option>
                        <option value="custom">Custom Description...</option>
                      </select>
                    </div>

                    {settings.background === 'custom' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Custom Background Description</label>
                        <input 
                          type="text" 
                          value={settings.customBackground}
                          onChange={(e) => setSettings({...settings, customBackground: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., A futuristic neon-lit cyberpunk street"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* On-Model Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60 flex justify-between">
                          Model Pose / Style
                        </label>
                        <select 
                          value={settings.modelPose}
                          onChange={(e) => setSettings({...settings, modelPose: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
                        >
                          <option value="candid lifestyle">Candid Lifestyle</option>
                          <option value="studio portrait">Studio Portrait</option>
                          <option value="action shot">Action Shot</option>
                          <option value="high fashion editorial">High Fashion Editorial</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60 flex justify-between">
                          Model Side / Angle
                        </label>
                        <select 
                          value={settings.modelSide}
                          onChange={(e) => setSettings({...settings, modelSide: e.target.value as any})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
                        >
                          <option value="front">Front View</option>
                          <option value="back">Back View</option>
                          <option value="left">Left Side</option>
                          <option value="right">Right Side</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60 flex justify-between">
                          Select Model
                        </label>
                        <select 
                          value={settings.selectedModel}
                          onChange={(e) => setSettings({...settings, selectedModel: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
                        >
                          <option value="model1">Emma (20s, Caucasian, Elegant)</option>
                          <option value="model2">Marcus (30s, Black, Athletic)</option>
                          <option value="model3">Yuki (25s, Asian, Streetwear)</option>
                          <option value="model4">Sofia (28s, Hispanic, Casual)</option>
                          <option value="custom">Custom Description...</option>
                        </select>
                      </div>
                      
                      {settings.selectedModel === 'custom' && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-white/60">Custom Model Description</label>
                          <input 
                            type="text" 
                            value={settings.modelDescription}
                            onChange={(e) => setSettings({...settings, modelDescription: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                            placeholder="e.g., Female fashion model, 20s"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-white/60">Country</label>
                          <input 
                            type="text" 
                            value={settings.country}
                            onChange={(e) => setSettings({...settings, country: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                            placeholder="e.g., France"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-white/60">Area / City</label>
                          <input 
                            type="text" 
                            value={settings.area}
                            onChange={(e) => setSettings({...settings, area: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                            placeholder="e.g., Paris"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Specific Location</label>
                        <input 
                          type="text" 
                          value={settings.location}
                          onChange={(e) => setSettings({...settings, location: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Cobblestone street at golden hour"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Model Interaction</label>
                        <input 
                          type="text" 
                          value={settings.modelInteraction}
                          onChange={(e) => setSettings({...settings, modelInteraction: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Wearing the jacket open, looking away"
                        />
                      </div>
                    </div>
                  </>
                )}

                {settings.mode === 'video' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/60">UGC Video Script / Action</label>
                      <textarea 
                        value={settings.videoScript}
                        onChange={(e) => setSettings({...settings, videoScript: e.target.value})}
                        className="w-full h-24 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                        placeholder="e.g., Model walks towards the camera showcasing the product, then spins around."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/60">Camera Movement</label>
                      <input 
                        type="text" 
                        value={settings.videoCameraMovement}
                        onChange={(e) => setSettings({...settings, videoCameraMovement: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                        placeholder="e.g., Slow pan, dynamic zoom, drone shot"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Transitions</label>
                        <input 
                          type="text" 
                          value={settings.videoTransition}
                          onChange={(e) => setSettings({...settings, videoTransition: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Fast cuts, smooth fade"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Focus Point</label>
                        <input 
                          type="text" 
                          value={settings.videoFocusPoint}
                          onChange={(e) => setSettings({...settings, videoFocusPoint: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Product texture, logo"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Country</label>
                        <input 
                          type="text" 
                          value={settings.country}
                          onChange={(e) => setSettings({...settings, country: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Japan"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Area / City</label>
                        <input 
                          type="text" 
                          value={settings.area}
                          onChange={(e) => setSettings({...settings, area: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                          placeholder="e.g., Tokyo"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/60">Specific Location</label>
                      <input 
                        type="text" 
                        value={settings.location}
                        onChange={(e) => setSettings({...settings, location: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30"
                        placeholder="e.g., Neon-lit street at night"
                      />
                    </div>
                  </div>
                )}

                {/* Sliders */}
                <div className="space-y-5">
                  <SliderControl 
                    label="Lighting Intensity" 
                    value={settings.lighting} 
                    onChange={(v) => setSettings({...settings, lighting: v})} 
                  />
                  <SliderControl 
                    label="Hyper-Realism" 
                    value={settings.realism} 
                    onChange={(v) => setSettings({...settings, realism: v})} 
                  />
                  <SliderControl 
                    label="Material Texture" 
                    value={settings.texture} 
                    onChange={(v) => setSettings({...settings, texture: v})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <button
                onClick={processBatch}
                disabled={images.length === 0 || isProcessingBatch || !images.some(i => i.status === 'idle' || i.status === 'error') || (settings.mode === 'video' && !hasApiKey)}
                className="w-full py-4 bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Batch...
                  </>
                ) : (
                  <>
                    {settings.mode === 'video' ? <Video className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {settings.mode === 'video' ? 'Generate UGC Video Ads' : 'Generate Studio Photos'}
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-white/40 mt-3">
                {settings.mode === 'video' ? 'Uses Veo Video Engine • ~2-3 mins per video' : 'Uses Nano Banana Engine • ~15s per image'}
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

function SliderControl({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-white/60">{label}</label>
        <span className="text-xs font-mono text-white/40">{value}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
      />
    </div>
  );
}
