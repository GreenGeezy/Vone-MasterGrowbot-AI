import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const functionName = process.argv[2] || "gemini-v3";
const shouldTestRateLimit = process.argv.includes("--rate-limit");
const fallbackOnly = process.argv.includes("--fallback-only");
const config = fs.readFileSync(new URL("../services/config.ts", import.meta.url), "utf8");
const supabaseUrl = config.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1];
const anonKey = config.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
if (!supabaseUrl || !anonKey) throw new Error("Public Supabase configuration not found");

async function invoke(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    payload,
    model: response.headers.get("x-mastergrowbot-model"),
  };
}

function check(name, condition, details) {
  if (!condition) throw new Error(`${name} failed${details ? `: ${details}` : ""}`);
  console.log(`${name}: ok${details ? ` (${details})` : ""}`);
}

async function imageBase64(url) {
  const response = await fetch(url, { headers: { "User-Agent": "MasterGrowbot-Reliability-Test/1.0" } });
  if (!response.ok) throw new Error(`Test image download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function commonsImageBase64(title, width) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", format: "json", prop: "imageinfo", iiprop: "url",
    iiurlwidth: String(width), titles: `File:${title}`, origin: "*",
  });
  const response = await fetch(api, { headers: { "User-Agent": "MasterGrowbot-Reliability-Test/1.0" } });
  if (!response.ok) throw new Error(`Commons metadata request failed: ${response.status}`);
  const payload = await response.json();
  const page = Object.values(payload?.query?.pages || {})[0];
  const imageUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
  if (!imageUrl) throw new Error("Commons test image URL was not returned");
  return imageBase64(imageUrl);
}

const jpeg = await commonsImageBase64("Weed in Islamabad.jpg", 960);
const png = await commonsImageBase64("Cannabis leaf 2.svg", 640);
const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const signup = await supabase.auth.signInAnonymously();
if (signup.error || !signup.data.session?.access_token || !signup.data.user) {
  throw signup.error || new Error("Anonymous test session was not created");
}
const accessToken = signup.data.session.access_token;
const userId = signup.data.user.id;
const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;
const diagnosisPrompt = `Analyze visible plant-health signs in this cannabis image. Return JSON only with keys diagnosis, severity, confidence, topAction, fixSteps, and preventionTips. Do not claim certainty from the image; explicitly state uncertainty when causes cannot be confirmed visually.`;

if (fallbackOnly) {
  const fallback = await invoke({ mode: "diagnosis", prompt: diagnosisPrompt, image: jpeg });
  check("controlled diagnosis fallback", fallback.status === 200 &&
    fallback.model === "google/gemini-3.1-flash-lite" &&
    String(fallback.payload?.result || "").trim().length > 100,
  `HTTP ${fallback.status}${fallback.model ? `, ${fallback.model}` : ""}`);
  console.log(`TEST_USER_ID=${userId}`);
  process.exit(0);
}

const wakeup = await invoke({ mode: "wakeup" });
check("wakeup", wakeup.status === 200 && wakeup.payload?.result === "Ready", `HTTP ${wakeup.status}`);

const insight = await invoke({ mode: "insight", prompt: "Give one short plant-care tip under 15 words." });
check("text insight", insight.status === 200 && String(insight.payload?.result || "").trim().length > 0,
  `HTTP ${insight.status}${insight.model ? `, ${insight.model}` : ""}`);

const chat = await invoke({ mode: "chat", prompt: "What is one common cause of leaf-tip burn?", history: [] });
check("standard text chat", chat.status === 200 && String(chat.payload?.result || "").trim().length > 0,
  `HTTP ${chat.status}${chat.model ? `, ${chat.model}` : ""}`);

const jpegDiagnosis = await invoke({ mode: "diagnosis", prompt: diagnosisPrompt, image: jpeg });
check("JPEG diagnosis", jpegDiagnosis.status === 200, `HTTP ${jpegDiagnosis.status}${jpegDiagnosis.model ? `, ${jpegDiagnosis.model}` : ""}`);
const jpegText = String(jpegDiagnosis.payload?.result || "").replace(/```json|```/g, "").trim();
check("JPEG meaningful analysis", jpegText.length > 100 && /diagnosis|visible|uncertain|confidence/i.test(jpegText));
try { JSON.parse(jpegText); } catch { throw new Error("JPEG diagnosis did not preserve the JSON response contract"); }

const pngDiagnosis = await invoke({ mode: "diagnosis", prompt: diagnosisPrompt, image: `data:image/png;base64,${png}`, mimeType: "image/png" });
check("PNG diagnosis", pngDiagnosis.status === 200, `HTTP ${pngDiagnosis.status}${pngDiagnosis.model ? `, ${pngDiagnosis.model}` : ""}`);
const pngText = String(pngDiagnosis.payload?.result || "").replace(/```json|```/g, "").trim();
check("PNG meaningful analysis", pngText.length > 100 && /diagnosis|visible|uncertain|confidence/i.test(pngText));
try { JSON.parse(pngText); } catch { throw new Error("PNG diagnosis did not preserve the JSON response contract"); }

const malformed = await invoke({ mode: "diagnosis", prompt: diagnosisPrompt, image: "not-an-image", mimeType: "image/jpeg" });
check("malformed image", malformed.status === 400, `HTTP ${malformed.status}`);

const missing = await invoke({ mode: "diagnosis" });
check("missing prompt/image", missing.status === 400, `HTTP ${missing.status}`);

if (shouldTestRateLimit) {
  let limited = null;
  for (let attempt = 0; attempt < 105; attempt += 1) {
    const response = await invoke({ mode: "wakeup" });
    if (response.status === 429) { limited = response; break; }
  }
  check("anonymous JWT daily rate limit", limited?.status === 429, `HTTP ${limited?.status || "none"}`);
}

console.log(`TEST_USER_ID=${userId}`);
