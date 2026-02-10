
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Validate Environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    // --- RATE LIMITING (FAIL OPEN) ---
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        if (supabaseUrl && supabaseAnonKey) {
          const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: authHeader } } }
          );

          const { data: { user } } = await supabaseClient.auth.getUser();

          if (user) {
            const limit = 100;
            const today = new Date().toISOString().split('T')[0];

            const { data: usage, error: usageError } = await supabaseClient
              .from('user_daily_usage')
              .select('request_count')
              .eq('user_id', user.id)
              .eq('date', today)
              .single();

            if (!usageError && usage && usage.request_count >= limit) {
              throw new Error(`Daily limit reached (${limit} requests). Please try again tomorrow.`);
            }

            // Increment count (Upsert)
            const { error: upsertError } = await supabaseClient
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
      }
    } catch (limiterError) {
      if (limiterError.message.includes("Daily limit")) {
        throw limiterError; // Re-throw actual limit errors
      }
      console.error("Rate Limiter Failed (Proceeding):", limiterError);
    }
    // ---------------------------------

    // 3. Parse Request
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body", details: e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, image, mode } = body;

    // 4. Validate Inputs
    if (!prompt && !image && mode !== 'wakeup') {
      return new Response(JSON.stringify({ error: "Missing required fields: prompt or image" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Wakeup Check (Fast Path)
    if (mode === 'wakeup') {
      return new Response(JSON.stringify({ message: "Backend awake" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Initialize Gemini Client
    // Use v1alpha to support 'media_resolution' and 'thinking_config'
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = "gemini-3-pro-preview";

    const model = genAI.getGenerativeModel({
      model: modelId,
      apiVersion: 'v1alpha',
      generationConfig: {
        temperature: 1.0, // Recommended for Gemini 3
        // @ts-ignore: thinkingConfig is not yet in strict types for this SDK version
        thinkingConfig: {
          thinkingLevel: "high"
        }
      }
    });

    let resultText;

    if (mode === 'diagnosis' && image) {
      // --- PLANT SCAN MODE ---
      // Fix: Structure the part correctly for v1alpha
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: image
          },
          // CRITICAL FIX: mediaResolution is a property of the part, NOT added dynamically after creation
          // This structure matches the SDK's expectation for passing through to the API
          mediaResolution: {
            level: "media_resolution_high"
          }
        }
      ];

      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      resultText = result.response.text();

    } else if (mode === 'insight') {
      // --- STRAIN INTELLIGENCE MODE ---
      const result = await model.generateContent(prompt);
      resultText = result.response.text();

    } else {
      throw new Error(`Invalid mode '${mode}' or missing inputs for Gemini V3`);
    }

    // 7. Success Response
    return new Response(JSON.stringify({ result: resultText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // 8. Global Error Handling
    console.error("Gemini V3 Execution Error:", error);

    // Extract meaningful error message
    const errorMessage = error.message || "Unknown error occurred";
    const errorDetails = error.stack || String(error);

    // Return 500 with JSON structure
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
