export const MODEL_ROUTING = {
  diagnosis: "google/gemini-3.7-flash",
  insight: "google/gemini-2.5-flash-lite",
  chat: "google/gemini-2.5-flash-lite",
  voice: "google/gemini-2.5-flash-lite",
  fallback: "google/gemini-3.1-flash-lite",
} as const;

export class RequestValidationError extends Error {
  status = 400;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;
};

const SYSTEM_MESSAGE =
  "You are MasterGrowbot AI, a legal cannabis cultivation assistant. Provide practical, careful, structured plant-health guidance. Do not claim certainty from images. Clearly distinguish visible signs from possible causes, state uncertainty, and recommend human verification for severe or high-risk issues.";

const IMAGE_SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((value, index) => bytes[index] === value),
  "image/gif": (bytes) => String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a" ||
    String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a",
  "image/webp": (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
};

function decodeBase64(value: string) {
  const compact = value.replace(/\s/g, "");
  if (!compact || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new RequestValidationError("Malformed image data");
  }
  try {
    const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new RequestValidationError("Malformed image data");
  }
}

export function toImageDataUrl(image: string, declaredMimeType = "image/jpeg") {
  const match = image.match(/^data:([^;,]+);base64,(.*)$/is);
  const mimeType = (match?.[1] || declaredMimeType).toLowerCase();
  const base64 = match?.[2] ?? image;
  const signatureMatches = IMAGE_SIGNATURES[mimeType];
  if (!signatureMatches) throw new RequestValidationError("Unsupported image type");
  const bytes = decodeBase64(base64);
  if (!signatureMatches(bytes)) throw new RequestValidationError("Image data does not match its MIME type");
  return `data:${mimeType};base64,${base64.replace(/\s/g, "")}`;
}

export function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  const mapped = history
    .filter((message) => message && typeof message === "object" &&
      typeof (message as { content?: unknown }).content === "string")
    .map((message) => ({
      role: (message as { role?: string }).role === "assistant" ? "assistant" as const : "user" as const,
      content: (message as { content: string }).content,
    }));
  while (mapped.length > 0 && mapped[0].role !== "user") mapped.shift();
  return mapped;
}

export function modelListForMode(mode: string, emergencyModel = "openrouter/free") {
  const primary = MODEL_ROUTING[mode as keyof typeof MODEL_ROUTING] || MODEL_ROUTING.insight;
  return Array.from(new Set([primary, MODEL_ROUTING.fallback, emergencyModel].filter(Boolean)));
}

export function buildMessages(body: Record<string, unknown>): ChatMessage[] {
  const mode = String(body.mode || "");
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const image = typeof body.image === "string" ? body.image : "";
  const fileData = typeof body.fileData === "string" ? body.fileData : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_MESSAGE }];

  if (mode === "chat") messages.push(...sanitizeHistory(body.history));
  const imagePayload = image || (fileData && mimeType.toLowerCase().startsWith("image/") ? fileData : "");
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
  if (fileData && !mimeType.toLowerCase().startsWith("image/")) {
    messages.push({ role: "user", content: `${prompt}\n\nAttached file data:\n${fileData}` });
    return messages;
  }
  messages.push({ role: "user", content: prompt });
  return messages;
}

export function validateRequestBody(body: Record<string, unknown>) {
  const mode = typeof body.mode === "string" ? body.mode : "";
  if (mode === "wakeup") return;
  const hasInput = [body.prompt, body.image, body.fileData].some((value) =>
    typeof value === "string" && value.trim().length > 0
  );
  if (!hasInput) throw new RequestValidationError("Missing required fields: prompt or image");
  if (!["diagnosis", "insight", "chat", "voice"].includes(mode)) {
    throw new RequestValidationError(`Invalid mode '${mode}' for gemini-v3`);
  }
}

export async function runModelFallback(
  models: string[],
  attempt: (model: string, index: number) => Promise<string>,
  statusOf: (error: unknown) => number,
) {
  let lastError: unknown;
  for (const [index, model] of models.entries()) {
    try {
      return { result: await attempt(model, index), model };
    } catch (error) {
      lastError = error;
      if ([401, 402].includes(statusOf(error))) break;
    }
  }
  throw lastError || new Error("All model attempts failed");
}
