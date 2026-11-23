import { Router } from "express";
import { z } from "zod";
import { generateJson, providerStatus } from "../ai.js";
import { getAnimeTrends, trendsToPrompt } from "../trends.js";
import { getAnimeTitles } from "../anilist.js";
import { filterByTitles, getNews } from "../news.js";

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
  news: "novedades y actualidad: qué se ha anunciado y por qué importa",
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
  hype: "hype total de estreno, con cuenta atrás y emoción",
  fan: "fan apasionado, puro hype otaku",
  epic: "épico, como voz de tráiler",
  dramatic: "dramático y cinematográfico",
  emotional_deep: "emotivo y profundo, que haga sentir",
  romantic: "romántico y soñador",
  cute: "tierno y kawaii, dulce y adorable",
  nostalgic: "nostálgico",
  inspirational: "inspirador y motivacional",
  humorous: "humorístico",
  genz: "humor de memes y redes (Gen Z), con remates rápidos",
  sarcastic: "sarcástico e irónico",
  gossip: "chismoso, como contando un salseo",
  mysterious: "misterioso y de suspense, dosificando la información",
  creepy: "oscuro y escalofriante, atmósfera inquietante",
  informative: "informativo y analítico",
  teacher: "didáctico, como un profe que lo explica fácil",
  documentary: "narrador de documental, sobrio y elegante",
  critic: "crítico exigente, opinión honesta y argumentada",
  poetic: "poético y lírico",
  gamer: "gamer / streamer, como comentando una partida",
  conversational: "cercano, como hablando con un amigo",
  calm: "relajado y reflexivo",
  controversial: "polémico pero sin desinformar",
} as const;

const NARRATOR_GENDER = {
  female: "VOZ FEMENINA: el guion lo narra una chica/mujer. Usa concordancia femenina cuando hable de sí misma (\"estoy obsesionada\", \"me quedé impactada\", \"soy fan\") y una forma de expresarse natural en una creadora de contenido.",
  male: "VOZ MASCULINA: el guion lo narra un chico/hombre. Usa concordancia masculina cuando hable de sí mismo (\"estoy obsesionado\", \"me quedé impactado\").",
  neutral: "VOZ NEUTRA: evita marcar el género del narrador al hablar de sí mismo (usa construcciones neutras: \"me voló la cabeza\" en vez de \"estoy impactado/a\").",
} as const;

const NARRATOR_AGE = {
  young: "EDAD JOVEN (18-24): energía alta, frases cortas, expresiones actuales de redes con naturalidad (sin abusar del slang ni sonar forzado).",
  adult: "EDAD ADULTA (25-35): natural, segura y cercana, vocabulario estándar, ritmo dinámico pero sin exagerar.",
  mature: "EDAD MADURA (35+): pausada y reflexiva, vocabulario cuidado, transmite experiencia y criterio; nada de slang juvenil.",
} as const;

const DIALECTS = {
  latam: "español latino neutro: usa \"ustedes\", evita regionalismos marcados.",
  mexico: "español de México: \"ustedes\" y expresiones mexicanas naturales (\"qué onda\", \"neta\", \"está padrísimo\") con moderación.",
  spain: "español de España: \"vosotros\" y expresiones peninsulares (\"flipar\", \"tío/tía\", \"mola\") con moderación.",
  argentina: "español rioplatense: voseo (\"vos\", \"mirá\", \"tenés\") y expresiones como \"che\" con moderación.",
  colombia: "español de Colombia: \"ustedes\" y expresiones como \"parce\", \"bacano\" con moderación.",
  chile: "español de Chile: expresiones como \"cachai\", \"bacán\" con moderación.",
  peru: "español de Perú: expresiones como \"causa\", \"chévere\" con moderación.",
} as const;

const AUDIENCES = {
  general: "público general de TikTok.",
  girls: "público principalmente femenino: ganchos, referencias y emociones que conecten con chicas (sin estereotipos).",
  boys: "público principalmente masculino: ganchos de acción, competencia y épica (sin estereotipos).",
  otaku: "otakus veteranos: puedes usar jerga del anime (seiyuu, filler, OVA, mangaka) y referencias profundas.",
  newbies: "principiantes en el anime: explica sin jerga e invita a empezar a verlo.",
} as const;

const NARRATIVE_STYLES = {
  narrator: "narrador en tercera persona que cuenta la historia.",
  first_person: "primera persona: como fan contando su propia experiencia (\"cuando vi esta escena…\").",
  pov: "POV en segunda persona (\"POV: eres…\", \"imagina que…\"), metiendo al espectador en la escena.",
  direct: "hablando directo a cámara al espectador, con preguntas que inviten a comentar.",
  list: "lista rápida numerada, con transiciones claras entre puntos.",
  story_twist: "mini-historia con un giro o revelación al final.",
  dialogue: "diálogo entre dos voces; márcalas en la narración como \"Voz A:\" y \"Voz B:\".",
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
  narratorGender: z.enum(keys(NARRATOR_GENDER)).default("neutral"),
  narratorAge: z.enum(keys(NARRATOR_AGE)).default("adult"),
  dialect: z.enum(keys(DIALECTS)).default("latam"),
  audience: z.enum(keys(AUDIENCES)).default("general"),
  narrativeStyle: z.enum(keys(NARRATIVE_STYLES)).default("narrator"),
  spoilerLevel: z.enum(["none", "light", "full"]),
  language: z.enum(["es", "en"]).default("es"),
  extraInstructions: z.string().max(500).optional().default(""),
  // Noticia elegida en la pestaña Noticias para usarla como tema del guion
  newsContext: z.object({
    title: z.string().max(300),
    summary: z.string().max(1000).optional().default(""),
    source: z.string().max(80).optional().default(""),
    date: z.string().max(40).optional().default(""),
  }).optional(),
});

