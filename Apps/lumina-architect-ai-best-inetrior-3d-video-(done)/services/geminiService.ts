import { GoogleGenAI } from "@google/genai";

// Helper to determine nearest supported aspect ratio
const getNearestAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const ratios: Record<string, number> = {
    '1:1': 1,
    '3:4': 3/4,
    '4:3': 4/3,
    '9:16': 9/16,
    '16:9': 16/9
  };
  
  // Find the key with the closest value
  return Object.keys(ratios).reduce((prev, curr) => {
    return (Math.abs(ratios[curr] - ratio) < Math.abs(ratios[prev] - ratio)) ? curr : prev;
  });
};

// Robust image processor: resizes, converts to JPEG, and handles dimensions
const processImage = async (
    base64: string, 
    maxDim: number = 1024, 
    targetWidth?: number, 
    targetHeight?: number
): Promise<{ data: string, mimeType: string, width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      let width = targetWidth || img.width;
      let height = targetHeight || img.height;
      
      // If no forced dimensions, resize maintaining aspect ratio if exceeding maxDim
      if (!targetWidth && !targetHeight) {
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      // Draw white background to handle transparent PNGs correctly
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      // Use high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as JPEG for best compatibility and lower payload size
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const data = newDataUrl.replace(/^data:image\/jpeg;base64,/, '');
      
      resolve({ data, mimeType: 'image/jpeg', width, height });
    };
    img.onerror = (e) => reject(new Error("Failed to load image for processing"));
    img.src = base64;
  });
};

export const generateEditedImage = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Process input image: Resize to 1024px to match '1K' output target and prevent payload issues
    const processedImg = await processImage(imageBase64, 1024);
    const aspectRatio = getNearestAspectRatio(processedImg.width, processedImg.height);
    
    // Process mask if it exists - MUST match image dimensions exactly
    let processedMask = null;
    if (maskBase64) {
        processedMask = await processImage(maskBase64, 1024, processedImg.width, processedImg.height);
    }
    
    const model = 'gemini-3-pro-image-preview';

    let fullPrompt = `
    ROLE: Precision Interior Architecture Editor.
    TASK: ${prompt}
    
    STRICT CONSTRAINTS:
    1. Modify ONLY the requested elements.
    2. Preserve original lighting, shadows, perspective, and camera angle perfectly.
    3. Maintain photorealism and architect-grade accuracy.
    4. Ensure seamless blending of edited areas with the existing environment.
    `;

    if (processedMask) {
      fullPrompt += `
      5. A mask image is provided. The WHITE areas in the second image indicate the precise region to edit/remove.
      6. Focus operations strictly on the masked regions.
      `;
    }

    const parts: any[] = [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType: processedImg.mimeType,
          data: processedImg.data,
        },
      }
    ];

    if (processedMask) {
      parts.push({
        inlineData: {
          mimeType: processedMask.mimeType,
          data: processedMask.data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            imageSize: '1K',
            aspectRatio: aspectRatio as any
        }
      }
    });

    const contentParts = response.candidates?.[0]?.content?.parts;
    
    if (!contentParts) {
      throw new Error("No content generated");
    }

    const imagePart = contentParts.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
       return `data:image/png;base64,${imagePart.inlineData.data}`;
    }

    throw new Error("No image data found in response");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Improve error message if possible
    let msg = error.message || "Unknown error";
    if (msg.includes("500")) msg = "The AI service encountered an internal error. This is often due to complex images or high server load. Please try again with a smaller image or different prompt.";
    throw new Error(msg);
  }
};

export const generateInteriorVideo = async (
  imageBase64: string,
  prompt: string,
  endImageBase64?: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Process image (1280px max for Video)
    const processedImg = await processImage(imageBase64, 1280);
    
    // Determine video aspect ratio based on image dimensions
    // Snap to 16:9 or 9:16 for Veo compatibility
    const ratio = processedImg.width / processedImg.height;
    const aspectRatio = ratio > 1 ? '16:9' : '9:16';

    const model = 'veo-3.1-fast-generate-preview'; 

    let config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
    };

    if (endImageBase64) {
        // Force end frame to match start frame dimensions/ratio structure roughly, but processImage handles scaling
        // We let processImage maintain aspect ratio of end image, but it might differ from start.
        // Veo generally handles minor diffs, but best if they match.
        const processedEnd = await processImage(endImageBase64, 1280);
        config.lastFrame = {
            imageBytes: processedEnd.data,
            mimeType: processedEnd.mimeType
        };
    }

    let operation = await ai.models.generateVideos({
      model: model,
      prompt: prompt || "Cinematic transition between architectural states, high resolution, 4k",
      image: {
        imageBytes: processedImg.data,
        mimeType: processedImg.mimeType,
      },
      config: config
    });

    // Poll for completion
    const startTime = Date.now();
    const TIMEOUT_MS = 300000; // 5 minutes

    while (!operation.done) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error("Video generation timed out after 5 minutes.");
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error from Gemini API'}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("Video generation completed but no URI returned.");
    }

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error("Failed to download generated video.");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Gemini Video API Error:", error);
    let msg = error.message || "Unknown error";
    if (msg.includes("500")) msg = "Video generation failed due to an internal server issue. Please try again.";
    throw new Error(msg);
  }
};
