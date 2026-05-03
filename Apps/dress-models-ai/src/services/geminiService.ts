import { GoogleGenAI } from "@google/genai";
import { EditingSettings } from "../types";

const PREDEFINED_MODELS: Record<string, string> = {
  model1: 'Emma - 20s, Caucasian, blonde hair, elegant and sophisticated',
  model2: 'Marcus - 30s, Black, short hair, athletic and confident',
  model3: 'Yuki - 25s, Asian, black hair, edgy streetwear style',
  model4: 'Sofia - 28s, Hispanic, curly hair, casual and approachable',
};

export async function processProductImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  settings: EditingSettings
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  let fullPrompt = "";

  if (settings.mode === 'model') {
    const actualModelDesc = settings.selectedModel && settings.selectedModel !== 'custom'
      ? PREDEFINED_MODELS[settings.selectedModel]
      : (settings.modelDescription || 'Professional fashion model');

    fullPrompt = `
      ${prompt}
      
      Task: Create a highly realistic lifestyle photo of a model wearing/using this exact uploaded product.
      
      Specific Requirements:
      - Model Description: ${actualModelDesc}
      - Model Pose/Style: ${settings.modelPose || 'Candid lifestyle'}
      - Model Side/Angle: ${settings.modelSide || 'front'} view
      - Location: ${settings.location || 'Specific location'}, ${settings.area || 'Area/City'}, ${settings.country || 'Country'}
      - Model Interaction: ${settings.modelInteraction || 'Wearing the item naturally'}
      - Lighting intensity: ${settings.lighting}/100
      - Realism level: ${settings.realism}/100
      
      Instructions: Seamlessly integrate the uploaded product onto the model. The product must look completely natural, matching the lighting, perspective, and shadows of the scene. Show the ${settings.modelSide || 'front'} side of the model. The final image should look like a high-end fashion editorial or lifestyle campaign.
    `;
  } else {
    const bgStyle = settings.background === 'custom' ? (settings.customBackground || 'Minimal white infinity') : settings.background;
    fullPrompt = `
      ${prompt}
      
      Technical Requirements:
      - Lighting intensity: ${settings.lighting}/100
      - Background style: ${bgStyle}
      - Realism level: ${settings.realism}/100
      - Texture enhancement: ${settings.texture}/100
      
      Instructions: Transform this product photo into a hyper-realistic luxury ecommerce image. Maintain the core product identity but enhance its presentation to match high-end studio photography.
    `;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: fullPrompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

export async function processProductVideo(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  settings: EditingSettings
): Promise<string> {
  const apiKey = (process.env as any).API_KEY;
  if (!apiKey) {
    throw new Error("Video generation requires a connected Google Cloud API Key.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = `UGC Video Ad: ${prompt}. ${settings.videoScript || 'Showcase the product dynamically.'}. Camera Movement: ${settings.videoCameraMovement || 'Dynamic'}. Transition: ${settings.videoTransition || 'Smooth'}. Focus Point: ${settings.videoFocusPoint || 'The product'}. The scene takes place in ${settings.location || 'a beautiful location'}, ${settings.area || ''}, ${settings.country || ''}.`;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: fullPrompt,
    image: {
      imageBytes: imageBase64,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Failed to generate video");
  }

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });
  
  if (!response.ok) {
     throw new Error("Failed to download generated video");
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
