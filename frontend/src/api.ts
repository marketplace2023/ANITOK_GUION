import type { Anime, AnimeTrends, GenerateResponse } from "./types";
// En desarrollo el backend corre en :4000; publicado (Netlify) la API está en el mismo dominio.
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error de conexión");
  return data as T;
}
export const searchAnime = (q: string, page = 1) => request<{results: Anime[]; pageInfo: {hasNextPage: boolean; total: number}}>(`/anime/search?q=${encodeURIComponent(q)}&page=${page}`);
export const getTrendingAnime = () => request<{results: Anime[]}>("/anime/trending");
export const getAnime = (id: number) => request<Anime>(`/anime/${id}`);
export const getAnimeTrends = (id: number) => request<AnimeTrends>(`/anime/${id}/trends`);
export const generateScript = (payload: unknown) => request<GenerateResponse>("/scripts/generate", { method: "POST", body: JSON.stringify(payload) });
export const getHealth = () => request<{status: string; providers: {gemini: boolean; openrouter: boolean}}>("/health");