const within = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]).catch(() => null);

router.post("/generate", async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa los datos del guion.", details: parsed.error.flatten() });
  const status = providerStatus();
  if (!status.gemini && !status.openrouter) return res.status(503).json({ error: "La IA no está configurada. Añade GEMINI_API_KEY u OPENROUTER_API_KEY al backend." });

  try {
    const d = parsed.data;
    const wantsNews = d.contentType === "news" || d.contentType === "episode_reaction";
    // Tendencias y noticias en paralelo, con tope de 6 s: el resto del presupuesto (60 s en Netlify) es para la IA.
    const [trends, relatedNews] = await Promise.all([
      within(getAnimeTrends(d.anime.id), 6000),
      wantsNews
        ? within(Promise.all([getAnimeTitles(d.anime.id), getNews()]).then(([titles, news]) => filterByTitles(news.items, titles).slice(0, 4)), 6000)
        : Promise.resolve(null),
    ]);

    const words = Math.round(d.targetChars / 6);
    const seconds = Math.round(d.targetChars / 15);
    const sceneCount = Math.max(2, Math.round(d.targetChars / 200));
    const isEs = d.language === "es";
    const newsBlock = d.newsContext
      ? `NOTICIA BASE (es el tema principal del vídeo; cuéntala con tus palabras sin añadir datos que no aparezcan aquí):
- ${d.newsContext.title}${d.newsContext.date ? ` (${d.newsContext.date.slice(0, 10)})` : ""}${d.newsContext.source ? ` · ${d.newsContext.source}` : ""}
  ${d.newsContext.summary}`
      : relatedNews?.length
        ? `NOTICIAS RECIENTES REALES SOBRE ESTE ANIME (úsalas como base de la actualidad; no inventes nada más):
${relatedNews.map((n) => `- ${n.title} (${n.date.slice(0, 10)}, ${n.source})${n.summary ? `: ${n.summary.slice(0, 200)}` : ""}`).join("\n")}`
        : wantsNews ? "No hay noticias recientes verificadas sobre este anime: habla de la actualidad en términos generales, sin inventar anuncios ni fechas." : "";

    const prompt = `Eres guionista y estratega de vídeos verticales cortos y experto en SEO de TikTok. Crea un guion original para TikTok sobre el anime indicado.
Devuelve EXCLUSIVAMENTE JSON válido con estas claves:
title, hook, narration, scenes (array de ${sceneCount} objetos {time, visual, voiceover, onScreenText}), cta, caption, hashtags (array), seoKeywords (array), postingTip (string).
Idioma: ${isEs ? `español. Variante: ${DIALECTS[d.dialect]}` : "English"}.
Anime: ${d.anime.title}. Géneros: ${d.anime.genres.join(", ")}.
Descripción de referencia: ${d.anime.description.slice(0, 3500)}
Personajes conocidos: ${d.anime.characters.join(", ")}.
Formato: ${CONTENT_TYPES[d.contentType]}.
Tono: ${TONES[d.tone]}.

VOZ Y PERSONA (respétalo en hook, narración, voiceover y CTA):
- ${NARRATOR_GENDER[d.narratorGender]}
- ${NARRATOR_AGE[d.narratorAge]}
- Estilo de narración: ${NARRATIVE_STYLES[d.narrativeStyle]}
- Público objetivo: ${AUDIENCES[d.audience]}

LONGITUD: el campo "narration" debe tener aproximadamente ${d.targetChars} caracteres contando espacios (unas ${words} palabras, ~${seconds} segundos de locución). Ni mucho más corto ni más largo.
Spoilers: ${d.spoilerLevel}. ${d.spoilerLevel === "none" ? "No reveles giros, muertes ni acontecimientos argumentales importantes." : ""}

DATOS DE TENDENCIA REALES (AniList, actualizados):
${trends ? trendsToPrompt(trends) : "No disponibles."}
Usa estos datos para elegir el ángulo más viral: si está en alza o en emisión, apóyate en la actualidad; si está en baja, véndelo como joya o clásico. No recites cifras de AniList en la narración salvo que aporten.
${newsBlock ? `\n${newsBlock}\n` : ""}
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
    res.json({ script, provider, model, stats, trends, newsUsed: d.newsContext ? 1 : relatedNews?.length ?? 0 });
  } catch (error) {
    console.error("AI generation failed:", error);
    res.status(502).json({ error: "No se pudo generar el guion. Inténtalo de nuevo." });
  }
});

export default router;
