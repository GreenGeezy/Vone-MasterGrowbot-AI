import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

/**
 * 1. DIAGNOSIS
 * Analyzes plant health and returns structured JSON
 */
export async function diagnosePlant(base64Image: string, strainName?: string, environment?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.DIAGNOSIS });
    
    // Clean Base64 string
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg"
      }
    };

    const context = `Strain: ${strainName || 'Unknown'}. Environment: ${environment || 'Indoor'}.`;

    const prompt = `
      Analyze this cannabis plant image. Context: ${context}
      Return ONLY a JSON object. Do not use Markdown blocks.
      Structure:
      {
        "diagnosis": "Name of issue (e.g. Nitrogen Deficiency, Spider Mites)",
        "severity": "high" | "medium" | "low",
        "healthy": boolean,
        "confidence": number,
        "topAction": "The single most important immediate fix",
        "fixSteps": ["Step 1", "Step 2", "Step 3"],
        "yieldTips": "Impact on final weight",
        "qualityTips": "Impact on potency/terpenes"
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);

  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
}

/**
 * 2. CHAT COACH
 * Handles Text & Persona Context
 */
export async function sendMessage(message: string, plant: any, userProfile: any, persona: string = 'Kore') {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.CHAT_LIVE });
    
    const plantContext = plant 
        ? `User's Plant: ${plant.name} (${plant.strain}), Stage: ${plant.stage}.` 
        : "User has no active plant.";
    
    const personas: any = {
        'Kore': 'You are Kore. Calm, nurturing, and scientific.',
        'Charon': 'You are Charon. Bold, direct, and no-nonsense.',
        'Fenrir': 'You are Fenrir. Synthetic, robotic, and precise.',
        'Puck': 'You are Puck. Energetic, fun, and casual.'
    };

    const prompt = `
      System: You are MasterGrowbot. ${personas[persona] || personas['Kore']}
      User Profile: ${userProfile?.experience || 'Novice'} grower.
      Context: ${plantContext}.
      User asks: "${message}"
      Response (Keep it helpful, accurate, and under 3 sentences):
    `;

    const result = await model.generateContent(prompt);
    return (await result.response).text();

  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

/**
 * 3. LOG ANALYSIS
 */
export async function analyzeGrowLog(notes: string) {
    try {
        const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.INSIGHTS });
        const result = await model.generateContent(`Analyze this grow note and predict yield impact in 10 words: "${notes}"`);
        return (await result.response).text();
    } catch (e) { return "Log saved."; }
}

/**
 * 4. DAILY INSIGHT
 */
export async function getDailyInsight(stage: string) {
    try {
        const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.INSIGHTS });
        const result = await model.generateContent(`Give 1 short, pro-tip for cannabis in ${stage} stage.`);
        return (await result.response).text();
    } catch (e) { return "Check your pH levels today."; }
}
