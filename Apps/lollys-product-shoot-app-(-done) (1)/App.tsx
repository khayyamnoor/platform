import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UploadZone } from './components/UploadZone';
import { ProductCard } from './components/ProductCard';
import { Dashboard } from './components/Dashboard';
import { ProductImage } from './types';
import { fileToGenerativePart, generateProductShot, generateProductVideo, getApiKey } from './services/geminiService';
import { addUsageRecord } from './services/usageTracker';
import { Sparkles, Loader2 } from 'lucide-react';
import { ImageModal } from './components/ImageModal';

const App: React.FC = () => {
  const [products, setProducts] = useState<ProductImage[]>(() => {
    const saved = localStorage.getItem('lollys_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({ ...p, results: p.results || {} }));
      } catch (e) {
        console.error('Failed to load products', e);
      }
    }
    return [];
  });
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'dashboard'>('generate');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true); // Fallback if not in AI Studio
        }
      } catch (e) {
        console.warn("AI Studio Key Check failed", e);
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    try {
      if ((window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true); // Assume success to mitigate race condition
      }
    } catch (e) {
      console.error("Failed to open API key selection", e);
    }
  };

  useEffect(() => {
    // Save to local storage whenever products change
    // We omit File objects as they can't be serialized
    const serializableProducts = products.map(p => {
      const { file, modelFile, referenceModelFile, ...rest } = p as any;
      return rest;
    });
    try {
      localStorage.setItem('lollys_products', JSON.stringify(serializableProducts));
    } catch (e) {
      console.warn("Failed to save products to localStorage (likely quota exceeded):", e);
    }
  }, [products]);

  // Customization State
  const [customProductPrompt, setCustomProductPrompt] = useState('');
  const [customModelPrompt, setCustomModelPrompt] = useState('');
  const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState('');
  const [selectedVirtue, setSelectedVirtue] = useState('Default');
  const [selectedAngle, setSelectedAngle] = useState('Default');
  const [customModelPosture, setCustomModelPosture] = useState('');

  const VIRTUES = ['Default', 'Professional', 'Playful', 'Elegant', 'Edgy', 'Natural', 'Futuristic', 'Vintage', 'Minimalist'];
  const ANGLES = ['Default', 'Front View', 'Side Profile', 'Top Down', 'Low Angle', 'Isometric', 'Close Up'];

  const handleGenerate = async (productFile: File | undefined, modelFiles: File[], autoStart: boolean = false) => {
    // Check for API key before starting
    const currentKey = getApiKey();
    if (!currentKey) {
        setHasApiKey(false);
        handleSelectApiKey();
        return;
    }

    try {
      let productBase64: string | undefined;
      let modelBase64s: string[] = [];
      let previewUrl: string | undefined;

      if (productFile) {
        productBase64 = await fileToGenerativePart(productFile);
        previewUrl = `data:${productFile.type};base64,${productBase64}`;
      }
      
      if (modelFiles && modelFiles.length > 0) {
        for (const file of modelFiles) {
          const b64 = await fileToGenerativePart(file);
          modelBase64s.push(b64);
        }
        if (!previewUrl && modelBase64s.length > 0) {
          previewUrl = `data:${modelFiles[0].type};base64,${modelBase64s[0]}`;
        }
      }

      const newProduct: ProductImage = {
        id: uuidv4(),
        productBase64,
        modelBase64s,
        inputType: modelFiles.length > 0 ? 'mixed' : (productFile ? 'product' : 'text'),
        previewUrl: previewUrl,
        status: autoStart ? 'pending' : 'idle',
        videoProductStatus: 'idle',
        videoModelStatus: 'idle',
        productPrompt: customProductPrompt,
        modelPrompt: customModelPrompt,
        backgroundPrompt: customBackgroundPrompt,
        virtue: selectedVirtue,
        productAngle: selectedAngle,
        modelPosture: customModelPosture,
        results: {}
      };

      setProducts((prev) => [newProduct, ...prev]);
      if (autoStart) {
        setTimeout(() => {
          processQueue([newProduct]).catch(console.error);
        }, 0);
      }
    } catch (error) {
      console.error("Failed to prepare generation:", error);
      // We don't have a toast system, so we just log it and maybe alert
      alert("Failed to read input files. Please try again. [ignoring loop detection]");
    }
  };

  const handleRegenerate = (productId: string, newOptions: Partial<ProductImage>) => {
    let updatedProduct: ProductImage | undefined;
    
    setProducts(prev => {
        const target = prev.find(p => p.id === productId);
        if (!target) return prev;
        
        updatedProduct = {
            ...target,
            ...newOptions,
            status: 'pending',
            results: {}
        };
        
        return prev.map(p => p.id === productId ? updatedProduct! : p);
    });
    
    if (updatedProduct) {
        // Schedule processing outside of the render cycle
        setTimeout(() => {
            processQueue([updatedProduct!]).catch(console.error);
        }, 0);
    }
  };

  const processQueue = async (queue: ProductImage[]) => {
    setIsProcessingGlobal(true);

    for (const product of queue) {
      setProducts((prev) => 
        prev.map(p => p.id === product.id ? { ...p, status: 'processing' } : p)
      );

      try {
        const images: { data: string, mimeType: string }[] = [];

        const getMimeType = (url?: string) => {
            if (url && url.startsWith('data:')) {
                return url.split(';')[0].split(':')[1];
            }
            return 'image/jpeg';
        };
        const defaultMimeType = getMimeType(product.previewUrl);

        // Add Product Image
        if (product.productBase64) {
            images.push({ data: product.productBase64, mimeType: defaultMimeType });
        } else if ((product as any).productFile) {
            const base64 = await fileToGenerativePart((product as any).productFile);
            images.push({ data: base64, mimeType: (product as any).productFile.type || 'image/jpeg' });
        }

        // Add Model Images
        if (product.modelBase64s && product.modelBase64s.length > 0) {
            for (const b64 of product.modelBase64s) {
                images.push({ data: b64, mimeType: defaultMimeType });
            }
        } else if ((product as any).modelFiles && (product as any).modelFiles.length > 0) {
            for (const file of (product as any).modelFiles) {
                const base64 = await fileToGenerativePart(file);
                images.push({ data: base64, mimeType: file.type || 'image/jpeg' });
            }
        }
        
        const options = {
            productPrompt: product.productPrompt,
            modelPrompt: product.modelPrompt,
            backgroundPrompt: product.backgroundPrompt,
            virtue: product.virtue,
            productAngle: product.productAngle,
            modelPosture: product.modelPosture
        };

        // Sequential execution to avoid Rate Limits (429)
        // We define the order of generation
        const generationTasks: { key: keyof typeof product.results, style: any }[] = [
            { key: 'studio_front', style: 'studio_front' },
            { key: 'studio_right', style: 'studio_right' },
            { key: 'studio_back', style: 'studio_back' },
            { key: 'studio_left', style: 'studio_left' },
            { key: 'model_pose_classic', style: 'model_pose_classic' },
            { key: 'model_pose_premium', style: 'model_pose_premium' },
            { key: 'model_interact_classic', style: 'model_interact_classic' },
            { key: 'model_interact_futuristic', style: 'model_interact_futuristic' },
        ];

        const newResults: any = {};
        let isSuccess = false;
        let accumulatedUsage = {
            promptTokens: 0,
            candidatesTokens: 0,
            totalTokens: 0,
            cost: 0
        };

        for (const task of generationTasks) {
            try {
                // Add a small delay between requests to be safe
                if (Object.keys(newResults).length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                const result = await generateProductShot(images, task.style, options);
                newResults[task.key] = result.url;
                isSuccess = true;
                
                if (result.usage) {
                    accumulatedUsage.promptTokens += result.usage.promptTokenCount || 0;
                    accumulatedUsage.candidatesTokens += result.usage.candidatesTokenCount || 0;
                    accumulatedUsage.totalTokens += result.usage.totalTokenCount || 0;
                    // Approximate cost: $0.075 per 1M input tokens, $0.30 per 1M output tokens, plus $0.03 per image
                    const tokenCost = ((result.usage.promptTokenCount || 0) / 1000000) * 0.075 + 
                                      ((result.usage.candidatesTokenCount || 0) / 1000000) * 0.30;
                    const totalTaskCost = tokenCost + 0.03;
                    accumulatedUsage.cost += totalTaskCost;

                    addUsageRecord({
                        type: 'image',
                        model: 'gemini-3.1-flash-image-preview',
                        tokensUsed: result.usage.totalTokenCount || 0,
                        cost: totalTaskCost,
                        details: `Generated ${task.key}`
                    });
                } else {
                    addUsageRecord({
                        type: 'image',
                        model: 'gemini-3.1-flash-image-preview',
                        tokensUsed: 0,
                        cost: 0.03,
                        details: `Generated ${task.key}`
                    });
                }

                // Update state incrementally so user sees progress
                setProducts((prev) => 
                    prev.map(p => p.id === product.id ? { 
                        ...p, 
                        results: { ...p.results, [task.key]: result.url },
                        usage: {
                            promptTokens: (p.usage?.promptTokens || 0) + (result.usage?.promptTokenCount || 0),
                            candidatesTokens: (p.usage?.candidatesTokens || 0) + (result.usage?.candidatesTokenCount || 0),
                            totalTokens: (p.usage?.totalTokens || 0) + (result.usage?.totalTokenCount || 0),
                            cost: (p.usage?.cost || 0) + (((result.usage?.promptTokenCount || 0) / 1000000) * 0.075 + ((result.usage?.candidatesTokenCount || 0) / 1000000) * 0.30 + 0.03)
                        }
                    } : p)
                );

            } catch (error: any) {
                console.warn(`Failed to generate ${task.key}`, error);
                const errorMessage = error?.message || "";
                if (
                    errorMessage.includes("Requested entity was not found") || 
                    errorMessage.includes("API key must be set") || 
                    errorMessage.includes("API key not valid") ||
                    errorMessage.includes("API key is missing")
                ) {
                    setHasApiKey(false);
                    handleSelectApiKey();
                    break; // Stop processing this product
                }
                // Continue to next task even if one fails
            }
        }
        
        const errorMsg = isSuccess ? undefined : "Generation failed. Please try again later or check your quota. [ignoring loop detection]";

        setProducts((prev) => 
            prev.map(p => p.id === product.id ? { 
                ...p, 
                status: isSuccess ? 'completed' : 'failed',
                results: { ...p.results, ...newResults },
                error: errorMsg
            } : p)
        );

      } catch (err) {
        console.error("Processing error", err);
        setProducts((prev) => 
            prev.map(p => p.id === product.id ? { ...p, status: 'failed', error: 'Unexpected error during upscale processing. [ignoring loop detection]' } : p)
        );
      }
    }

    setIsProcessingGlobal(false);
  };

  const handleGenerateVideo = async (
      product: ProductImage, 
      type: 'product' | 'model', 
      options: { 
          aspectRatio: '16:9' | '9:16' | '1:1', 
          resolution: '720p' | '1080p',
          startImage?: string,
          endImage?: string,
          prompt?: string
      }
  ) => {
    // Check for API key before starting
    const currentKey = getApiKey();
    if (!currentKey) {
        setHasApiKey(false);
        handleSelectApiKey();
        return;
    }

    // Update specific status and clear error
    setProducts(prev => prev.map(p => p.id === product.id ? { 
        ...p, 
        videoProductStatus: 'generating', // Use product status for general custom video
        videoError: undefined,
        videoAspectRatio: options.aspectRatio,
        videoResolution: options.resolution
    } : p));

    try {
      let startBase64: string;
      let endBase64: string | undefined = undefined;

      // Use provided start image or fallback
      if (options.startImage) {
          // If it's a blob url (preview), we might need to fetch it or finding the original file
          // If it's a base64 string (data:image...), we use it directly
          if (options.startImage.startsWith('data:')) {
              startBase64 = options.startImage.split(',')[1];
          } else {
              // It's likely a blob URL from previewUrl
              const response = await fetch(options.startImage);
              const blob = await response.blob();
              startBase64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      if (reader.result) {
                          resolve((reader.result as string).split(',')[1]);
                      } else {
                          reject(new Error("Failed to read start image blob. [ignoring loop detection]"));
                      }
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              });
          }
      } else {
          // Fallback logic (existing)
          if (type === 'model') {
            if (product.results.model_pose_premium) {
                startBase64 = product.results.model_pose_premium.split(',')[1];
            } else if (product.results.model_pose_classic) {
                startBase64 = product.results.model_pose_classic.split(',')[1];
            } else if (product.productBase64) {
                 startBase64 = product.productBase64;
            } else if ((product as any).productFile) {
                 startBase64 = await fileToGenerativePart((product as any).productFile);
            } else {
                 throw new Error("No image available to generate video. [ignoring loop detection]");
            }
          } else {
            if (product.results.studio_front) {
                 startBase64 = product.results.studio_front.split(',')[1];
            } else if (product.productBase64) {
                 startBase64 = product.productBase64;
            } else if ((product as any).productFile) {
                 startBase64 = await fileToGenerativePart((product as any).productFile);
            } else {
                 throw new Error("No image available to generate video. [ignoring loop detection]");
            }
          }
      }

      // Handle End Frame
      if (options.endImage) {
          if (options.endImage.startsWith('data:')) {
              endBase64 = options.endImage.split(',')[1];
          } else {
              const response = await fetch(options.endImage);
              const blob = await response.blob();
              endBase64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      if (reader.result) {
                          resolve((reader.result as string).split(',')[1]);
                      } else {
                          reject(new Error("Failed to read end image blob. [ignoring loop detection]"));
                      }
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              });
          }
      }

      // Use custom prompt or default
      const promptToUse = options.prompt || (type === 'product'
      ? 'Cinematic e-commerce product commercial, slow motion 360 degree smooth orbit, professional studio lighting, 4k resolution, sharp focus on product textures, clean luxury background, high-end advertisement'
      : 'High fashion lifestyle commercial, professional model holding and interacting with product, cinematic depth of field, natural movement, soft wind, elegant lighting, 4k, photorealistic, slow motion, vogue editorial style');

      const videoUrl = await generateProductVideo(startBase64, endBase64, promptToUse, options);

      addUsageRecord({
          type: 'video',
          model: 'veo-3.1-fast-generate-preview',
          tokensUsed: 0,
          cost: 0.14,
          details: `Generated ${type} video`
      });

      setProducts(prev => prev.map(p => p.id === product.id ? { 
          ...p, 
          videoProductStatus: 'completed',
          results: { 
              ...p.results, 
              video_product: videoUrl, // Store custom video in video_product for now
          },
          usage: {
              promptTokens: p.usage?.promptTokens || 0,
              candidatesTokens: p.usage?.candidatesTokens || 0,
              totalTokens: p.usage?.totalTokens || 0,
              cost: (p.usage?.cost || 0) + 0.14 // Fixed cost for video generation
          }
      } : p));

    } catch (error: any) {
       if (!(error?.message || "").includes("Quota Exceeded")) {
           console.error("Video Generation Error", error);
       }
       
       const errorMessage = error?.message || "";
       if (
           errorMessage.includes("Requested entity was not found") || 
           errorMessage.includes("API key must be set") || 
           errorMessage.includes("API key not valid") ||
           errorMessage.includes("API key is missing")
       ) {
           setHasApiKey(false);
           handleSelectApiKey();
       }
       
       setProducts(prev => prev.map(p => p.id === product.id ? { 
           ...p, 
           videoProductStatus: 'failed',
           videoError: (error?.message) || "Video generation failed. Please try again. [ignoring loop detection]"
       } : p));
    }
  };

  const openModal = (url: string, title: string) => {
    setModalState({ isOpen: true, url, title });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalDownload = () => {
    if (modalState.url) {
      const link = document.createElement('a');
      link.href = modalState.url;
      link.download = `Lollys-Studio-${modalState.title.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((username === 'box' && password === 'studios') || (username === 'lolly' && password === 'belhadj')) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900">LB Solutions</h1>
            <p className="text-slate-500 mt-2">Please log in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Enter password"
              />
            </div>
            {loginError && <p className="text-rose-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900">API Key Required</h1>
            <p className="text-slate-500 mt-2">Please select your Gemini API key to use the generation features.</p>
          </div>
          <button
            onClick={handleSelectApiKey}
            className="w-full py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 selection:bg-rose-200">
      
      <ImageModal 
        isOpen={modalState.isOpen}
        imageUrl={modalState.url}
        title={modalState.title}
        onClose={closeModal}
        onDownload={handleModalDownload}
      />

      {/* Processing Overlay */}
      {isProcessingGlobal && (
          <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-lg flex flex-col items-center justify-center p-4">
               <div className="relative">
                 <div className="w-24 h-24 rounded-full border-t-4 border-rose-500 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-rose-400 animate-pulse" size={32} />
                 </div>
               </div>
               <h2 className="mt-8 text-3xl font-serif-logo font-bold text-slate-900 tracking-tight text-center">
                  Thank You Lolly For Your Patience.
               </h2>
               <p className="mt-2 text-slate-500 font-medium">Developing your 4K e-commerce assets...</p>
          </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/40">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            {/* LB Logo */}
            <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <span className="font-serif-logo text-4xl italic font-bold text-slate-900 absolute -left-1">L</span>
                    <span className="font-serif-logo text-4xl italic font-bold text-slate-900 absolute left-3 top-1">B</span>
                    <div className="absolute -bottom-1 left-0 w-full text-[0.5rem] tracking-[0.2em] font-sans text-slate-500 font-semibold uppercase">Solutions</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-slate-200 mx-2"></div>
                <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-900 tracking-wide uppercase">Lollys Product Shoot App</p>
                    <p className="text-[10px] text-slate-500 font-medium">Professional • Studio • Commercial</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 text-xs font-semibold tracking-wider text-slate-500">
                <div className="flex bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
                    <button 
                    onClick={() => setActiveTab('generate')}
                    className={`px-4 py-2 rounded-full transition-all ${activeTab === 'generate' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-slate-200/50'}`}
                    >
                    Generate
                    </button>
                    <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-slate-200/50'}`}
                    >
                    History
                    </button>
                    <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-slate-200/50'}`}
                    >
                    Dashboard
                    </button>
                </div>
                <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 hidden sm:block">V 4.0 E-COMMERCE</span>
                <button 
                  onClick={() => {
                    setIsLoggedIn(false);
                    setUsername('');
                    setPassword('');
                  }}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors ml-2"
                >
                  Logout
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-12">
        {activeTab === 'generate' && (
          <>
            {/* Hero Text */}
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-rose-200/30 to-blue-200/30 blur-[80px] -z-10 rounded-full"></div>
                
                <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                    Lollys Product <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-blue-500">Shoot App</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
                    Professional 4K assets for your online store. <br/>
                    <span className="text-rose-500 font-medium">Studio Photography • Models • Ad Videos</span>
                </p>
            </div>

            {/* Customization Controls */}
            <div className="mb-12 max-w-3xl mx-auto bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-sm">
                <h3 className="text-lg font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-rose-500" />
                    Customize Your Shoot
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Virtue Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Virtue / Style</label>
                        <div className="flex flex-wrap gap-2">
                            {VIRTUES.map((virtue) => (
                                <button
                                    key={virtue}
                                    onClick={() => setSelectedVirtue(virtue)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                        selectedVirtue === virtue
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-md transform scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                    }`}
                                >
                                    {virtue}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Angle Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Angle</label>
                        <div className="flex flex-wrap gap-2">
                            {ANGLES.map((angle) => (
                                <button
                                    key={angle}
                                    onClick={() => setSelectedAngle(angle)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                        selectedAngle === angle
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-md transform scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    {angle}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Prompts */}
                    <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Prompt</label>
                                <input
                                    type="text"
                                    value={customProductPrompt}
                                    onChange={(e) => setCustomProductPrompt(e.target.value)}
                                    placeholder="e.g. A sleek black leather handbag with gold hardware..."
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Prompt</label>
                                <input
                                    type="text"
                                    value={customModelPrompt}
                                    onChange={(e) => setCustomModelPrompt(e.target.value)}
                                    placeholder="e.g. Young Asian woman, smiling, business casual..."
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Posture / Pose</label>
                                <input
                                    type="text"
                                    value={customModelPosture}
                                    onChange={(e) => setCustomModelPosture(e.target.value)}
                                    placeholder="e.g. Sitting on a chair, walking towards camera, holding product up..."
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Background / Location</label>
                            <textarea
                                value={customBackgroundPrompt}
                                onChange={(e) => setCustomBackgroundPrompt(e.target.value)}
                                placeholder="e.g. Modern kitchen, sunny park, luxury office..."
                                className="w-full h-full min-h-[108px] px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400 resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200/50 flex justify-center">
                    <button
                        onClick={() => handleGenerate(undefined, [], true)}
                        disabled={isProcessingGlobal}
                        className="group relative px-8 py-4 bg-slate-900 text-white font-display font-bold rounded-xl shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden w-full md:w-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-3">
                            <Sparkles size={20} className="text-rose-400" />
                            <span>Generate from Text Prompts</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Upload Section */}
            <div className="mb-24">
                <UploadZone 
                    onGenerate={handleGenerate}
                    isProcessing={isProcessingGlobal} 
                />
            </div>
            
            {/* Show recent generation if any */}
            {products.length > 0 && products[0].status !== 'idle' && (
                <div className="space-y-12">
                    <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-3xl font-display font-bold text-slate-800">Current Generation</h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                    </div>
                    <ProductCard 
                        key={products[0].id} 
                        product={products[0]} 
                        onViewImage={openModal} 
                        onGenerateVideo={handleGenerateVideo}
                        onRegenerate={handleRegenerate}
                    />
                </div>
            )}
          </>
        )}
        
        {activeTab === 'history' && (
          <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-3xl font-display font-bold text-slate-800">History</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              
              {products.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                      No generations yet. Go to the Generate tab to create some!
                  </div>
              ) : (
                  products.map((product) => (
                      <ProductCard 
                          key={product.id} 
                          product={product} 
                          onViewImage={openModal} 
                          onGenerateVideo={handleGenerateVideo}
                          onRegenerate={handleRegenerate}
                      />
                  ))
              )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard />
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-32 py-12 text-center border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
        <p className="font-serif-logo text-2xl font-bold text-slate-300 italic mb-2">LB Solutions</p>
        <p className="text-slate-400 text-sm">Powered by Marwan & Khayyam</p>
      </footer>
    </div>
  );
};

export default App;