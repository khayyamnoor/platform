"use client";

import {
  Camera,
  Clock,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Play,
  Sparkles,
  Sun,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useGateway } from "./gateway-context.js";

// Type enum mirror — was previously imported from @google/genai. Kept as a
// local const so the rest of the schema body below is unchanged.
const Type = {
  OBJECT: "OBJECT" as const,
  STRING: "STRING" as const,
  ARRAY: "ARRAY" as const,
  INTEGER: "INTEGER" as const,
};

// Define the response type from Gemini
interface VideoSequence {
  sequence: number;
  duration: string;
  startImageRef: string;
  endImageRef: string;
  cameraMovement: string;
  sceneDescription: string;
  technicalPrompt: string;
}

interface AnalysisResult {
  analysisSummary: string;
  videos: VideoSequence[];
}

export default function App() {
  const gateway = useGateway();
  const [prompt, setPrompt] = useState(
    "i want you to analyse the video prompt i want a drone cinematic shot for image 1 then to image 2 like a movie , i want to make 2 videos. first is image 1 to image 2 and then image 11 to image 12 i want it to have golden summer is coming and i want it to be hyper realistic and not add fake things and i want you to have people and dj playing in the pool \n\n/analyze\n\n/canvas-design\ni want 2 videos of 30 seconds each with a drone cinematic shot transitioning between the images, featuring a lively pool scene with people and a DJ, all under a hyper-realistic golden summer ambiance.",
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await gateway.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `You are an expert AI Video Director and Prompt Engineer. The user has provided an idea or a set of raw instructions, including slash commands like /analyze and /canvas-design.

        Analyze their request and output a highly detailed, structured storyboard for the requested videos. Make the 'technicalPrompt' field extremely detailed, suitable for feeding into an AI video generator like Sora or Runway Gen-3.

        User Input:
        ${prompt}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisSummary: {
                type: Type.STRING,
                description: "A brief professional summary of the user's vision.",
              },
              videos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sequence: { type: Type.INTEGER },
                    duration: { type: Type.STRING },
                    startImageRef: { type: Type.STRING },
                    endImageRef: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING },
                    sceneDescription: { type: Type.STRING },
                    technicalPrompt: { type: Type.STRING },
                  },
                  required: [
                    "sequence",
                    "duration",
                    "startImageRef",
                    "endImageRef",
                    "cameraMovement",
                    "sceneDescription",
                    "technicalPrompt",
                  ],
                },
              },
            },
            required: ["analysisSummary", "videos"],
          },
        },
      });

      if (response.text) {
        const parsedResult = JSON.parse(response.text) as AnalysisResult;
        setResult(parsedResult);
      } else {
        throw new Error("No response text returned from AI");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate video design.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-[100vh] bg-[#050505] text-[#f5f5f5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#F1D592] border-8 border-[#0a0a0a]">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-10 pt-10 flex justify-between items-baseline mb-12 border-b border-gold pb-6">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.4em] uppercase opacity-60 mb-2">
            Cinematic Production Portfolio
          </span>
          <h1 className="text-4xl md:text-6xl font-serif italic font-light flex items-center gap-4">
            <div className="opacity-80">
              <Film className="w-10 h-10 text-[#D4AF37]" strokeWidth={1} />
            </div>
            Director's <span className="gold-gradient not-italic font-bold">Canvas</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs uppercase tracking-widest opacity-50 mb-1">
            Project ID: GS-2024-082
          </p>
          <p className="text-sm font-serif italic text-white/70">AI Video Studio</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-10 pb-10">
        <div className="flex flex-col lg:flex-row gap-12 h-full">
          {/* Left Column: Input & Controls */}
          <aside className="w-full lg:w-1/3 flex flex-col gap-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-[#D4AF37] font-semibold text-[11px] uppercase tracking-[0.2em]">
                <Wand2 className="w-3.5 h-3.5" />
                Raw Idea / Commands
              </div>

              <p className="text-sm opacity-80 font-light mb-4 leading-relaxed">
                Paste your instructions, slash commands (e.g., /analyze, /canvas-design), or raw
                thoughts here. The AI will structure it into a production-ready storyboard.
              </p>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-64 bg-glass border border-gold rounded-sm p-4 text-sm font-light text-[#f5f5f5] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] resize-none transition-all placeholder:text-white/30"
                placeholder="E.g., /canvas-design I want a drone shot..."
              />

              {error && (
                <div className="mt-4 p-3 border border-red-500/30 bg-red-500/5 rounded-sm flex items-start gap-2">
                  <Zap className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-light text-red-200">{error}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-6 bg-[#D4AF37] hover:bg-[#F1D592] text-black disabled:opacity-50 disabled:hover:bg-[#D4AF37] font-semibold text-[10px] tracking-widest uppercase rounded-sm px-4 py-4 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Render Canvas Design
                  </>
                )}
              </button>
            </div>

            {/* Hint Card */}
            <section className="mt-auto mb-10">
              <div className="bg-glass border border-gold p-6 rounded-sm">
                <h3 className="font-serif italic text-lg mb-4 text-[#f5f5f5]">Vibe Check</h3>
                <ul className="space-y-3 text-xs leading-relaxed opacity-60 italic">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#D4AF37]"></span>
                    <Camera className="w-3 h-3 text-[#D4AF37]" /> Cinematic Drone
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#D4AF37]"></span>
                    <Sun className="w-3 h-3 text-[#D4AF37]" /> Golden Summer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#D4AF37]"></span>
                    <Music className="w-3 h-3 text-[#D4AF37]" /> Lively DJ Pool
                  </li>
                </ul>
              </div>
            </section>
          </aside>

          {/* Right Column: Canvas Output */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6 relative">
            <AnimatePresence mode="wait">
              {!result && !isGenerating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[500px] border border-gold bg-[#111] flex flex-col items-center justify-center text-center p-8 bg-glass"
                >
                  <div className="w-16 h-16 flex items-center justify-center mb-6">
                    <Video className="w-10 h-10 text-[#D4AF37]/40" strokeWidth={1} />
                  </div>
                  <h3 className="font-serif text-[#f5f5f5] italic text-2xl mb-2">
                    Awaiting Directives
                  </h3>
                  <p className="opacity-60 text-[10px] uppercase tracking-widest max-w-sm">
                    Enter requirements for cinematic storyboard compilation.
                  </p>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[500px] border border-gold bg-[#111] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: "radial-gradient(circle at center, #D4AF37, transparent)",
                    }}
                  ></div>
                  <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mb-6 relative z-10" />
                  <h3 className="text-2xl font-serif italic text-white mb-2 relative z-10">
                    Processing Sequence...
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 relative z-10">
                    Generating hyper-realistic scene descriptions.
                  </p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Analysis Summary */}
                  <div className="bg-glass border border-gold p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Zap className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h2 className="text-[11px] uppercase tracking-[0.2em] mb-3 text-[#D4AF37] font-semibold">
                          Analysis Summary
                        </h2>
                        <p className="text-sm opacity-80 font-light leading-relaxed">
                          {result.analysisSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Design (Videos) */}
                  <div className="flex flex-col gap-6">
                    {result.videos.map((video, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        key={video.sequence}
                        className="group relative overflow-hidden bg-[#111] border border-gold flex-1 flex flex-col"
                      >
                        {/* Video Header Strip */}
                        <div className="flex justify-between items-center p-4 border-b border-gold/10">
                          <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]">
                            Sequence {String(video.sequence).padStart(2, "0")}
                          </span>
                          <span className="text-[10px] font-mono opacity-60">
                            {video.startImageRef} &rarr; {video.endImageRef} / {video.duration}
                          </span>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                          {/* Scene Visuals */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Camera className="w-3.5 h-3.5" /> Camera Movement
                              </h4>
                              <p className="text-sm font-light opacity-90 leading-relaxed font-serif italic text-white/90">
                                "{video.cameraMovement}"
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sun className="w-3.5 h-3.5" /> Scene Description
                              </h4>
                              <p className="text-xs font-light opacity-70 leading-relaxed">
                                {video.sceneDescription}
                              </p>
                            </div>
                          </div>

                          {/* Tech Prompt */}
                          <div className="flex flex-col h-full">
                            <h4 className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Play className="w-3.5 h-3.5" /> Technical Generation Prompt
                            </h4>
                            <div className="bg-black/50 border border-gold/20 p-4 text-[11px] font-mono text-[#D4AF37] leading-relaxed flex-1">
                              {video.technicalPrompt}
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => navigator.clipboard.writeText(video.technicalPrompt)}
                                className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 hover:text-[#D4AF37] transition-colors cursor-pointer"
                              >
                                Copy content
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className="absolute inset-0 opacity-5 pointer-events-none"
                          style={{
                            background:
                              "radial-gradient(circle at top right, #D4AF37, transparent)",
                          }}
                        ></div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
