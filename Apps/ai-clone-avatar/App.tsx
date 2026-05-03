
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
import { GlassCard } from './components/GlassCard';
import { FileUpload } from './components/FileUpload';
import { generateSophiePlan, generateSophieAudio, generateSophieVideo, ensureApiKeySelected } from './services/geminiService';
import { SophiePlan, AppStep, HistoryItem, Language, VideoResolution, AmbientSound, CameraMotion, LightingStyle, Emotion, VoiceStyle, AvatarStyle, AspectRatio } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('intro');
  const [characterImg, setCharacterImg] = useState<string | null>(null);
  const [clothesImg, setClothesImg] = useState<string | null>(null);
  const [backgroundImg, setBackgroundImg] = useState<string | null>(null);
  const [hasBackgroundImg, setHasBackgroundImg] = useState<boolean>(false);
  
  // Configuration State
  const [location, setLocation] = useState('Luxury Riyadh Villa at Sunset');
  const [dialogue, setDialogue] = useState('Welcome to my world.');
  const [language, setLanguage] = useState<Language>('saudi');
  
  // New Configuration State
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [ambient, setAmbient] = useState<AmbientSound>('none');
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>('static');
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>('cinematic');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('natural');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('photorealistic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<SophiePlan | null>(null);
  const [media, setMedia] = useState<{ videoUri?: string; audioBase64?: string }>({});
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('sophie_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history helper
  const saveToHistory = (newPlan: SophiePlan, newMedia: { videoUri?: string; audioBase64?: string }) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      plan: newPlan,
      media: newMedia,
      language: language,
      resolution: backgroundImg ? '720p' : resolution,
      ambient: ambient,
      cameraMotion,
      lightingStyle,
      emotion,
      voiceStyle,
      avatarStyle,
      aspectRatio: backgroundImg ? '16:9' : aspectRatio,
      hasBackgroundImg: !!backgroundImg
    };
    
    // Prepend new item, limit to last 10 to save space
    const updated = [newItem, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('sophie_history', JSON.stringify(updated));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setPlan(item.plan);
    setMedia(item.media);
    setLanguage(item.language);
    setResolution(item.resolution || '720p');
    setAmbient(item.ambient || 'none');
    setCameraMotion(item.cameraMotion || 'static');
    setLightingStyle(item.lightingStyle || 'cinematic');
    setEmotion(item.emotion || 'neutral');
    setVoiceStyle(item.voiceStyle || 'natural');
    setAvatarStyle(item.avatarStyle || 'photorealistic');
    setAspectRatio(item.aspectRatio || '9:16');
    setBackgroundImg(null);
    setHasBackgroundImg(item.hasBackgroundImg || false);
    setStep('result');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('sophie_history');
  };

  // --- Handlers ---

  const handleGeneratePlan = async () => {
    if (!characterImg) {
      setError("Please upload a character image.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // 1. Generate The Plan (Text/JSON)
      // Pass the full Data URL so the service can extract MIME types correctly
      const planResult = await generateSophiePlan(
        characterImg,
        clothesImg ? [clothesImg] : [],
        backgroundImg,
        location,
        dialogue,
        language,
        cameraMotion,
        lightingStyle,
        emotion,
        voiceStyle,
        avatarStyle,
        aspectRatio
      );
      setPlan(planResult);
      setStep('planning');
    } catch (err: any) {
      setError(err.message || "Failed to generate plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMedia = async () => {
    if (!plan || !characterImg) return;
    
    setIsLoading(true);
    setError(null);
    setStep('generating');

    try {
      // 2. Ensure Key for Veo
      const hasKey = await ensureApiKeySelected();
      if (!hasKey) {
        throw new Error("API Key selection is required for video generation.");
      }

      // 3. Generate Video & Audio in parallel
      // Pass the selected resolution to generateSophieVideo
      const [videoUri, audioData] = await Promise.all([
        generateSophieVideo(characterImg, backgroundImg, plan.veoPrompt, resolution, aspectRatio),
        generateSophieAudio(plan.dialogue, voiceStyle, language)
      ]);

      const newMedia = { videoUri, audioBase64: audioData };
      setMedia(newMedia);
      setHasBackgroundImg(!!backgroundImg);
      
      // Save to history automatically
      saveToHistory(plan, newMedia);
      
      setStep('result');

    } catch (err: any) {
      console.error(err);
      const isPermissionError = err.message?.includes("PERMISSION_DENIED") || err.message?.includes("403");
      if (isPermissionError) {
        setError("Access Denied. Please ensure you have selected a valid API key with permissions for video generation.");
        // Try to re-trigger key selection
        const win = window as any;
        if (win.aistudio) {
          win.aistudio.openSelectKey();
        }
      } else {
        setError("Generation failed. " + (err.message || ""));
      }
      setStep('planning'); // Go back
    } finally {
      setIsLoading(false);
    }
  };

  // --- Renders ---

  const renderIntro = () => (
    <div className="flex flex-col items-center text-center space-y-8 animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-6xl md:text-8xl cyber-gradient font-space tracking-widest mb-4">AI CLONE AVATAR</h1>
      <p className="text-xl text-slate-400 font-light tracking-wide max-w-lg">
        THE PREMIER AI AVATAR PLATFORM. <br />
        <span className="text-cyan-400 font-mono text-sm tracking-widest">PRECISION. INTELLIGENCE. FUTURISM.</span>
      </p>
      <div className="flex flex-col md:flex-row gap-4 mt-8">
        <Button onClick={() => setStep('upload')} className="text-lg px-12 py-4">
          Initialize Clone
        </Button>
        <Button variant="outline" onClick={() => setStep('history')} className="text-lg px-12 py-4">
          Access Database
        </Button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-3xl text-cyan-400 font-space">Database Archive</h2>
        <div className="flex gap-4">
           <Button variant="outline" onClick={clearHistory} disabled={history.length === 0} className="text-xs">
             Purge Records
           </Button>
           <button onClick={() => setStep('intro')} className="text-slate-500 hover:text-white transition-colors uppercase text-sm font-mono">
             Return to Core
           </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-lg border border-slate-800 border-dashed">
          <p className="text-slate-500 font-mono">No clone records found in database.</p>
          <Button onClick={() => setStep('upload')} variant="outline" className="mt-4">
            Initialize First Clone
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <GlassCard key={item.id} className="group hover:border-cyan-500/50 transition-all duration-300">
               <div className="flex justify-between items-start mb-2">
                 <span className="text-xs text-cyan-400 font-mono uppercase font-bold tracking-widest">
                   {new Date(item.timestamp).toLocaleDateString()}
                 </span>
                 <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-1 rounded uppercase font-mono">
                        {item.resolution || '720p'}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-1 rounded uppercase font-mono">
                        {item.language === 'saudi' ? 'Arabic (Saudi)' : item.language}
                    </span>
                 </div>
               </div>
               
               <p className="text-white font-space text-lg line-clamp-2 mb-2">"{item.plan.dialogue}"</p>
               <p className="text-slate-500 text-xs mb-4 line-clamp-2">{item.plan.wardrobeStyling}</p>
               
               <Button fullWidth onClick={() => loadFromHistory(item)} className="text-xs py-2">
                 Execute Playback
               </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="grid md:grid-cols-3 gap-8">
        <GlassCard className="space-y-6">
          <h2 className="text-2xl text-cyan-400 font-space border-b border-slate-800 pb-2">Subject Base</h2>
          <FileUpload 
            label="Character Image" 
            onFileSelect={(img) => {
              setCharacterImg(img);
            }} 
            preview={characterImg}
          />
        </GlassCard>
        
        <GlassCard className="space-y-6">
          <h2 className="text-2xl text-cyan-400 font-space border-b border-slate-800 pb-2">Apparel Data</h2>
          <FileUpload 
            label="Outfit / Style" 
            onFileSelect={setClothesImg} 
            preview={clothesImg}
          />
          <p className="text-xs text-slate-500 mt-2 font-mono">*Upload an image of the desired clothing style.</p>
        </GlassCard>

        <GlassCard className="space-y-6">
          <h2 className="text-2xl text-cyan-400 font-space border-b border-slate-800 pb-2">Environment</h2>
          <FileUpload 
            label="Background Image" 
            onFileSelect={setBackgroundImg} 
            preview={backgroundImg}
          />
          <p className="text-xs text-slate-500 mt-2 font-mono">*Optional. Overrides location text. Forces 16:9 720p output.</p>
        </GlassCard>
      </div>

      <div className="flex justify-end pt-4">
         <Button 
          disabled={!characterImg}
          onClick={() => setStep('configure')}
          className="px-8 py-4 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]"
         >
           Next: Parameters
         </Button>
      </div>
    </div>
  );

  const renderConfigure = () => (
    <GlassCard className="max-w-3xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-3xl text-cyan-400 font-space">Direct The Scene</h2>
        <span className="text-slate-500 text-sm tracking-widest font-mono">STEP 02/03</span>
      </div>

      <div className="space-y-6">
        {/* Language Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Primary Language</label>
            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setLanguage('saudi')}
                  className={`p-3 border text-center transition-all duration-300 uppercase tracking-widest text-xs font-bold font-mono ${
                    language === 'saudi' 
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  Arabic (Saudi)
                </button>
                <button 
                  onClick={() => setLanguage('english')}
                  className={`p-3 border text-center transition-all duration-300 uppercase tracking-widest text-xs font-bold font-mono ${
                    language === 'english' 
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  English
                </button>
            </div>
          </div>

          <div>
             <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Video Quality</label>
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setResolution('720p')}
                  disabled={!!backgroundImg}
                  className={`p-3 border text-center transition-all duration-300 uppercase tracking-widest text-xs font-bold font-mono ${
                    resolution === '720p' || !!backgroundImg
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  } ${!!backgroundImg ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  720p (Std)
                </button>
                <button 
                  onClick={() => setResolution('1080p')}
                  disabled={!!backgroundImg}
                  className={`p-3 border text-center transition-all duration-300 uppercase tracking-widest text-xs font-bold font-mono ${
                    resolution === '1080p' && !backgroundImg
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  } ${!!backgroundImg ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  1080p (HD)
                </button>
             </div>
             {!!backgroundImg && <p className="text-[10px] text-cyan-500/70 mt-2 uppercase tracking-wider font-mono">Locked to 720p when using a custom background image.</p>}
          </div>
        </div>

        {/* New Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Camera Motion</label>
            <select 
              value={cameraMotion} 
              onChange={(e) => setCameraMotion(e.target.value as CameraMotion)}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm"
            >
              <option value="static">Static</option>
              <option value="slow_zoom">Slow Zoom</option>
              <option value="handheld">Handheld</option>
              <option value="pan_right">Pan Right</option>
            </select>
          </div>
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Lighting Style</label>
            <select 
              value={lightingStyle} 
              onChange={(e) => setLightingStyle(e.target.value as LightingStyle)}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm"
            >
              <option value="cinematic">Cinematic</option>
              <option value="neon_cyberpunk">Neon Cyberpunk</option>
              <option value="studio_portrait">Studio Portrait</option>
              <option value="natural_daylight">Natural Daylight</option>
            </select>
          </div>
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Emotion</label>
            <select 
              value={emotion} 
              onChange={(e) => setEmotion(e.target.value as Emotion)}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm"
            >
              <option value="neutral">Neutral</option>
              <option value="joyful">Joyful</option>
              <option value="serious">Serious</option>
              <option value="intense">Intense</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Voice Style</label>
            <select 
              value={voiceStyle} 
              onChange={(e) => setVoiceStyle(e.target.value as VoiceStyle)}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm"
            >
              <option value="natural">Natural</option>
              <option value="broadcast">Broadcast</option>
              <option value="conversational">Conversational</option>
              <option value="narrative">Narrative</option>
            </select>
          </div>
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Avatar Style</label>
            <select 
              value={avatarStyle} 
              onChange={(e) => setAvatarStyle(e.target.value as AvatarStyle)}
              className="w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm"
            >
              <option value="photorealistic">Photorealistic</option>
              <option value="3d_render">3D Render</option>
              <option value="anime">Anime</option>
              <option value="cinematic">Cinematic</option>
            </select>
          </div>
          <div>
            <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Aspect Ratio</label>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              disabled={!!backgroundImg}
              className={`w-full bg-slate-950 border border-slate-700 p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono text-sm ${!!backgroundImg ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="9:16">9:16 (Portrait)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
            {!!backgroundImg && <p className="text-[10px] text-cyan-500/70 mt-1 uppercase tracking-wider font-mono">Locked to 16:9 with background image.</p>}
          </div>
        </div>

        <div>
          <label className="block text-cyan-400 text-sm font-bold mb-3 uppercase font-space">Ambient Sound (Background)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
             {(['none', 'luxury_lounge', 'desert_wind', 'urban_city', 'ocean_waves'] as AmbientSound[]).map((snd) => (
                <button
                  key={snd}
                  onClick={() => setAmbient(snd)}
                  className={`p-2 border text-center transition-all duration-300 uppercase tracking-widest text-[10px] font-bold font-mono ${
                    ambient === snd
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {snd.replace('_', ' ')}
                </button>
             ))}
          </div>
        </div>

        <div>
          <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase font-space">Location & Atmosphere</label>
          <input 
            type="text" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 p-4 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
            placeholder="e.g. Cyberpunk city at night..."
          />
        </div>

        <div>
          <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase font-space">Dialogue Request</label>
          <textarea 
            rows={3}
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 p-4 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
            placeholder="What should the clone say?"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <button onClick={() => setStep('upload')} className="text-slate-500 hover:text-white transition-colors uppercase text-sm font-mono">Back</button>
        <Button onClick={handleGeneratePlan} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Generate Creative Plan'}
        </Button>
      </div>
    </GlassCard>
  );

  const renderPlanning = () => (
    <div className="max-w-5xl mx-auto w-full grid lg:grid-cols-2 gap-8">
      {/* Left: The Plan Details */}
      <GlassCard className="space-y-6 h-full">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="text-2xl text-cyan-400 font-space">Creative Direction</h2>
            <div className="flex gap-2">
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded uppercase tracking-wider font-mono">{language === 'saudi' ? 'Arabic (Saudi)' : language}</span>
                <span className="text-xs bg-slate-800 text-cyan-400 px-2 py-1 rounded uppercase tracking-wider font-bold font-mono">{resolution}</span>
            </div>
        </div>
        
        {plan && (
          <div className="space-y-6 text-sm md:text-base">
            <div>
              <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Target Dialogue</h3>
              <p className={`text-xl text-white leading-relaxed ${language === 'saudi' ? 'arabic-text' : 'font-space'}`} dir={language === 'saudi' ? 'rtl' : 'ltr'}>
                {plan.dialogue}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Tone</h3>
                <p className="text-cyan-100">{plan.emotionalTone}</p>
              </div>
              <div>
                <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Lighting</h3>
                <p className="text-cyan-100">{plan.sceneLighting}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Voice Style</h3>
                <p className="text-cyan-100 capitalize">{voiceStyle}</p>
              </div>
              <div>
                <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Avatar Style</h3>
                <p className="text-cyan-100 capitalize">{avatarStyle.replace('_', ' ')}</p>
              </div>
            </div>

            <div>
              <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Wardrobe Styling</h3>
              <p className="text-slate-300 italic">"{plan.wardrobeStyling}"</p>
            </div>

            <div>
              <h3 className="text-slate-500 uppercase text-xs mb-1 font-mono">Camera</h3>
              <p className="text-slate-300">{plan.cameraAngle}</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Right: Confirmation */}
      <div className="flex flex-col space-y-8">
        <GlassCard className="flex-1 flex flex-col justify-center items-center text-center space-y-4 border-cyan-500/20">
          <h3 className="text-xl font-space text-white">Ready to Initialize?</h3>
          <p className="text-slate-400 text-sm max-w-xs font-mono">
            This will generate a high-definition ({resolution}) video using Veo and synthesize the voice.
            {ambient !== 'none' && <span className="block mt-1 text-cyan-500/70 text-xs">+ {ambient.replace('_', ' ')} Ambience</span>}
            <br/><br/>
            <span className="text-cyan-600 text-xs">REQUIRES PAID API KEY SELECTION</span>
          </p>
          <Button onClick={handleGenerateMedia} className="w-full max-w-xs py-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            Generate Clone Media
          </Button>
          <button onClick={() => setStep('configure')} className="text-xs text-slate-600 hover:text-slate-400 mt-4 uppercase font-mono">Adjust Parameters</button>
        </GlassCard>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 text-center">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
      </div>
      <div>
        <h2 className="text-3xl font-space text-white mb-2">Compiling Clone Data</h2>
        <p className="text-cyan-500/80 animate-pulse font-mono">Rendering {resolution} video & synthesizing audio...</p>
        <p className="text-slate-600 text-sm mt-4 font-mono">This may take up to 2 minutes.</p>
      </div>
    </div>
  );

  const renderResult = () => {
    let aspectClass = 'aspect-[9/16]';
    if (aspectRatio === '16:9' || hasBackgroundImg) {
      aspectClass = 'aspect-[16/9]';
    } else if (aspectRatio === '1:1') {
      aspectClass = 'aspect-square';
    }

    return (
    <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-3 gap-8">
      {/* Video Result */}
      <GlassCard className={`lg:col-span-2 p-0 overflow-hidden relative bg-black flex flex-col items-center justify-center ${aspectClass} lg:h-[600px]`}>
        {media.videoUri ? (
          <>
            <video 
              src={media.videoUri} 
              controls 
              autoPlay 
              loop 
              className="w-full h-full object-contain bg-black"
              // Removed crossOrigin="anonymous" to avoid CORS errors on playback if headers missing
            />
            {/* Download Action Bar */}
            <div className="absolute top-4 right-4 z-10">
               <a 
                 href={media.videoUri}
                 download={`clone-avatar-${resolution}.mp4`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-2 bg-slate-900/80 hover:bg-cyan-600 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all border border-slate-700 hover:border-cyan-500 shadow-lg text-xs font-bold uppercase tracking-wider font-mono"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                 Download {resolution}
               </a>
            </div>
            {/* Ambient Sound Indicator */}
            {ambient !== 'none' && (
                <div className="absolute bottom-4 left-4 z-10 bg-slate-900/60 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 border border-slate-700">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] uppercase text-slate-300 tracking-wider font-mono">Ambience: {ambient.replace('_', ' ')}</span>
                </div>
            )}
          </>
        ) : (
          <p className="text-red-500 font-mono">Video generation unavailable.</p>
        )}
      </GlassCard>

      {/* Audio & Details */}
      <div className="flex flex-col space-y-6">
         <GlassCard>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-cyan-400 font-space">Voice Synthesis</h3>
             {media.audioBase64 && (
                <a 
                  href={`data:audio/mp3;base64,${media.audioBase64}`} 
                  download="clone-voice.mp3"
                  className="text-xs text-slate-500 hover:text-white transition-colors font-mono"
                >
                  DOWNLOAD MP3
                </a>
             )}
          </div>
          {media.audioBase64 ? (
            <audio controls className="w-full" src={`data:audio/mp3;base64,${media.audioBase64}`} />
          ) : (
            <p className="text-slate-500 text-sm font-mono">Audio unavailable</p>
          )}
         </GlassCard>

         <GlassCard className="flex-1">
           <h3 className="text-cyan-400 font-space mb-4">System Logs</h3>
           <div className="space-y-4 text-sm text-slate-300 font-mono">
             <div className="flex gap-2 mb-2 flex-wrap">
                 <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded uppercase tracking-wider">{resolution}</span>
                 <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded uppercase tracking-wider">{aspectRatio}</span>
                 <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded uppercase tracking-wider">{avatarStyle.replace('_', ' ')}</span>
                 {ambient !== 'none' && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">{ambient.replace('_', ' ')}</span>}
             </div>
             <p><span className="text-slate-500 block text-xs uppercase">Dialogue ({language === 'saudi' ? 'Arabic (Saudi)' : language})</span> {plan?.dialogue}</p>
             <p><span className="text-slate-500 block text-xs uppercase">Voice Style</span> {voiceStyle}</p>
             <p><span className="text-slate-500 block text-xs uppercase">Styling</span> {plan?.wardrobeStyling}</p>
             <p><span className="text-slate-500 block text-xs uppercase">Camera</span> {cameraMotion}</p>
             <p><span className="text-slate-500 block text-xs uppercase">Lighting</span> {lightingStyle}</p>
             <p><span className="text-slate-500 block text-xs uppercase">Emotion</span> {emotion}</p>
           </div>
           
           <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col gap-3">
             <Button variant="outline" fullWidth onClick={() => setStep('intro')}>Initialize New Clone</Button>
             <Button variant="secondary" fullWidth onClick={() => setStep('history')} className="text-xs">Access Database</Button>
           </div>
         </GlassCard>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">
      {/* Header */}
      <header className="py-6 px-8 border-b border-slate-900 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-lg z-50">
        <div className="text-2xl font-space font-bold text-white tracking-widest cursor-pointer" onClick={() => setStep('intro')}>
          AI CLONE AVATAR <span className="text-cyan-600">.</span>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setStep('history')} 
                className="hidden md:block text-xs font-bold text-slate-500 hover:text-cyan-500 tracking-[0.2em] transition-colors uppercase font-mono"
            >
                Archive
            </button>
            <div className="w-px h-4 bg-slate-800 hidden md:block"></div>
            <div className="text-xs font-bold text-slate-500 tracking-[0.2em] hidden md:block font-mono">
            ADVANCED CLONING PLATFORM
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-12 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[128px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center">
          {error && (
            <div className="mb-6 p-4 border border-red-900/50 bg-red-900/10 text-red-200 text-center rounded font-mono">
              {error}
            </div>
          )}

          {step === 'intro' && renderIntro()}
          {step === 'upload' && renderUpload()}
          {step === 'history' && renderHistory()}
          {step === 'configure' && renderConfigure()}
          {step === 'planning' && renderPlanning()}
          {step === 'generating' && renderGenerating()}
          {step === 'result' && renderResult()}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center text-slate-700 text-xs tracking-widest uppercase font-mono">
        Powered by Marwan & Khayyam • AI Clone Avatar Platform © 2025
      </footer>
    </div>
  );
};

export default App;
