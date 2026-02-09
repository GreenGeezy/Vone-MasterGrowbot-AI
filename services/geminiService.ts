import { supabase } from './supabaseClient';
import { DiagnosisResult, UserProfile } from '../types';
import { CONFIG } from './config';

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
    Analyze the image for abiotic environmental stress. Determine the PRIORITY issue among:
    1. Lighting (Bleaching/Stretching)
    2. Temperature (Heat Stress/Tacoing)
    3. Humidity (Mold/Droop)
    If no stress is visible, the priority is 'Optimal'.

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
      "environmentSummary": "Light Stress (Adjust Intensity) | Heat Risk (Check Venting) | High Humidity (Risk) | Optimal Climate",
      "riskScore": 0-100
    }
  `;

  // Retry Logic for Cold Starts (Edge Function Wake-up)
  const MAX_RETRIES = 5;
  let attempt = 0;
  let delay = 2000;
  let data, error;

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[Gemini Diagnosis] Attempt ${attempt}/${MAX_RETRIES}...`);

    const response = await supabase.functions.invoke('gemini-gateway', {
      body: {
        model: CONFIG.MODELS.DIAGNOSIS,
        mode: 'diagnosis',
        image: cleanImage,
        prompt: systemContext + prompt
      }
    });

    data = response.data;
    error = response.error;

    if (!error) break; // Success!

    console.warn(`[Gemini Diagnosis] Attempt ${attempt} failed:`, error);

    if (attempt === MAX_RETRIES) break; // Give up after max retries

    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }

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
export async function sendMessage(
  message: string,
  history: { role: string; content: string }[] = [],
  attachment?: { data: string; type: string; mimeType: string }
) {
  const body: any = {
    model: CONFIG.MODELS.CHAT_LIVE,
    mode: 'chat',
    prompt: message,
    // Filter out artificial messages and sanitize for alternation logic
    history: sanitizeHistory(history)
  };

  if (attachment) {
    body.fileData = attachment.data; // Base64 or Text
    body.mimeType = attachment.mimeType || (attachment.type === 'image' ? 'image/jpeg' : 'text/plain');
  }

  // Retry Logic for Cold Starts (Edge Function Wake-up)
  const MAX_RETRIES = 5;
  let attempt = 0;
  let delay = 2000; // Start with 2s delay

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[Gemini] Sending message (Attempt ${attempt}/${MAX_RETRIES})...`);

    const { data, error } = await supabase.functions.invoke('gemini-gateway', { body });

    if (!error) {
      return data?.result || "I didn't catch that.";
    }

    // Capture precise error info
    // Supabase invoke error is often: { message: "...", context: Response }
    // If we have a backend generated error response, it might be in `error.message` depending on how Supabase client parses the 500 response.
    // But often for 500s, `invoke` gives a generic error.
    // Let's rely on the fact that my backend sends JSON { error: "..." }.
    // If Supabase client parses that, we might see it.

    // Check if it's a "Permanent" error (Client side issue / Invalid Model / Rate Limit)
    // If the valid session cannot be established, waiting won't help.
    const errorString = JSON.stringify(error || {});
    const isPermanent =
      errorString.includes("400") ||
      errorString.includes("404") ||
      errorString.includes("invalid") ||
      errorString.includes("not found") ||
      errorString.includes("Daily limit") || // NEW: Stop immediately if limit reached
      errorString.includes("429");

    console.warn(`[Gemini] Attempt ${attempt} failed:`, error);

    if (isPermanent) {
      console.error("Permanent error detected. Stopping retries.");
      return `Error: ${error.message || "Request Failed"}.`;
    }

    // If it's the last attempt, return the error message
    if (attempt === MAX_RETRIES) {
      console.error("All retries failed.");
      return `Connection failed after ${MAX_RETRIES} attempts. Server said: ${error.message || "Network Error"}`;
    }

    // Exponential Backoff: Wait 2s, 4s, 8s...
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }

  return "I'm having trouble connecting to the network right now.";
}

/**
 * Ensures history alternates User -> Model -> User -> Model
 * Gemini 1.5/Advanced is strict about this.
 */
function sanitizeHistory(history: { role: string; content: string }[]): { role: string; content: string }[] {
  if (!history || history.length === 0) return [];

  const sanitized: { role: string; content: string }[] = [];

  // 1. Filter out artificial/system messages first
  const cleanRaw = history.filter(h =>
    !h.content.includes("Welcome, Grower!") &&
    !h.content.includes("Could not start chat") &&
    !h.content.includes("Connection error") &&
    !h.content.includes("Daily limit") // Filter limit messages too
  );

  // 2. Enforce: First Message MUST be User
  // Skip ANY messages at the start until we find a 'user' message
  let startIndex = 0;
  while (startIndex < cleanRaw.length && cleanRaw[startIndex].role !== 'user') {
    startIndex++;
  }

  // If no user messages found, return empty history (start fresh)
  if (startIndex >= cleanRaw.length) {
    return [];
  }

  const validStarts = cleanRaw.slice(startIndex);

  // 3. Enforce Alternation (User -> Model -> User)
  for (let i = 0; i < validStarts.length; i++) {
    const msg = validStarts[i];
    const role = msg.role === 'assistant' ? 'model' : 'user';

    // Logic: Look ahead.
    const nextMsg = validStarts[i + 1];
    const nextRole = nextMsg ? (nextMsg.role === 'assistant' ? 'model' : 'user') : null;

    if (role === 'user' && nextRole === 'user') {
      // Skip this message (it's a dangling user message from a failed previous turn)
      continue;
    }

    // Also, if this is the LAST message, it MUST be 'model' (because new prompt is 'user')
    if (i === validStarts.length - 1 && role === 'user') {
      continue;
    }

    sanitized.push(msg);
  }

  return sanitized;
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

/**
 * Strain Intelligence (New Feature)
 * Analyzes a strain name (and optional desc) to give growing tips.
 */
export async function getStrainInsights(strainName: string, description?: string): Promise<string> {
  const prompt = `
    Analyze the cannabis strain "${strainName}" ${description ? `(User Notes: ${description})` : ''}.
    Provide a concise Grow Guide in this exact format:
    
    🧬 LINEAGE: [Indica/Sativa/Hybrid] - [Famous Parents if known]
    🏠 BEST ENVIRONMENT: [Indoor/Outdoor] because [Reason]
    ⚡ DIFFICULTY: [Easy/Moderate/Hard]
    🚀 PRO TIP: [One specific yield-maximizing technique]
    
    Keep it under 100 words total. Use emojis.
  `;

  // Use the Insights model (Flash)
  try {
    const response = await supabase.functions.invoke('gemini-gateway', {
      body: {
        model: CONFIG.MODELS.INSIGHTS,
        mode: 'insight', // Use simple generation mode to avoid Chat history errors
        prompt: prompt
      }
    });

    if (response.error) throw response.error;
    return response.data?.result || "Could not retrieve strain data.";
  } catch (e) {
    console.error("Strain Insight Error:", e);
    return "Strain intelligence is currently offline. Please try again later.";
  }
}

/**
 * Wake Up Backend (Cold Start Fix)
 * Pings the Edge Function on app launch to pre-warm the instance.
 */
export async function wakeUpBackend() {
  console.log("[Gemini] Waking up backend...");
  try {
    // Send a dummy request with 'wakeup' mode to avoid expensive API calls
    await supabase.functions.invoke('gemini-gateway', { body: { mode: 'wakeup' } });
  } catch (e) {
    console.log("[Gemini] Wake-up ping sent.");
  }
}