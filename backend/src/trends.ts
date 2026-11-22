// Señales de tendencia gratuitas desde la API pública de AniList (sin clave).
// AniList mide actividad real de su comunidad: "trending" = cambios recientes en listas de usuarios.

const ANILIST = "https://graphql.anilist.co";
const CACHE_MS = 30 * 60_000;
const cache = new Map<number, { at: number; data: AnimeTrends }>();
let globalCache: { at: number; ids: number[]; titles: string[] } | null = null;

export type AnimeTrends = {
  trendingScore: number;
  popularity: number;
  popularityGrowth7d: number | null; // % de crecimiento de popularidad en ~7 días
  globalTrendingRank: number | null; // posición en el top 50 global de AniList ahora mismo
  status: string | null;
  nextEpisode: { episode: number; airsInHours: number } | null;
  officialHashtag: string | null;
  topTags: string[];
  trendingNow: string[]; // otros animes en tendencia (para comparaciones / novedades)
  momentum: "explosivo" | "en alza" | "estable" | "en baja";
};

async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`AniList respondió ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown[] };
  if (json.errors?.length || !json.data) throw new Error("AniList no pudo completar la consulta.");
  return json.data;
}

async function getGlobalTrending() {
  if (globalCache && Date.now() - globalCache.at < CACHE_MS) return globalCache;
  const data = await query<{ Page: { media: { id: number; title: { romaji: string; english: string | null } }[] } }>(
    `{ Page(perPage: 50) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { id title { romaji english } } } }`
  );
  globalCache = {
    at: Date.now(),
    ids: data.Page.media.map((m) => m.id),
    titles: data.Page.media.map((m) => m.title.english || m.title.romaji),
  };
  return globalCache;
}

export async function getAnimeTrends(id: number): Promise<AnimeTrends> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const [data, global] = await Promise.all([
    query<{ Media: any }>(
      `query ($id: Int) { Media(id: $id, type: ANIME) {
        trending popularity status hashtag
        nextAiringEpisode { episode timeUntilAiring }
        tags { name rank isMediaSpoiler }
        trends(sort: DATE_DESC, perPage: 8) { nodes { date trending popularity } }
      } }`,
      { id }
    ),
    getGlobalTrending().catch(() => null),
  ]);
  const m = data.Media;
  const nodes: { popularity: number | null }[] = m.trends?.nodes ?? [];
  const newest = nodes[0]?.popularity ?? null;
  const oldest = nodes[nodes.length - 1]?.popularity ?? null;
  const growth = newest && oldest && nodes.length > 1 ? Math.round(((newest - oldest) / oldest) * 1000) / 10 : null;
  const rankIdx = global ? global.ids.indexOf(id) : -1;
  const trendingScore: number = m.trending ?? 0;

  const momentum: AnimeTrends["momentum"] =
    rankIdx >= 0 && rankIdx < 10 ? "explosivo"
    : rankIdx >= 0 || (growth ?? 0) >= 1 || trendingScore >= 100 ? "en alza"
    : trendingScore > 5 ? "estable"
    : "en baja";

  const result: AnimeTrends = {
    trendingScore,
    popularity: m.popularity ?? 0,
    popularityGrowth7d: growth,
    globalTrendingRank: rankIdx >= 0 ? rankIdx + 1 : null,
    status: m.status ?? null,
    nextEpisode: m.nextAiringEpisode
      ? { episode: m.nextAiringEpisode.episode, airsInHours: Math.round(m.nextAiringEpisode.timeUntilAiring / 3600) }
      : null,
    officialHashtag: m.hashtag ? String(m.hashtag).split(/\s+/)[0] : null,
    topTags: (m.tags ?? [])
      .filter((t: { isMediaSpoiler: boolean; rank: number }) => !t.isMediaSpoiler && t.rank >= 60)
      .slice(0, 8)
      .map((t: { name: string }) => t.name),
    trendingNow: (global?.titles ?? []).filter((_, i) => global!.ids[i] !== id).slice(0, 8),
    momentum,
  };
  cache.set(id, { at: Date.now(), data: result });
  return result;
}

export function trendsToPrompt(t: AnimeTrends): string {
  const lines = [
    `Momentum actual: ${t.momentum}${t.globalTrendingRank ? ` (puesto #${t.globalTrendingRank} en tendencias globales de AniList)` : ""}.`,
    t.popularityGrowth7d !== null ? `Crecimiento de popularidad últimos 7 días: ${t.popularityGrowth7d}%.` : "",
    t.nextEpisode ? `Está en emisión: el episodio ${t.nextEpisode.episode} sale en ~${t.nextEpisode.airsInHours} horas.` : t.status === "FINISHED" ? "La serie ya terminó de emitirse." : "",
    t.officialHashtag ? `Hashtag oficial: ${t.officialHashtag}.` : "",
    t.topTags.length ? `Temas/etiquetas más asociados (palabras clave SEO): ${t.topTags.join(", ")}.` : "",
    t.trendingNow.length ? `Otros animes en tendencia ahora: ${t.trendingNow.join(", ")}.` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
