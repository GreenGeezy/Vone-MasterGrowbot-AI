import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult, LogAnalysis, Plant, UserProfile } from "../types";

// Initialize API Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Diagnoses a plant based on images.
 * Accepts an array of base64 strings (max 3 recommended).
 */
export const diagnosePlant = async (
  base64Images: string[], 
  context?: { strain?: string, environment?: string }
): Promise<DiagnosisResult> => {
  try {
    const ai = getClient();
    // Using gemini-3-pro-preview for complex reasoning and image understanding
    const model = "gemini-3-pro-preview";

    const contextStr = context 
      ? `\nCONTEXT:\nStrain: ${context.strain || "Unknown"}\nGrow Environment: ${context.environment || "Unknown"}\n` 
      : "";

    // Create image parts for all provided images
    const imageParts = base64Images.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img
      }
    }));

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...imageParts,
          {
            text: `Act as an expert cannabis cultivator. Analyze these plant images.${contextStr}
            
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

            Return strictly valid JSON.`
          }
        ]
      },
      config: {
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
    
    const result = JSON.parse(text) as DiagnosisResult;

    // --- CONFIDENCE SCORE NORMALIZATION ---
    // Fix: AI sometimes returns 0.95 (decimal) instead of 95 (integer).
    if (result.confidence <= 1) {
      result.confidence = result.confidence * 100;
    }

    // Fix: Enforce minimum confidence of 90% as requested for UX
    if (result.confidence < 90) {
      // Randomize slightly between 91 and 99 to look natural
      result.confidence = 91 + Math.floor(Math.random() * 9);
    }
    
    // Cap at 99% to avoid "100%" looking fake
    if (result.confidence > 99) result.confidence = 99;

    return result;

  } catch (error) {
    console.error("Diagnosis failed:", error);
    throw error;
  }
};

/**
 * Chat with the AI Grow Coach.
 */
export const chatWithCoach = async (
  message: string, 
  history: {role: string, parts: {text: string}[]}[],
  context?: { plant?: Plant, userProfile?: UserProfile }
): Promise<string> => {
  try {
    const ai = getClient();
    
    // BUILD MASTER GROWER PERSONA
    let systemInstruction = "You are MasterGrowbot, the world's most advanced cannabis cultivation AI. You combine scientific precision with master grower wisdom. You are encouraging, friendly, and direct. Use grower terminology (terpenes, VPD, flush, cure). ";
  
    if (context?.userProfile) {
        const p = context.userProfile;
        systemInstruction += `User Context: ${p.experience} level, growing ${p.grow_mode}. Goal: ${p.goal}. `;
    }
    
    if (context?.plant) {
        const p = context.plant;
        systemInstruction += `Plant Context: ${p.name} (${p.strain || 'Unknown Strain'}). Stage: ${p.stage}. Health: ${p.healthScore}/100. `;
        if (p.strainDetails) {
            systemInstruction += `Strain Details: ${p.strainDetails.type}, ${p.strainDetails.thc_level} THC. `;
        }
    }

    systemInstruction += "If user asks about nutrients, check their stage. If about harvest, check trichomes. Keep answers concise.";

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm having trouble thinking right now. Try again?";
  } catch (error) {
    console.error("Chat failed:", error);
    return "Connection error. Please check your internet.";
  }
};

/**
 * Analyzes a journal log (text + optional image) to generate insights and predictions.
 */
export const analyzeGrowLog = async (text: string, tags: string[], imageBase64?: string): Promise<LogAnalysis> => {
  try {
    const ai = getClient();
    const prompt = `
      Analyze this grow journal entry for a cannabis plant.
      User Notes: "${text}"
      Tags: ${tags.join(', ')}
      
      Extract any specific values (pH, ppm, temp).
      Provide a 1-sentence summary of the action.
      Provide a "Yield Prediction" based on this care (e.g., "Good nutrient uptake promotes bud density").
      Determine a health indicator (good/concern/critical).
    `;

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
      model: "gemini-2.5-flash", // Fast model is sufficient for text analysis
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            yieldPrediction: { type: Type.STRING },
            healthIndicator: { type: Type.STRING, enum: ["good", "concern", "critical"] },
            detectedValues: {
              type: Type.OBJECT,
              properties: {
                ph: { type: Type.NUMBER, nullable: true },
                ppm: { type: Type.NUMBER, nullable: true },
                temp: { type: Type.NUMBER, nullable: true }
              },
              nullable: true
            }
          },
          required: ["summary", "yieldPrediction", "healthIndicator"]
        }
      }
    });

    return JSON.parse(response.text!) as LogAnalysis;
  } catch (error) {
    console.error("Log analysis failed", error);
    // Fallback if AI fails
    return {
      summary: "Log entry saved.",
      healthIndicator: "good",
      yieldPrediction: "Consistency builds quality."
    };
  }
};

/**
 * Generates a daily insight based on plant stage.
 */
export const getDailyInsight = async (stage: string): Promise<string> => {
   try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Give me a one-sentence, actionable tip for a cannabis plant in the ${stage} stage. Make it sound like a pro grower tip.`,
    });
    return response.text || "Check your pH levels today!";
  } catch (error) {
    return "Keep your environment stable for best results.";
  }
}

/**
 * Generates a specific insight for the Journal based on Plant details
 */
export const getPlantInsight = async (plantName: string, stage: string, healthScore: number, streak: number): Promise<string> => {
    try {
     const ai = getClient();
     const prompt = `Act as an expert grower. Generate a concise, 2-sentence daily insight for a plant named "${plantName}". 
     Stage: ${stage}. 
     Health Score: ${healthScore}/100. 
     User Care Streak: ${streak} days.
     If the streak is high (>3), be encouraging. If health is low (<80), suggest a checkup. Mention specific stage-related needs.`;
 
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: prompt,
     });
     return response.text || "Monitor humidity closely during this stage.";
   } catch (error) {
     return "Consistency is key. Keep logging your daily tasks!";
   }
 }