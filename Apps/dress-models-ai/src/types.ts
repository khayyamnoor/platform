export interface ProductImage {
  id: string;
  originalUrl: string;
  mimeType?: string;
  processedUrl?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface EditingSettings {
  lighting: number;
  background: string;
  realism: number;
  texture: number;
  resolution: '1K' | '2K' | '4K';
}
