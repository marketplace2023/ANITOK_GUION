import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { getAnimeTitles, memo, queryAniList } from "../anilist.js";

// Buscador de escenas:
// - Sakugabooru: clips de animación por serie y por tipo de escena (no tiene etiquetas de personaje).
// - AniList: miniaturas reales de cada episodio y tráiler (para identificar escenas con trace.moe).
// - Vídeos de un personaje: Dailymotion (sin clave) o YouTube si hay YOUTUBE_API_KEY.
// trace.moe se llama directamente desde el navegador (admite CORS y así gasta la cuota de cada usuario).

const router = Router();
const SAKUGA = "https://www.sakugabooru.com";
const UA = "AnimeTokAI/1.0 (scene search)";

async function sakugaGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SAKUGA}${path}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Sakugabooru respondió ${res.status}`);
  return res.json() as Promise<T>;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
// "Black Clover 2nd Season" → "Black Clover"; "Frieren: Beyond Journey's End" → "Frieren"
const baseTitle = (t: string) => t
  .split(/[:：]/)[0]
  .replace(/\b(\d+(st|nd|rd|th)\s+season|season\s+\d+|part\s+\d+|cour\s+\d+|final\s+season|the\s+movie|movie)\b.*$/i, "")
  .trim();
const STOP = new Set(["no", "the", "to", "wa", "ga", "of", "season", "and", "ni", "de", "wo"]);

const tagCache = memo<string | null>(24 * 3_600_000);

// Encuentra la etiqueta de serie de Sakugabooru (tipo 3) que corresponde al anime de AniList
async function sakugaSeriesTag(animeId: number): Promise<string | null> {
  return tagCache(String(animeId), async () => {
    const titles = (await getAnimeTitles(animeId)).filter((t): t is string => Boolean(t));
    const slugs = [...new Set(titles.flatMap((t) => [slug(t), slug(baseTitle(t))]).filter((s) => s.length >= 3))];
    if (!slugs.length) return null;
    // Buscamos por la palabra más distintiva (la más larga que no sea una partícula)
    const keyword = slugs.flatMap((s) => s.split("_")).filter((w) => w.length >= 3 && !STOP.has(w)).sort((a, b) => b.length - a.length)[0];
    // Primero por el título completo (más preciso) y luego por la palabra clave: con palabras muy
    // comunes ("piece") Sakugabooru devuelve tantas etiquetas que la principal puede quedar fuera.
    const queries = [...new Set([...slugs.slice(0, 3), keyword].filter(Boolean))] as string[];
    const results = await Promise.allSettled(queries.map((q) => sakugaGet<{ name: string; type: number; count: number }[]>(`/tag.json?name=${encodeURIComponent(q)}&limit=100`)));
    const tags = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    let best: { name: string; score: number; count: number } | null = null;
    for (const t of tags) {
      if (t.type !== 3 || t.count < 1) continue;
      let score = 0;
      for (const s of slugs) {
        if (t.name === `${s}_series`) score = Math.max(score, 100);
        else if (t.name === s) score = Math.max(score, 90);
        else if (t.name.startsWith(`${s}_`)) score = Math.max(score, 60);
      }
      if (score && (!best || score > best.score || (score === best.score && t.count > best.count))) best = { name: t.name, score, count: t.count };
    }
    return best?.name ?? null;
  });
}

// Tipos de escena (etiquetas generales de Sakugabooru)
const SCENE_TAGS = ["fighting", "effects", "character_acting", "running", "crying", "explosions", "hair", "liquid", "dancing", "animals", "vehicle", "food"] as const;
const INTERESTING = new Set<string>([...SCENE_TAGS, "smoke", "fire", "lightning", "beams", "debris", "wind", "smears", "background_animation", "flying", "falling", "impact_frames"]);

const postsCache = memo<unknown>(10 * 60_000);

router.get("/sakuga", async (req, res, next) => {
  const parsed = z.object({
    animeId: z.coerce.number().int().positive(),
    type: z.enum(SCENE_TAGS).optional(),
    page: z.coerce.number().int().min(1).max(50).default(1),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros inválidos." });
  const { animeId, type, page } = parsed.data;
  try {
    const tag = await sakugaSeriesTag(animeId);
    if (!tag) return res.json({ tag: null, results: [], hasMore: false });
    const data = await postsCache(`${tag}|${type ?? ""}|${page}`, async () => {
      const q = [tag, "rating:safe", type].filter(Boolean).join(" ");
      const posts = await sakugaGet<{ id: number; tags: string; file_ext: string; file_url: string; preview_url: string; file_size: number; width: number; height: number }[]>(
        `/post.json?tags=${encodeURIComponent(q)}&limit=24&page=${page}`
      );
      return {
        hasMore: posts.length === 24,
        results: posts
          .filter((p) => p.file_ext === "mp4" || p.file_ext === "webm")
          .map((p) => ({
            id: p.id,
            video: p.file_url,
            preview: p.preview_url,
            sizeMB: Math.round((p.file_size / 1e6) * 10) / 10,
            vertical: p.height > p.width,
            tags: p.tags.split(" ").filter((t) => INTERESTING.has(t)).slice(0, 4),
            source: `${SAKUGA}/post/show/${p.id}`,
          })),
      };
    }) as { hasMore: boolean; results: unknown[] };
    res.json({ tag, ...data });
  } catch (error) { next(error); }
});

const episodesCache = memo<unknown>(6 * 3_600_000);

router.get("/episodes", async (req, res, next) => {
  const parsed = z.object({ animeId: z.coerce.number().int().positive() }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros inválidos." });
  try {
    const data = await episodesCache(String(parsed.data.animeId), async () => {
      const r = await queryAniList<{ Media: { streamingEpisodes: { title: string; thumbnail: string; url: string; site: string }[]; trailer: { id: string; site: string } | null } | null }>(
        `query ($id: Int) { Media(id: $id, type: ANIME) { streamingEpisodes { title thumbnail url site } trailer { id site } } }`,
        { id: parsed.data.animeId }
      );
      const m = r.Media;
      // AniList los devuelve a veces desordenados: ordenamos por el número de episodio del título
      const num = (t: string) => Number(t.match(/(?:episode|episodio|ep\.?)\s*(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
      return {
        trailer: m?.trailer?.site === "youtube" ? m.trailer.id : null,
        episodes: (m?.streamingEpisodes ?? []).filter((e) => e.thumbnail).sort((a, b) => num(a.title) - num(b.title)),
      };
    });
    res.json(data);
  } catch (error) { next(error); }
});

type SceneVideo = { id: string; title: string; channel: string; date: string; thumbnail: string | null; duration: number | null };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Vídeos que no son escenas del anime (figuras, cosplay, videojuegos, reacciones…)
const NOISE = /\b(figures?|figura|figurine|cosplay|clay|unboxing|review|reseña|reaction|reacci[oó]n|gameplay|game|juego|wii|ps[2-5]|drawing|draw|dibujo|speed ?paint|tutorial|toys?|merch|lego|fan ?art)\b/i;

async function searchYoutube(q: string): Promise<SceneVideo[]> {
  const params = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "moderate", maxResults: "12", q, key: config.YOUTUBE_API_KEY! });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(10_000) });
  const json = (await r.json()) as { error?: { message?: string }; items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string } } } }[] };
  if (!r.ok || json.error) throw new Error(`YouTube ${r.status}: ${json.error?.message ?? "error"}`);
  return (json.items ?? []).map((i) => ({
    id: i.id.videoId,
    title: i.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
    channel: i.snippet.channelTitle,
    date: i.snippet.publishedAt,
    thumbnail: i.snippet.thumbnails.high?.url ?? i.snippet.thumbnails.medium?.url ?? null,
    duration: null,
  }));
}

// Dailymotion: API pública oficial, sin clave ni tarjeta. Clips de menos de 10 minutos e incrustables.
async function searchDailymotion(q: string, mustMatch: string[]): Promise<SceneVideo[]> {
  const params = new URLSearchParams({
    search: q, sort: "relevance", limit: "40", shorter_than: "10", family_filter: "true",
    fields: "id,title,thumbnail_360_url,duration,owner.screenname,created_time,allow_embed",
  });
  const r = await fetch(`https://api.dailymotion.com/videos?${params}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
  const json = (await r.json()) as { error?: { message?: string }; list?: { id: string; title: string; thumbnail_360_url: string; duration: number; "owner.screenname": string; created_time: number; allow_embed: boolean }[] };
  if (!r.ok || json.error) throw new Error(`Dailymotion ${r.status}: ${json.error?.message ?? "error"}`);
  const words = mustMatch.flatMap((s) => norm(s).split(/[^a-z0-9]+/)).filter((w) => w.length >= 3 && !STOP.has(w));
  return (json.list ?? [])
    .filter((v) => v.allow_embed && !NOISE.test(v.title) && (!words.length || words.some((w) => norm(v.title).includes(w))))
    .slice(0, 12)
    .map((v) => ({
      id: v.id, title: v.title, channel: v["owner.screenname"], date: new Date(v.created_time * 1000).toISOString(),
      thumbnail: v.thumbnail_360_url ?? null, duration: v.duration,
    }));
}

