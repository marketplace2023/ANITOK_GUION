import { Router } from "express";
import { z } from "zod";
import { filterNews, getNews } from "../news.js";

const router = Router();

router.get("/", async (req, res, next) => {
  const parsed = z.object({
    lang: z.enum(["es", "en", "all"]).default("all"),
    q: z.string().trim().max(80).optional(),
    limit: z.coerce.number().int().min(1).max(120).default(60),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Parámetros inválidos." });
  try {
    const news = await getNews();
    const results = filterNews(news.items, parsed.data.lang, parsed.data.q).slice(0, parsed.data.limit);
    res.json({ results, updatedAt: new Date(news.at).toISOString(), failedSources: news.failed });
  } catch (error) { next(error); }
});

export default router;
