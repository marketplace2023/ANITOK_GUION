import { Router } from "express";
import { z } from "zod";
import { generateJson, providerStatus } from "../ai.js";
import { getAnimeTrends, trendsToPrompt } from "../trends.js";

const router = Router();

// Descripciones que recibe el modelo para cada opción del formulario.
const CONTENT_TYPES = {
  general: "ideas generales: el ángulo más atractivo del anime para alguien que no lo conoce",
  curiosities: "curiosidades poco conocidas (sin inventar datos)",
  story: "historia y resumen de la premisa",
  ranking: "ranking o top (ej. top personajes, top momentos), con cuenta atrás",
  theory: "teoría de fans, presentada claramente como teoría",
  analysis: "análisis de personaje: motivaciones, evolución y por qué conecta",
  comparison: "comparación con otro anime o entre personajes",
  emotional: "historia emotiva centrada en sentimientos y momentos que tocan",
  news: "novedades y actualidad (emisión, temporada, popularidad actual)",
  top_moments: "mejores momentos y escenas épicas",
  recommendation: "recomendación: 'si te gustó X, mira esto' y por qué engancha",
  lore: "lore y worldbuilding: reglas del mundo, sistema de poder, historia",
  ending_explained: "final explicado e interpretación",
  versus: "versus: ¿quién ganaría? argumentando cada lado",
  hidden_details: "detalles ocultos, simbolismo y easter eggs",
  review: "reseña rápida: ¿vale la pena verlo? pros y contras",
  watch_order: "guía para empezar: por dónde empezar y qué esperar",
  episode_reaction: "reacción al último episodio en emisión",
  underrated: "por qué este anime está infravalorado",
} as const;
const TONES = {
  energetic: "enérgico y viral, ritmo rápido",
  dramatic: "dramático y cinematográfico",
  informative: "informativo y analítico",
  humorous: "humorístico",
  controversial: "polémico pero sin desinformar",
  mysterious: "misterioso y de suspense, dosificando la información",
  epic: "épico, como voz de tráiler",
  nostalgic: "nostálgico",
  inspirational: "inspirador y motivacional",
  conversational: "cercano, como hablando con un amigo",
  sarcastic: "sarcástico e irónico",
  fan: "fan apasionado, puro hype otaku",
  calm: "relajado y reflexivo",
} as const;
const LENGTHS: readonly number[] = [300, 600, 900, 1200, 1500];

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const inputSchema = z.object({
  anime: z.object({
    id: z.number().int().positive(),
    title: z.string().min(1).max(180),
    description: z.string().max(5000).optional().default(""),
    genres: z.array(z.string().max(40)).max(20).default([]),
    characters: z.array(z.string().max(80)).max(12).default([]),
  }),
  contentType: z.enum(keys(CONTENT_TYPES)),
  targetChars: z.number().refine((n) => LENGTHS.includes(n), "Longitud no válida"),
  tone: z.enum(keys(TONES)),
  spoilerLevel: z.enum(["none", "light", "full"]),
  language: z.enum(["es", "en"]).default("es"),
  extraInstructions: z.string().max(500).optional().default(""),
});

router.post("/generate", async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa los datos del guion.", details: parsed.error.flatten() });
  const status = providerStatus();
  if (!status.gemini && !status.openrouter) return res.status(503).json({ error: "La IA no está configurada. Añade GEMINI_API_KEY u OPENROUTER_API_KEY al backend." });

  try {
    const d = parsed.data;
    // Máx. 6 s para tendencias: el resto del presupuesto (límite de 60 s en Netlify) es para la IA.
    const trends = await Promise.race([
      getAnimeTrends(d.anime.id),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]).catch((e) => { console.warn("Tendencias no disponibles:", e?.message); return null; });
    const words = Math.round(d.targetChars / 6);
    const seconds = Math.round(d.targetChars / 15);
    const sceneCount = Math.max(2, Math.round(d.targetChars / 200));
    const prompt = `Eres guionista y estratega de vídeos verticales cortos y experto en SEO de TikTok. Crea un guion original para TikTok sobre el anime indicado.
Devuelve EXCLUSIVAMENTE JSON válido con estas claves:
title, hook, narration, scenes (array de ${sceneCount} objetos {time, visual, voiceover, onScreenText}), cta, caption, hashtags (array), seoKeywords (array), postingTip (string).
Idioma: ${d.language === "es" ? "español natural" : "English"}.
Anime: ${d.anime.title}. Géneros: ${d.anime.genres.join(", ")}.
Descripción de referencia: ${d.anime.description.slice(0, 3500)}
Personajes conocidos: ${d.anime.characters.join(", ")}.
Formato: ${CONTENT_TYPES[d.contentType]}.
Tono: ${TONES[d.tone]}.
LONGITUD: el campo "narration" debe tener aproximadamente ${d.targetChars} caracteres contando espacios (unas ${words} palabras, ~${seconds} segundos de locución). Ni mucho más corto ni más largo.
Spoilers: ${d.spoilerLevel}. ${d.spoilerLevel === "none" ? "No reveles giros, muertes ni acontecimientos argumentales importantes." : ""}

DATOS DE TENDENCIA REALES (AniList, actualizados):
${trends ? trendsToPrompt(trends) : "No disponibles."}
Usa estos datos para elegir el ángulo más viral: si está en alza o en emisión, apóyate en la actualidad; si está en baja, véndelo como joya o clásico. No recites cifras de AniList en la narración salvo que aporten.

SEO:
- seoKeywords: 5 a 8 frases cortas que la gente escribiría en el buscador de TikTok para encontrar este vídeo (ej. "${d.anime.title} explicado"). Úsalas de forma natural en caption y en onScreenText.
- hashtags: 6 a 10 en total: 2-3 amplios de la comunidad (ej. #anime #animetok), 3-4 específicos del anime y sus personajes${trends?.officialHashtag ? ` (puedes añadir el oficial japonés ${trends.officialHashtag}, pero prioriza el nombre en alfabeto latino que usa la comunidad)` : ""}, y 1-2 ligados al formato o al momento (ej. episodio nuevo). Sin espacios.
- caption: máximo 150 caracteres, con la palabra clave principal al inicio.
- postingTip: un consejo breve de cuándo y cómo publicarlo según los datos de tendencia (ej. antes del próximo episodio).

No inventes datos específicos, episodios, citas ni declaraciones. Si la información no está en el contexto, formula la idea como opinión o pregunta, no como hecho. No reproduzcas diálogos protegidos. Crea un gancho potente en los primeros 2 segundos, narración oral natural, ritmo ágil, indicaciones visuales genéricas sin pedir clips protegidos y CTA final.
Instrucciones adicionales: ${d.extraInstructions || "Ninguna"}`;
    const { data, provider, model } = await generateJson(prompt);
    const script = data as { narration?: string };
    const stats = { narrationChars: script.narration?.length ?? 0, targetChars: d.targetChars };
    res.json({ script, provider, model, stats, trends });
  } catch (error) {
    console.error("AI generation failed:", error);
    res.status(502).json({ error: "No se pudo generar el guion. Inténtalo de nuevo." });
  }
});
export default router;
