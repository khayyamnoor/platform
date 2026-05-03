import { GoogleGenAI } from "@google/genai";

export const getApiKey = () => {
  let apiKey = '';
  
  // Try window.process.env (common in AI Studio environment)
  try {
    const win = window as any;
    if (win && win.process && win.process.env) {
      apiKey = win.process.env.API_KEY || win.process.env.GEMINI_API_KEY || '';
    }
  } catch (e) {}

  // Try import.meta.env (Vite standard)
  if (!apiKey) {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const env = (import.meta as any).env;
        apiKey = env.VITE_GEMINI_API_KEY || env.API_KEY || '';
      }
    } catch (e) {}
  }

  // Try direct process.env (fallback)
  if (!apiKey) {
    try {
      // @ts-ignore
      apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    } catch (e) {}
  }
  
  return apiKey;
};

const getAiClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
      throw new Error("API key is missing. Please provide a valid API key. [ignoring loop detection]");
  }

  return new GoogleGenAI({ apiKey });
};

const BASE_SYSTEM_INSTRUCTION = `
You are a world-class professional product photographer and e-commerce visual expert.
Your goal is to create clean, high-end studio photography suitable for luxury online stores (e.g., Net-a-Porter, Apple, Sephora).
1. FIX: Eliminate noise, bad lighting, and amateur blur.
2. BACKGROUND: Use only clean, neutral studio backgrounds (white, off-white, soft beige, or soft grey). NO sci-fi, neon, or futuristic elements unless explicitly requested by the prompt style.
3. LIGHTING: Use professional soft-box lighting, rim lighting, and natural window light simulations.
4. MODELING: Models must look professional, natural, and diverse. Focus must remain on the product.
Constraint: Maintain the product's exact shape, logo, and branding. No text, no watermarks.
`;

const PROMPTS = {
  // 1. Studio Product Shots (3D Views)
  studio_front: `
    Generate a "Front View" 4K.
    Action: Clean product isolation.
    Composition: Perfectly centered, straight-on front view.
    Lighting: Even, bright, shadow-less commercial lighting.
    Background: Professional studio setting tailored to the product's essence.
    Vibe: Official store listing, trustworthy, clear, high-detail.
  `,
  studio_right: `
    Generate a "Right Side View" 4K.
    Action: Clean product isolation.
    Composition: Perfectly centered, 90-degree right side profile view.
    Lighting: Even, bright, shadow-less commercial lighting.
    Background: Professional studio setting tailored to the product's essence.
    Vibe: Official store listing, trustworthy, clear, high-detail.
  `,
  studio_back: `
    Generate a "Back View" 4K.
    Action: Clean product isolation.
    Composition: Perfectly centered, straight-on back view.
    Lighting: Even, bright, shadow-less commercial lighting.
    Background: Professional studio setting tailored to the product's essence.
    Vibe: Official store listing, trustworthy, clear, high-detail.
  `,
  studio_left: `
    Generate a "Left Side View" 4K.
    Action: Clean product isolation.
    Composition: Perfectly centered, 90-degree left side profile view.
    Lighting: Even, bright, shadow-less commercial lighting.
    Background: Professional studio setting tailored to the product's essence.
    Vibe: Official store listing, trustworthy, clear, high-detail.
  `,

  // 2. Models with Product (Posed) - Updated for Dynamic Classic & Futuristic Styles
  model_pose_classic: `
    Generate a "Dynamic Classic Studio Portrait" 4K.
    Action: Professional model actively engaging with the product (e.g., holding it up to light, wearing it with movement).
    Pose: Fluid, elegant motion, not stiff. Showcasing key features.
    Attire: Solid colors, timeless minimalism, smart casual.
    Background: Clean studio wall.
    Vibe: High-end catalog, active elegance, authentic.
  `,
  model_pose_premium: `
    Generate a "Futuristic High-Fashion Editorial" 4K.
    Action: Model showcasing the product with bold, dynamic, avant-garde poses.
    Pose: Angular, confident, high-fashion movement.
    Lighting: Cinematic, modern, slightly cool or dramatic contrast.
    Background: Minimalist modern architecture or sleek metallic textures.
    Vibe: Next-gen fashion magazine, bold, premium.
  `,

  // 3. Interactive Product Shots
  model_interact_classic: `
    Generate a "Classic Interaction Editorial" 4K.
    Action: Model authentically using the product (e.g., typing, applying cream, adjusting jewelry).
    Style: Timeless, elegant, soft lighting, natural poses.
    Background: Warm, inviting studio setting.
    Vibe: Authentic, trustworthy, traditional luxury.
  `,
  model_interact_futuristic: `
    Generate a "Futuristic Editorial Interaction" 4K.
    Action: Model interacting with the product in a high-fashion, future-forward style.
    Style: Avant-garde, sleek, bold geometry, modern lighting.
    Background: Minimalist modern studio with metallic or cool-toned accents.
    Vibe: Innovative, next-gen, edgy, premium.
  `
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error("Failed to read file. [ignoring loop detection]"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateProductShot = async (
  images: { data: string, mimeType: string }[],
  style: keyof typeof PROMPTS,
  options?: {
    productPrompt?: string;
    modelPrompt?: string;
    backgroundPrompt?: string;
    virtue?: string;
    productAngle?: string;
    modelPosture?: string;
  }
): Promise<{ url: string, usage?: any }> => {
  try {
    const ai = getAiClient();
    let prompt = BASE_SYSTEM_INSTRUCTION + "\n\n" + PROMPTS[style];

    // Append user customizations if provided
    if (options?.virtue && options.virtue !== 'Default') {
      prompt += `\n    Virtue/Style Override: ${options.virtue} style.`;
    }
    if (options?.productAngle && options.productAngle !== 'Default') {
      prompt += `\n    Product Angle Override: ${options.productAngle} view.`;
    }
    if (options?.modelPosture) {
      prompt += `\n    Model Posture/Pose Details: ${options.modelPosture}`;
    }
    if (options?.productPrompt) {
      prompt += `\n    Product Details: ${options.productPrompt}`;
    }
    if (options?.modelPrompt) {
      prompt += `\n    Model Details: ${options.modelPrompt}`;
    }
    if (options?.backgroundPrompt) {
      prompt += `\n    Background Details: ${options.backgroundPrompt}`;
    }
    
    // Add context about images
    if (images.length > 0) {
        prompt += `\n    Input Images Context:
    Image 1: The CLOTHING PRODUCT. Maintain its details, texture, and shape exactly.
    Image 2 (if present): The MODEL FACE. You MUST use this face for the model in the generated image. Blend it naturally but keep the facial features recognizable.`;
    }

    const parts: any[] = [{ text: prompt }];

    // Add all images
    for (const img of images) {
        parts.unshift({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType,
            },
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview', 
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            imageSize: "1K", 
            aspectRatio: "1:1"
        }
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return {
                 url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                 usage: response.usageMetadata
             };
          }
        }
      }
    }

    throw new Error(`No image generated for ${style}. [ignoring loop detection]`);
  } catch (error) {
    console.error(`Gemini API Error (${style}):`, error);
    throw error;
  }
};

