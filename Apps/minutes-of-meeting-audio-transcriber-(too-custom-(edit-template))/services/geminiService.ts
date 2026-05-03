import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const buildSystemInstruction = (context?: string) => {
  let instruction = "You are an expert transcriber and professional secretary for Golden Carthage. Your task is to extract meeting data into structured formats.";
  if (context && context.trim().length > 0) {
    instruction += `\n\nCONTEXT & VOCABULARY:\n${context}`;
  }
  return instruction;
};

const buildPrompt = (template: string, isJsonMode: boolean, language: string) => {
  let prompt = "";
  if (isJsonMode) {
    prompt = `Analyze the provided audio content and extract information into the requested JSON fields.
    
INSTRUCTIONS:
${template}

IMPORTANT:
- If multiple audio segments are provided, they are part of the SAME meeting in sequence.
- Combine info from all parts to fill the fields accurately.
- Return ONLY valid JSON.
- Do not include markdown formatting like \`\`\`json.`;
  } else {
    prompt = "Analyze the provided content and create structured notes in Markdown.";
  }

  if (language && language !== 'Auto-detect') {
    prompt += `\n\nIMPORTANT: The language is ${language}.`;
  }
  return prompt;
};

export const processText = async (
  inputText: string,
  language: string = 'Auto-detect',
  template?: string,
  context?: string,
  isJsonMode: boolean = false
): Promise<{ text: string, json?: any }> => {
  try {
    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(context);
    const prompt = buildPrompt(template || "", isJsonMode, language);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Content:\n${inputText}\n\nInstruction:\n${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: isJsonMode ? 'application/json' : 'text/plain'
      }
    });

    const text = response.text || "";
    if (isJsonMode) {
      try {
        const json = JSON.parse(text);
        return { text: JSON.stringify(json, null, 2), json };
      } catch (e) {
        return { text };
      }
    }
    return { text };
  } catch (error: any) {
    throw new Error(error.message || "Failed to process text.");
  }
};

export const transcribeAudio = async (
  audioBlobs: Blob | Blob[], 
  language: string = 'Auto-detect', 
  template?: string,
  context?: string,
  isJsonMode: boolean = false
): Promise<{ text: string, json?: any }> => {
  try {
    const blobs = Array.isArray(audioBlobs) ? audioBlobs : [audioBlobs];
    
    // Check total size. If > 18MB, use Sequential Chunk Processing to avoid "File too large" errors.
    const totalSize = blobs.reduce((acc, blob) => acc + blob.size, 0);
    const MAX_PAYLOAD_SIZE = 18 * 1024 * 1024; // 18MB safety limit

    if (totalSize > MAX_PAYLOAD_SIZE) {
       console.log("Large file detected. Switching to sequential processing.");
       return await transcribeSequentially(blobs, language, template, context, isJsonMode);
    }

    const ai = getGeminiClient();
    const parts = await Promise.all(blobs.map(async (blob, index) => {
      const base64 = await blobToBase64(blob);
      return {
        inlineData: {
          mimeType: blob.type || 'audio/webm',
          data: base64
        }
      };
    }));

    const systemInstruction = buildSystemInstruction(context);
    const prompt = buildPrompt(template || "", isJsonMode, language);
    
    parts.push({ text: prompt } as any);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts as any },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: isJsonMode ? 'application/json' : 'text/plain'
      }
    });

    const text = response.text || "";
    if (isJsonMode) {
      try {
        const json = JSON.parse(text);
        return { text: JSON.stringify(json, null, 2), json };
      } catch (e) {
        return { text };
      }
    }
    return { text };
  } catch (error: any) {
    throw new Error(error.message || "Failed to transcribe audio.");
  }
};

export const translateContent = async (
  content: string | any,
  targetLanguage: string,
  isJsonMode: boolean = false
): Promise<{ text: string, json?: any }> => {
  try {
    const ai = getGeminiClient();
    
    let prompt = `Translate the following content into ${targetLanguage}.`;
    let inputText = typeof content === 'string' ? content : JSON.stringify(content);

    if (isJsonMode) {
      prompt += `\nMaintain the exact same JSON structure and keys, only translate the values. Return ONLY valid JSON.`;
    } else {
      prompt += `\nMaintain the original formatting (e.g., Markdown).`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Content to translate:\n${inputText}\n\nInstruction:\n${prompt}`,
      config: {
        responseMimeType: isJsonMode ? 'application/json' : 'text/plain'
      }
    });

    const text = response.text || "";
    if (isJsonMode) {
      try {
        const json = JSON.parse(text);
        return { text: JSON.stringify(json, null, 2), json };
      } catch (e) {
        return { text };
      }
    }
    return { text };
  } catch (error: any) {
    throw new Error(error.message || "Failed to translate content.");
  }
};

// Helper for large files: Transcribe each part to text, then combine and process
const transcribeSequentially = async (
  blobs: Blob[],
  language: string,
  template?: string,
  context?: string,
  isJsonMode?: boolean
) => {
  const ai = getGeminiClient();
  let fullTranscript = "";
  
  // 1. Convert all audio to simple transcriptions first
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const base64 = await blobToBase64(blob);
    
    // For intermediate chunks, we just want a raw transcription, not the final JSON yet
    const chunkPrompt = `Transcribe this audio segment exactly. This is part ${i + 1} of a longer meeting. Language: ${language}.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: blob.type || 'audio/webm', data: base64 } },
            { text: chunkPrompt }
          ]
        },
        config: {
          responseMimeType: 'text/plain'
        }
      });
      fullTranscript += (response.text || "") + "\n\n";
    } catch (e) {
      console.error(`Error processing chunk ${i}:`, e);
      fullTranscript += `[Error processing audio segment ${i + 1}]\n\n`;
    }
  }

  // 2. Process the combined text to extract the final PV/Structure
  if (isJsonMode) {
     return await processText(fullTranscript, language, template, context, true);
  } else {
     // If general mode, maybe summarize the full transcript
     return await processText(fullTranscript, language, "Create a structured meeting summary from this transcript.", context, false);
  }
};