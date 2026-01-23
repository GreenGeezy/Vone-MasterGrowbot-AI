import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

export async function diagnosePlant(base64Image: string, strainName?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.DIAGNOSIS });
    
    // Robust Base64 Cleaning
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const prompt = `
      Analyze this cannabis plant image. Context: ${strainName || 'Unknown Strain'}.
      
      Act as a Master Cultivator. Identify pests, deficiencies, or diseases.
      
      CRITICAL: Return ONLY a valid JSON object. Do not use Markdown blocks.
      
      Required JSON Structure:
      {
        "diagnosis": "Name of the issue (e.g., Nitrogen Deficiency, Wind Burn, Healthy)",
        "severity": "high" | "medium" | "low",
        "health": 0 to 100 (integer representing plant health),
        "confidence": 0 to 100 (integer representing diagnosis confidence),
        "topAction": "The single most important immediate action (max 10 words)",
        "fixSteps": ["Step 1 detail", "Step 2 detail", "Step 3 detail"],
        "yieldTips": "One specific tip to save yield",
        "qualityTips": "One specific tip to preserve terpenes"
      }
    `;

    const result = await model.generateContent([
        prompt, 
        { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } }
    ]);
    
    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText);

  } catch (error) {
    console.error("Gemini Diagnosis Error:", error);
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
      User Profile: ${userProfile?.experience || 'Novice'}.
      Context: User has a ${plant?.strain || 'plant'}.
      User: "${message}"
      Response (Keep it helpful, accurate, and under 3 sentences):
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}

export async function getDailyInsight(stage: string) {
    try {
        const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.INSIGHTS });
        const result = await model.generateContent(`Give 1 short, pro-tip for cannabis in ${stage} stage.`);
        return result.response.text();
    } catch (e) { return "Check your pH levels today."; }
}

export async function analyzeGrowLog(text: string) {
    return "Log saved."; 
}
