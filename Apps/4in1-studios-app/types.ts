export interface Layer {
  id: string;
  name: string;
  type: 'subject' | 'background' | 'lighting' | 'effect';
  prompt: string;
  isActive: boolean;
}

export interface EnhancementSuggestion {
  label: string;
  prompt: string;
  description: string;
}

export interface ImageWorkspaceState {
  id: string;
  file: File | null;
  originalPreviewUrl: string | null;
  currentPreviewUrl: string | null;
  history: string[]; // URLs of past versions
  historyIndex: number;
  
  status: 'idle' | 'analyzing' | 'processing' | 'error' | 'done';
  statusMessage?: string;
  
  analysisData?: {
    subject: string;
    type: 'portrait' | 'landscape' | 'product' | 'other';
    mood: string;
    suggestions: EnhancementSuggestion[];
  };

  layers: Layer[];
  selectedLayerId: string | null;
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progress: number; // Simulated 0-100
  resultUrl: string | null;
  error: string | null;
}