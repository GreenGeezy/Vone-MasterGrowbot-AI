export const MODEL_ROUTING = {
  diagnosis: "google/gemini-3.7-flash",
  insight: "google/gemini-2.5-flash-lite",
  chat: "google/gemini-2.5-flash-lite",
  voice: "google/gemini-2.5-flash-lite",
  video_visual_analysis: "google/gemini-3.8-flash",
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
      | { type: "video_url"; video_url: { url: string } }
    >;
};

const SYSTEM_MESSAGE =
  "You are MasterGrowbot AI, a legal cannabis cultivation assistant. Provide practical, careful, structured plant-health guidance. Do not claim certainty from images. Clearly distinguish visible signs from possible causes, state uncertainty, and recommend human verification for severe or high-risk issues.";

const VIDEO_SYSTEM_MESSAGE = `You review a user-supplied plant video and return general visual observations only.
Describe visible evidence, uncertainty, viewing limitations, and areas that merit closer visual inspection.
Distinguish visible observations from possible interpretations. Use phrases such as "appears consistent with",
"may indicate", and "cannot confirm from this video alone". Do not provide controlled-substance cultivation
optimization, potency, harvest timing, medical claims, guaranteed diagnosis, treatment recipes, feeding targets,
yield advice, sales, delivery, purchase, consumption, intoxication, or content involving minors or illegal activity.`;

export const VIDEO_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "video_visual_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["visualSummary", "visibleSigns", "possibleInterpretations", "severity", "confidence", "healthScore", "healthLabel", "environmentSummary", "areasToInspect", "recommendedVerification", "mediaQuality"],
      properties: {
        visualSummary: { type: "string" },
        visibleSigns: { type: "array", maxItems: 8, items: { type: "string" } },
        possibleInterpretations: { type: "array", maxItems: 8, items: { type: "string" } },
        severity: { type: "string", enum: ["low", "medium", "high", "uncertain"] },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        healthScore: { type: "number", minimum: 0, maximum: 100 },
        healthLabel: { type: "string", enum: ["Needs a closer look", "Visible concerns", "Mixed visual condition", "No obvious concern visible"] },
        environmentSummary: { type: "string" },
        areasToInspect: { type: "array", maxItems: 8, items: { type: "string" } },
        recommendedVerification: { type: "string" },
        mediaQuality: { type: "string" },
      },
    },
  },
} as const;

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
    throw new RequestValidationError("Malformed media data");
  }
  try {
    const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new RequestValidationError("Malformed media data");
  }
}

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}

function videoDurationSeconds(bytes: Uint8Array) {
  for (let i = 4; i + 36 < bytes.length; i++) {
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue;
    const version = bytes[i + 4];
    const timescaleOffset = version === 1 ? i + 24 : i + 16;
    const durationOffset = version === 1 ? i + 28 : i + 20;
    const timescale = readUint32(bytes, timescaleOffset);
    if (!timescale) continue;
    const duration = version === 1
      ? readUint32(bytes, durationOffset + 4) // 20 seconds cannot overflow the low 32 bits.
      : readUint32(bytes, durationOffset);
    return duration / timescale;
  }
  throw new RequestValidationError("Could not verify video duration");
}

export function toVideoDataUrl(video: string, declaredMimeType: string) {
  const match = video.match(/^data:([^;,]+);base64,(.*)$/is);
  const mimeType = (match?.[1] || declaredMimeType).toLowerCase();
  if (!["video/mp4", "video/quicktime"].includes(mimeType)) {
    throw new RequestValidationError("Unsupported video type. Choose an MP4 or MOV video.");
  }
  const base64 = match?.[2] ?? video;
  const bytes = decodeBase64(base64);
  if (bytes.length > 8 * 1024 * 1024) throw new RequestValidationError("Video is larger than the 8 MB limit");
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") {
    throw new RequestValidationError("Video data does not match its MIME type");
  }
  const duration = videoDurationSeconds(bytes);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 20.5) {
    throw new RequestValidationError("Video must be 20 seconds or shorter");
  }
  return { dataUrl: `data:${mimeType};base64,${base64.replace(/\s/g, "")}`, duration };
}

