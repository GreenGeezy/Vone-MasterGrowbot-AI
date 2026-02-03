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
    const { mode, prompt, image, history, mimeType, fileData } = await req.json();

    // --- 1. DEFAULT MODEL (Chat/Voice) ---
    let modelName = "gemini-3-flash-preview";

    // UPDATED SYSTEM PROMPT: AI Cultivation Assistant
    // - Removed "No Markdown" restriction to allow ordered lists/bolding.
    // - Added strict "Step-by-Step" command.
    let systemInstruction = `
      You are MasterGrowbot AI, an expert AI Cultivation Assistant.
      
      CORE IDENTITY:
      - You are a friendly, authoritative, and precise cannabis cultivation coach.
      - You assist with growing, harvesting, drying, and curing.

      CRITICAL FORMATTING RULES:
      1. LISTS: When asked for a guide, instructions, or steps, YOU MUST USE A NUMBERED LIST (1., 2., 3.).
      2. MARKDOWN: Use **bold** for key terms and emphasis. Use headings for sections.
      3. TONE: Encouraging, professional, "Pro-Grower" vibe.
      4. EMOJIS: Use 🌿✨🌱 sparingly.

      RESPONSE BEHAVIOR:
      - If user asks for a diagnosis validation, analyze the context/image deeply.
      - If user attaches a file (Data/Table), analyze the rows/columns and summarize trends.
      - NEVER say "I cannot see the image" if binary data is provided.
    `;

    // --- 2. DIAGNOSIS MODE (Legacy Support) ---
    if (mode === 'diagnosis') {
      modelName = "gemini-3-pro-preview";
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
      systemInstruction += " You are speaking via voice interface. Be ultra-concise (under 3 sentences). Do not use markdown.";
    }

    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

    // --- 3. EXECUTION ---
    let resultText;

    if (mode === 'chat') {
      // MAP HISTORY (If present)
      // Client sends: [{ role: 'user'|'assistant', content: '...' }]
      // Gemini expects: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
      let chatHistory = [];
      if (history && Array.isArray(history)) {
        chatHistory = history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
      }

      const chat = model.startChat({ history: chatHistory });

      // CONSTRUCT MESSAGE PARTS
      let msgParts = [{ text: prompt }];

      // Handle New Image/File Attachment
      if (fileData && mimeType) {
        msgParts.push({ inlineData: { mimeType: mimeType, data: fileData } });
      } else if (image) {
        // Legacy support if client sends 'image' key
        msgParts.push({ inlineData: { mimeType: "image/jpeg", data: image } });
      }

      const result = await chat.sendMessage(msgParts);
      resultText = result.response.text();
    }
    else if (mode === 'diagnosis' && image) {
      const parts = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: image } }];
      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      resultText = result.response.text();
    }
    else {
      // Fallback (Voice / Simple)
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