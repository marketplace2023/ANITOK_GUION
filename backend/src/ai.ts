import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

// Cadena de proveedores: Gemini → NVIDIA → modelos gratuitos de OpenRouter.

type Attempt = { provider: "gemini" | "nvidia" | "openrouter"; model: string; apiKey?: string };
export type JsonResult = { data: unknown; provider: Attempt["provider"]; model: string };

const list = (s: string) => s.split(",").map((m) => m.trim()).filter(Boolean);

export function providerStatus() {
  return {
    gemini: Boolean(config.GEMINI_API_KEY),
    nvidia: Boolean(config.NVIDIA_API_KEY || config.NVIDIA_GEMMA_API_KEY),
    openrouter: Boolean(config.OPENROUTER_API_KEY),
  };
}

function attempts(): Attempt[] {
  const out: Attempt[] = [];
  if (config.GEMINI_API_KEY) {
    for (const model of [config.GEMINI_MODEL, ...list(config.GEMINI_FALLBACK_MODELS)]) out.push({ provider: "gemini", model });
  }
  if (config.NVIDIA_API_KEY) out.push({ provider: "nvidia", model: config.NVIDIA_MODEL, apiKey: config.NVIDIA_API_KEY });
  if (config.NVIDIA_GEMMA_API_KEY) out.push({ provider: "nvidia", model: config.NVIDIA_GEMMA_MODEL, apiKey: config.NVIDIA_GEMMA_API_KEY });
  if (config.OPENROUTER_API_KEY) {
    for (const model of list(config.OPENROUTER_MODELS)) out.push({ provider: "openrouter", model });
  }
  return out;
}

async function callGemini(model: string, prompt: string, timeoutMs: number): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.85, abortSignal: AbortSignal.timeout(timeoutMs) },
  });
  return response.text?.trim() ?? "";
}

async function callChatCompletion(provider: "nvidia" | "openrouter", model: string, prompt: string, timeoutMs: number, apiKey?: string): Promise<string> {
  const isNvidia = provider === "nvidia";
  const isGemma = isNvidia && model === config.NVIDIA_GEMMA_MODEL;
  const res = await fetch(isNvidia ? "https://integrate.api.nvidia.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${isNvidia ? apiKey : config.OPENROUTER_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Title": "AnimeTok AI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: isGemma ? 0.5 : 0.85,
      ...(isNvidia ? { stream: false, max_tokens: 4096, top_p: isGemma ? 1 : 0.95 } : {}),
      ...(isNvidia && !isGemma ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; choices?: { message?: { content?: string } }[] };
  if (!res.ok || json.error) throw new Error(`${provider} ${res.status}: ${json.error?.message ?? "error desconocido"}`);
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
  // Presupuesto total: Netlify corta las funciones a los 60 s, así que nunca lo superamos.
  const deadline = Date.now() + config.AI_TOTAL_TIMEOUT_MS;
  let lastError: unknown = new Error("Tiempo agotado antes de probar ningún modelo.");
  for (const { provider, model, apiKey } of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;
    const timeoutMs = Math.min(config.GEMINI_TIMEOUT_MS, remaining - 1000);
    try {
      const raw = provider === "gemini" ? await callGemini(model, prompt, timeoutMs) : await callChatCompletion(provider, model, prompt, timeoutMs, apiKey);
      if (!raw) throw new Error("respuesta vacía");
      return { data: parseJson(raw), provider, model };
    } catch (error) {
      lastError = error;
      console.warn(`[${provider}] ${model} falló:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}
