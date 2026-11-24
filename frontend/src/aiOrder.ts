import type { ProviderId } from "./types";

// Orden de prioridad de los servicios de IA elegido en Ajustes. Se guarda en este dispositivo
// y se envía con cada guion; si no hay ninguno guardado, manda el orden del servidor (AI_PROVIDER_ORDER).
const KEY = "ai-provider-order";
export const PROVIDER_IDS: ProviderId[] = ["gemini", "nemotron", "gemma", "openrouter"];

export function loadAiOrder(): ProviderId[] | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!Array.isArray(raw)) return null;
    const valid = raw.filter((p): p is ProviderId => PROVIDER_IDS.includes(p));
    return valid.length ? [...new Set([...valid, ...PROVIDER_IDS])] : null;
  } catch { return null; }
}

export function saveAiOrder(order: ProviderId[] | null) {
  try {
    if (order) localStorage.setItem(KEY, JSON.stringify(order));
    else localStorage.removeItem(KEY);
  } catch { /* sin almacenamiento */ }
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini", nemotron: "NVIDIA Nemotron", gemma: "NVIDIA Gemma", openrouter: "OpenRouter",
};
