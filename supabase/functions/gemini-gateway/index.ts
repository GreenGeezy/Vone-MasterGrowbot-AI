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

    // --- 1. DEFAULT MODEL (Chat/Voice) ---
    // Default to strict Flash Preview (User Requested)
    let modelName = "gemini-3-flash-preview";

    // "Golden Rules" System Prompt (No Markdown, Friendly Coach)
    let systemInstruction = `
      You are MasterGrowbot AI, an expert cannabis cultivation coach.
      
      YOUR GOLDEN RULES:
      1. TONE: Be friendly, enthusiastic, and authoritative like a supportive sports coach.
      2. FORMATTING STRICTLY FORBIDDEN:
         - Do NOT use Markdown headers (# or ##).
         - Do NOT use bolding (**text**).
         - Use simple *asterisks* for emphasis only.
         - Use bullet points (•) for lists.
      3. EMOJIS: Use emojis 🌿✨🌱 sparingly (max 1-2 per response).
      4. STRUCTURE: Hook -> Lesson -> Question.
      5. RESTRICTIONS: No promotions, no legal advice, no slang.
    `;

    // --- 2. DIAGNOSIS MODE ---
    if (mode === 'diagnosis') {
      // STRICTLY USING GEMINI 3 PRO (Multimodal Vision)
      modelName = "gemini-3-pro-preview";

      // Strict JSON Schema for Predictive Analysis
      systemInstruction = `
        You are an expert plant pathologist. Analyze this cannabis plant image.
        Return ONLY valid JSON (no markdown) with this structure:
        {
          "diagnosis": "string",
          "severity": "low" | "medium" | "high",
          "healthScore": number,
          "healthLabel": "Struggling" | "Poor" | "Suboptimal" | "Average" | "Good" | "Great" | "Thriving",
          "growthStage": "string",
          "topAction": "string",
          "fixSteps": ["string"],
          "preventionTips": ["string"],
          "yieldEstimate": "string",
          "harvestWindow": "string",
          "nutrientTargets": { "ec": "string", "ph": "string" },
          "environmentTargets": { "vpd": "string", "temp": "string", "rh": "string" },
          "riskScore": number
        }
      `;
    } else if (mode === 'voice') {
      // UPDATE: Use Stable Flash for Voice to prevent 500 errors
      modelName = "gemini-1.5-flash";
      systemInstruction += " You are speaking via voice interface. Be ultra-concise (under 3 sentences).";
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