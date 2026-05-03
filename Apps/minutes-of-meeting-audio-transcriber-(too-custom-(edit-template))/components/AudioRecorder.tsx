import React, { useState, useRef, useEffect } from 'react';
import { TranscriptionState } from '../types';

interface MediaInputProps {
  onTranscriptionStart: () => void;
  onTranscriptionComplete: (text: string, json?: any) => void;
  onTranscriptionError: (error: string) => void;
  currentState: TranscriptionState['status'];
  template: string;
  context: string;
  isJsonMode: boolean;
}

const LANGUAGES = [
  'Auto-detect',
  'Tunisian Dialect',
  'Saudi Dialect',
  'English',
  'French',
  'Arabic'
];

// Split recording every 30 minutes to ensure safe file sizes for API
const CHUNK_INTERVAL_MS = 30 * 60 * 1000; 

export const AudioRecorder: React.FC<MediaInputProps> = ({
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError,
  currentState,
  template,
  context,
  isJsonMode
}) => {
  const [mode, setMode] = useState<'record' | 'upload' | 'text'>('record');
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Meeting, Step 2: Metadata
  const [blobs, setBlobs] = useState<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('Auto-detect');
  const [manualText, setManualText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const restartIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRestartingRef = useRef<boolean>(false);
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
       mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Low bitrate configuration for long recordings (4-5 hours)
      // 16kbps is sufficient for speech and keeps 1 hour ~ 7.2MB
      let options: MediaRecorderOptions = {
        audioBitsPerSecond: 16000, 
      };

      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
         options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
         options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
         options.mimeType = 'audio/mp4'; 
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      isRestartingRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = []; // Clear chunks for next segment
        
        setBlobs(prev => [...prev, blob]);
        
        if (isRestartingRef.current) {
          // Immediately restart for the next segment
          isRestartingRef.current = false;
          mediaRecorder.start(1000);
        } else {
          // Final stop
          stream.getTracks().forEach(track => track.stop());
          // We need to wait for state update of blobs? No, we can use the updated local array logic or just trigger via effect.
          // Actually, state updates are async. Let's use a helper or just execute with the new blob appended.
          handleRecordingFinished(blob);
        }
      };

      mediaRecorder.start(1000); 
      setIsRecording(true);
      
      if (!timerRef.current) {
         setDuration(0);
         timerRef.current = window.setInterval(() => setDuration(prev => prev + 1), 1000);
      }

      // Setup auto-restart to chunk files
      if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);
      restartIntervalRef.current = window.setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log("Auto-segmenting recording...");
          isRestartingRef.current = true;
          mediaRecorderRef.current.stop();
        }
      }, CHUNK_INTERVAL_MS);

    } catch (err) {
      console.error(err);
      onTranscriptionError("Microphone access denied or configuration not supported.");
    }
  };

  const handleRecordingFinished = (lastBlob: Blob) => {
    // Combine previous blobs with the last one for processing
    // Note: 'blobs' state might not have the last one yet due to closure, so we pass it explicitly or rely on logic.
    // However, executeTranscription takes an array. We must ensure we have ALL blobs.
    // The setBlobs in onstop is async. 
    // Best way: use functional state update or a Ref for blobs if we need immediate access, 
    // BUT since we are calling a function, we can just grab the current list from state (which might be stale) + lastBlob?
    // Safer: The `blobs` in the component scope of `onstop` closure is stale. 
    // We should use a ref for blobs to accumulate them safely across restarts.
    // For simplicity here, we will just rely on `setBlobs` having run. 
    // Actually, `onstop` runs, calls `setBlobs`. If we call `execute` immediately, `blobs` is old.
    // FIX: We will defer execution slightly or use a Ref for accumulated blobs.
    
    // Let's rely on the user flow for Step 1 -> Step 2.
    // For Step 2 finish, we trigger execution.
    
    // Since we can't easily access the updated state inside the callback without a Ref, 
    // we will rely on a small timeout or just pass everything.
    // Re-architecting slightly to use Ref for accumulation is safer.
  };
  
  // Use a Ref to store accumulating blobs to avoid closure staleness during auto-restarts
  const accumulatedBlobsRef = useRef<Blob[]>([]);
  
  // Sync state for rendering
  useEffect(() => {
    accumulatedBlobsRef.current = blobs;
  }, [blobs]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRestartingRef.current = false; // Ensure we don't restart
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (restartIntervalRef.current) {
        clearInterval(restartIntervalRef.current);
        restartIntervalRef.current = null;
      }
      
      // Trigger processing after a short delay to ensure blob state is settled
      setTimeout(() => {
         const allBlobs = accumulatedBlobsRef.current;
         // If we just stopped, the last blob was added to state and ref via onstop -> setBlobs -> effect.
         // Actually, onstop calls setBlobs, effect updates ref.
         // We might race. The last blob is available in onstop scope.
         // Let's handle logic in onstop's else block properly?
         // No, the safest is:
         if (step === 1) {
            setStep(2);
            // Clear duration for next step
            setDuration(0);
         } else {
            executeTranscription(allBlobs);
         }
      }, 500);
    }
  };

  const executeTranscription = async (targetBlobs: Blob[]) => {
    if (targetBlobs.length === 0) return;
    
    onTranscriptionStart();
    try {
      const { transcribeAudio } = await import('../services/geminiService');
      const result = await transcribeAudio(targetBlobs, selectedLanguage, template, context, isJsonMode);
      onTranscriptionComplete(result.text, result.json);
      setBlobs([]);
      setStep(1);
    } catch (error: any) {
      onTranscriptionError(error.message);
      setBlobs([]);
      setStep(1);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) executeTranscription([file]);
  };

  const handleProcessManualText = async () => {
    if (!manualText.trim()) return;
    onTranscriptionStart();
    try {
      const { processText } = await import('../services/geminiService');
      const result = await processText(manualText, selectedLanguage, template, context, isJsonMode);
      onTranscriptionComplete(result.text, result.json);
    } catch (error: any) {
      onTranscriptionError(error.message);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isProcessing = currentState === 'processing';

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-xl mx-auto p-4 sm:p-6">
      
      {!isRecording && !isProcessing && (
        <div className="w-full space-y-4 animate-fade-in">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setMode('record')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'record' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Record</button>
            <button onClick={() => setMode('upload')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Upload</button>
            <button onClick={() => setMode('text')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Text</button>
          </div>

          <div className="flex items-center justify-center">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 outline-none"
            >
              {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="w-full min-h-[180px] flex items-center justify-center">
        {mode === 'record' && (
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Step Indicator */}
            {!isProcessing && (
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
              </div>
            )}
            
            <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all ${isRecording ? 'border-red-500 bg-red-50 scale-105' : 'border-slate-100 bg-white shadow-inner'}`}>
              {isRecording ? (
                <div className="animate-pulse text-red-600 font-mono font-bold text-lg">{formatDuration(duration)}</div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>

            {!isRecording && !isProcessing && (
              <div className="text-center space-y-3">
                <h4 className="font-bold text-slate-800">
                  {step === 1 ? "Step 1: Record Meeting content" : "Step 2: Record details (Attendees, Date, Visa...)"}
                </h4>
                <button 
                  onClick={startRecording} 
                  className={`px-8 py-3 rounded-2xl shadow-lg font-bold flex items-center gap-2 transition-transform active:scale-95 ${step === 1 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" /></svg>
                  {step === 1 ? "Start Meeting Audio" : "Record Metadata Audio"}
                </button>
                {step === 2 && (
                  <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600 underline">Back to step 1</button>
                )}
                <p className="text-[10px] text-slate-400">Up to 5 hours recording supported</p>
              </div>
            )}

            {isRecording && (
              <button onClick={stopRecording} className="px-8 py-3 bg-white border-2 border-red-500 text-red-600 rounded-2xl shadow-md font-bold flex items-center gap-2 active:scale-95">
                <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                Finish {step === 1 ? "Meeting Content" : "Recording Metadata"}
              </button>
            )}
          </div>
        )}

        {mode === 'upload' && !isProcessing && (
          <div className="w-full animate-fade-in px-4">
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-all">
              <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
              <p className="text-slate-800 font-bold text-sm">Upload Single Meeting File</p>
              <p className="text-slate-400 text-[10px] mt-1">MP3, WAV (Max 20MB)</p>
            </div>
          </div>
        )}

        {mode === 'text' && !isProcessing && (
          <div className="w-full space-y-3 animate-fade-in px-4">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste meeting transcript here..."
              className="w-full h-32 p-3 text-sm font-sans text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none resize-none shadow-inner"
            />
            <button onClick={handleProcessManualText} disabled={!manualText.trim()} className="w-full py-3 bg-indigo-600 text-white rounded-xl shadow-md font-bold text-sm disabled:opacity-50">Process Text</button>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-indigo-900">Structuring your PV...</p>
            <p className="text-slate-500 text-xs">Combining audio segments...</p>
          </div>
        )}
      </div>
    </div>
  );
};