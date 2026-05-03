
import { GoogleGenAI, Type, Schema, Modality, VideoGenerationReferenceType, VideoGenerationReferenceImage } from "@google/genai";
import { SophiePlan, Language, VideoResolution, CameraMotion, LightingStyle, Emotion, VoiceStyle, AvatarStyle, AspectRatio } from "../types";

// Helper to get the AI client.
const getAiClient = () => {
  const apiKey = (globalThis as any).process?.env?.API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

// Helper to parse Data URL to get mimeType and base64 data
const parseDataUrl = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error("Invalid image data format.");
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error("Could not detect image MIME type.");
  }
  return {
    mimeType: mimeMatch[1],
    data: parts[1]
  };
};

const SAUDI_INSTRUCTION = `
CRITICAL LANGUAGE RULE (SAUDI):
- The 'dialogue' output must be in **STRICT AUTHENTIC SAUDI ARABIC DIALECT** (Najdi or Hejazi).
- **ABSOLUTELY FORBIDDEN:** Modern Standard Arabic (Fusha). Do not use formal phrasing.
- **ABSOLUTELY FORBIDDEN:** English words in the dialogue.
- Use deep local slang, fillers (e.g., "يعني", "ترا", "يا هلا", "أبشر", "سم", "وش دعوة"), and cultural nuances.
`;

const ENGLISH_INSTRUCTION = `
CRITICAL LANGUAGE RULE (ENGLISH):
- The 'dialogue' output must be in **ELEGANT LUXURY ENGLISH**.
- The tone should be sophisticated, international, and welcoming.
- You may include very slight, subtle Arabic loanwords only if they fit a luxury context (e.g., "Habibi", "Yalla") but keep it 99% English.
`;

const BASE_SYSTEM_INSTRUCTION = `
You are the AI brain of "AI Clone Avatar", a futuristic, clean, and highly advanced AI cloning platform.

Brand Identity:
- Futuristic, Clean, Cyber-aesthetic.
- Neon cyan and deep space blue.
- Advanced technology and precision.

Task:
Analyze the character image, clothing items, location, and dialogue request.
Generate a structured JSON plan containing the final dialogue, scene details, and a prompt suitable for a video generation model (Veo).
`;

export const generateSophiePlan = async (
  characterDataUrl: string,
  clothesDataUrls: string[],
  backgroundDataUrl: string | null,
  location: string,
  dialogueRequest: string,
  language: Language,
  cameraMotion: CameraMotion,
  lightingStyle: LightingStyle,
  emotion: Emotion,
  voiceStyle: VoiceStyle,
  avatarStyle: AvatarStyle,
  aspectRatio: AspectRatio
): Promise<SophiePlan> => {
  const ai = getAiClient();
  
  const parts: any[] = [];
  
  // Add Character
  if (characterDataUrl) {
    const { mimeType, data } = parseDataUrl(characterDataUrl);
    parts.push({ inlineData: { mimeType, data } });
    parts.push({ text: "This is the character reference image." });
  }

  // Add Clothes
  clothesDataUrls.forEach((clothUrl, idx) => {
    const { mimeType, data } = parseDataUrl(clothUrl);
    parts.push({ inlineData: { mimeType, data } });
    parts.push({ text: `Clothing item ${idx + 1} reference.` });
  });

  // Add Background
  if (backgroundDataUrl) {
    const { mimeType, data } = parseDataUrl(backgroundDataUrl);
    parts.push({ inlineData: { mimeType, data } });
    parts.push({ text: "This is the desired background/environment reference." });
  }

  // Add Request
  const prompt = `
    Location: ${location}
    Camera Motion: ${cameraMotion}
    Lighting Style: ${lightingStyle}
    Emotion/Expression: ${emotion}
    Voice Style: ${voiceStyle}
    Avatar Style: ${avatarStyle}
    Aspect Ratio: ${aspectRatio}
    Dialogue Request: "${dialogueRequest}"
    Target Language: ${language === 'saudi' ? 'Saudi Arabic Dialect' : 'English'}

    Based on the images and text provided, generate an AI Clone Avatar Plan.
    
    CRITICAL VEO PROMPT INSTRUCTION:
    The 'veoPrompt' is for a video generation model to simulate a speaking avatar.
    It MUST start with: "Cinematic close-up portrait of..."
    You MUST explicitly include these keywords to simulate lip-sync: "The subject is looking directly into the camera lens. Her lips are moving and articulating words. She is speaking continuously. Expressive facial animation."
    Describe the clothing, the location, the camera motion (${cameraMotion}), the lighting (${lightingStyle}), the emotion (${emotion}), and the avatar style (${avatarStyle}).
    If a background image was provided, describe it perfectly so the video model uses it.
    The character must appear alive, engaged, and actively talking to the viewer.
  `;
  parts.push({ text: prompt });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dialogue: { type: Type.STRING, description: "The final dialogue in the requested language." },
      emotionalTone: { type: Type.STRING, description: "Description of the emotional tone." },
      sceneLighting: { type: Type.STRING, description: "Description of the scene lighting." },
      wardrobeStyling: { type: Type.STRING, description: "A refined description of the combined wardrobe." },
      cameraAngle: { type: Type.STRING, description: "Suggested cinematic camera angle." },
      veoPrompt: { type: Type.STRING, description: "A detailed visual prompt for the video generation model focused on speaking and lip movement." },
    },
    required: ["dialogue", "emotionalTone", "sceneLighting", "wardrobeStyling", "cameraAngle", "veoPrompt"],
  };

  const specificInstruction = language === 'saudi' ? SAUDI_INSTRUCTION : ENGLISH_INSTRUCTION;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview', 
    contents: { parts },
    config: {
      systemInstruction: BASE_SYSTEM_INSTRUCTION + "\n" + specificInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 1024 }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate plan");
  return JSON.parse(text) as SophiePlan;
};

