import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle Browser Security (CORS)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 2. Get the Secure Key
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenAI({ apiKey: apiKey });
    const { mode, prompt, image, context } = await req.json();

    // 3. MODEL SELECTION (The "Gemini 3.0" Logic)
    let modelName = "gemini-3-flash-preview"; // Default to Fastest (Chat/Voice)
    let systemInstruction = "You are MasterGrowbot. Be helpful, concise, and friendly.";
    let contents = [];

    // --- MODE A: PLANT DOCTOR (Diagnosis) ---
    // Uses PRO model for deep reasoning on images
    if (mode === 'diagnosis') {
      modelName = "gemini-3-pro-preview"; 
      systemInstruction = "You are an expert botanist. Analyze this image for cannabis pests, deficiencies, or diseases. Return valid JSON only.";
      
      contents = [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: image } }
        ]
      }];
    } 
    // --- MODE B: CHAT & VOICE ---
    // Uses FLASH model for speed
    else {
      modelName = "gemini-3-flash-preview";
      
      // If it's Voice, keep it shorter
      if (mode === 'voice') {
        systemInstruction = "You are a voice assistant. Keep answers short (under 2 sentences) and conversational.";
      }
      
      contents = [{ role: "user", parts: [{ text: prompt }] }];
    }

    // 4. Run the AI
    console.log(`Using Model: ${modelName} for Mode: ${mode}`); // Debug log
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
    const result = await model.generateContent({ contents });
    const text = result.response.text();

    return new Response(JSON.stringify({ result: text }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});