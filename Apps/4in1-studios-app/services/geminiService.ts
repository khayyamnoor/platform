import { GoogleGenAI, Type } from "@google/genai";

// Models
const ANALYSIS_MODEL = 'gemini-3-flash-preview';
const EDITING_MODEL = 'gemini-2.5-flash-image'; // "Nano Banana"
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

// Helper to convert Blob/File to Base64
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Initialize API
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes the image to detect type, subjects, and suggest enhancements.
 */
export const analyzeImage = async (file: File) => {
  const ai = getAiClient();
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analyze this image efficiently. 
    1. Identify the image type (Portrait, Landscape, Product, or Other).
    2. Identify the main subject.
    3. Describe the current lighting and mood.
    4. Suggest 3 distinct professional creative enhancement styles suitable for this image (e.g., "Cyberpunk", "Minimalist Studio", "Cinematic Warmth"). 
       For each suggestion, provide a label and a short prompt description.
    
    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['portrait', 'landscape', 'product', 'other'] },
          subject: { type: Type.STRING },
          mood: { type: Type.STRING },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                prompt: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

/**
 * Applies enhancements or edits to an image based on a prompt.
 * Uses the Nano Banana (gemini-2.5-flash-image) model.
 */
export const editImage = async (base64Image: string, prompt: string, mimeType: string = 'image/png') => {
  const ai = getAiClient();
  
  const finalPrompt = `
    Act as a professional photo editor. 
    Enhance or modify the provided image based strictly on this instruction: "${prompt}".
    Ensure the output is hyper-realistic, has cinematic lighting, and maintains high fidelity.
    Return the image only.
  `;

  const response = await ai.models.generateContent({
    model: EDITING_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: finalPrompt }
      ]
    },
    config: {
      // Nano Banana (2.5 flash image) does not support responseMimeType or Schema
    }
  });

  // Extract image from response
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated.");
};

/**
 * Generates a video from an image using Veo.
 */
export const generateVideoSequence = async (base64Image: string, prompt: string = "Cinematic slow motion camera pan, ultra realistic") => {
    // Check for API key selection for Veo models (Client-side check usually, but assuming wrapper logic here)
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
             await (window as any).aistudio.openSelectKey();
             // In a real app we might wait or retry, here we assume success or fail on next call
        }
    }

    const ai = getAiClient();
    
    // We create a new instance to ensure fresh key if selection happened
    const aiWithKey = getAiClient();

    let operation = await aiWithKey.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt,
      image: {
        imageBytes: base64Image,
        mimeType: 'image/png' // Assuming PNG for simplicity in this demo context
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await aiWithKey.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Fetch the actual video bytes using the API key
    const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoRes.blob();
    return URL.createObjectURL(blob);
};
