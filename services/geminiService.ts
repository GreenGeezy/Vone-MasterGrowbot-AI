import { supabase } from './supabaseClient';
import { DiagnosisResult, UserProfile } from '../types';

// --- Types ---

export interface ExtendedDiagnosisResult extends DiagnosisResult {
  yieldEstimate?: string;
  harvestWindow?: string;
  nutrientTargets?: { ec?: string; ph?: string; };
  environmentTargets?: { vpd?: string; temp?: string; rh?: string; };
  riskScore?: number;
  preventionTips?: string[];
}

// --- Helpers ---

const cleanBase64 = (data: string) =>
  data.includes('base64,') ? data.split('base64,')[1] : data;

// --- Core Functions ---

/**
 * AI Plant Diagnosis (Vision + Logic)
 * Uses 'gemini-3-pro-preview' via Gateway
 */
export async function diagnosePlant(
  base64Image: string,
  context: {
    strain?: string;
    growMethod?: 'Indoor' | 'Outdoor' | 'Greenhouse';
    stage?: string;
    userProfile?: UserProfile;
  }
): Promise<ExtendedDiagnosisResult> {

  const cleanImage = cleanBase64(base64Image);
  const experienceLevel = context.userProfile?.experience || 'Novice';
  const method = context.growMethod || 'Indoor';
  const strain = context.strain || 'Unknown';

  let systemContext = `
    You are an expert AI Botanist specializing in Cannabis Cultivation.
    CONTEXT:
    - Strain: ${strain} (Tailor diagnosis to this specific genetic profile).
    - Method: ${method}.
    
    CRITICAL INSTRUCTIONS FOR METHOD:
    1. IF INDOOR: Focus on precise environment control (Lights, VPD, Nutrition).
    2. IF OUTDOOR: Do NOT provide 'vpdTarget' or 'nutrientTargets' for control. Instead, use 'environmentTargets.vpd' to output a 1-10 "Env. Risk" score (1=Safe, 10=Extreme Weather Risk). Use 'nutrientTargets.ec' to output a 1-10 "Watering Urgency" score (1=Fine, 10=Emergency Water/Drainage). Top Action must be weather/pest related.
    3. IF GREENHOUSE: Focus on "Heat Stress" & "Humidity/Mold". If healthy, output ideal VPD. If at risk (mold/wilt), output "Emergency VPD" text in the 'vpd' field to dry it out.
    
    - Grower Level: ${experienceLevel}. (Expert=Technical, Novice=Simple terms).
  `;

  // Strict JSON Prompt
  const prompt = `
    Analyze this plant image strictly.
    REQUIRED OUTPUT (JSON ONLY):
    {
      "diagnosis": "Precise identification of the main issue (or 'Healthy')",
      "severity": "low" | "medium" | "high",
      "healthScore": 0-100,
      "healthLabel": "Struggling" | "Poor" | "Suboptimal" | "Average" | "Good" | "Great" | "Thriving",
      "growthStage": "Seedling" | "Vegetative" | "Early Flower" | "Late Flower" | "Harvest",
      "confidence": 0-100,
      "topAction": "The single most important immediate action",
      "fixSteps": ["Step 1", "Step 2", "Step 3"],
      "preventionTips": ["Proactive tip 1", "Proactive tip 2"],
      "yieldEstimate": "Estimate dry weight or 'N/A' if veg",
      "harvestWindow": "Predicted time to harvest (e.g. '3-4 Weeks') or 'N/A'",
      "nutrientTargets": { "ec": "1.8", "ph": "6.0" },
      "environmentTargets": { "vpd": "1.2", "temp": "75F", "rh": "45%" },
      "riskScore": 0-100
    }
  `;

  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: {
      mode: 'diagnosis',
      image: cleanImage,
      prompt: systemContext + prompt
    }
  });

  if (error) {
    console.error("Gemini Connection Error:", error);
    throw new Error("Failed to connect to AI Doctor.");
  }

  try {
    const rawText = data.result || "";
    // Sanitize and Parse JSON
    const jsonString = rawText.replace(/```json|```/g, '').trim();
    const result: ExtendedDiagnosisResult = JSON.parse(jsonString);

    return {
      ...result,
      severity: result.severity || 'low',
      healthScore: result.healthScore || 80,
    };

  } catch (e) {
    console.error("AI Parsing Failed:", e);
    // Fallback logic if JSON fails
    return {
      diagnosis: "Analysis Inconclusive",
      severity: "low",
      confidence: 0,
      topAction: "Retake photo with better lighting",
      fixSteps: ["Ensure clear focus", "Check internet connection"],
      healthScore: 0,
      growthStage: "Unknown",
      healthLabel: "Struggling",
      yieldTips: [],
      qualityTips: [],
    } as ExtendedDiagnosisResult;
  }
}

/**
 * Chat with Coach (Text / Voice)
 * Uses 'gemini-3-flash-preview' via Gateway
 */
export async function sendMessage(message: string, isVoice: boolean = false) {
  const { data, error } = await supabase.functions.invoke('gemini-gateway', {
    body: { mode: isVoice ? 'voice' : 'chat', prompt: message }
  });

  if (error) {
    console.error(error);
    return "I'm having trouble connecting to the network right now.";
  }
  return data?.result || "I didn't catch that.";
}

/**
 * Daily Insight (Home Screen)
 * Restored function required by Home.tsx
 */
export async function getDailyInsight(userProfile?: UserProfile): Promise<string> {
  const experience = userProfile?.experience || 'General';
  const prompt = `Generate a single, short (under 15 words), motivating cannabis cultivation tip for a ${experience} grower. No hashtags.`;

  try {
    const response = await sendMessage(prompt);
    return response.replace(/"/g, ''); // Remove quotes if AI adds them
  } catch (e) {
    return "Check your pH and temperature daily for best results!";
  }
}

/**
 * Grow Log Analysis (Journal)
 * Restored function required by Journal.tsx
 */
export async function analyzeGrowLog(notes: string, tags: string[] = []): Promise<string> {
  const prompt = `Analyze this grow journal note: "${notes}". Tags: ${tags.join(', ')}. Provide a 1-sentence observation on plant health.`;
  return await sendMessage(prompt);
}