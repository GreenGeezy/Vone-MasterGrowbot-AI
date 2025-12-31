
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult, LogAnalysis, Plant, UserProfile } from "../types";

// Initialize API Client using the mandatory process.env.API_KEY variable
const getClient = () => {
  if (!process.env.API_KEY) {
    console.error("API Key not found in environment.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Diagnoses a plant based on images using Gemini 3 Pro for high-quality analysis.
 */
export const diagnosePlant = async (
  base64Images: string[], 
  context?: { strain?: string, environment?: string }
): Promise<DiagnosisResult> => {
  try {
    const ai = getClient();
    const model = 'gemini-3-pro-preview';

    const contextStr = context 
      ? `\nCONTEXT:\nStrain: ${context.strain || "Unknown"}\nGrow Environment: ${context.environment || "Unknown"}\n` 
      : "";

    const imageParts = base64Images.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img
      }
    }));

    const systemInstruction = `Act as an expert cannabis cultivator. Analyze these plant images.${contextStr}
            
    1.  **Diagnosis**: Identify deficiencies, pests, or stress. Take the provided Strain and Environment into account for specific advice.
    2.  **Health**: Determine overall health strictly as one of: "Poor", "Fair", "Good", "Great", "Excellent".
    3.  **Stage**: Estimate growth stage (e.g., Seedling, Vegetative, Flowering, Harvest).
    4.  **TopAction**: Write ONE single, concise sentence of the most important action the grower should take immediately.
    5.  **Severity**: low, medium, or high.
    6.  **Fixes**: Step-by-step recovery.
    7.  **Yield**: Techniques to increase yield.
    8.  **Quality**: Tips for potency.
    9.  **Advice**: Brief summary.
    10. **Confidence**: A number between 0 and 100 representing confidence level.

    Return strictly valid JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...imageParts,
          {
            text: `Analyze these plant images.`
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING },
            issues: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
            health: { type: Type.STRING, enum: ["Poor", "Fair", "Good", "Great", "Excellent"] },
            stage: { type: Type.STRING },
            topAction: { type: Type.STRING },
            fixSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            yieldTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            qualityTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            generalAdvice: { type: Type.STRING }
          },
          required: ["diagnosis", "issues", "confidence", "severity", "health", "stage", "topAction", "fixSteps", "yieldTips", "qualityTips", "generalAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as DiagnosisResult;
  } catch (error) {
    console.error("Diagnosis failed:", error);
    throw error;
  }
};

/**
 * Chat with the AI Grow Coach using Gemini 3 Flash.
 */
export const chatWithCoach = async (
  message: string, 
  history: {role: string, parts: {text: string}[]}[],
  context?: { plant?: Plant, userProfile?: UserProfile }
): Promise<string> => {
  try {
    const ai = getClient();
    const model = 'gemini-3-flash-preview';
    
    let systemInstruction = "You are MasterGrowbot, a expert cannabis cultivation AI. You are direct, wise and encouraging. Use grower terminology. ";
  
    if (context?.userProfile) {
        const p = context.userProfile;
        systemInstruction += `User Profile: ${p.experience} experience, ${p.grow_mode} mode. Goal: ${p.goal}. `;
    }
    
    if (context?.plant) {
        const p = context.plant;
        systemInstruction += `Active Plant: ${p.name} (${p.strain || 'Unknown'}). Stage: ${p.stage}. Health: ${p.healthScore}. `;
    }

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "Protocol error. Please retry.";
  } catch (error) {
    console.error("Chat failed:", error);
    return "Offline. Check your connection.";
  }
};

/**
 * Analyzes a journal log.
 */
export const analyzeGrowLog = async (text: string, tags: string[], imageBase64?: string): Promise<LogAnalysis> => {
  try {
    const ai = getClient();
    const model = 'gemini-3-flash-preview';
    const prompt = `Analyze this grow log: "${text}" with tags: ${tags.join(', ')}. Summarize, predict yield impact, and state health indicator (good/concern/critical).`;

    const parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            yieldPrediction: { type: Type.STRING },
            healthIndicator: { type: Type.STRING, enum: ["good", "concern", "critical"] },
          },
          required: ["summary", "yieldPrediction", "healthIndicator"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) throw new Error("No analysis generated");
    return JSON.parse(textResult) as LogAnalysis;
  } catch (error) {
    return {
      summary: "Observation logged.",
      healthIndicator: "good",
      yieldPrediction: "Stable care leads to stable yields."
    };
  }
};

export const getDailyInsight = async (stage: string): Promise<string> => {
   try {
    const ai = getClient();
    const model = 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model,
      contents: `One-sentence actionable tip for a cannabis plant in ${stage}. Pro grower style.`,
    });
    return response.text || "Monitor environmentals daily.";
  } catch (error) {
    return "Ensure pH is in the optimal range.";
  }
}
