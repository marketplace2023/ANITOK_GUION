import type { Anime, AnimeTrends, BrowseFilters, GenerateResponse, NewsItem } from "./types";

// La API siempre está en /api del mismo dominio: en Netlify por la función y en local por el proxy de Vite.
const API = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${url}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("No hay conexión con el servidor.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Sesión caducada o cerrada en otra pestaña: la app vuelve a la pantalla de login
    if (res.status === 401 && !url.startsWith("/auth/")) window.dispatchEvent(new Event("auth:expired"));
    throw new ApiError(data.error || "Error de conexión", res.status, data.code);
  }
  return data as T;
}

const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();

// Sesión
export const getMe = () => request<{ user: string }>("/auth/me");
export const login = (user: string, password: string) => request<{ user: string }>("/auth/login", { method: "POST", body: JSON.stringify({ user, password }) });
export const logout = () => request<{ ok: true }>("/auth/logout", { method: "POST" });

// Anime
export const browseAnime = (f: BrowseFilters, page = 1) =>
  request<{ results: Anime[]; pageInfo: { hasNextPage: boolean; total: number } }>(`/anime/search?${qs({ ...f, page })}`);
export const searchAnime = (q: string, page = 1) => browseAnime({ q }, page);
export const getGenres = () => request<{ genres: string[] }>("/anime/genres");
export const getTrendingAnime = () => request<{ results: Anime[] }>("/anime/trending");
export const getAnime = (id: number) => request<Anime>(`/anime/${id}`);
export const getAnimeTrends = (id: number) => request<AnimeTrends>(`/anime/${id}/trends`);
export const getAnimeNews = (id: number) => request<{ results: NewsItem[] }>(`/anime/${id}/news`);

// Noticias
export const getNews = (lang: "es" | "en" | "all" = "all", q?: string, limit?: number) =>
  request<{ results: NewsItem[]; updatedAt: string; failedSources: string[] }>(`/news?${qs({ lang, q, limit })}`);

// Generación y estado
export const generateScript = (payload: unknown) => request<GenerateResponse>("/scripts/generate", { method: "POST", body: JSON.stringify(payload) });
export const getHealth = () => request<{ status: string; auth: string; providers?: { gemini: boolean; nvidia: boolean; openrouter: boolean } }>("/health");
