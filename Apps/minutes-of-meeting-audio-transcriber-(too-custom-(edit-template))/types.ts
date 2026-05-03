export interface TranscriptionState {
  status: 'idle' | 'recording' | 'processing' | 'success' | 'error';
  text: string | null;
  jsonResult?: any | null;
  error: string | null;
}

export interface AudioVisualizerProps {
  isRecording: boolean;
}