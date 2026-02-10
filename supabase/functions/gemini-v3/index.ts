
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

    const { prompt, image, mode } = await req.json();

    if (!prompt && !image && mode !== 'wakeup') {
      return new Response(JSON.stringify({ error: "Missing required fields: prompt or image" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (mode === 'wakeup') {
      return new Response(JSON.stringify({ message: "Backend awake" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 3 Pro Preview
    const modelId = "gemini-3-pro-preview";

    const model = genAI.getGenerativeModel({
      model: modelId,
      // CRITICAL: Gemini 3 Preview features (media_resolution) require v1alpha API version used in docs
      apiVersion: 'v1alpha',
      // Thinking Config and Temperature
      generationConfig: {
        temperature: 1.0, // Recommended for Gemini 3
        // @ts-ignore: handling dynamic properties not yet in types
        thinkingConfig: {
          thinkingLevel: "high"
        }
      }
    });

    let resultText;

    if (mode === 'diagnosis' && image) {
      // Plant Scan Mode
      const parts: any[] = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: image
          }
        }
      ];

      // Add media_resolution only if supported by structured part
      // Note: The SDK might structure this differently, but passing it as a property of the part object is key for v1alpha
      parts[1].mediaResolution = {
        level: "media_resolution_high"
      };

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
