
import { BusinessFields, GeminiSessionResponse } from "./types";

/**
 * World-Class Forensic Audit Service
 * This service acts as the gateway to the n8n intelligence pipeline.
 * Updated to demand high-fidelity data on Market Barriers and Regulatory Compliance.
 */

const N8N_WEBHOOK_URL = "https://thatboitrippin13.app.n8n.cloud/webhook/326d38cc-10c6-4c77-bb33-cae2f6feae1c";

export class GeminiService {
  /**
   * Dispatches the analytical payload to the forensic webhook.
   * Mandates a 'Red Team' approach to market analysis.
   */
  async processInput(
    userInput: string,
    history: { role: string; parts: { text: string }[] }[],
    currentFields: BusinessFields,
    fileData?: { data: string; mimeType: string }
  ): Promise<GeminiSessionResponse> {
    
    // Construct the forensic payload with specific mandates for market depth
    const payload = {
      userInput,
      history,
      currentFields,
      fileData: fileData || null,
      timestamp: new Date().toISOString(),
      metadata: {
        engine: "n8n-forensic-audit-v7-deep-market",
        analyst_role: "Chief Strategic Risk Officer & Regulatory Auditor",
        forensic_mandates: [
          "Barriers to Entry Audit: Identify structural, legal, and capital hurdles.",
          "Regulatory Matrix: Analyze compliance costs, licensing, and geopolitical legal shifts.",
          "Second-Order Market Logic: How do these barriers protect or trap the incumbent?",
          "Auditability: Specific evidence pointers for due diligence."
        ],
        visualization_requirements: [
          "radarData: Array<{subject: string, A: number, B: number, fullMark: number}> representing 'Our Moat' vs 'Competitor Average'"
        ]
      }
    };

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        mode: "cors",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Webhook Error ${response.status}: Falling back to local heuristic.`);
        return this.generateFallbackResponse(userInput, currentFields);
      }

      // Robust JSON handling: Get text first to avoid "Unexpected end of JSON input"
      const textResponse = await response.text();
      
      if (!textResponse || textResponse.trim() === "") {
        console.warn("Empty response received from Intelligence Core. Engaging Failover Protocol.");
        return this.generateFallbackResponse(userInput, currentFields);
      }

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (jsonError) {
        console.error("JSON Parse Error:", jsonError, "Raw Response:", textResponse);
        return this.generateFallbackResponse(userInput, currentFields);
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result || typeof result.fields === "undefined") {
        console.error("Invalid Data Structure:", result);
        return this.generateFallbackResponse(userInput, currentFields);
      }

      return result as GeminiSessionResponse;
    } catch (e: any) {
      console.error("Forensic Connectivity Fault:", e);
      return this.generateFallbackResponse(userInput, currentFields);
    }
  }

  /**
   * Generates a local fallback response when the intelligence core is offline.
   * Uses a basic heuristic to assign input to the next missing field to keep the flow moving.
   */
  private generateFallbackResponse(userInput: string, currentFields: BusinessFields): GeminiSessionResponse {
    const updatedFields = { ...currentFields };
    let filledKey: string | null = null;
    const inputContent = userInput || "File Attachment";

    // 1. Find the first field that is null (Logic: User is answering the prompt for the next missing field)
    const fieldKeys = [
      'businessIdea', 'productService', 'targetCustomer', 'problemSolved', 
      'location', 'revenueModel', 'competitors', 'uniqueAdvantage', 
      'monthlyCosts', 'monthlyRevenue'
    ] as const;

    for (const key of fieldKeys) {
      if (updatedFields[key] === null) {
        // Simple type checking for numeric fields
        if (key === 'monthlyCosts' || key === 'monthlyRevenue') {
          const extractedNum = parseFloat(inputContent.replace(/[^0-9.]/g, ''));
          if (!isNaN(extractedNum)) {
            updatedFields[key] = extractedNum;
            filledKey = key;
          }
        } else {
          updatedFields[key] = inputContent;
          filledKey = key;
        }
        break; // Only fill one field at a time
      }
    }

    let message = "";
    if (filledKey) {
      message = `**SYSTEM ALERT (OFFLINE MODE)**: The Intelligence Core is momentarily unreachable.\n\nHowever, I have locally logged your input for **${filledKey}**.\n\n*Forensic Note: Deep-tissue validation will resume automatically once the link is re-established.* \n\nPlease proceed to the next vector.`;
    } else {
      message = `**SYSTEM ALERT (OFFLINE MODE)**: Connectivity to the Strategic Core is intermittent. \n\nI have buffered your input: "${inputContent.substring(0, 30)}${inputContent.length > 30 ? '...' : ''}". \n\nPlease continue providing mission-critical details; synthesis will occur in the background.`;
    }

    return {
      fields: updatedFields,
      message: message,
      isReadyForAnalysis: false
    };
  }
}

export const gemini = new GeminiService();
