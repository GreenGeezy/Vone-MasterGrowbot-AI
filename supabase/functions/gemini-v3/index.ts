/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildMessages,
  type ChatMessage,
  modelListForMode,
  MODEL_ROUTING,
  parseVideoResult,
  RequestValidationError,
  validateRequestBody,
  VIDEO_RESPONSE_FORMAT,
} from "./core.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REVENUECAT_PROJECT = "projf176df92";
const MACHINE_VISION_ENTITLEMENT_ID = "entl05530ace9d";
const REFERER = "https://mastergrowbot.com";
const TITLE = "MasterGrowbot AI";
const WEEKLY_BUDGET_USD = 1.90;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-mastergrowbot-model",
};

class FunctionError extends Error {
  constructor(message: string, public status = 500, public code = "server_error") { super(message); }
}

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  error?: { message?: string; code?: string | number };
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
};

type UsageReservation = { allowed: boolean; reason: string | null; weekly_cost_usd: number; video_requests_today: number };

function jsonResponse(payload: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" } });
}

function statusOf(error: unknown) {
  if (error instanceof FunctionError || error instanceof RequestValidationError) return error.status;
  if (error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number") return (error as { status: number }).status;
  return 500;
}

function extractText(payload: OpenRouterResponse) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("").trim();
  return "";
}

function serverClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new FunctionError("Usage service is unavailable", 503, "usage_unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader || !url || !anonKey) throw new FunctionError("Authentication required", 401, "authentication_required");
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.id) throw new FunctionError("Your session could not be verified. Please reopen the app and try again.", 401, "invalid_session");
  return user;
}

