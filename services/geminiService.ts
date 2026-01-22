// services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config';

// Initialize Gemini with the API Key
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

/**
 * VISION ANALYSIS: Diagnoses plant health from an image
 */
export async function diagnosePlant(base64Image: string) {
  try {
    // 1. Get the Vision Model (Gemini 1.5 Pro is best for this)
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.DIAGNOSIS || "gemini-1.5-pro" });
    
    // 2. Clean the Base64 string (remove data:image/jpeg;base64, prefix if present)
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    // 3. Construct the image part for Gemini
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg"
      }
    };

    // 4. Structured Prompt for JSON response
    const prompt = `
      Analyze this cannabis plant image. Return ONLY a JSON object. Do not use Markdown formatting.
      Structure:
      {
        "diagnosis": "Name of issue (e.g. Nitrogen Deficiency, Spider Mites, or Healthy)",
        "severity": "low" | "medium" | "high",
        "healthy": boolean,
        "confidence": "High" | "Medium" | "Low",
        "treatment": "One sentence recommended action",
        "fixSteps": ["Step 1", "Step 2", "Step 3"]
      }
    `;

    // 5. Send to AI
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // 6. Parse JSON (strip any accidental markdown code blocks)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error; // Throw so the UI Alert can show the user
  }
}

/**
 * CHAT COACH: Answers questions with context of the user's plant
 */
export async function sendMessage(message: string, plant: any, userProfile: any) {
  try {
    // 1. Get the Flash Model (Fast text response)
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.CHAT_LIVE || "gemini-1.5-flash" });
    
    // 2. Build Context Strings
    const plantContext = plant 
      ? `The user is growing a ${plant.strain} plant named "${plant.name}". It is in the ${plant.stage} stage.` 
      : "The user has not set up a plant yet.";
      
    const userContext = userProfile 
      ? `The user is a ${userProfile.experience} grower.` 
      : "";

    // 3. Construct System Prompt
    const prompt = `
      You are MasterGrowbot, an expert cannabis cultivation AI coach.
      Context: ${plantContext} ${userContext}
      
      User asks: "${message}"
      
      Provide a helpful, encouraging, and accurate response. Keep it concise (under 3 sentences unless complex).
    `;

    // 4. Send to AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

/**
 * DAILY INSIGHTS: Placeholder for future functionality
 */
export async function getDailyInsight(stage: string) {
    return `Tip for ${stage}: Ensure consistent airflow today to prevent micro-climates.`;
}
