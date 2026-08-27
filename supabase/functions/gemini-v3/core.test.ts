import { describe, expect, it, vi } from "vitest";
import {
  buildMessages,
  MODEL_ROUTING,
  modelListForMode,
  RequestValidationError,
  runModelFallback,
  toImageDataUrl,
  validateRequestBody,
} from "./core";

const jpeg = "/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

describe("gemini-v3 routing and multimodal contract", () => {
  it("routes only diagnosis to Gemini 3.7", () => {
    expect(modelListForMode("diagnosis")).toEqual([
      "google/gemini-3.7-flash",
      "google/gemini-3.1-flash-lite",
      "openrouter/free",
    ]);
    expect(MODEL_ROUTING.insight).toBe("google/gemini-2.5-flash-lite");
    expect(MODEL_ROUTING.chat).toBe("google/gemini-2.5-flash-lite");
    expect(MODEL_ROUTING.voice).toBe("google/gemini-2.5-flash-lite");
  });

  it("preserves text first and JPEG/PNG data URL inputs", () => {
    expect(toImageDataUrl(jpeg, "image/jpeg")).toBe(`data:image/jpeg;base64,${jpeg}`);
    expect(toImageDataUrl(`data:image/png;base64,${png}`)).toBe(`data:image/png;base64,${png}`);
    const messages = buildMessages({ mode: "diagnosis", prompt: "Inspect the leaves", image: jpeg });
    expect(messages.at(-1)?.content).toEqual([
      { type: "text", text: "Inspect the leaves" },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg}` } },
    ]);
  });

  it("rejects malformed and mismatched images before provider usage", () => {
    expect(() => toImageDataUrl("not-an-image", "image/jpeg")).toThrow(RequestValidationError);
    expect(() => toImageDataUrl(`data:image/png;base64,${jpeg}`)).toThrow("does not match");
  });

  it("validates missing and invalid requests intentionally", () => {
    expect(() => validateRequestBody({ mode: "diagnosis" })).toThrow("Missing required fields");
    expect(() => validateRequestBody({ mode: "unknown", prompt: "hello" })).toThrow("Invalid mode");
    expect(() => validateRequestBody({ mode: "wakeup" })).not.toThrow();
  });

  it("falls back to 3.1 when diagnosis primary is unavailable", async () => {
    const attempt = vi.fn(async (model: string) => {
      if (model === "google/gemini-3.7-flash") throw { status: 503 };
      return "fallback analysis";
    });
    const response = await runModelFallback(modelListForMode("diagnosis"), attempt, (error: any) => error.status);
    expect(response).toEqual({ result: "fallback analysis", model: "google/gemini-3.1-flash-lite" });
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
