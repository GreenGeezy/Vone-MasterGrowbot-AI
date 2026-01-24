import { supabase } from './supabaseClient';

export async function diagnosePlant(base64Image: string, strainName?: string) {
  // This calls your new secure backend
  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: { 
      mode: 'diagnosis', 
      image: base64Image.replace('data:image/jpeg;base64,', ''), 
      prompt: `Analyze ${strainName || 'plant'}` 
    }
  });

  if (error) throw new Error(error.message);
  
  // The backend returns a text string, we parse it into JSON here
  return JSON.parse(data.result);
}

export async function sendMessage(message: string, plant?: any, userProfile?: any) {
  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: { mode: 'chat', prompt: message }
  });

  if (error) throw new Error(error.message);
  return data.result;
}

export async function getDailyInsight(stage: string) {
  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: { mode: 'chat', prompt: `Give me a short tip for ${stage} stage cannabis.` }
  });
  return data?.result || "Check your pH levels.";
}

export async function analyzeGrowLog(text: string) {
  return "Log saved.";
}