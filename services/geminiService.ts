import { GoogleGenerativeAI } from "@google/genai";
import { CONFIG } from './config';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1]; 
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function diagnosePlant(images: any[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // CRITICAL: We ask for JSON specifically to power the UI
    const prompt = `
      Analyze this cannabis plant image. Return ONLY a JSON object. Do not use Markdown formatting.
      Structure:
      {
        "diagnosis": "Name of issue (e.g. Nitrogen Deficiency, Spider Mites, or Healthy)",
        "severity": "low" | "medium" | "high",
        "health": number (0-100),
        "confidence": number (0.0-1.0),
        "fixSteps": ["Step 1", "Step 2", "Step 3"]
      }
    `;

    const result = await model.generateContent([prompt, ...images]);
    const response = await result.response;
    const text = response.text();
    
    // Clean up if Gemini accidentally adds markdown code blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Diagnosis Error:", error);
    // Fallback if AI fails so app doesn't crash
    return {
        diagnosis: "Analysis Failed",
        severity: "low",
        health: 0,
        fixSteps: ["Check internet connection", "Try a clearer photo"]
    };
  }
}

export async function chatWithCoach(message: string, history: any[], persona: string = "MasterGrowbot") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let systemInstruction = "You are MasterGrowbot, an expert cannabis cultivation AI.";
    
    // PERSONA LOGIC
    if (persona === 'Kore') systemInstruction += " You are Coach Kore. You are calm, scientific, and focus on soil biology.";
    if (persona === 'Charon') systemInstruction += " You are Coach Mike. You are bold, direct, and focus on high-yield crop steering.";
    if (persona === 'Puck') systemInstruction += " You are Coach Puck. You are energetic, funny, and use emojis.";

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
    });

    const result = await chat.sendMessage(`${systemInstruction} User asks: ${message}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to the network. Please check your internet.";
  }
}

export async function getDailyInsight(stage: string) {
    // keeping this simple to save tokens
    return `Tip for ${stage}: Ensure consistent airflow today to prevent micro-climates.`;
}