const videoCache = memo<unknown>(6 * 3_600_000, 300);

// Escenas de un personaje (o del anime en general). YouTube si hay YOUTUBE_API_KEY; si no, o si
// YouTube falla (cuota agotada), Dailymotion, que no necesita clave.
router.get("/videos", async (req, res, next) => {
  const parsed = z.object({ anime: z.string().trim().min(1).max(150), character: z.string().trim().max(100).optional().default("") }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros inválidos." });
  const { anime, character } = parsed.data;
  const base = baseTitle(anime) || anime;
  try {
    const data = await videoCache(`${norm(base)}|${norm(character)}`, async () => {
      if (config.YOUTUBE_API_KEY) {
        try {
          // Cada búsqueda gasta 100 de las 10 000 unidades diarias gratuitas de YouTube (de ahí la caché)
          const results = await searchYoutube([character, base, character ? "escena" : "escenas épicas"].filter(Boolean).join(" "));
          if (results.length) return { provider: "youtube", results };
        } catch (error) { console.warn(String(error)); }
      }
      // El personaje (nombre o apellido) debe aparecer en el título; sin personaje, el anime.
      const results = await searchDailymotion([character, base, character ? "" : "scene"].filter(Boolean).join(" "), [character || base]);
      return { provider: "dailymotion", results };
    }) as { provider: string; results: SceneVideo[] };
    res.json({ ...data, playerId: data.provider === "dailymotion" ? config.DAILYMOTION_PLAYER_ID ?? null : null });
  } catch (error) { next(error); }
});

export default router;
