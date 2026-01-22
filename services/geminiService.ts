import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config';

// Initialize Gemini with the API Key
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

/**
 * VISION ANALYSIS: Diagnoses plant health from an image
 * Uses Gemini 2.5 Pro for maximum accuracy.
 */
export async function diagnosePlant(base64Image: string) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.DIAGNOSIS });
    
    // Clean the Base64 string (remove data:image/jpeg;base64, prefix if present)
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    // Construct image part for Multimodal Input
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg"
      }
    };

    // Advanced Prompt for Health Analysis
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

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON safely (strips markdown code blocks if AI adds them)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Diagnosis Service Error:", error);
    throw error;
  }
}

/**
 * CHAT COACH: Answers questions with context
 * Uses Gemini 2.5 Flash for speed.
 */
export async function sendMessage(message: string, plant: any, userProfile: any) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.CHAT_LIVE });
    
    const plantContext = plant 
      ? `User's Plant: ${plant.name} (${plant.strain}), Stage: ${plant.stage}.` 
      : "User has no active plant.";
      
    const userContext = userProfile 
      ? `User Experience: ${userProfile.experience}.` 
      : "";

    const prompt = `
      You are MasterGrowbot, an expert AI cannabis cultivation coach.
      Context: ${plantContext} ${userContext}
      User Question: "${message}"
      
      Provide a helpful, accurate, and concise response (under 3 sentences).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Chat Service Error:", error);
    throw error;
  }
}