export const generateProductVideo = async (
  startImageBase64: string,
  endImageBase64: string | undefined,
  prompt: string,
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    resolution?: '720p' | '1080p';
  }
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    let aspectRatio = options?.aspectRatio || '9:16';
    if (aspectRatio === '1:1') aspectRatio = '9:16'; // Fallback

    // Config for Veo
    const config: any = {
        numberOfVideos: 1,
        resolution: options?.resolution || '1080p',
        aspectRatio: aspectRatio as '16:9' | '9:16'
    };

    // If end frame is provided, use it
    if (endImageBase64) {
        config.lastFrame = {
            imageBytes: endImageBase64,
            mimeType: 'image/jpeg',
        };
    }

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: startImageBase64,
        mimeType: 'image/jpeg',
      },
      config: config
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to return a URI. [ignoring loop detection]");
    
    // Download the video as a Blob and create an Object URL for local rendering
    // This prevents CORS issues and ensures the video is locally addressable
    const apiKey = getApiKey();
    
    const response = await fetch(videoUri, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}. [ignoring loop detection]`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo API Error:", error);
    
    // Robust Quota/Rate Limit Error Detection
    let isQuotaError = false;

    // Check 1: Direct status codes on error object
    if (error?.status === 429 || error?.code === 429) isQuotaError = true;
    if (String(error?.status).includes('RESOURCE_EXHAUSTED')) isQuotaError = true;
    
    // Check 2: Nested error object (common in Google APIs)
    if (error?.error?.code === 429 || String(error?.error?.status).includes('RESOURCE_EXHAUSTED')) isQuotaError = true;
    
    // Check 3: Message string analysis
    // Ensure we handle objects that don't stringify well by using message property if available
    let errorDetails = '';
    try {
        errorDetails = JSON.stringify(error || {});
    } catch (e) {
        errorDetails = 'Circular or non-serializable error object';
    }
    const msg = (error?.message || '') + errorDetails;
    
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) isQuotaError = true;

    if (isQuotaError) {
         throw new Error("Quota Exceeded: The video generation limit for this API key has been reached. Please check your billing or wait. [ignoring loop detection]");
    }
    
    throw error;
  }
};