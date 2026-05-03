import { GoogleGenAI } from "@google/genai";

export async function generateDreamVideo(params: {
  prompt: string;
  firstFrame: string; // base64
  middleFrame?: string; // base64
  lastFrame?: string; // base64
  apiKey: string;
  onStatusUpdate: (status: string) => void;
}) {
  const { prompt, firstFrame, middleFrame, lastFrame, apiKey, onStatusUpdate } = params;
  
  const ai = new GoogleGenAI({ apiKey });

  onStatusUpdate("Initializing generation...");

  // If a middle frame is provided, we use the referenceImages approach for higher control
  // Otherwise, we use the simpler image/lastFrame interpolation if lastFrame is provided.
  
  let operation;
  
  if (middleFrame) {
    onStatusUpdate("Generating video with 3 reference frames...");
    const referenceImages: any[] = [
      {
        image: { imageBytes: firstFrame.split(',')[1], mimeType: 'image/png' },
        referenceType: 'ASSET'
      },
      {
        image: { imageBytes: middleFrame.split(',')[1], mimeType: 'image/png' },
        referenceType: 'ASSET'
      }
    ];
    
    if (lastFrame) {
      referenceImages.push({
        image: { imageBytes: lastFrame.split(',')[1], mimeType: 'image/png' },
        referenceType: 'ASSET'
      });
    }

    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        referenceImages: referenceImages,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } else if (lastFrame) {
    onStatusUpdate("Interpolating between start and end frames...");
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: firstFrame.split(',')[1],
        mimeType: 'image/png'
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        lastFrame: {
          imageBytes: lastFrame.split(',')[1],
          mimeType: 'image/png'
        },
        aspectRatio: '16:9'
      }
    });
  } else {
    onStatusUpdate("Animating starting frame...");
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: firstFrame.split(',')[1],
        mimeType: 'image/png'
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  }

  // Poll for completion
  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    onStatusUpdate(`Generating... (this usually takes 1-3 minutes) - Step ${pollCount}`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const firstVideo = operation.response?.generatedVideos?.[0]?.video;
  if (!firstVideo) throw new Error("No video generated in first pass");

  // Extension for 10-20 seconds requirement
  // Initial is usually 5-6s. One extension adds 7s. Total ~12-13s.
  onStatusUpdate("Extending video to 10-20 seconds...");
  
  let extendOperation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: `Continue the scene: ${prompt}`,
    video: firstVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!extendOperation.done) {
    onStatusUpdate("Fine-tuning and extending duration...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    extendOperation = await ai.operations.getVideosOperation({ operation: extendOperation });
  }

  const finalVideoUri = extendOperation.response?.generatedVideos?.[0]?.video?.uri;
  if (!finalVideoUri) throw new Error("Video extension failed");

  // Fetch the final video with API key
  onStatusUpdate("Downloading final masterpiece...");
  const videoResp = await fetch(finalVideoUri, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!videoResp.ok) throw new Error("Failed to download generated video");
  
  const blob = await videoResp.blob();
  return URL.createObjectURL(blob);
}
