export enum ToolType {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
  MOVE = 'MOVE'
}

export enum EditMode {
  EDIT = 'EDIT',
  REMOVE = 'REMOVE',
  TOUR = 'TOUR',
  HISTORY = 'HISTORY'
}

export interface Point {
  x: number;
  y: number;
}

export interface AppState {
  image: HTMLImageElement | null;
  imageBase64: string | null;
  isProcessing: boolean;
  generatedImage: string | null;
  brushSize: number;
  tool: ToolType;
  prompt: string;
  history: string[]; // store generated image history URLs
}

export interface ProcessingError {
  message: string;
  code?: string;
}

export interface ImageEditorHandle {
  getMaskDataURL: () => string | null;
}
