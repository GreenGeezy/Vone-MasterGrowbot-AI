/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REFERER = "https://mastergrowbot.com";
const TITLE = "MasterGrowbot AI";

const SYSTEM_MESSAGE =
  "You are MasterGrowbot AI, a legal cannabis cultivation assistant. Provide practical, careful, structured plant-health guidance. Do not claim certainty from images. Recommend human verification for severe or high-risk issues.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class FunctionError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;
};

type OpenRouterChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: string | number };
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isImageMimeType(mimeType?: string) {
  return !mimeType || mimeType.toLowerCase().startsWith("image/");
}

function toImageDataUrl(image: string, mimeType = "image/jpeg") {
  if (image.startsWith("data:")) return image;
  return `data:${mimeType};base64,${image}`;
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

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  const mapped = history
    .filter((message) =>
      message &&
      typeof message === "object" &&
      typeof (message as { content?: unknown }).content === "string"
    )
    .map((message) => {
      const role = (message as { role?: string }).role === "assistant" ? "assistant" : "user";
      return {
        role,
        content: (message as { content: string }).content,
      } satisfies ChatMessage;
    });

  while (mapped.length > 0 && mapped[0].role !== "user") mapped.shift();
  return mapped;
}

function modelListForMode(mode: string) {
  const diagnosisModel =
    Deno.env.get("OPENROUTER_MODEL_DIAGNOSIS") || "google/gemini-3.1-flash-lite";
  const insightModel =
    Deno.env.get("OPENROUTER_MODEL_INSIGHT") || "google/gemini-2.5-flash-lite";
  const fallbackModel =
    Deno.env.get("OPENROUTER_FALLBACK_MODEL") || "google/gemini-3.1-flash-lite";
  const emergencyModel =
    Deno.env.get("OPENROUTER_EMERGENCY_FREE_MODEL") || "openrouter/free";

  const primary = mode === "diagnosis" ? diagnosisModel : insightModel;
  return Array.from(new Set([primary, fallbackModel, emergencyModel].filter(Boolean)));
}

function buildMessages(body: Record<string, unknown>): ChatMessage[] {
  const mode = String(body.mode || "");
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const image = typeof body.image === "string" ? body.image : "";
  const fileData = typeof body.fileData === "string" ? body.fileData : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";

  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_MESSAGE }];

  if (mode === "chat") {
    messages.push(...sanitizeHistory(body.history));
  }

  const imagePayload = image || (fileData && isImageMimeType(mimeType) ? fileData : "");
  if ((mode === "diagnosis" || mode === "chat") && imagePayload) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt || "Analyze this plant image." },
        { type: "image_url", image_url: { url: toImageDataUrl(imagePayload, mimeType) } },
      ],
    });
    return messages;
  }

  if (fileData && !isImageMimeType(mimeType)) {
    messages.push({
      role: "user",
      content: `${prompt}\n\nAttached file data:\n${fileData}`,
    });
    return messages;
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}

async function enforceRateLimit(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return;

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
  const models = modelListForMode(mode);

  let lastError: unknown;
  for (const [index, model] of models.entries()) {
    try {
      console.log("OpenRouter attempt", { mode, model, attempt: index + 1 });
      return await callOpenRouter(apiKey, model, messages, maxTokens);
    } catch (error) {
      lastError = error;
      const status = error instanceof FunctionError ? error.status : 500;
      console.warn("OpenRouter attempt failed", { mode, model, status, attempt: index + 1 });
      if (status === 401 || status === 402) break;
    }
  }

  if (lastError instanceof FunctionError) throw lastError;
  throw new FunctionError("OpenRouter request failed", 500);
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
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const image = typeof body.image === "string" ? body.image : "";
    const fileData = typeof body.fileData === "string" ? body.fileData : "";

    if (mode === "wakeup") {
      return jsonResponse({ message: "Backend awake", result: "Ready" });
    }

    if (!prompt && !image && !fileData) {
      return jsonResponse({ error: "Missing required fields: prompt or image" }, 400);
    }

    if (!["diagnosis", "insight", "chat", "voice"].includes(mode)) {
      return jsonResponse({ error: `Invalid mode '${mode}' for gemini-v3` }, 400);
    }

    const normalizedBody = { ...body, mode: mode === "voice" ? "chat" : mode };
    const result = await generateWithFallback(normalizedBody);
    return jsonResponse({ result });
  } catch (error) {
    const status = error instanceof FunctionError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("gemini-v3 execution error", { status });

    return jsonResponse({
      error: message,
      details: message,
    }, status >= 400 && status < 600 ? status : 500);
  }
});