export const generateSophieAudio = async (text: string, voiceStyle: VoiceStyle = 'natural', language: Language = 'english'): Promise<string> => {
  const ai = getAiClient();
  
  let voiceName = 'Kore';
  switch (voiceStyle) {
    case 'broadcast': voiceName = 'Puck'; break;
    case 'conversational': voiceName = 'Charon'; break;
    case 'narrative': voiceName = 'Fenrir'; break;
    case 'natural':
    default: voiceName = 'Kore'; break;
  }

  const promptText = language === 'saudi' 
    ? `Say in an authentic Saudi Arabic dialect: ${text}`
    : `Say: ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }, 
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("Failed to generate audio");
  return audioData;
};

export const generateSophieVideo = async (
  characterDataUrl: string,
  backgroundDataUrl: string | null,
  prompt: string,
  resolution: VideoResolution = '720p',
  aspectRatio: AspectRatio = '9:16'
): Promise<string> => {
  const ai = getAiClient();
  
  // 1. Parse Data URL to ensure correct MIME type
  const { mimeType, data } = parseDataUrl(characterDataUrl);

  let operation;

  if (backgroundDataUrl) {
    // If background is provided, we MUST use veo-3.1-generate-preview with referenceImages
    // Note: This requires 16:9 and 720p according to the API docs.
    const bgParsed = parseDataUrl(backgroundDataUrl);
    
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [
      {
        image: { imageBytes: data, mimeType: mimeType },
        referenceType: VideoGenerationReferenceType.ASSET,
      },
      {
        image: { imageBytes: bgParsed.data, mimeType: bgParsed.mimeType },
        referenceType: VideoGenerationReferenceType.ASSET,
      }
    ];

    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        referenceImages: referenceImagesPayload,
        resolution: '720p', // Forced to 720p for multiple references
        aspectRatio: '16:9' // Forced to 16:9 for multiple references
      }
    });
  } else {
    // Standard generation (highest quality lip sync)
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt, 
      image: {
        imageBytes: data,
        mimeType: mimeType, 
      },
      config: {
        numberOfVideos: 1,
        resolution: resolution, // Dynamic resolution
        aspectRatio: aspectRatio
      }
    });
  }

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  // 2. Check for errors
  if (operation.error) {
    const errorMsg = operation.error.message || "Unknown error";
    console.error("Veo API Error:", operation.error);
    throw new Error(`Video generation failed: ${errorMsg}`);
  }

  const response = operation.response as any;
  if (response?.raiMediaFilteredReasons && response.raiMediaFilteredReasons.length > 0) {
    const reasons = response.raiMediaFilteredReasons.join(" ");
    throw new Error(`Video generation blocked by safety filters: ${reasons}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    console.error("Operation completed but no video URI:", JSON.stringify(operation, null, 2));
    throw new Error("Video generation completed successfully but returned no video URI.");
  }
  
  const apiKey = (globalThis as any).process?.env?.API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY; 
  
  // 3. Download the video content to create a local Blob URL
  // This ensures the video can be played and downloaded without CORS/Auth issues in the UI
  try {
      if (!apiKey) {
          console.warn("No API key available to fetch video blob, returning direct URI.");
          return videoUri;
      }

      console.log("Downloading video...");
      const response = await fetch(videoUri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });
      if (!response.ok) {
          throw new Error(`Failed to download video file: ${response.statusText}`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob); 
  } catch (error) {
      console.warn("Failed to fetch video blob, falling back to direct URI.", error);
      // Fallback: return the URI
      return videoUri;
  }
};

export const ensureApiKeySelected = async (): Promise<boolean> => {
    const win = window as any;
    if (win.aistudio) {
        if (await win.aistudio.hasSelectedApiKey()) {
            return true;
        }
        try {
            await win.aistudio.openSelectKey();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
    // Fallback for dev environments
    return !!((globalThis as any).process?.env?.API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY); 
};
