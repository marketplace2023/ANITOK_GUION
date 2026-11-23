import { Router } from "express";
import { z } from "zod";
import { getAnimeTrends } from "../trends.js";
import { getAnimeTitles, memo, queryAniList } from "../anilist.js";
import { filterByTitles, getNews } from "../news.js";

const router = Router();

const mediaFields = `
  id idMal title { romaji english native }
  description(asHtml: false) coverImage { extraLarge large }
  bannerImage genres averageScore popularity episodes season seasonYear
  format status startDate { year month day } studios(isMain: true) { nodes { name } }
`;

const SORTS = ["TRENDING_DESC", "POPULARITY_DESC", "SCORE_DESC", "START_DATE_DESC", "SEARCH_MATCH"] as const;
const browseCache = memo<unknown>(10 * 60_000);

// Búsqueda y exploración: el texto es opcional, se puede filtrar solo por género, año, etc.
router.get("/search", async (req, res, next) => {
  const parsed = z.object({
    q: z.string().trim().max(100).optional().default(""),
    page: z.coerce.number().int().min(1).max(100).default(1),
    genre: z.string().trim().max(40).optional(),
    year: z.coerce.number().int().min(1940).max(2100).optional(),
    season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
    format: z.enum(["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"]).optional(),
    status: z.enum(["RELEASING", "FINISHED", "NOT_YET_RELEASED"]).optional(),
    sort: z.enum(SORTS).optional(),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros de búsqueda inválidos." });
  const f = parsed.data;
  const sort = f.sort ?? (f.q ? "SEARCH_MATCH" : "TRENDING_DESC");
  try {
    const data = await browseCache(JSON.stringify({ ...f, sort }), () => queryAniList(
      `query ($search: String, $page: Int, $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
        Page(page: $page, perPage: 24) {
          pageInfo { currentPage hasNextPage total }
          media(search: $search, genre: $genre, seasonYear: $year, season: $season, format: $format, status: $status, type: ANIME, isAdult: false, sort: $sort) { ${mediaFields} }
        }
      }`,
      // AniList devuelve vacío si un filtro va como null explícito: solo enviamos los que tienen valor
      Object.fromEntries(Object.entries({
        search: f.q || undefined, page: f.page, genre: f.genre || undefined, year: f.year, season: f.season,
        format: f.format, status: f.status, sort: [sort, "POPULARITY_DESC"],
      }).filter(([, v]) => v !== undefined))
    )) as any;
    res.json({ pageInfo: data.Page.pageInfo, results: data.Page.media });
  } catch (error) { next(error); }
});

const genresCache = memo<string[]>(24 * 3_600_000);
router.get("/genres", async (_req, res, next) => {
  try {
    const genres = await genresCache("all", async () => {
      const data = await queryAniList<{ GenreCollection: string[] }>(`{ GenreCollection }`);
      return data.GenreCollection.filter((g) => g !== "Hentai");
    });
    res.json({ genres });
  } catch (error) { next(error); }
});

let trendingCache: { at: number; data: unknown } | null = null;
router.get("/trending", async (_req, res, next) => {
  try {
    if (!trendingCache || Date.now() - trendingCache.at > 30 * 60_000) {
      const data = await queryAniList(
        `{ Page(perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${mediaFields} trending } } }`
      ) as any;
      trendingCache = { at: Date.now(), data: data.Page.media };
    }
    res.json({ results: trendingCache.data });
  } catch (error) { next(error); }
});

const validId = (v: string) => { const id = Number(v); return Number.isInteger(id) && id > 0 ? id : null; };

router.get("/:id", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });
  try {
    const data = await queryAniList(
      `query ($id: Int) { Media(id: $id, type: ANIME) { ${mediaFields}
        characters(sort: ROLE, perPage: 8) { edges { role node { name { full } image { large } } } }
      } }`, { id }
    ) as any;
    if (!data.Media) return res.status(404).json({ error: "Anime no encontrado." });
    res.json(data.Media);
  } catch (error) { next(error); }
});

router.get("/:id/trends", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });
  try { res.json(await getAnimeTrends(id)); } catch (error) { next(error); }
});

router.get("/:id/news", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido." });
  try {
    const [titles, news] = await Promise.all([getAnimeTitles(id), getNews()]);
    res.json({ results: filterByTitles(news.items, titles).slice(0, 12) });
  } catch (error) { next(error); }
});

export default router;
