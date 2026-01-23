import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

export async function diagnosePlant(base64Image: string, strainName?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.DIAGNOSIS });
    // Remove header if present
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const prompt = `
      Analyze this cannabis plant image. Strain Context: ${strainName || 'Unknown'}.
      Return ONLY a JSON object. Do not use Markdown code blocks.
      Structure:
      {
        "diagnosis": "Name of issue (e.g. Nitrogen Deficiency)",
        "severity": "high" | "medium" | "low",
        "healthy": boolean,
        "confidence": number,
        "topAction": "Single most important fix",
        "fixSteps": ["Step 1", "Step 2", "Step 3"],
        "yieldTips": "Impact on yield",
        "qualityTips": "Impact on potency"
      }
    `;

    const result = await model.generateContent([prompt, { inlineData: { data: cleanBase64, mimeType: "image/jpeg" }}]);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini 2.5 API Error:", error);
    throw error;
  }
}

export async function sendMessage(message: string, plant: any, userProfile: any, persona: string = 'Kore') {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.CHAT_LIVE });
    
    const personas: any = {
        'Kore': 'You are Kore. Calm, nurturing, scientific.',
        'Charon': 'You are Charon. Bold, direct.',
        'Fenrir': 'You are MasterGrowbot. Synthetic, precise.',
        'Puck': 'You are Puck. Energetic, fun.'
    };

    const prompt = `
      System: ${personas[persona] || personas['Kore']}
      Context: User has a ${plant?.strain || 'plant'}.
      User: "${message}"
      Response (max 3 sentences):
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    throw error;
  }
}

export async function getDailyInsight(stage: string) {
    try {
        const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.INSIGHTS });
        const result = await model.generateContent(`One short pro-tip for cannabis in ${stage} stage.`);
        return result.response.text();
    } catch (e) { return "Check your pH levels today."; }
}

export async function analyzeGrowLog(text: string) {
    return "Log saved."; 
}
