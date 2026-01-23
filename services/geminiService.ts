// @ts-ignore
import { GoogleGenAI } from "@google/genai";
import { CONFIG } from './config';

// Initialize the NEW SDK Client
const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

/**
 * 1. PLANT DIAGNOSIS (Gemini 3 Pro)
 */
export async function diagnosePlant(base64Image: string, strainName?: string) {
  try {
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const prompt = `
      Analyze this cannabis plant image. Context: ${strainName || 'Unknown Strain'}.
      Act as an Expert Agronomist. Identify pests, deficiencies, pathogens, or environmental stress.
      
      CRITICAL: Return ONLY a valid JSON object. Do not use Markdown.
      {
        "diagnosis": "Scientific name of issue",
        "severity": "high" | "medium" | "low",
        "health": 0 to 100 (integer),
        "confidence": 0 to 100 (integer),
        "topAction": "The single most important immediate fix",
        "fixSteps": ["Step 1", "Step 2", "Step 3"],
        "yieldTips": "Impact on final harvest",
        "qualityTips": "Impact on quality"
      }
    `;

    // New SDK Syntax
    const response = await ai.models.generateContent({
      model: CONFIG.MODELS.DIAGNOSIS,
      contents: [
        { role: 'user', parts: [{ text: prompt }, { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } }] }
      ],
      config: {
        responseMimeType: 'application/json' // Forces JSON output natively
      }
    });

    // In new SDK, .text is a property, not a function
    const text = response.text(); 
    return JSON.parse(text || "{}");

  } catch (error: any) {
    console.error("Gemini 3 Diagnosis Error:", error);
    throw new Error(`AI Service Error: ${error.message}`);
  }
}

/**
 * 2. CHATBOT (Gemini 3 Flash)
 */
export async function sendMessage(message: string, plant: any, userProfile: any, persona: string = 'Kore') {
  try {
    const personas: any = {
        'Kore': 'You are Coach Kore. Calm, nurturing, scientific.',
        'Charon': 'You are Coach Mike. Bold, direct, no-nonsense.',
        'Fenrir': 'You are MasterGrowbot. Robotic, precise, data-driven.',
        'Puck': 'You are Coach Puck. Energetic, fun, informal.'
    };

    const systemInstruction = `
      ${personas[persona] || personas['Kore']}
      User Profile: ${userProfile?.experience || 'Novice'}.
      Context: ${plant ? `${plant.name} (${plant.strain})` : 'No active plant'}.
      Keep responses helpful and under 3 sentences.
    `;

    // New SDK Syntax
    const response = await ai.models.generateContent({
      model: CONFIG.MODELS.CHAT_LIVE,
      contents: [
        // System instructions are now passed as a specific part or role depending on the model,
        // but simple concatenation works best for Flash Preview compatibility right now.
        { role: 'user', parts: [{ text: `System: ${systemInstruction}\nUser: ${message}` }] }
      ]
    });

    return response.text() || "I am connected and listening.";

  } catch (error: any) {
    console.error("Gemini 3 Chat Error:", error);
    throw new Error("Connection Error. Please check internet.");
  }
}

/**
 * 3. DAILY INSIGHTS (Gemini 3 Flash)
 */
export async function getDailyInsight(stage: string) {
    try {
        const response = await ai.models.generateContent({
            model: CONFIG.MODELS.INSIGHTS,
            contents: [{ role: 'user', parts: [{ text: `Give 1 short pro-tip for cannabis in ${stage} stage.` }] }]
        });
        return response.text() || "Check your pH levels today.";
    } catch (e) { return "Check your pH levels today."; }
}

export async function analyzeGrowLog(text: string) {
    return "Log saved."; 
}
