
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenAI({ apiKey });
    const { prompt, image, mode } = await req.json();

    // Use Gemini 3 Pro Preview
    const modelId = "gemini-3-pro-preview";

    let contents = [];

    if (mode === 'diagnosis' && image) {
      // Plant Scan Mode
      contents = [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image // Expecting base64 string
              }
            }
          ]
        }
      ];
    } else if (mode === 'insight') {
      // Strain Intelligence Mode
      contents = [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ];
    } else {
      throw new Error("Invalid mode or missing inputs for Gemini V3");
    }

    // Call Gemini 3 with High Thinking Level
    const response = await genAI.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        thinkingLevel: "high"
      }
    });

    return new Response(JSON.stringify({ result: response.text() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error("Gemini V3 Error:", errorDetails);

    return new Response(JSON.stringify({ error: error.message, details: errorDetails }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