async function verifyMachineVision(customerId: string) {
  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secret) throw new FunctionError("Premium verification is temporarily unavailable", 503, "premium_verification_unavailable");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT}/customers/${encodeURIComponent(customerId)}/active_entitlements`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" }, signal: controller.signal,
    });
    if (response.status === 404) throw new FunctionError("MasterGrowbot AI Premium is required for video analysis", 403, "premium_required");
    if (response.status === 401 || response.status === 403) throw new FunctionError("Premium verification is temporarily unavailable", 503, "premium_verification_unavailable");
    if (!response.ok) throw new FunctionError("Premium verification is temporarily unavailable", 503, "premium_verification_unavailable");
    const payload = await response.json().catch(() => null) as { items?: Array<{ entitlement_id?: string; expires_at?: number | null }> } | null;
    const active = payload?.items?.some((item) => item.entitlement_id === MACHINE_VISION_ENTITLEMENT_ID && (item.expires_at == null || item.expires_at > Date.now()));
    if (!active) throw new FunctionError("MasterGrowbot AI Premium is required for video analysis", 403, "premium_required");
  } catch (error) {
    if (error instanceof FunctionError) throw error;
    throw new FunctionError("Premium verification timed out. Please try again.", 503, "premium_verification_unavailable");
  } finally { clearTimeout(timer); }
}

function reservationFor(model: string) {
  if (model === MODEL_ROUTING.video_visual_analysis) return 0.06;
  if (model === MODEL_ROUTING.diagnosis) return 0.025;
  if (model === MODEL_ROUTING.insight) return 0.005;
  if (model === MODEL_ROUTING.fallback) return 0.015;
  return 0.02;
}

async function reserveUsage(admin: ReturnType<typeof serverClient>, userId: string, mode: string, model: string, countRequest: boolean) {
  const amount = reservationFor(model);
  const { data, error } = await admin.rpc("reserve_ai_usage", {
    p_user_id: userId, p_mode: countRequest ? mode : "fallback", p_reserved_cost_usd: amount, p_count_request: countRequest,
  });
  if (error) throw new FunctionError("Usage limits are temporarily unavailable", 503, "usage_unavailable");
  const admission = (data?.[0] ?? null) as UsageReservation | null;
  if (!admission?.allowed) {
    if (admission?.reason === "daily_video_limit") throw new FunctionError("You've reached today's Premium video analysis limit. More analyses will be available tomorrow.", 429, "daily_video_limit");
    if (admission?.reason === "weekly_cost_limit") throw new FunctionError("You've reached this week's AI usage limit. More analyses will become available as your weekly window resets.", 429, "weekly_cost_limit");
    throw new FunctionError("You've reached today's AI request limit. Please try again tomorrow.", 429, "daily_request_limit");
  }
  return { amount, admission };
}

async function finalizeUsage(admin: ReturnType<typeof serverClient>, userId: string, reserved: number, payload?: OpenRouterResponse) {
  const actual = typeof payload?.usage?.cost === "number" && Number.isFinite(payload.usage.cost) ? Math.max(0, payload.usage.cost) : reserved;
  const { error } = await admin.rpc("finalize_ai_usage", {
    p_user_id: userId, p_reserved_cost_usd: reserved, p_actual_or_estimated_cost_usd: actual,
    p_input_tokens: Math.max(0, payload?.usage?.prompt_tokens ?? 0), p_output_tokens: Math.max(0, payload?.usage?.completion_tokens ?? 0),
  });
  if (error) console.error("Usage finalization failed", { reserved });
}

async function callOpenRouter(apiKey: string, model: string, messages: ChatMessage[], maxTokens: number, video: boolean) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), video ? 90000 : 65000);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": REFERER, "X-Title": TITLE },
      body: JSON.stringify({ model, messages, temperature: video ? 0.2 : 0.4, max_tokens: maxTokens, ...(video ? { response_format: VIDEO_RESPONSE_FORMAT } : {}) }),
    });
    const payload = await response.json().catch(() => ({})) as OpenRouterResponse;
    if (!response.ok) throw Object.assign(new FunctionError(payload.error?.message || `OpenRouter request failed with ${response.status}`, response.status, "provider_error"), { usagePayload: payload });
    const text = extractText(payload);
    if (!text) throw Object.assign(new FunctionError("OpenRouter returned no content", 502, "malformed_provider_response"), { usagePayload: payload });
    return { text, payload };
  } catch (error) {
    if (error instanceof FunctionError) throw error;
    throw new FunctionError("AI analysis timed out. Please try again.", 504, "provider_timeout");
  } finally { clearTimeout(timer); }
}

async function generate(body: Record<string, unknown>, admin: ReturnType<typeof serverClient>, userId: string, primaryReservation: number) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new FunctionError("AI service is unavailable", 503, "provider_unavailable");
  const mode = String(body.mode);
  const video = mode === "video_visual_analysis";
  // Only a zero-cost emergency route is allowed under the hard weekly budget.
  const configuredEmergency = Deno.env.get("OPENROUTER_EMERGENCY_FREE_MODEL");
  const emergencyModel = configuredEmergency === "openrouter/free" ? configuredEmergency : "openrouter/free";
  const models = modelListForMode(mode, emergencyModel);
  const messages = buildMessages(body);
  const maxTokens = mode === "diagnosis" ? 1400 : video ? 1100 : 900;
  let lastError: unknown;
  for (const [index, model] of models.entries()) {
    const reserved = index === 0 ? primaryReservation : (await reserveUsage(admin, userId, mode, model, false)).amount;
    try {
      const generated = await callOpenRouter(apiKey, model, messages, maxTokens, video);
      await finalizeUsage(admin, userId, reserved, generated.payload);
      return { result: video ? parseVideoResult(generated.text) : generated.text, model };
    } catch (error) {
      lastError = error;
      await finalizeUsage(admin, userId, reserved, (error as { usagePayload?: OpenRouterResponse })?.usagePayload);
      if ([400, 401, 402, 403, 422].includes(statusOf(error))) break;
    }
  }
  throw lastError || new FunctionError("All model attempts failed", 502, "provider_error");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(req);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body", code: "invalid_json" }, 400); }
    const mode = typeof body.mode === "string" ? body.mode : "";
    if (mode === "wakeup") return jsonResponse({ message: "Backend awake", result: "Ready" });
    if (!["diagnosis", "insight", "chat", "voice", "video_visual_analysis"].includes(mode)) throw new FunctionError(`Invalid mode '${mode}' for gemini-v3`, 400, "invalid_mode");
    if (mode === "video_visual_analysis") await verifyMachineVision(user.id);
    const admin = serverClient();
    const primaryModel = modelListForMode(mode)[0];
    const reservation = await reserveUsage(admin, user.id, mode, primaryModel, true);
    try { validateRequestBody(body); } catch (error) {
      await finalizeUsage(admin, user.id, reservation.amount);
      throw error;
    }
    const normalizedBody = { ...body, mode: mode === "voice" ? "chat" : mode };
    const generated = await generate(normalizedBody, admin, user.id, reservation.amount);
    return jsonResponse({ result: generated.result }, 200, { "X-MasterGrowbot-Model": generated.model });
  } catch (error) {
    const status = statusOf(error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    const code = error instanceof FunctionError ? error.code : error instanceof RequestValidationError ? "invalid_request" : "server_error";
    console.error("gemini-v3 execution error", { status, code });
    return jsonResponse({ error: message, details: message, code }, status >= 400 && status < 600 ? status : 500);
  }
});
