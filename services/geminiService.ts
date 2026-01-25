import { supabase } from './supabaseClient';
import { DiagnosisResult, UserProfile } from '../types';

export interface ExtendedDiagnosisResult extends DiagnosisResult {
  yieldEstimate?: string;
  harvestWindow?: string;
  nutrientTargets?: { ec?: string; ph?: string; };
  environmentTargets?: { vpd?: string; temp?: string; rh?: string; };
  riskScore?: number;
  preventionTips?: string[];
}

const cleanBase64 = (data: string) => data.includes('base64,') ? data.split('base64,')[1] : data;

export async function diagnosePlant(base64Image: string, context: { strain?: string; growMethod?: 'Indoor' | 'Outdoor' | 'Greenhouse'; stage?: string; userProfile?: UserProfile; }): Promise<ExtendedDiagnosisResult> {
  const cleanImage = cleanBase64(base64Image);
  const experienceLevel = context.userProfile?.experience || 'Novice';
  const method = context.growMethod || 'Indoor';
  const strain = context.strain || 'Unknown';

  let systemContext = `
    You are an expert AI Botanist specializing in Cannabis Cultivation.
    CONTEXT:
    - Strain: ${strain} (Tailor diagnosis to this specific genetic profile).
    - Method: ${method} (CRITICAL: If Indoor, suggest light/airflow fixes. If Outdoor, suggest weather/pest fixes).
    - Grower Level: ${experienceLevel}.
  `;

  const prompt = `
    Analyze this plant image strictly.
    REQUIRED OUTPUT (JSON ONLY):
    {
      "diagnosis": "Precise identification of issue or 'Healthy'",
      "severity": "low" | "medium" | "high",
      "healthScore": 0-100,
      "growthStage": "Seedling" | "Vegetative" | "Early Flower" | "Late Flower" | "Harvest",
      "confidence": 0-100,
      "topAction": "The single most important immediate action",
      "fixSteps": ["Step 1", "Step 2", "Step 3"],
      "preventionTips": ["Proactive tip 1", "Proactive tip 2"],
      "yieldEstimate": "Estimate dry weight (e.g. '3-4oz') or 'N/A' if veg",
      "harvestWindow": "Predicted time to harvest (e.g. '3 weeks') or 'N/A'",
      "nutrientTargets": { "ec": "Target EC", "ph": "Target pH" },
      "environmentTargets": { "vpd": "Target VPD", "temp": "Target Temp", "rh": "Target Humidity" },
      "riskScore": 0-100
    }
  `;

  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: { mode: 'diagnosis', image: cleanImage, prompt: systemContext + prompt }
  });

  if (error) throw new Error("Failed to connect to AI Doctor.");

  try {
    const rawText = data.result || "";
    const jsonString = rawText.replace(/```json|```/g, '').trim();
    const result: ExtendedDiagnosisResult = JSON.parse(jsonString);
    return { ...result, severity: result.severity || 'low', healthScore: result.healthScore || 80 };
  } catch (e) {
    return { diagnosis: "Analysis Inconclusive", severity: "low", confidence: 0, topAction: "Retake photo with better lighting", fixSteps: ["Ensure clear focus"], healthScore: 0, growthStage: "Unknown" } as ExtendedDiagnosisResult;
  }
}

export async function sendMessage(message: string, isVoice: boolean = false) {
  return await supabase.functions.invoke('gemini-gateway', { body: { mode: isVoice ? 'voice' : 'chat', prompt: message } }).then(res => res.data?.result || "Connection error.");
}