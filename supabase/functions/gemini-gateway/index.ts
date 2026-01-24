import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const { mode, prompt, image } = await req.json();

    // --- 1. PERSONA CONFIGURATION (The "Expert Teacher") ---
    // Based on "Chatbot Summary" doc
    const CHAT_PERSONA = `
      You are MasterGrowbot, an expert cannabis cultivation teacher.
      Your goal is to guide growers of any level to a successful harvest.
      - Tone: Encouraging, precise, and authoritative but friendly (Coach Kore style).
      - Strategy: Always identify the "Priority Action" first.
      - If the user is a novice, explain "why". If expert, be technical (VPD, EC, PPFD).
    `;

    // --- 2. MODEL SELECTION ---
    let modelName = "gemini-3-flash-preview"; 
    let systemInstruction = CHAT_PERSONA;

    if (mode === 'diagnosis') {
      modelName = "gemini-3-pro-preview"; // Reasoning for scans
      // Strict JSON instruction for the "Plant Scan Summary" fields
      systemInstruction = `
        You are an expert plant pathologist. Analyze this cannabis plant image.
        Return ONLY valid JSON (no markdown) with this structure:
        {
          "diagnosis": "Name of issue or 'Healthy'",
          "severity": "low" | "medium" | "high",
          "healthScore": number (0-100),
          "growthStage": "Seedling" | "Vegetative" | "Flowering",
          "topAction": "The single most important thing to do NOW",
          "fixSteps": ["Step 1", "Step 2", "Step 3"],
          "yieldTips": ["Tip to increase weight"],
          "qualityTips": ["Tip to increase potency/terpenes"]
        }
      `;
    } else if (mode === 'voice') {
      // Voice mode needs to be conversational
      systemInstruction = `${CHAT_PERSONA} Keep your response conversational and under 3 sentences for voice playback.`;
    }

    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

    // --- 3. EXECUTION ---
    let resultText;
    if (mode === 'diagnosis' && image) {
      const parts = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: image } }];
      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      resultText = result.response.text();
    } else {
      const result = await model.generateContent(prompt);
      resultText = result.response.text();
    }

    return new Response(JSON.stringify({ result: resultText }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});