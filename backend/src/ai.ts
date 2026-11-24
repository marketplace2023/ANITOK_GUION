import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

// Cadena de proveedores de IA con orden de prioridad configurable:
// - Orden por defecto en AI_PROVIDER_ORDER; la app puede enviar su propio orden en cada petición (Ajustes).
// - Cada servicio tiene un tiempo máximo (AI_PROVIDER_TIMEOUT_MS) para que uno colgado no agote el presupuesto total.
// - Si un servicio está saturado (429/503) o no responde, se pausa AI_COOLDOWN_MS y pasa al final de la cola.

export const PROVIDER_IDS = ["gemini", "nemotron", "sensenova", "gemma", "openrouter"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type JsonResult = { data: unknown; provider: ProviderId; model: string };

const list = (s: string) => s.split(",").map((m) => m.trim()).filter(Boolean);

const PROVIDERS: Record<ProviderId, { label: string; key: () => string | undefined; models: () => string[] }> = {
  gemini: { label: "Google Gemini", key: () => config.GEMINI_API_KEY, models: () => [config.GEMINI_MODEL, ...list(config.GEMINI_FALLBACK_MODELS)] },
  nemotron: { label: "NVIDIA Nemotron", key: () => config.NVIDIA_API_KEY, models: () => [config.NVIDIA_MODEL] },
  sensenova: { label: "SenseNova", key: () => config.SENSENOVA_API_KEY, models: () => [config.SENSENOVA_MODEL, ...list(config.SENSENOVA_FALLBACK_MODELS)] },
  gemma: { label: "NVIDIA Gemma", key: () => config.NVIDIA_GEMMA_API_KEY, models: () => [config.NVIDIA_GEMMA_MODEL] },
  openrouter: { label: "OpenRouter (gratis)", key: () => config.OPENROUTER_API_KEY, models: () => list(config.OPENROUTER_MODELS) },
};

const isProvider = (s: string): s is ProviderId => (PROVIDER_IDS as readonly string[]).includes(s);

// Orden final: el pedido (o el de AI_PROVIDER_ORDER) y después cualquier proveedor que falte, para no perder respaldos.
export function resolveOrder(requested?: readonly string[]): ProviderId[] {
  const base = (requested?.length ? requested : list(config.AI_PROVIDER_ORDER)).filter(isProvider);
  return [...new Set([...base, ...PROVIDER_IDS])];
}

// Estado en memoria (dura mientras la instancia esté viva; en Netlify, mientras la función siga "caliente")
const health: Partial<Record<ProviderId, { pausedUntil?: number; lastError?: string; lastOk?: number; lastMs?: number }>> = {};
const isPaused = (id: ProviderId) => (health[id]?.pausedUntil ?? 0) > Date.now();

export function providerStatus(): Record<ProviderId, boolean> {
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, Boolean(PROVIDERS[id].key())])) as Record<ProviderId, boolean>;
}

export function providerInfo() {
  return {
    order: resolveOrder(),
    providers: PROVIDER_IDS.map((id) => ({
      id,
      label: PROVIDERS[id].label,
      configured: Boolean(PROVIDERS[id].key()),
      models: PROVIDERS[id].models(),
      pausedUntil: isPaused(id) ? health[id]!.pausedUntil : null,
      lastError: health[id]?.lastError ?? null,
      lastMs: health[id]?.lastMs ?? null,
    })),
  };
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

async function callChatCompletion(provider: Exclude<ProviderId, "gemini">, model: string, prompt: string, timeoutMs: number): Promise<string> {
  const isNvidia = provider === "nemotron" || provider === "gemma";
  const isGemma = provider === "gemma";
  const url = {
    nemotron: "https://integrate.api.nvidia.com/v1/chat/completions",
    gemma: "https://integrate.api.nvidia.com/v1/chat/completions",
    sensenova: "https://token.sensenova.ai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  }[provider];
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PROVIDERS[provider].key()}`,
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
      ...(provider === "sensenova" ? { stream: false, max_tokens: 4096 } : {}),
      ...(provider === "nemotron" ? { chat_template_kwargs: { enable_thinking: false } } : {}),
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

// Saturación, límite de uso o sin respuesta: merece pausar el servicio un rato
const isOverload = (msg: string) => /\b(429|503|502|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|rate.?limit|quota|aborted|timeout|timed out/i.test(msg);

export async function generateJson(prompt: string, requestedOrder?: readonly string[]): Promise<JsonResult> {
  const configured = resolveOrder(requestedOrder).filter((id) => PROVIDERS[id].key());
  if (!configured.length) throw new Error("No hay ningún proveedor de IA configurado.");
  // Los servicios en pausa pasan al final (se prueban solo si los demás fallan y queda tiempo)
  const chain = [...configured.filter((id) => !isPaused(id)), ...configured.filter(isPaused)];
  // Presupuesto total: Netlify corta las funciones a los 60 s, así que nunca lo superamos.
  const deadline = Date.now() + config.AI_TOTAL_TIMEOUT_MS;
  let lastError: unknown = new Error("Tiempo agotado antes de probar ningún modelo.");

  for (const provider of chain) {
    const serviceDeadline = Math.min(deadline, Date.now() + config.AI_PROVIDER_TIMEOUT_MS);
    let overloaded = false;
    for (const model of PROVIDERS[provider].models()) {
      const remaining = serviceDeadline - Date.now();
      if (remaining < 3000) { overloaded = true; break; }
      const timeoutMs = Math.min(config.GEMINI_TIMEOUT_MS, remaining - 500);
      const started = Date.now();
      try {
        const raw = provider === "gemini" ? await callGemini(model, prompt, timeoutMs) : await callChatCompletion(provider, model, prompt, timeoutMs);
        if (!raw) throw new Error("respuesta vacía");
        const data = parseJson(raw);
        health[provider] = { lastOk: Date.now(), lastMs: Date.now() - started };
        return { data, provider, model };
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (isOverload(msg)) overloaded = true;
        health[provider] = { ...health[provider], lastError: `${model}: ${msg.slice(0, 160)}` };
        console.warn(`[${provider}] ${model} falló:`, msg);
      }
    }
    if (overloaded) health[provider] = { ...health[provider], pausedUntil: Date.now() + config.AI_COOLDOWN_MS };
    if (deadline - Date.now() < 4000) break;
  }
  throw lastError;
}
