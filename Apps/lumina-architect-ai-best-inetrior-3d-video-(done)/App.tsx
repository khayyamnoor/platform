import React, { useState, useRef, useEffect } from 'react';
import { Upload, Hand, Download, Sparkles, RefreshCcw, Layers, Edit3, Undo, Redo, Check, Video, PlayCircle, Box, History as HistoryIcon, Clock, ArrowRight, X } from 'lucide-react';
import { ImageEditor } from './components/ImageEditor';
import { Button } from './components/Button';
import { ToolType, EditMode, ImageEditorHandle } from './types';
import { generateEditedImage, generateInteriorVideo } from './services/geminiService';

const EXAMPLE_PROMPTS = [
  "Change the wooden floor to polished concrete.",
  "Replace the curtains with modern roller blinds.",
  "Change the wall color to sage green with a matte finish."
];

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [endImageBase64, setEndImageBase64] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  // Default to MOVE as masking tools are removed
  const [tool, setTool] = useState<ToolType>(ToolType.MOVE);
  const [editMode, setEditMode] = useState<EditMode>(EditMode.EDIT);
  const [brushSize, setBrushSize] = useState(30);
  const [hasMask, setHasMask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 3D Parallax State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to load image from base64 string
  const loadImageFromBase64 = (base64: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = base64;
    });
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
        setError("Please upload valid image files.");
        return;
    }

    // Load first image (Start Frame)
    const reader1 = new FileReader();
    reader1.onload = (event) => {
        const base64 = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setImageBase64(base64);
          
          // Initialize History
          setHistory([base64]);
          setHistoryIndex(0);
          
          setGeneratedImage(null);
          setGeneratedVideo(null);
          setHasMask(false);
          setError(null);

          // If a second image exists, load it as End Frame and switch to Tour Mode
          if (validFiles.length > 1) {
            const reader2 = new FileReader();
            reader2.onload = (event2) => {
                const endBase64 = event2.target?.result as string;
                setEndImageBase64(endBase64);
                setEditMode(EditMode.TOUR);
            };
            reader2.readAsDataURL(validFiles[1]);
          } else {
             setEndImageBase64(null);
          }
        };
        img.src = base64;
    };
    reader1.readAsDataURL(validFiles[0]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) processFiles(files as File[]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files as File[]);
  };

  const handleMouseMoveParallax = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25; // Sensitivity divisor
    const y = (e.clientY - top - height / 2) / 25;
    setMousePos({ x, y });
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;
    // For video, we might not need a prompt if we have start+end, but let's keep it for style guidance or required param
    if (editMode === EditMode.EDIT && !prompt.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (editMode === EditMode.TOUR) {
        // Video Generation Logic
        
        // 1. Check API Key for Veo
        const win = window as any;
        if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
                setIsProcessing(false);
                return;
            }
        }
        
        let videoPrompt = prompt || "Cinematic slow pan of the room, architectural visualization";
        if (endImageBase64 && !prompt) {
            videoPrompt = "Smooth cinematic transition between the starting and ending architectural states";
        }

        const videoUrl = await generateInteriorVideo(
            generatedImage || imageBase64, 
            videoPrompt,
            endImageBase64 || undefined
        );
        setGeneratedVideo(videoUrl);

      } else {
        // Image Generation Logic (Global Edit)
        const maskBase64 = undefined;
        let finalPrompt = prompt;
        
        const resultBase64 = await generateEditedImage(imageBase64, finalPrompt, maskBase64);
        setGeneratedImage(resultBase64);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyEdit = async () => {
    if (!generatedImage) return;

    try {
      const newImg = await loadImageFromBase64(generatedImage);
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(generatedImage);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      setImage(newImg);
      setImageBase64(generatedImage);
      
      setGeneratedImage(null);
      setHasMask(false);
      setPrompt(""); 
      setError(null);
      
    } catch (e) {
      console.error("Failed to apply edit", e);
      setError("Failed to apply the edit. Please try again.");
    }
  };

  const jumpToHistory = async (index: number) => {
    if (index === historyIndex) return;
    const base64 = history[index];
    const img = await loadImageFromBase64(base64);
    
    setImage(img);
    setImageBase64(base64);
    setHistoryIndex(index);
    setGeneratedImage(null); // Clear any pending preview
    setGeneratedVideo(null);
    setHasMask(false);
  };

  const handleUndo = async () => {
    if (historyIndex > 0) {
      jumpToHistory(historyIndex - 1);
    }
  };

  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      jumpToHistory(historyIndex + 1);
    }
  };

  const handleDownload = () => {
    if (generatedVideo) {
        const link = document.createElement('a');
        link.href = generatedVideo;
        link.download = `lumina-tour-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `lumina-edit-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleMode = (mode: EditMode) => {
    setEditMode(mode);
    setGeneratedImage(null); 
    setGeneratedVideo(null);
    setError(null);
    setMousePos({ x: 0, y: 0 });
  };
  
  const removeEndFrame = () => {
      setEndImageBase64(null);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-brand-900 text-gray-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-brand-700 bg-brand-800/80 px-6 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-accent to-blue-600 shadow-lg shadow-brand-accent/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Lumina<span className="text-brand-accent">Architect</span></span>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />}>
              Upload New
           </Button>
           {process.env.API_KEY ? (
             <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">System Online</span>
           ) : (
             <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full border border-red-400/20">API Key Missing</span>
           )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Toolbar - Updated with History */}
        <div className="flex w-20 flex-col items-center gap-4 border-r border-brand-700 bg-brand-800 py-6 overflow-y-auto no-scrollbar">
          <div className="space-y-4 w-full flex flex-col items-center">
             <div 
                className={`p-3 rounded-xl transition-all bg-brand-accent text-white shadow-lg shadow-brand-accent/20 cursor-default`}
                title="View Mode"
             >
                <Hand size={20} />
             </div>
             
             {editMode === EditMode.TOUR && (
                <div className="text-brand-accent p-3">
                    <Box size={24} className="animate-pulse" />
                </div>
             )}
          </div>

          {/* History Thumbnails */}
          {history.length > 0 && (
             <>
                <div className="w-12 h-px bg-brand-700 my-2 shrink-0" />
                <div className="flex flex-col gap-3 w-full px-2 items-center">
                     <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                        <Clock size={10} /> History
                     </div>
                     {history.map((histState, idx) => (
                         <button
                            key={idx}
                            onClick={() => jumpToHistory(idx)}
                            className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all group shrink-0 ${
                                idx === historyIndex 
                                ? 'border-brand-accent shadow-[0_0_10px_rgba(56,189,248,0.3)] ring-2 ring-brand-accent/20' 
                                : 'border-transparent hover:border-gray-500 opacity-60 hover:opacity-100'
                            }`}
                            title={`Version ${idx + 1}`}
                         >
                            <img src={histState} className="w-full h-full object-cover" alt={`v${idx}`} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <span className="absolute bottom-0 right-0 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-tl-md font-mono">
                                {idx === 0 ? 'Start' : `#${idx}`}
                            </span>
                         </button>
                     ))}
                </div>
             </>
          )}
        </div>

        {/* Center Canvas Area */}
        <div 
            className={`relative flex flex-1 flex-col bg-brand-900 p-8 transition-colors ${isDragging ? 'bg-brand-800 ring-4 ring-brand-accent ring-inset' : ''}`}
            onMouseMove={handleMouseMoveParallax}
            onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
           {/* Canvas Toolbar / History Controls - Kept for quick access */}
           {image && !generatedImage && !generatedVideo && editMode !== EditMode.TOUR && history.length > 1 && (
             <div className="absolute top-10 right-10 z-20 flex items-center gap-2 bg-brand-800/90 p-2 rounded-lg border border-brand-700 shadow-xl backdrop-blur-sm">
                <button 
                  onClick={handleUndo} 
                  disabled={historyIndex <= 0}
                  className="p-2 text-gray-300 hover:text-white hover:bg-brand-700 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Undo"
                >
                  <Undo size={18} />
                </button>
                <span className="text-xs font-mono text-gray-500 w-12 text-center">
                  {historyIndex + 1} / {history.length}
                </span>
                <button 
                  onClick={handleRedo} 
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 text-gray-300 hover:text-white hover:bg-brand-700 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Redo"
                >
                  <Redo size={18} />
                </button>
             </div>
           )}

            {/* Drag Overlay */}
           {isDragging && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-900/80 backdrop-blur-sm border-4 border-dashed border-brand-accent m-4 rounded-2xl pointer-events-none">
                <div className="text-center animate-bounce">
                    <Upload size={48} className="mx-auto text-brand-accent mb-4" />
                    <p className="text-2xl font-bold text-white">Drop Images (1 or 2)</p>
                    <p className="text-sm text-gray-400 mt-2">1 for Edit • 2 for Tour Video</p>
                </div>
             </div>
           )}

           <div 
             ref={containerRef}
             className="flex-1 rounded-2xl border border-brand-700 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] shadow-2xl relative overflow-hidden"
             style={{ perspective: '1000px' }}
           >
             {generatedVideo ? (
                <div 
                    className="relative w-full h-full flex items-center justify-center bg-black transition-transform duration-100 ease-out"
                    style={{
                        transform: `rotateX(${-mousePos.y}deg) rotateY(${mousePos.x}deg) scale(1.05)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    <video 
                        src={generatedVideo} 
                        controls 
                        autoPlay 
                        loop
                        className="max-w-full max-h-full shadow-2xl"
                    />
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl pointer-events-none z-50" style={{ transform: 'translateZ(40px)' }}>
                        <Sparkles size={14} className="text-brand-accent" />
                        <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">AI Generated</span>
                    </div>
                     <div className="absolute top-4 right-4 flex gap-2" style={{ transform: 'translateZ(30px)' }}>
                        <Button variant="secondary" onClick={() => setGeneratedVideo(null)} icon={<RefreshCcw size={16} />}>
                            Back
                        </Button>
                        <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
                            Download Video
                        </Button>
                    </div>
                </div>
             ) : generatedImage ? (
                <div 
                    className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                    style={{
                        transform: `rotateX(${-mousePos.y}deg) rotateY(${mousePos.x}deg) scale(1.05)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl" />
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl pointer-events-none z-50" style={{ transform: 'translateZ(40px)' }}>
                        <Sparkles size={14} className="text-brand-accent" />
                        <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">AI Generated</span>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2" style={{ transform: 'translateZ(30px)' }}>
                        <Button variant="secondary" onClick={() => setGeneratedImage(null)} icon={<RefreshCcw size={16} />}>
                            Back to Edit
                        </Button>
                        <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
                            Download
                        </Button>
                        <Button variant="primary" className="bg-green-600 hover:bg-green-700 focus:ring-green-600" onClick={handleApplyEdit} icon={<Check size={16} />}>
                            Apply & Continue
                        </Button>
                    </div>
                </div>
             ) : (
                <div 
                    className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                    style={{
                        transform: `rotateX(${-mousePos.y}deg) rotateY(${mousePos.x}deg) scale(1.05)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {editMode === EditMode.TOUR && image && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
                                <Box size={48} className="text-brand-accent mx-auto mb-2 opacity-80" />
                                <p className="text-white font-medium">3D Preview Mode</p>
                                <p className="text-xs text-gray-300">Move mouse to view parallax depth</p>
                            </div>
                        </div>
                    )}
                    
                    {editMode === EditMode.EDIT ? (
                         <ImageEditor 
                            ref={editorRef}
                            image={image} 
                            tool={tool} 
                            brushSize={brushSize}
                            onMaskChange={setHasMask}
                        />
                    ) : (
                        image && (
                            <img 
                                src={imageBase64 || image.src} 
                                alt="Preview"
                                className="max-w-full max-h-full object-contain shadow-2xl" 
                            />
                        )
                    )}
                </div>
             )}
           </div>
           
           <input 
               type="file" 
               ref={fileInputRef}
               className="hidden" 
               accept="image/*"
               multiple
               onChange={handleFileUpload}
           />
           
           {!image && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="pointer-events-auto text-center">
                        <Button 
                            variant="primary" 
                            className="px-8 py-4 text-lg shadow-xl shadow-brand-accent/20"
                            onClick={() => fileInputRef.current?.click()}
                            icon={<Upload size={24} />}
                        >
                            Upload Interior Photo
                        </Button>
                        <p className="text-gray-500 text-sm mt-4">Support for JPG, PNG, WEBP</p>
                    </div>
                </div>
           )}
        </div>

        {/* Right Control Panel */}
        <div className="w-96 border-l border-brand-700 bg-brand-800 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Mode Toggle */}
            <div className="bg-brand-900 p-1 rounded-lg flex border border-brand-700">
                <button
                    onClick={() => toggleMode(EditMode.EDIT)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                        editMode === EditMode.EDIT 
                        ? 'bg-brand-700 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Edit3 size={16} />
                    Edit
                </button>
                <button
                    onClick={() => toggleMode(EditMode.TOUR)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                        editMode === EditMode.TOUR 
                        ? 'bg-brand-700 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Video size={16} />
                    Tour
                </button>
                <button
                    onClick={() => toggleMode(EditMode.HISTORY)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                        editMode === EditMode.HISTORY 
                        ? 'bg-brand-700 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <HistoryIcon size={16} />
                    History
                </button>
            </div>

            {/* Panel Content based on Mode */}
            {editMode === EditMode.HISTORY ? (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                     <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Edit History</h2>
                        <p className="text-sm text-gray-400">View and restore previous versions of your image.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center mt-10">No history yet. Upload an image to start.</p>
                        ) : (
                            history.map((histState, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border ${idx === historyIndex ? 'border-brand-accent bg-brand-800' : 'border-brand-700 bg-brand-900'} flex gap-4 items-center transition-colors`}>
                                    <img src={histState} className="w-16 h-16 object-cover rounded-lg border border-brand-700" alt={`v${idx}`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Version {idx + 1}</p>
                                        <p className="text-xs text-gray-400">{idx === 0 ? 'Original Image' : 'Applied Edit'}</p>
                                    </div>
                                    <Button 
                                        variant="secondary" 
                                        className="text-xs py-1.5 px-3"
                                        onClick={() => jumpToHistory(idx)}
                                        disabled={idx === historyIndex}
                                    >
                                        {idx === historyIndex ? 'Current' : 'Restore'}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : editMode === EditMode.TOUR ? (
                <div className="flex-1 flex flex-col gap-6">
                     <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Virtual Tour</h2>
                        <p className="text-sm text-gray-400">Generate a 3D cinematic flythrough video.</p>
                    </div>

                    {/* Keyframes Section */}
                    <div className="bg-brand-900/50 p-4 rounded-xl border border-brand-700">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-3">Keyframes</label>
                        <div className="flex items-center gap-2">
                             {/* Start Frame */}
                             <div className="flex-1 space-y-2">
                                 <div className="aspect-square rounded-lg bg-brand-800 border-2 border-brand-600 overflow-hidden relative group">
                                     {imageBase64 ? (
                                         <img src={imageBase64} className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-gray-600">Start</div>
                                     )}
                                     <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">Start</div>
                                 </div>
                             </div>

                             <ArrowRight className="text-gray-500" size={20} />

                             {/* End Frame */}
                             <div className="flex-1 space-y-2">
                                 <div className={`aspect-square rounded-lg bg-brand-800 border-2 overflow-hidden relative group ${!endImageBase64 ? 'border-dashed border-gray-600 hover:border-brand-accent cursor-pointer' : 'border-brand-600'}`}>
                                     {endImageBase64 ? (
                                         <>
                                            <img src={endImageBase64} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={removeEndFrame}
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                            <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">End</div>
                                         </>
                                     ) : (
                                         <label className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-brand-accent cursor-pointer">
                                             <Upload size={16} className="mb-1" />
                                             <span className="text-[10px]">Add End</span>
                                             <input 
                                                 type="file" 
                                                 className="hidden" 
                                                 accept="image/*"
                                                 onChange={(e) => {
                                                     const file = e.target.files?.[0];
                                                     if (file) {
                                                         const reader = new FileReader();
                                                         reader.onload = (ev) => setEndImageBase64(ev.target?.result as string);
                                                         reader.readAsDataURL(file);
                                                     }
                                                 }}
                                             />
                                         </label>
                                     )}
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Camera Movement</label>
                             <div className="grid grid-cols-2 gap-2">
                                 {["Cinematic Pan", "Slow Zoom In", "Orbit", "Fly Through"].map((m) => (
                                     <button 
                                        key={m}
                                        onClick={() => setPrompt(m + " of the room, high resolution, 4k, photorealistic")}
                                        className="text-xs bg-brand-900 border border-brand-700 p-3 rounded-lg hover:border-brand-accent hover:text-brand-accent transition-all text-left"
                                     >
                                        {m}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        
                         <textarea 
                            className="w-full h-24 rounded-xl bg-brand-900 border-brand-600 p-4 text-gray-200 placeholder-gray-500 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent resize-none transition-all text-sm"
                            placeholder={endImageBase64 ? "Describe the transition between states..." : "Describe the video movement..."}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <div className="mt-auto p-4 rounded-lg bg-purple-900/20 border border-purple-500/20">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-2">
                            <Video size={14} />
                            AI Video Generation
                        </h4>
                        <p className="text-xs text-purple-200/70 leading-relaxed">
                            {endImageBase64 
                                ? "Generates a morphing video transition between the two images."
                                : "Uses Gemini Veo 3.1 to simulate a 3D environment from a single image."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Global Edit</h2>
                        <p className="text-sm text-gray-400">Describe the changes you want to apply to the entire scene.</p>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <textarea 
                            className="w-full h-40 rounded-xl bg-brand-900 border-brand-600 p-4 text-gray-200 placeholder-gray-500 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent resize-none transition-all"
                            placeholder="E.g., Change the carpet to a beige wool texture. Modernize the furniture."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Examples</p>
                            <div className="flex flex-col gap-2">
                                {EXAMPLE_PROMPTS.map((p, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setPrompt(p)}
                                        className="text-left text-xs text-gray-400 hover:text-brand-accent transition-colors p-2 rounded-lg hover:bg-brand-700/50 border border-transparent hover:border-brand-700 truncate"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings / Features (Common) */}
            {editMode !== EditMode.HISTORY && (
                <div className="space-y-4 border-t border-brand-700 pt-6">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Layers size={16} />
                            <span>Preserve Geometry</span>
                        </div>
                        <div className="h-4 w-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-end px-1">
                            <div className="h-2 w-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Action Button */}
            {editMode !== EditMode.HISTORY && (
                <div className="mt-auto pt-6">
                    <Button 
                        variant="primary"
                        className={`w-full py-4 text-lg font-semibold shadow-lg transition-all ${
                            editMode === EditMode.TOUR 
                            ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-600 shadow-purple-500/20' 
                            : 'shadow-brand-accent/20 hover:shadow-brand-accent/40'
                        }`}
                        onClick={handleGenerate}
                        disabled={!image || (!prompt && !endImageBase64)}
                        isLoading={isProcessing}
                        icon={editMode === EditMode.TOUR ? <PlayCircle size={20} /> : <Sparkles size={20} />}
                    >
                        {editMode === EditMode.TOUR ? "Generate Video Tour" : "Generate Global Edit"}
                    </Button>
                    <p className="text-center text-xs text-gray-500 mt-3">
                        Powered by Gemini {editMode === EditMode.TOUR ? "Veo 3.1" : "3 Pro Vision"}
                    </p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}