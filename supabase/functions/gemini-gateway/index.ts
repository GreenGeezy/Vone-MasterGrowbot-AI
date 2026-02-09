import { serve } from "std/http/server.ts"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing API Key");

    // --- RATE LIMITING (FAIL OPEN) ---
    // We try to limit usage, but if DB fails, we allow the request to proceed (Fail Open).
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const limit = 100;
          const today = new Date().toISOString().split('T')[0];

          const { data: usage, error: usageError } = await supabase
            .from('user_daily_usage')
            .select('request_count')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

          if (!usageError && usage && usage.request_count >= limit) {
            throw new Error(`Daily limit reached (${limit} requests). Please try again tomorrow.`);
          }

          // Increment count (Upsert)
          // If row exists, increment. If not, insert 1.
          const { error: upsertError } = await supabase
            .from('user_daily_usage')
            .upsert(
              {
                user_id: user.id,
                date: today,
                request_count: (usage?.request_count ?? 0) + 1
              },
              { onConflict: 'user_id, date' }
            );

          if (upsertError) console.error("Rate Limit Upsert Error:", upsertError);
        }
      }
    } catch (limiterError) {
      if (limiterError.message.includes("Daily limit")) {
        throw limiterError; // Re-throw actual limit errors
      }
      // Otherwise, swallow the error (Fail Open)
      console.error("Rate Limiter Failed (Proceeding anyway):", limiterError);
    }
    // ---------------------------------

    const genAI = new GoogleGenerativeAI(apiKey);
    const reqBody = await req.json();
    const { mode, prompt, image, history, mimeType, fileData } = reqBody;

    // --- 0. WAKE UP PING (Cold Start Optimization) ---
    if (mode === 'wakeup') {
      console.log("Waking up Gemini Flash...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      // Perform a real, tiny request to ensuring connection is warm
      await model.generateContent("Ping");
      return new Response(JSON.stringify({ result: 'Ready' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- 1. DYNAMIC MODEL SELECTION ---
    // Use model from client config, fallback to gemini-1.5-flash if missing
    let modelName = reqBody.model || "gemini-1.5-flash";

    // UPDATED SYSTEM PROMPT: AI Cultivation Assistant
    // - Removed "No Markdown" restriction to allow ordered lists/bolding.
    // - Added strict "Step-by-Step" command.
    let systemInstruction = `
      You are MasterGrowbot AI, an expert AI Cultivation Assistant.
      
      CORE IDENTITY:
      - You are a friendly, authoritative, and precise cannabis cultivation coach.
      - You assist with growing, harvesting, drying, and curing.

      CRITICAL FORMATTING RULES:
      1. LISTS: Use numbered lists (1., 2., 3.) for steps.
      2. POOR MAN'S MARKDOWN: Do NOT use asterisks (*) or hashtags (#). Use CAPITAL LETTERS for headers and emphasis.
      3. CLEAN TEXT: Use clear spacing between sections.
      4. TONE: Encouraging, professional, "Pro-Grower" vibe.
      5. EMOJIS: Use 🌿✨🌱 sparingly.

      RESPONSE BEHAVIOR:
      - If user asks for a diagnosis validation, analyze the context/image deeply.
      - If user attaches a file (Data/Table), analyze the rows/columns and summarize trends.
      - NEVER say "I cannot see the image" if binary data is provided.
    `;

    // --- 2. DIAGNOSIS MODE (Legacy Support) ---
    if (mode === 'diagnosis') {
      modelName = "gemini-1.5-pro";
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
    } else if (mode === 'insight') {
      systemInstruction = `
        You are a world-class Cannabis Growing Strain and Plant Genetics Expert.
        Your knowledge spans the entire history of cannabis breeding, from landrace strains to modern poly-hybrids.
        
        YOUR GOAL:
        Provide elite, breeder-level insights that help growers maximize the genetic potential of their specific strain.
        
        GUIDELINES:
        1. ERA & LINEAGE: Always identify the breeder (if known) and the genetic lineage (parents).
        2. GROW STYLE: Specify if the strain prefers heavy/light feeding, topping, SCROG, or SOG.
        3. TERPENES & EFFECTS: Describe the specific nose and effect profile based on the genetics.
        4. OUTPUT: Follow the user's requested format EXACTLY.
        5. TONE: Authoritative, precise, and passionate about genetics.
      `;
    }

    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

    // --- 3. EXECUTION ---
    let resultText;

    if (mode === 'chat') {
      // MAP HISTORY (If present)
      let chatHistory = [];
      if (history && Array.isArray(history)) {
        chatHistory = history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        // CRITICAL FIX: Ensure History STARTS with 'user'
        // Drop any leading 'model' messages
        while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
          chatHistory.shift();
        }
      }

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      });

      // CONSTRUCT MESSAGE PARTS
      let msgParts = [{ text: prompt }];

      // Handle New Image/File Attachment
      if (fileData && mimeType) {
        msgParts.push({ inlineData: { mimeType: mimeType, data: fileData } });
      } else if (image) {
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
      // Fallback
      const result = await model.generateContent(prompt);
      resultText = result.response.text();
    }

    return new Response(JSON.stringify({ result: resultText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // UPDATED ERROR LOGGING: Serialize the full Error object
    const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error("Gemini Backend Error:", errorDetails);

    return new Response(JSON.stringify({
      error: error.message || "Unknown Backend Error",
      details: errorDetails
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});