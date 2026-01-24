import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Get the Key from the Safe
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenAI({ apiKey: apiKey });
    const { mode, prompt, image } = await req.json();

    // 2. Select Model (Pro for images, Flash for chat)
    const modelName = (mode === 'diagnosis') ? "gemini-1.5-pro" : "gemini-1.5-flash";
    
    // 3. Prepare content
    let contents = [];
    if (mode === 'diagnosis' && image) {
       contents = [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: image } }] }];
    } else {
       contents = [{ role: "user", parts: [{ text: prompt }] }];
    }

    // 4. Run AI
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({ contents });
    const text = result.response.text();

    return new Response(JSON.stringify({ result: text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});