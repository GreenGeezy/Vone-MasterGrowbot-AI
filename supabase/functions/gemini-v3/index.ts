/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildMessages,
  type ChatMessage,
  modelListForMode,
  RequestValidationError,
  runModelFallback,
  validateRequestBody,
} from "./core.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REFERER = "https://mastergrowbot.com";
const TITLE = "MasterGrowbot AI";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-mastergrowbot-model",
};

class FunctionError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type OpenRouterChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: string | number };
};

function jsonResponse(payload: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
  });
}

function extractText(payload: OpenRouterResponse) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => part.type === "text" || part.text ? part.text ?? "" : "")
      .join("")
      .trim();
  }
  return "";
}


function statusOf(error: unknown) {
  if (error instanceof FunctionError || error instanceof RequestValidationError) return error.status;
  if (error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number") {
    return (error as { status: number }).status;
  }
  return 500;
}

function bearerTokenHasSubject(authHeader: string): boolean {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload = token.split(".")[1];
    if (!payload) return false;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof decoded?.sub === "string" && decoded.sub.length > 0;
  } catch {
    return false;
  }
}

async function enforceRateLimit(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !bearerTokenHasSubject(authHeader)) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      console.warn("Rate limiter auth check skipped:", authError.message);
      return;
    }
    if (!user) return;

    const limit = 100;
    const today = new Date().toISOString().split("T")[0];
    const { data: usage, error: usageError } = await supabaseClient
      .from("user_daily_usage")
      .select("request_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (!usageError && usage && usage.request_count >= limit) {
      throw new FunctionError(`Daily limit reached (${limit} requests). Please try again tomorrow.`, 429);
    }

    const { error: upsertError } = await supabaseClient
      .from("user_daily_usage")
      .upsert(
        {
          user_id: user.id,
          date: today,
          request_count: (usage?.request_count ?? 0) + 1,
        },
        { onConflict: "user_id, date" },
      );

    if (upsertError) console.warn("Rate limit update skipped:", upsertError.message);
  } catch (error) {
    if (error instanceof FunctionError) throw error;
    console.warn("Rate limiter failed open.");
  }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": REFERER,
      "X-Title": TITLE,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({})) as OpenRouterResponse;
  console.log("OpenRouter response", { model, status: response.status });

  if (!response.ok) {
    const upstreamMessage = payload.error?.message || `OpenRouter request failed with ${response.status}`;
    throw new FunctionError(upstreamMessage, response.status);
  }

  const text = extractText(payload);
  if (!text) throw new FunctionError("OpenRouter returned no content", 502);
  return text;
}

async function generateWithFallback(body: Record<string, unknown>) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new FunctionError("Missing OPENROUTER_API_KEY environment variable", 500);

  const mode = String(body.mode || "insight");
  const maxTokens = mode === "diagnosis" ? 1400 : 900;
  const messages = buildMessages(body);
  const emergencyModel = Deno.env.get("OPENROUTER_EMERGENCY_FREE_MODEL") || "openrouter/free";
  const models = modelListForMode(mode, emergencyModel);

  return await runModelFallback(models, async (model, index) => {
    try {
      console.log("OpenRouter attempt", { mode, model, attempt: index + 1 });
      return await callOpenRouter(apiKey, model, messages, maxTokens);
    } catch (error) {
      console.warn("OpenRouter attempt failed", { mode, model, status: statusOf(error), attempt: index + 1 });
      throw error;
    }
  }, statusOf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await enforceRateLimit(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON body";
      return jsonResponse({ error: "Invalid JSON body", details: message }, 400);
    }

    const mode = typeof body.mode === "string" ? body.mode : "";

    if (mode === "wakeup") {
      return jsonResponse({ message: "Backend awake", result: "Ready" });
    }

    validateRequestBody(body);

    const normalizedBody = { ...body, mode: mode === "voice" ? "chat" : mode };
    const generated = await generateWithFallback(normalizedBody);
    return jsonResponse({ result: generated.result }, 200, { "X-MasterGrowbot-Model": generated.model });
  } catch (error) {
    const status = statusOf(error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("gemini-v3 execution error", { status });

    return jsonResponse({
      error: message,
      details: message,
    }, status >= 400 && status < 600 ? status : 500);
  }
});
