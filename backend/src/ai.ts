import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

// Cadena de proveedores: primero los modelos de Gemini y, si todos fallan
// (cuota agotada, saturación, timeout), los modelos gratuitos de OpenRouter.

type Attempt = { provider: "gemini" | "openrouter"; model: string };
export type JsonResult = { data: unknown; provider: Attempt["provider"]; model: string };

const list = (s: string) => s.split(",").map((m) => m.trim()).filter(Boolean);

export function providerStatus() {
  return {
    gemini: Boolean(config.GEMINI_API_KEY),
    openrouter: Boolean(config.OPENROUTER_API_KEY),
  };
}

function attempts(): Attempt[] {
  const out: Attempt[] = [];
  if (config.GEMINI_API_KEY) {
    for (const model of [config.GEMINI_MODEL, ...list(config.GEMINI_FALLBACK_MODELS)]) out.push({ provider: "gemini", model });
  }
  if (config.OPENROUTER_API_KEY) {
    for (const model of list(config.OPENROUTER_MODELS)) out.push({ provider: "openrouter", model });
  }
  return out;
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.85, abortSignal: AbortSignal.timeout(config.GEMINI_TIMEOUT_MS) },
  });
  return response.text?.trim() ?? "";
}

async function callOpenRouter(model: string, prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "AnimeTok AI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(config.GEMINI_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; choices?: { message?: { content?: string } }[] };
  if (!res.ok || json.error) throw new Error(`OpenRouter ${res.status}: ${json.error?.message ?? "error desconocido"}`);
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

// Algunos modelos envuelven el JSON en ```json ... ```; lo limpiamos antes de parsear.
function parseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function generateJson(prompt: string): Promise<JsonResult> {
  const chain = attempts();
  if (!chain.length) throw new Error("No hay ningún proveedor de IA configurado.");
  let lastError: unknown;
  for (const { provider, model } of chain) {
    try {
      const raw = provider === "gemini" ? await callGemini(model, prompt) : await callOpenRouter(model, prompt);
      if (!raw) throw new Error("respuesta vacía");
      return { data: parseJson(raw), provider, model };
    } catch (error) {
      lastError = error;
      console.warn(`[${provider}] ${model} falló:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}
