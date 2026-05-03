export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  cost: number;
}

export interface ProductImage {
  id: string;
  file?: File;
  modelFile?: File;
  referenceModelFile?: File; // For user uploaded model reference when input is product
  productBase64?: string;
  modelBase64s?: string[];
  inputType: 'product' | 'model' | 'text' | 'mixed';
  previewUrl?: string;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  
  // Usage tracking
  usage?: TokenUsage;

  // Separate video statuses
  videoProductStatus: 'idle' | 'generating' | 'completed' | 'failed';
  videoModelStatus: 'idle' | 'generating' | 'completed' | 'failed';
  videoError?: string; // Specific error message for video generation failures

  // User customization
  productPrompt?: string;
  modelPrompt?: string;
  backgroundPrompt?: string;
  videoPrompt?: string; // User defined video prompt
  virtue?: string;
  productAngle?: string;
  modelPosture?: string;

  // Video Customization
  videoAspectRatio?: '16:9' | '9:16' | '1:1';
  videoResolution?: '720p' | '1080p';
  videoDuration?: '5s' | '10s'; // Although Veo is usually fixed, good to have structure
  
  results: {
    // Studio Tab (3D Views)
    studio_front?: string;
    studio_right?: string;
    studio_back?: string;
    studio_left?: string;
    // Models Tab
    model_pose_classic?: string;
    model_pose_premium?: string;
    // Interactive Tab
    model_interact_classic?: string;
    model_interact_futuristic?: string;
    
    // Video Tab - Separate Results
    video_product?: string;
    video_model?: string;
  };
  error?: string;
}

export interface ProcessingStats {
  total: number;
  completed: number;
  failed: number;
}