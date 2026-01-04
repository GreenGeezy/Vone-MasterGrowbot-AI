import { GoogleGenAI, SchemaType } from "@google/genai";
import { DiagnosisResult, LogAnalysis } from "../types";
import { CONFIG } from "./config";

// Initialize the Client with your Key
const genAI = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

/**
 * EXPERT KNOWLEDGE BASE
 * This system instruction forces the AI to act as a Cannabis Expert.
 */
const SYSTEM_CORE = `
You are MasterGrowbot, a PhD-level cannabis cultivation expert. 
Your goal is to maximize yield and quality (terpenes/THC) for the user.

CRITICAL PARAMETERS:
- Soil pH: 6.0 - 6.8
- Hydro/Coco pH: 5.5 - 6.1
- Temp: 70-85°F (Lights On), 65-75°F (Lights Off)
- Humidity: Seedling (65-70%), Veg (50-60%), Flower (40-50%)

RULES:
1. Be concise. Mobile users need quick answers.
2. Prioritize "Fix Steps". Give actionable advice (e.g., "Flush with pH 6.0 water").
3. Distinguish carefully between "Calcium Deficiency" (brown spots) and "Septoria" (yellow halos).
4. If unsure, recommend a slurry test or runoff test.
`;

/**
 * Utility: Convert File to Base64 for Gemini
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Feature: Plant Diagnosis (Visual Analysis)
 * Uses PRO model for high accuracy.
 */
export const diagnosePlant = async (base64Images: string[]): Promise<DiagnosisResult> => {
  try {
    // Use the PRO model for visual reasoning
    const model = genAI.getGenerativeModel({ 
      model: CONFIG.MODELS.DIAGNOSIS,
      systemInstruction: `${SYSTEM_CORE} MODE: CRISIS DIAGNOSIS. Analyze the image for pests, disease, or deficiencies.`
    });

    const prompt = "Diagnose this cannabis plant. Identify the issue, severity, and provide a checklist of fixes.";

    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [
          ...base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img } })),
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            diagnosis: { type: SchemaType.STRING },
            severity: { type: SchemaType.STRING, enum: ["low", "medium", "high"] },
            health: { type: SchemaType.STRING }, // e.g. "Poor", "Fair", "Good"
            fixSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            confidence: { type: SchemaType.NUMBER }
          },
          required: ["diagnosis", "severity", "health", "fixSteps", "confidence"]
        }
      }
    });

    return JSON.parse(result.response.text()) as DiagnosisResult;
  } catch (error) {
    console.error("Diagnosis Error:", error);
    // Fallback if AI fails
    return {
      diagnosis: "Analysis Failed",
      severity: "low",
      health: "Unknown",
      fixSteps: ["Check internet connection", "Try taking a clearer photo"],
      confidence: 0
    };
  }
};

/**
 * Feature: Chat Coach (Text)
 * Uses FLASH model for speed.
 */
export const chatWithCoach = async (message: string, history: any[]): Promise<string> => {
  const model = genAI.getGenerativeModel({ 
    model: CONFIG.MODELS.INSIGHTS,
    systemInstruction: SYSTEM_CORE 
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(message);
  return result.response.text();
};

/**
 * Feature: Daily Insight
 * Uses FLASH model for low cost.
 */
export const getDailyInsight = async (stage: string): Promise<string> => {
  const model = genAI.getGenerativeModel({ 
    model: CONFIG.MODELS.INSIGHTS,
    systemInstruction: SYSTEM_CORE 
  });
  
  const result = await model.generateContent(`Provide one single, high-impact pro tip for the ${stage} stage of cannabis growth.`);
  return result.response.text();
};

/**
 * Feature: Journal Log Analysis
 * Uses FLASH model to predict yield/health.
 */
export const analyzeGrowLog = async (text: string): Promise<LogAnalysis> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: CONFIG.MODELS.INSIGHTS,
      systemInstruction: `${SYSTEM_CORE} Analyze this log entry. Predict yield impact and overall health.`
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Log: ${text}` }] }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
                summary: { type: SchemaType.STRING },
                yieldPrediction: { type: SchemaType.STRING }, // e.g. "Stable", "Increasing"
                healthIndicator: { type: SchemaType.STRING, enum: ["good", "concern", "critical"] }
            },
            required: ["summary", "yieldPrediction", "healthIndicator"]
        }
      }
    });
    return JSON.parse(result.response.text()) as LogAnalysis;
  } catch (error) {
    return { summary: "Log saved.", healthIndicator: "good", yieldPrediction: "Stable" };
  }
};
