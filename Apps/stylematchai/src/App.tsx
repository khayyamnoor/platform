import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Upload, Image as ImageIcon, Loader2, RefreshCw, Download, Crop as CropIcon, X, ChevronLeft, ChevronRight, Check, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type StyleAnalysis = {
  style_description: string;
  lighting_description: string;
  color_palette: string;
  mood: string;
  camera_style: string;
  depth: string;
  texture_details: string;
};

export default function App() {
  const [inputImages, setInputImages] = useState<{ id: string; url: string; base64: string; mimeType: string; originalUrl: string; type: string }[]>([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  
  const [resolution, setResolution] = useState('8k resolution');
  const [detailLevel, setDetailLevel] = useState('ultra realistic, highly detailed');

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<any>();
  const cropImgRef = useRef<HTMLImageElement>(null);
  
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'transforming' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null);
  const [targetAnalysis, setTargetAnalysis] = useState<{content_description: string} | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const [logoImage, setLogoImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [generationHistory, setGenerationHistory] = useState<{ id: string; url: string; timestamp: number }[]>([]);
  
  const inputImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const logoImageRef = useRef<HTMLInputElement>(null);

  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages: typeof inputImages = [];

    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1536;
          let { width, height } = img;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > width && height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type || 'image/jpeg', 0.85));
        };
        img.src = dataUrl;
      });

      const [header, base64] = compressed.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      
      newImages.push({
        id: Date.now().toString() + Math.random(),
        url: compressed,
        originalUrl: dataUrl,
        base64,
        mimeType,
        type: file.type || 'image/jpeg'
      });
    }

    setInputImages(prev => [...prev, ...newImages]);
  };

  const handleApplyCrop = async () => {
    if (!completedCrop || !cropImgRef.current || inputImages.length === 0) {
      setCropModalOpen(false);
      return;
    }

    const image = cropImgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const [header, base64] = croppedDataUrl.split(',');
    const mimeType = header.split(':')[1].split(';')[0];

    const currentImg = inputImages[currentInputIndex];
    const updatedImg = {
      ...currentImg,
      url: croppedDataUrl,
      base64,
      mimeType
    };

    setInputImages(prev => prev.map((img, idx) => idx === currentInputIndex ? updatedImg : img));
    setCropModalOpen(false);
  };

  const handleRemoveInputImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setInputImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (currentInputIndex >= newImages.length) {
        setCurrentInputIndex(Math.max(0, newImages.length - 1));
      }
      return newImages;
    });
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<{ url: string; base64: string; mimeType: string } | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1536; // Optimized size for AI upload speed
        let { width, height } = img;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > width && height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.85); // Compress heavily to speed up the process
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        
        setter({ url: dataUrl, base64, mimeType });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleTransform = async () => {
    if (inputImages.length === 0) return;
    
    try {
      setStatus('analyzing');
      setStatusMessage('Scanning image buffers...');
      setStyleAnalysis(null);
      setTargetAnalysis(null);
      setResultImage(null);

      // Analyze Reference Image for Style (Optional) - Only done once for the batch
      let stylePromise = null;
      if (referenceImage) {
        stylePromise = ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                data: referenceImage.base64,
                mimeType: referenceImage.mimeType,
              }
            },
            `Analyze this image and precisely extract its visual style, lighting, color palette, mood, camera style, depth of field, and texture details. USER INSTRUCTIONS / FOCUS AREAS: "${userPrompt || 'General style extraction'}". Tailor your analysis specifically to ensure aspects requested by the user are prioritized and deeply analyzed.`
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                style_description: { type: Type.STRING },
                lighting_description: { type: Type.STRING },
                color_palette: { type: Type.STRING },
                mood: { type: Type.STRING },
                camera_style: { type: Type.STRING },
                depth: { type: Type.STRING },
                texture_details: { type: Type.STRING },
              },
              required: ['style_description', 'lighting_description', 'color_palette', 'mood', 'camera_style', 'depth', 'texture_details']
            }
          }
        });
      }

      const styleRes = stylePromise ? await stylePromise : null;
      let analysis: StyleAnalysis | null = null;
      if (styleRes && styleRes.text) {
        analysis = JSON.parse(styleRes.text.trim());
        setStyleAnalysis(analysis);
      }

      setStatus('transforming');

      // Process each target image in the batch sequentially to avoid rate limits
      for (let i = 0; i < inputImages.length; i++) {
        const currentInput = inputImages[i];
        if (inputImages.length > 1) {
          setStatusMessage(`Processing batch item ${i + 1} of ${inputImages.length}...`);
        } else {
          setStatusMessage('Applying parameters...');
        }

        // Analyze Target Image for Content
        const targetRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                data: currentInput.base64,
                mimeType: currentInput.mimeType,
              }
            },
            "Analyze this target image very thoroughly. Provide a highly detailed description of its core subjects, actions, pose, structure, and setting. This description will be used to ensure the generated output perfectly preserves the original content."
          ]
        });

        if (!targetRes.text) throw new Error("Failed to extract target image content.");
        const targetContentStr = targetRes.text.trim();
        
        // Only set target analysis for the first one for the UI
        if (i === 0) setTargetAnalysis({ content_description: targetContentStr });

        let buildPrompt = `Transform the input image according to the instructions.\n\n`;
        buildPrompt += `TARGET IMAGE CONTENT (Preserve this strictly):\n${targetContentStr}\n\n`;

        if (analysis) {
          buildPrompt += `REFERENCE STYLE ANALYSIS (Apply this visual style):\n`;
          buildPrompt += `- Style: ${analysis.style_description}\n`;
          buildPrompt += `- Lighting: ${analysis.lighting_description}\n`;
          buildPrompt += `- Color palette: ${analysis.color_palette}\n`;
          buildPrompt += `- Mood: ${analysis.mood}\n`;
          buildPrompt += `- Camera type: ${analysis.camera_style}\n`;
          buildPrompt += `- Depth of field: ${analysis.depth}\n`;
          buildPrompt += `- Textures: ${analysis.texture_details}\n\n`;
        }

        buildPrompt += `INSTRUCTIONS:\n`;
        if (analysis) {
           buildPrompt += `- Apply the reference image's style to the target image\n`;
           buildPrompt += `- Match lighting direction, intensity, and color grading\n`;
           buildPrompt += `- Adapt textures and materials to resemble the reference\n`;
        }
        buildPrompt += `- STRICTLY preserve the original structure, pose, subject identity, and composition of the target image as described.\n`;
        buildPrompt += `- Maintain realism and high detail\n`;
        buildPrompt += `- Ensure consistency across the whole image\n\n`;

        buildPrompt += `USER INPUT:\n${userPrompt || (analysis ? 'Apply the style accurately while preserving the core subject.' : 'Enhance the image aesthetically while preserving the core subject.')}\n\n`;

        if (logoImage) {
          buildPrompt += `LOGO INTEGRATION INSTRUCTIONS:\nA logo image has been provided alongside the target image. Please naturally integrate this logo into the generated design, ensuring it fits the overall aesthetic while remaining clearly visible.\n\n`;
        }

        buildPrompt += `QUALITY SETTINGS:\n- ${resolution}, ${detailLevel}, professional photography, sharp focus, cinematic color grading\n\n`;
        buildPrompt += `NEGATIVE PROMPT:\nblurry, low quality, distorted face, bad anatomy, artifacts, oversaturated, unrealistic lighting`;

        const parts: any[] = [
          {
            inlineData: {
              data: currentInput.base64,
              mimeType: currentInput.mimeType,
            },
          },
        ];

        if (logoImage) {
          parts.push({
            inlineData: {
              data: logoImage.base64,
              mimeType: logoImage.mimeType,
            },
          });
        }

        parts.push({ text: buildPrompt });

        const genResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });

        let finalImageUrl = null;
        for (const part of genResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            finalImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!finalImageUrl) {
          throw new Error("No image data returned from the generation model.");
        }

        setResultImage(finalImageUrl);
        setGenerationHistory(prev => [{ id: Date.now().toString() + Math.random(), url: finalImageUrl as string, timestamp: Date.now() }, ...prev]);
      }

      setStatus('success');
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setStatusMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `style_matched_${Date.now()}.png`; // Usually png from gemini
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans select-none">
      
      {/* HEADER */}
      <header className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-[10px]">SM</div>
          <h1 className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-100">StyleMatch Engine <span className="text-blue-500">v1.0</span></h1>
        </div>
        <div className="flex items-center gap-8 text-[10px] font-mono flex-none">
          <div className="flex gap-4 text-slate-500 hidden sm:flex">
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> ENGINE READY</span>
             <span className="flex items-center gap-1.5">LATENCY: <span className="text-blue-400 cursor-default">42ms</span></span>
          </div>
          {resultImage && (
            <button onClick={handleDownload} className="px-4 py-1.5 bg-blue-600 rounded text-[10px] uppercase font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors">
              Export IMG
            </button>
          )}
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[340px] border-r border-slate-800 bg-slate-900 flex flex-col overflow-y-auto shrink-0 relative custom-scrollbar">
          <div className="p-4 flex flex-col gap-6">
            
            {/* UPLOADS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Input Buffers</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                
                {/* TARGET */}
                <div className="space-y-1.5">
                  <label className="text-[8px] text-slate-500 uppercase flex items-center justify-between tracking-tighter">
                    Target Buffer
                    {inputImages.length > 1 && <span className="text-blue-500 font-bold bg-blue-500/10 px-1 py-0.5 rounded">x{inputImages.length}</span>}
                  </label>
                  <div className="relative aspect-square">
                    <div 
                      onClick={() => inputImages.length === 0 ? inputImageRef.current?.click() : undefined}
                      className={`absolute inset-0 flex flex-col items-center justify-center p-2 border border-dashed border-slate-700 bg-slate-950/80 hover:bg-slate-900 hover:border-blue-500/50 rounded transition-all overflow-hidden group ${inputImages.length === 0 ? 'cursor-pointer' : ''}`}
                    >
                      {inputImages.length > 0 ? (
                        <>
                          <img src={inputImages[currentInputIndex].url} alt="Target" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setCropModalOpen(true); }} className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 flex items-center justify-center pointer-events-auto">
                                <CropIcon className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => handleRemoveInputImage(e, currentInputIndex)} className="p-1.5 bg-slate-800 text-red-400 hover:text-red-300 rounded hover:bg-slate-700 flex items-center justify-center pointer-events-auto">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); inputImageRef.current?.click(); }} className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 flex flex-col items-center justify-center pointer-events-auto text-[8px] font-bold">
                              <Plus className="w-4 h-4" /> ADD
                            </button>
                          </div>
                          
                          {/* Navigation for multiple images */}
                          {inputImages.length > 1 && (
                             <div className="absolute bottom-1 w-full px-2 flex justify-between z-10 pointer-events-auto">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setCurrentInputIndex(prev => prev > 0 ? prev - 1 : inputImages.length - 1) }}
                                  className="bg-black/80 p-0.5 rounded text-white hover:text-blue-400"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setCurrentInputIndex(prev => prev < inputImages.length - 1 ? prev + 1 : 0) }}
                                  className="bg-black/80 p-0.5 rounded text-white hover:text-blue-400"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                             </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-slate-600 group-hover:text-blue-400 transition-colors pointer-events-none">
                          <ImageIcon className="w-5 h-5 mb-1" />
                          <span className="text-[8px] font-bold tracking-widest">UPLOAD</span>
                        </div>
                      )}
                      {/* Allow multiple files for batch processing */}
                      <input type="file" multiple className="hidden" ref={inputImageRef} accept="image/*" onChange={handleBatchImageUpload} />
                    </div>
                  </div>
                </div>

                {/* STYLE */}
                <div className="space-y-1.5">
                  <label className="text-[8px] text-slate-500 uppercase block tracking-tighter">Style Ref_01 <span className="text-[7px] text-slate-600">(OPTIONAL)</span></label>
                  <div 
                    onClick={() => referenceImage ? undefined : referenceImageRef.current?.click()}
                    className={`aspect-square relative flex flex-col items-center justify-center p-2 border border-dashed border-slate-700 bg-slate-950/80 hover:bg-slate-900 hover:border-blue-500/50 rounded transition-all overflow-hidden group ${!referenceImage ? 'cursor-pointer' : ''}`}
                  >
                    {referenceImage ? (
                      <>
                        <img src={referenceImage.url} alt="Reference" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <button onClick={(e) => { e.stopPropagation(); referenceImageRef.current?.click(); }} className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 pointer-events-auto">
                             <RefreshCw className="w-4 h-4" />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }} className="p-1.5 bg-slate-800 text-red-400 hover:text-red-300 rounded hover:bg-slate-700 pointer-events-auto">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 group-hover:text-blue-400 transition-colors">
                        <ImageIcon className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-bold tracking-widest">UPLOAD</span>
                      </div>
                    )}
                    <input type="file" className="hidden" ref={referenceImageRef} accept="image/*" onChange={(e) => handleImageUpload(e, setReferenceImage)} />
                  </div>
                </div>

                {/* LOGO */}
                <div className="space-y-1.5">
                  <label className="text-[8px] text-slate-500 uppercase block tracking-tighter">Logo Buffer <span className="text-[7px] text-slate-600">(OPTIONAL)</span></label>
                  <div 
                    onClick={() => logoImage ? undefined : logoImageRef.current?.click()}
                    className={`aspect-square relative flex flex-col items-center justify-center p-2 border border-dashed border-slate-700 bg-slate-950/80 hover:bg-slate-900 hover:border-blue-500/50 rounded transition-all overflow-hidden group ${!logoImage ? 'cursor-pointer' : ''}`}
                  >
                    {logoImage ? (
                      <>
                        <img src={logoImage.url} alt="Logo" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <button onClick={(e) => { e.stopPropagation(); logoImageRef.current?.click(); }} className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 pointer-events-auto">
                             <RefreshCw className="w-4 h-4" />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); setLogoImage(null); }} className="p-1.5 bg-slate-800 text-red-400 hover:text-red-300 rounded hover:bg-slate-700 pointer-events-auto">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 group-hover:text-blue-400 transition-colors">
                        <ImageIcon className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-bold tracking-widest">UPLOAD</span>
                      </div>
                    )}
                    <input type="file" className="hidden" ref={logoImageRef} accept="image/*" onChange={(e) => handleImageUpload(e, setLogoImage)} />
                  </div>
                </div>
              </div>
            </section>

            {/* OVERLAYS */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Prompt Overlays</h3>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Additional parameters..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-mono resize-none h-24"
              />
            </section>

            {/* SETTINGS */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Render Settings</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 uppercase block tracking-tighter">Resolution</label>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none font-mono tracking-tighter"
                  >
                     <option value="1080p resolution">1080p (Fast)</option>
                     <option value="4k resolution">4K (High Quality)</option>
                     <option value="8k resolution">8K (Ultra Quality)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 uppercase block tracking-tighter">Detail Logic</label>
                  <select 
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none font-mono tracking-tighter"
                  >
                     <option value="standard realistic">Standard Detail</option>
                     <option value="highly detailed, conceptual">Creative Detail</option>
                     <option value="ultra realistic, highly detailed, raw photography">Maximum Realism</option>
                  </select>
                </div>
              </div>
            </section>

            {/* ACTION BUTTON */}
            <div className="pt-2">
              <button
                onClick={handleTransform}
                disabled={inputImages.length === 0 || status === 'analyzing' || status === 'transforming'}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                {status === 'analyzing' || status === 'transforming' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{statusMessage}</span>
                  </>
                ) : (
                  <>
                     <span className="text-[11px] font-bold tracking-widest uppercase">Run Style Transfer</span>
                     <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              {status === 'error' && (
                <div className="mt-3 p-2 bg-slate-950 border border-red-900/30 rounded text-[10px] text-red-400 leading-relaxed font-mono">
                  {statusMessage}
                </div>
              )}
            </div>

            {/* ANALYSIS PANEL */}
            <AnimatePresence>
              {(styleAnalysis || targetAnalysis) && (
                <motion.section 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 overflow-hidden border-t border-slate-800 pt-5 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Image Assessment</h3>
                    <span className="text-[9px] text-blue-400 font-mono">SCAN_COMPLETE</span>
                  </div>
                  
                  <div className="space-y-2">
                    {targetAnalysis && (
                      <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                        <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Target Content Extracted</label>
                        <p className="text-[11px] text-neutral-300 leading-relaxed font-serif">{targetAnalysis.content_description}</p>
                      </div>
                    )}
                    
                    {styleAnalysis && (
                      <>
                        <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                          <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Composition / Style</label>
                          <p className="text-[11px] text-slate-200">{styleAnalysis.style_description}</p>
                        </div>
                        
                        <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                          <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Lighting Matrix</label>
                          <p className="text-[11px] text-slate-200 font-medium">{styleAnalysis.lighting_description}</p>
                        </div>

                        <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                          <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Color Palette</label>
                          <p className="text-[11px] text-slate-300">{styleAnalysis.color_palette}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                            <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Camera</label>
                            <p className="text-[11px] text-slate-300">{styleAnalysis.camera_style}</p>
                          </div>
                          <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                            <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Mood</label>
                            <p className="text-[11px] text-slate-300">{styleAnalysis.mood}</p>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                          <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Depth & Focus</label>
                          <p className="text-[11px] text-slate-200">{styleAnalysis.depth}</p>
                        </div>

                        <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                          <label className="text-[8px] text-slate-500 uppercase block tracking-tighter mb-1">Texture Info</label>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{styleAnalysis.texture_details}</p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* GENERATION HISTORY */}
            {generationHistory.length > 0 && (
              <section className="space-y-3 overflow-hidden border-t border-slate-800 pt-5 mt-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Generation History</h3>
                  <span className="text-[9px] text-blue-400 font-mono">ARCHIVED</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {generationHistory.map((item) => (
                    <img 
                      key={item.id} 
                      onClick={() => setResultImage(item.url)}
                      src={item.url} 
                      alt={`Gen ${item.id}`} 
                      className={`w-14 h-14 shrink-0 object-cover rounded border cursor-pointer hover:border-blue-500 transition-colors ${resultImage === item.url ? 'border-blue-500 shadow-md shadow-blue-900/30' : 'border-slate-800 opacity-60 hover:opacity-100'}`} 
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>

        {/* VIEWPORT AREA */}
        <div className="flex-1 bg-slate-950 flex p-6 items-center justify-center relative overflow-hidden">
          <div className="w-full h-full max-w-6xl max-h-[800px] bg-slate-900 border border-slate-700 shadow-2xl relative overflow-hidden flex items-center justify-center group flex-col">
            
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* HUD OVERLAYS */}
            <div className="absolute top-6 left-6 flex flex-col gap-1 z-20 pointer-events-none">
              <div className="text-[9px] text-blue-500 font-bold tracking-widest">{status === 'success' ? 'VIEW_01: RESULT' : 'VIEW_01: STANDBY'}</div>
              <div className="text-[18px] text-white font-light">{status === 'success' ? 'Style_Render_Complete.tif' : 'Buffer_Wait.raw'}</div>
            </div>

            <div className="absolute top-6 right-6 flex gap-2 items-center z-20 pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${status === 'transforming' || status === 'analyzing' ? 'bg-red-500 shadow-lg shadow-red-900/50 animate-pulse' : 'bg-slate-600'}`}></div>
              <div className="text-[9px] text-slate-500 font-mono tracking-widest mt-[1px]">
                {status === 'transforming' ? 'REC: IN_PROGRESS' : status === 'analyzing' ? 'REC: ANALYZING' : 'REC: 00:00:00:00'}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full h-12 bg-slate-900/90 border-t border-slate-700 px-6 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none z-20">
               <div>ISO: 400 | SHUTTER: 1/125 | APERTURE: F1.4</div>
               <div className="flex gap-6">
                 <span>MAG: 1.0X</span>
                 <span className={status === 'success' ? 'text-green-500' : 'text-slate-500'}>
                   {status === 'success' ? 'HIST: BALANCED' : 'HIST: AWAITING'}
                 </span>
               </div>
            </div>

            {/* RENDER CONTENT */}
            <div className="absolute inset-8 bottom-16 flex items-center justify-center z-10 transition-all duration-500">
              <AnimatePresence mode="wait">
                {resultImage ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full relative"
                  >
                    <img src={resultImage} alt="Generated result" className="w-full h-full object-contain filter drop-shadow-2xl" />
                  </motion.div>
                ) : status === 'analyzing' || status === 'transforming' ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-[80%] h-[80%] border-2 border-dashed border-slate-700/60 rounded-lg flex flex-col items-center justify-center gap-4 bg-slate-900/50 backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 border-2 border-blue-500/50 rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="text-center space-y-1 pt-2">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{statusMessage}</p>
                      <p className="text-slate-600 text-[10px] font-mono">PLEASE HOLD POSITION</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-[80%] h-[80%] border-2 border-dashed border-slate-700/60 rounded-lg flex flex-col items-center justify-center gap-4 bg-slate-900/50 backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 border-2 border-slate-700 rounded-full flex items-center justify-center text-slate-600">
                      <Sparkles className="w-4 h-4 opacity-50" />
                    </div>
                    <div className="text-center space-y-1 pt-2">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Main Render Viewport</p>
                      <p className="text-slate-600 text-[10px] font-mono">AWAITING SOURCE-TARGET PAIRING</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-8 border-t border-slate-800 flex items-center px-6 justify-between bg-slate-950 text-[9px] text-slate-600 font-mono shrink-0">
        <div>SYS_CORE_TEMP: 42°C | DISK_R: 0.2MB/s</div>
        <div>ENGINE_BUILD_2023.11.02_STABLE</div>
        <div className="flex gap-4">
          <span>X: 1024.00</span>
          <span>Y: 768.00</span>
          <span className="text-green-500">SYNC_LOCKED</span>
        </div>
      </footer>

      {/* CROP MODAL */}
      <AnimatePresence>
        {cropModalOpen && inputImages[currentInputIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur flex flex-col items-center justify-center p-6"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 w-full flex flex-col items-center" style={{ maxWidth: 'min(90vw, 800px)' }}>
               <div className="w-full flex justify-between items-center mb-4">
                  <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-100">CROP TARGET_BUFFER</h2>
                  <button onClick={() => setCropModalOpen(false)} className="text-slate-500 hover:text-white p-1 bg-slate-950 rounded">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="bg-slate-950 w-full overflow-hidden flex items-center justify-center rounded p-2" style={{ maxHeight: '70vh' }}>
                 <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                   <img ref={cropImgRef} src={inputImages[currentInputIndex].originalUrl} alt="Crop target" style={{ maxHeight: '65vh', width: 'auto' }} />
                 </ReactCrop>
               </div>

               <div className="w-full flex justify-end mt-4">
                  <button 
                     onClick={handleApplyCrop}
                     className="px-4 py-2 bg-blue-600 rounded text-[10px] font-bold text-white uppercase flex flex-center gap-2 hover:bg-blue-500 transition"
                  >
                     <Check className="w-4 h-4" /> Apply Crop
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

