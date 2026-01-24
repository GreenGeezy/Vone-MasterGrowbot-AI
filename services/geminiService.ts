import { supabase } from './supabaseClient';

// Helper function to handle the secure call
async function callGemini(payload: any) {
  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: payload,
  });

  if (error) throw new Error(`Connection Error: ${error.message}`);
  if (data?.error) throw new Error(`AI Error: ${data.error}`);
  
  return data.result;
}

// 1. PLANT DOCTOR (Gemini 3 Pro)
export async function diagnosePlant(base64Image: string, strainName?: string) {
  // Ensure we strip the header if it exists
  const cleanImage = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  const responseText = await callGemini({
    mode: 'diagnosis',
    image: cleanImage,
    prompt: `Analyze this plant (Strain: ${strainName || 'Unknown'}). Return JSON with: diagnosis, severity (low/med/high), topAction, and fixSteps (array).`
  });

  try {
    // Clean up if the AI wraps JSON in markdown blocks
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("JSON Parse Error", e);
    // Fallback if AI fails to give JSON
    return {
      diagnosis: "Analysis Incomplete",
      severity: "low",
      topAction: "Check manually",
      fixSteps: [responseText]
    };
  }
}

// 2. CHATBOT (Gemini 3 Flash)
export async function sendMessage(message: string, isVoice: boolean = false) {
  return await callGemini({
    mode: isVoice ? 'voice' : 'chat',
    prompt: message
  });
}

// 3. DAILY INSIGHTS
export async function getDailyInsight(stage: string) {
  return await callGemini({
    mode: 'chat',
    prompt: `Give me one single, exciting growing tip for the ${stage} stage.`
  });
}

export async function analyzeGrowLog(text: string) {
  return "Log saved.";
}