
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    const { prompt, image, mode } = await req.json();

    // Use Gemini 3 Pro Preview
    const modelId = "gemini-3-pro-preview";

    const model = genAI.getGenerativeModel({
      model: modelId,
      // CRITICAL: Gemini 3 Preview models require v1beta API version
      // The stable SDK defaults to v1, which causes 404/Not Found for preview models.
      apiVersion: 'v1beta',
      // Attempt to pass thinking config if supported, otherwise standard
      generationConfig: {
        temperature: 0.7, // Standard
      }
    });

    let resultText;

    if (mode === 'diagnosis' && image) {
      // Plant Scan Mode
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: image
          }
        }
      ];
      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      resultText = result.response.text();
    } else if (mode === 'insight') {
      // Strain Intelligence Mode
      const result = await model.generateContent(prompt);
      resultText = result.response.text();
    } else {
      throw new Error("Invalid mode or missing inputs for Gemini V3");
    }

    return new Response(JSON.stringify({ result: resultText }), {
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