export function toImageDataUrl(image: string, declaredMimeType = "image/jpeg") {
  const match = image.match(/^data:([^;,]+);base64,(.*)$/is);
  const mimeType = (match?.[1] || declaredMimeType).toLowerCase();
  const base64 = match?.[2] ?? image;
  const signatureMatches = IMAGE_SIGNATURES[mimeType];
  if (!signatureMatches) throw new RequestValidationError("Unsupported image type");
  const bytes = decodeBase64(base64);
  if (bytes.length > 8 * 1024 * 1024) throw new RequestValidationError("Image is larger than the 8 MB limit");
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
      content: (message as { content: string }).content.slice(0, 6000),
    })).slice(-20);
  while (mapped.length > 0 && mapped[0].role !== "user") mapped.shift();
  return mapped;
}

export function modelListForMode(mode: string, emergencyModel = "openrouter/free") {
  if (mode === "video_visual_analysis") {
    return [MODEL_ROUTING.video_visual_analysis, MODEL_ROUTING.fallback];
  }
  const primary = MODEL_ROUTING[mode as keyof typeof MODEL_ROUTING] || MODEL_ROUTING.insight;
  return Array.from(new Set([primary, MODEL_ROUTING.fallback, emergencyModel].filter(Boolean)));
}

export function buildMessages(body: Record<string, unknown>): ChatMessage[] {
  const mode = String(body.mode || "");
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const image = typeof body.image === "string" ? body.image : "";
  const fileData = typeof body.fileData === "string" ? body.fileData : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  const messages: ChatMessage[] = [{ role: "system", content: mode === "video_visual_analysis" ? VIDEO_SYSTEM_MESSAGE : SYSTEM_MESSAGE }];

  if (mode === "video_visual_analysis") {
    const { dataUrl } = toVideoDataUrl(fileData, mimeType);
    messages.push({
      role: "user",
      content: [
        { type: "text", text: "Describe only the visible plant evidence in the required JSON structure. Separate observations from possible interpretations." },
        { type: "video_url", video_url: { url: dataUrl } },
      ],
    });
    return messages;
  }

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
  if (mode === "video_visual_analysis") {
    if (typeof body.fileData !== "string" || !body.fileData.trim()) throw new RequestValidationError("Missing video data");
    if (body.fileData.length > 11_200_000) throw new RequestValidationError("Video is larger than the 8 MB limit");
    toVideoDataUrl(body.fileData, typeof body.mimeType === "string" ? body.mimeType : "");
    return;
  }
  const hasInput = [body.prompt, body.image, body.fileData].some((value) =>
    typeof value === "string" && value.trim().length > 0
  );
  if (!hasInput) throw new RequestValidationError("Missing required fields: prompt or image");
  if (!["diagnosis", "insight", "chat", "voice", "video_visual_analysis"].includes(mode)) {
    throw new RequestValidationError(`Invalid mode '${mode}' for gemini-v3`);
  }
  if (typeof body.prompt === "string" && body.prompt.length > 30_000) throw new RequestValidationError("Prompt is too long");
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  const imagePayload = typeof body.image === "string" && body.image
    ? body.image
    : typeof body.fileData === "string" && mimeType.toLowerCase().startsWith("image/") ? body.fileData : "";
  if (imagePayload) {
    if (imagePayload.length > 11_200_000) throw new RequestValidationError("Image is larger than the 8 MB limit");
    toImageDataUrl(imagePayload, mimeType);
  } else if (typeof body.fileData === "string" && body.fileData.length > 100_000) {
    throw new RequestValidationError("Attached text is too large");
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

export function parseVideoResult(value: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new RequestValidationError("The video model returned malformed JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestValidationError("The video model returned an invalid result");
  const result = parsed as Record<string, unknown>;
  const requiredStrings = ["visualSummary", "healthLabel", "environmentSummary", "recommendedVerification", "mediaQuality"];
  const requiredLists = ["visibleSigns", "possibleInterpretations", "areasToInspect"];
  if (requiredStrings.some((key) => typeof result[key] !== "string" || !(result[key] as string).trim())) throw new RequestValidationError("The video model omitted a required observation");
  if (requiredLists.some((key) => !Array.isArray(result[key]) || (result[key] as unknown[]).length > 8 || (result[key] as unknown[]).some((item) => typeof item !== "string"))) throw new RequestValidationError("The video model returned invalid observation lists");
  if (!["low", "medium", "high", "uncertain"].includes(String(result.severity))) throw new RequestValidationError("The video model returned an invalid severity");
  for (const key of ["confidence", "healthScore"]) {
    if (typeof result[key] !== "number" || !Number.isFinite(result[key]) || (result[key] as number) < 0 || (result[key] as number) > 100) throw new RequestValidationError(`The video model returned an invalid ${key}`);
  }
  return result;
}
