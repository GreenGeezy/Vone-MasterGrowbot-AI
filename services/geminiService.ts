
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult, LogAnalysis, Plant, UserProfile } from "../types";

const getClient = () => {
  // Use process.env.API_KEY directly as required by the system instructions
  // This value is replaced at build time by Vite's define configuration
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key missing in process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const diagnosePlant = async (
  base64Images: string[], 
  context?: { strain?: string, environment?: string }
): Promise<DiagnosisResult> => {
  const ai = getClient();
  const contextStr = context ? `\nCONTEXT: Strain: ${context.strain}, Env: ${context.environment}` : "";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        ...base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img } })),
        { text: `Analyze these cannabis plant images.${contextStr}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosis: { type: Type.STRING },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
          health: { type: Type.STRING, enum: ["Poor", "Fair", "Good", "Great", "Excellent"] },
          stage: { type: Type.STRING },
          topAction: { type: Type.STRING },
          fixSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          yieldTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          qualityTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          generalAdvice: { type: Type.STRING }
        },
        required: ["diagnosis", "issues", "confidence", "severity", "health", "stage", "topAction", "fixSteps", "yieldTips", "qualityTips", "generalAdvice"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as DiagnosisResult;
};

export const chatWithCoach = async (
  message: string, 
  history: any[],
  context?: { plant?: Plant, userProfile?: UserProfile }
): Promise<string> => {
  const ai = getClient();
  let systemInstruction = "You are MasterGrowbot, a wise expert coach.";
  if (context?.userProfile) systemInstruction += ` User Level: ${context.userProfile.experience}.`;

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction },
    history
  });

  const result = await chat.sendMessage({ message });
  return result.text || "I'm processing. Please try again.";
};

export const analyzeGrowLog = async (text: string, tags: string[], imageBase64?: string): Promise<LogAnalysis> => {
  try {
    const ai = getClient();
    const parts: any[] = [{ text: `Analyze log: ${text} [${tags.join(',')}]` }];
    if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    return JSON.parse(response.text || '{}') as LogAnalysis;
  } catch {
    return { summary: "Logged.", healthIndicator: "good", yieldPrediction: "Stable." };
  }
};

export const getDailyInsight = async (stage: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Pro actionable tip for cannabis ${stage} stage. One sentence.`,
    });
    return response.text || "Maintain consistent environmentals.";
  } catch {
    return "Check your pH levels regularly.";
  }
};
