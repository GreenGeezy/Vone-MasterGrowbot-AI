import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// WE USE THE UNIVERSAL SDK FOR DENO COMPATIBILITY
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS (Browser Security)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const { mode, prompt, image } = await req.json();

    // --- GEMINI 3.0 MODEL CONFIGURATION ---
    // Gemini 3.0 Flash Preview: The fastest model (Best for Chat/Voice)
    // Gemini 3.0 Pro Preview: The reasoning model (Best for Plant Doctor)
    let modelName = "gemini-3-flash-preview"; 
    let systemInstruction = "You are MasterGrowbot. Be helpful, concise, and friendly.";

    if (mode === 'diagnosis') {
      // Use PRO for Vision/Reasoning
      modelName = "gemini-3-pro-preview"; 
      systemInstruction = "Analyze this plant image for pests, deficiencies, or disease. Return valid JSON only.";
    } else if (mode === 'voice') {
      // Voice needs maximum speed
      modelName = "gemini-3-flash-preview";
      systemInstruction = "You are a voice assistant. Keep answers under 2 sentences.";
    }

    // Initialize the Model
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

    // --- EXECUTE REQUEST ---
    let resultText;

    if (mode === 'diagnosis' && image) {
      // Vision Request (Gemini 3 Pro)
      const parts = [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: image } }
      ];
      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      resultText = result.response.text();
    } else {
      // Text/Chat Request (Gemini 3 Flash)
      const result = await model.generateContent(prompt);
      resultText = result.response.text();
    }

    return new Response(JSON.stringify({ result: resultText }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Backend Error:", error);
    // Return the specific error so we can debug on the phone if needed
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});