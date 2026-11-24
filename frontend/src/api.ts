import type { AiProviderInfo, Anime, AnimeTrends, BrowseFilters, EpisodeThumb, GenerateResponse, NewsItem, SakugaClip, ProviderId, SceneVideo, TraceResult, VideoProvider } from "./types";

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
export const getHealth = () => request<{ status: string; auth: string; ai?: { order: ProviderId[]; providers: AiProviderInfo[] } }>("/health");

// Escenas
export const getSakugaClips = (animeId: number, type?: string, page = 1) =>
  request<{ tag: string | null; results: SakugaClip[]; hasMore: boolean }>(`/scenes/sakuga?${qs({ animeId, type, page })}`);
export const getEpisodes = (animeId: number) => request<{ trailer: string | null; episodes: EpisodeThumb[] }>(`/scenes/episodes?animeId=${animeId}`);
export const getSceneVideos = (anime: string, character?: string) =>
  request<{ provider: VideoProvider; playerId: string | null; results: SceneVideo[] }>(`/scenes/videos?${qs({ anime, character })}`);

// trace.moe se llama directamente desde el navegador: así cada búsqueda gasta la cuota
// de la IP de quien busca (100/mes gratis) y no la IP compartida del servidor.
const TRACE = "https://api.trace.moe";
async function traceRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(url, init); } catch { throw new ApiError("No hay conexión con trace.moe.", 0); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = res.status === 402 ? "Se agotó tu cuota gratuita de trace.moe de este mes."
      : res.status === 429 ? "trace.moe está ocupado con otra búsqueda tuya. Espera unos segundos."
      : res.status === 413 ? "La imagen es demasiado grande."
      : data.error || "trace.moe no pudo analizar la imagen.";
    throw new ApiError(msg, res.status);
  }
  return data as T;
}
export const traceQuota = () => traceRequest<{ quota: number; quotaUsed: number }>(`${TRACE}/me`);
export const traceByUrl = (imageUrl: string, anilistId?: number) =>
  traceRequest<{ result: TraceResult[] }>(`${TRACE}/search?anilistInfo&cutBorders${anilistId ? `&anilistID=${anilistId}` : ""}&url=${encodeURIComponent(imageUrl)}`);
export const traceByFile = (file: Blob, anilistId?: number) =>
  traceRequest<{ result: TraceResult[] }>(`${TRACE}/search?anilistInfo&cutBorders${anilistId ? `&anilistID=${anilistId}` : ""}`, { method: "POST", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
