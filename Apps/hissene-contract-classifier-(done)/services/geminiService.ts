import { GoogleGenAI } from "@google/genai";
import { CONTRACT_ANALYZER_INSTRUCTION, SUPPLIER_ANALYZER_INSTRUCTION } from "../constants";
import { AnalysisResult, ChatMessage, ContractData, SupplierAnalysisData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_CONTRACT_DATA: ContractData = {
  type: 'CONTRACT',
  classifier_name: "Hissene Contract Analyzer",
  company_name: "Unknown Company",
  counterparty_name: "Unknown Counterparty",
  contract_subject: "Contract Analysis",
  contract_type: "Agreement",
  contract_start_date: "Unknown",
  contract_end_date: "Unknown",
  contract_duration_description: "Not specified",
  currency: "TND",
  amounts: {
    total_contract_amount: "0.00",
    total_amount_paid: "0.00",
    calculation_notes: ""
  },
  payment_modality: "Not specified",
  payment_schedule: [],
  contract_status: "UNKNOWN",
  expiration_alert: {
    is_within_2_months: "NO",
    alert_message: ""
  },
  analysis_translations: {
    english: { summary: "Summary not available." },
    french: { summary: "Résumé non disponible." },
    arabic: { summary: "ملخص غير متوفر" }
  }
};

const DEFAULT_SUPPLIER_DATA: SupplierAnalysisData = {
  type: 'SUPPLIER',
  analysis_name: "Hissene Supplier Check",
  supplier_name: "Unknown Supplier",
  supplier_metadata: {
    tax_id: "N/A",
    address: "N/A",
    phone: "N/A",
    email: "N/A",
    website: "N/A"
  },
  document_type: "UNKNOWN",
  products: [],
  supplier_evaluation: {
    supplier_name: "Unknown",
    location: "Tunisia",
    score: 0,
    rank: 0,
    risk_level: "HIGH",
    dimensions: {
      product_match_accuracy: 0,
      local_presence: 0,
      price_competitiveness: 0,
      reliability_documentation: 0
    }
  },
  negotiation_guidance: {
    strategy_summary: "Insufficient data for negotiation strategy.",
    leverage_points: [],
    recommended_ask: "N/A",
    walk_away_point: "N/A"
  },
  flags: ["DATA_MISSING"],
  summary_translations: {
    english: "No summary available.",
    french: "Aucun résumé disponible.",
    arabic: "ملخص غير متوفر"
  }
};

/**
 * Executes a function with retry logic specifically designed for AI Model Overload (503).
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 5, operationName: string = "Operation"): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Identify if it's a 503 or overload error
      // API error structure can vary, so we check multiple places
      const isOverloaded = 
        error?.status === 503 || 
        error?.code === 503 || 
        error?.status === 'UNAVAILABLE' || 
        (error?.message && error.message.toLowerCase().includes('overloaded')) ||
        (error?.error?.message && error.error.message.toLowerCase().includes('overloaded'));

      // If we reached max retries, stop
      if (attempt === maxRetries) break;

      // Exponential Backoff
      // If overloaded, start with a higher base delay (5s) to give the server breathing room.
      // Otherwise, start with 2s.
      const baseDelay = isOverloaded ? 5000 : 2000;
      const factor = 1.5;
      const delay = Math.round(baseDelay * Math.pow(factor, attempt - 1)); 
      
      console.warn(`[${operationName}] Attempt ${attempt} failed (Overloaded: ${isOverloaded}). Retrying in ${delay}ms...`, error.message);
      await wait(delay);
    }
  }
  
  console.error(`[${operationName}] Failed after ${maxRetries} attempts.`);
  throw lastError;
}

/**
 * Analyzes a file based on the selected mode (CONTRACT vs SUPPLIER).
 */
export const analyzeFile = async (fileData: string, mimeType: string, mode: 'CONTRACT' | 'SUPPLIER', fileName?: string): Promise<AnalysisResult> => {
  return withRetry(async () => {
    if (!fileData) throw new Error("File data is empty");

    let contentPart;
    if (mimeType === 'text/plain') {
      contentPart = { text: `Here is the OCR/Parsed Text content of the file to analyze:\n\n${fileData}` };
    } else {
      contentPart = {
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      };
    }

    const systemInstruction = mode === 'CONTRACT' ? CONTRACT_ANALYZER_INSTRUCTION : SUPPLIER_ANALYZER_INSTRUCTION;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", 
      contents: [
        {
          role: "user",
          parts: [
              contentPart,
              { text: `Perform Full Analysis in ${mode} mode.` }
          ],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response received from Gemini.");
    
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanText);
    } catch (jsonError) {
      console.error("JSON Parse Error:", jsonError);
      throw new Error("Failed to parse JSON response");
    }

    // Sanitize based on mode
    if (mode === 'CONTRACT' || parsed.type === 'CONTRACT') {
        return {
          ...DEFAULT_CONTRACT_DATA,
          ...parsed,
          type: 'CONTRACT', // Enforce type
          amounts: { ...DEFAULT_CONTRACT_DATA.amounts, ...(parsed.amounts || {}) },
          expiration_alert: { ...DEFAULT_CONTRACT_DATA.expiration_alert, ...(parsed.expiration_alert || {}) },
          analysis_translations: {
            english: { ...DEFAULT_CONTRACT_DATA.analysis_translations?.english, ...(parsed.analysis_translations?.english || {}) },
            french: { ...DEFAULT_CONTRACT_DATA.analysis_translations?.french, ...(parsed.analysis_translations?.french || {}) },
            arabic: { ...DEFAULT_CONTRACT_DATA.analysis_translations?.arabic, ...(parsed.analysis_translations?.arabic || {}) },
          },
          payment_schedule: Array.isArray(parsed.payment_schedule) ? parsed.payment_schedule : [],
          legal_analysis: parsed.legal_analysis ? {
            overall_risk_score: parsed.legal_analysis.overall_risk_score || 0,
            missing_mandatory_clauses: Array.isArray(parsed.legal_analysis.missing_mandatory_clauses) ? parsed.legal_analysis.missing_mandatory_clauses : [],
            risks: Array.isArray(parsed.legal_analysis.risks) ? parsed.legal_analysis.risks : []
          } : undefined
        } as ContractData;
    } else {
        const result = {
          ...DEFAULT_SUPPLIER_DATA,
          ...parsed,
          type: 'SUPPLIER', // Enforce type
          products: Array.isArray(parsed.products) ? parsed.products : [],
          supplier_metadata: { ...DEFAULT_SUPPLIER_DATA.supplier_metadata, ...(parsed.supplier_metadata || {}) },
          supplier_evaluation: { ...DEFAULT_SUPPLIER_DATA.supplier_evaluation, ...(parsed.supplier_evaluation || {}) },
          negotiation_guidance: { ...DEFAULT_SUPPLIER_DATA.negotiation_guidance, ...(parsed.negotiation_guidance || {}) },
          flags: Array.isArray(parsed.flags) ? parsed.flags : [],
          summary_translations: { ...DEFAULT_SUPPLIER_DATA.summary_translations, ...(parsed.summary_translations || {}) }
        } as SupplierAnalysisData;
        
        if (fileName) {
          const cleanName = fileName.replace(/\.[^/.]+$/, ""); // Strip file extension
          result.supplier_name = cleanName;
          if (result.supplier_evaluation) {
            result.supplier_evaluation.supplier_name = cleanName;
          }
        }
        
        return result;
    }
  }, 5, "File Analysis");
};

// Kept for backward compat but simply calls analyzeFile with CONTRACT mode
export const analyzeContract = async (fileData: string, mimeType: string): Promise<ContractData> => {
  const result = await analyzeFile(fileData, mimeType, 'CONTRACT');
  return result as ContractData;
};

export const sendChatMessage = async (
  message: string, 
  history: ChatMessage[], 
  systemInstruction: string,
  contextFiles: { base64: string, mimeType: string, name?: string }[]
): Promise<string> => {
  return withRetry(async () => {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const currentUserParts: any[] = [{ text: message }];
    
    contextFiles.forEach(file => {
      // If text/plain (parsed Docx/Excel), pass as text part, NOT inlineData
      if (file.mimeType === 'text/plain') {
        currentUserParts.unshift({
           text: `[Context Document: ${file.name || 'File'}]\n${file.base64}\n` 
        });
      } else {
        currentUserParts.unshift({
          inlineData: {
            data: file.base64,
            mimeType: file.mimeType
          }
        });
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        ...contents, 
        { role: "user", parts: currentUserParts }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    return response.text || "UNKNOWN";
  }, 3, "Chat Message");
};