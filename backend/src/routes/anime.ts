import { Router } from "express";
import { z } from "zod";
import { getAnimeTrends } from "../trends.js";

const router = Router();
const ANILIST = "https://graphql.anilist.co";
async function queryAniList(query: string, variables: Record<string, unknown>) {
  const response = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const json = await response.json() as { data?: unknown; errors?: unknown[] };
  if (json.errors?.length) throw new Error("AniList no pudo completar la consulta.");
  return json.data;
}

const mediaFields = `
  id idMal title { romaji english native }
  description(asHtml: false) coverImage { extraLarge large }
  bannerImage genres averageScore popularity episodes season seasonYear
  format status startDate { year month day } studios(isMain: true) { nodes { name } }
`;
router.get("/search", async (req, res, next) => {
  const parsed = z.object({
    q: z.string().trim().min(1).max(100),
    page: z.coerce.number().int().min(1).max(100).default(1),
    genre: z.string().optional(),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros de búsqueda inválidos." });
  try {
    const data = await queryAniList(
      `query ($search: String, $page: Int, $genre: String) {
        Page(page: $page, perPage: 24) {
          pageInfo { currentPage hasNextPage total }
          media(search: $search, genre: $genre, type: ANIME, sort: SEARCH_MATCH) { ${mediaFields} }
        }
      }`,
      { search: parsed.data.q, page: parsed.data.page, genre: parsed.data.genre || null }
    ) as any;
    res.json({ pageInfo: data.Page.pageInfo, results: data.Page.media });
  } catch (error) { next(error); }
});
let trendingCache: { at: number; data: unknown } | null = null;
router.get("/trending", async (_req, res, next) => {
  try {
    if (!trendingCache || Date.now() - trendingCache.at > 30 * 60_000) {
      const data = await queryAniList(
        `{ Page(perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${mediaFields} trending } } }`, {}
      ) as any;
      trendingCache = { at: Date.now(), data: data.Page.media };
    }
    res.json({ results: trendingCache.data });
  } catch (error) { next(error); }
});
router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "ID inválido." });
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
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "ID inválido." });
  try { res.json(await getAnimeTrends(id)); } catch (error) { next(error); }
});
export default router;
