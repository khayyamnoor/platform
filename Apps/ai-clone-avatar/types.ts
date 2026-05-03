
export type CameraMotion = 'static' | 'slow_zoom' | 'handheld' | 'pan_right';
export type LightingStyle = 'cinematic' | 'neon_cyberpunk' | 'studio_portrait' | 'natural_daylight';
export type Emotion = 'neutral' | 'joyful' | 'serious' | 'intense';
export type VoiceStyle = 'natural' | 'broadcast' | 'conversational' | 'narrative';
export type AvatarStyle = 'photorealistic' | '3d_render' | 'anime' | 'cinematic';
export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface SophiePlan {
  dialogue: string;
  emotionalTone: string;
  sceneLighting: string;
  wardrobeStyling: string;
  cameraAngle: string;
  veoPrompt: string;
}

export interface GeneratedMedia {
  videoUri?: string;
  audioBase64?: string;
}

export type VideoResolution = '720p' | '1080p';
export type AmbientSound = 'none' | 'luxury_lounge' | 'desert_wind' | 'urban_city' | 'ocean_waves';

export interface HistoryItem {
  id: string;
  timestamp: number;
  plan: SophiePlan;
  media: GeneratedMedia;
  language: Language;
  resolution: VideoResolution;
  ambient: AmbientSound;
  cameraMotion: CameraMotion;
  lightingStyle: LightingStyle;
  emotion: Emotion;
  voiceStyle: VoiceStyle;
  avatarStyle: AvatarStyle;
  aspectRatio: AspectRatio;
  hasBackgroundImg?: boolean;
}

export type Language = 'saudi' | 'english';

export type AppStep = 'intro' | 'upload' | 'configure' | 'planning' | 'generating' | 'result' | 'history';
