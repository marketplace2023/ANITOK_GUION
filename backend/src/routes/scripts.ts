import { Router } from "express";
import { z } from "zod";
import { generateJson, providerStatus } from "../ai.js";
import { getAnimeTrends, trendsToPrompt } from "../trends.js";
import { getAnimeTitles } from "../anilist.js";
import { filterByTitles, getNews } from "../news.js";

const router = Router();

// Descripciones que recibe el modelo para cada opción del formulario.
// TIPO DE CONTENIDO = QUÉ se cuenta (tema y estructura). No dice nada del tono.
const CONTENT_TYPES = {
  general: "presentación del anime: el ángulo más atractivo para alguien que no lo conoce",
  story: "resumen de la historia y la premisa",
  recommendation: "recomendación: 'si te gustó X, mira esto' y por qué engancha",
  review: "reseña rápida: ¿vale la pena verlo? puntos fuertes y débiles",
  watch_order: "guía para empezar: por dónde empezar, orden y qué esperar",
  underrated: "por qué este anime está infravalorado",
  series_analysis: "análisis de la serie: temas centrales, mensaje, cómo construye a sus personajes, dirección y qué la hace especial",
  analysis: "análisis de personaje: quién es, motivaciones, heridas, contradicciones, evolución y por qué conecta con el público",
  relationship: "análisis de una relación entre personajes (amistad, rivalidad, familia, pareja): cómo nace, cómo cambia y qué significa",
  villain: "análisis del antagonista: qué quiere, por qué hace lo que hace y qué lo convierte en un buen villano",
  life_lessons: "lecciones de vida y reflexiones que deja el anime o un personaje, conectadas con la vida real del espectador",
  lore: "lore y worldbuilding: reglas del mundo, sistema de poder, historia",
  theory: "teoría de fans, presentada claramente como teoría",
  hidden_details: "detalles ocultos, simbolismo y easter eggs",
  ending_explained: "final explicado e interpretación",
  ranking: "TOP en cuenta atrás (del último puesto al número 1), cada puesto con su motivo",
  top_moments: "los mejores momentos y escenas del anime",
  emotional: "los momentos más emotivos o tristes del anime y por qué duelen",
  versus: "versus: ¿quién ganaría? argumentando cada lado",
  comparison: "comparación con otro anime o entre personajes",
  curiosities: "curiosidades y anécdotas: datos poco conocidos de la obra, su autor, la producción, el doblaje o la recepción (solo datos verificables; si no estás seguro, no lo incluyas)",
  news: "novedades y actualidad: qué se ha anunciado y por qué importa",
  episode_reaction: "reacción al último episodio en emisión",
} as const;

// TONO = CÓMO se cuenta (actitud, emoción, ritmo y vocabulario). No cambia el tema.
const TONES = {
  // Cálidos y humanos
  warm: "cálido y humano: empático, cercano y sincero; habla de las emociones de los personajes como de personas reales, con frases suaves y comprensivas",
  conversational: "cercano, como hablando con un amigo: natural, coloquial y sin pose",
  cute: "tierno: dulce, delicado y adorable, con ternura en cada frase",
  nostalgic: "nostálgico: evoca recuerdos y el paso del tiempo, con añoranza serena",
  hopeful: "esperanzador: aunque hable de dolor, siempre deja una luz y un motivo para seguir",
  romantic: "romántico y soñador: sensible, con imágenes bonitas y emoción contenida",
  // Alegres y enérgicos
  cheerful: "alegre y positivo: optimista, luminoso, con entusiasmo amable y sonrisa en la voz",
  euphoric: "eufórico: emoción desbordada, como si no pudiera contenerse; muchas exclamaciones (¡…!), frases muy cortas, repeticiones enfáticas (\"¡es que no, es que NO!\"), palabras intensas (\"brutal\", \"increíble\", \"me explota la cabeza\") y ritmo explosivo",
  charismatic: "carismático: seguro, magnético y con encanto, frases con gancho y personalidad propia que atrapa al espectador",
  energetic: "enérgico y viral: ritmo rápido, frases cortas, cambios constantes que retienen",
  fan: "fan apasionado: entusiasmo otaku genuino, se nota que lo ama",
  epic: "épico, como voz de tráiler: grandilocuente, solemne y con crescendo",
  // Profundos y reflexivos
  philosophical: "filosófico: plantea preguntas existenciales (identidad, libertad, muerte, sentido, moral), conecta con ideas universales y deja al espectador pensando; ritmo pausado",
  calm: "sereno y reflexivo: pausado, tranquilo, invita a pensar sin prisa",
  melancholic: "melancólico: tristeza suave y contemplativa, belleza en lo que se pierde",
  emotional_deep: "emotivo y profundo: va al corazón, busca que el espectador sienta",
  poetic: "poético y lírico: metáforas, imágenes y ritmo casi musical",
  inspirational: "inspirador y motivacional: impulsa a actuar y superarse",
  // Fríos y serios
  cold: "frío y distante: analítico, impasible y cortante, como un informe; frases cortas y secas terminadas en punto, cero exclamaciones, cero emojis, cero adjetivos emotivos; juzga con calma clínica y sin admiración",
  documentary: "sobrio de documental: elegante, neutral y preciso",
  informative: "objetivo y neutral: claro, informativo, sin opinión ni exageración",
  solemn: "solemne y respetuoso: grave, pausado, con peso en cada palabra",
  critic: "crítico exigente: opinión honesta, argumentada y sin miedo a señalar defectos",
  teacher: "didáctico: explica fácil, como un buen profesor, con ejemplos claros",
  // Intensos y oscuros
  dramatic: "dramático y cinematográfico: tensión, pausas y frases con peso",
  mysterious: "misterioso y de suspense: dosifica la información, deja preguntas abiertas",
  creepy: "oscuro e inquietante: atmósfera tensa y escalofriante",
  controversial: "provocador y polémico: opiniones fuertes que invitan a debatir, sin desinformar",
  // Humor
  humorous: "humorístico: chistes y comparaciones graciosas",
  genz: "humor de memes y redes (Gen Z), con remates rápidos",
  sarcastic: "sarcástico e irónico",
  gossip: "chismoso, como contando un salseo",
} as const;

const TOP_SUBJECTS = {
  characters: "personajes", moments: "momentos", fights: "peleas", villains: "villanos", sad: "escenas tristes",
  couples: "parejas o relaciones", powers: "poderes o técnicas", openings: "openings y endings", quotes: "frases o reflexiones",
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
  // Personaje en el que centrar el guion (opcional) y configuración del top
  focusCharacter: z.string().trim().max(80).optional().default(""),
  topCount: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]).default(5),
  topSubject: z.enum(keys(TOP_SUBJECTS)).default("characters"),
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
  if (!Object.values(status).some(Boolean)) return res.status(503).json({ error: "La IA no está configurada. Añade GEMINI_API_KEY, NVIDIA_API_KEY, NVIDIA_GEMMA_API_KEY u OPENROUTER_API_KEY al backend." });

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
QUÉ CONTAR (tipo de contenido): ${CONTENT_TYPES[d.contentType]}.${d.contentType === "ranking" ? ` Es un TOP ${d.topCount} de ${TOP_SUBJECTS[d.topSubject]} de este anime: exactamente ${d.topCount} puestos, numerados en cuenta atrás. Cada puesto nombra un elemento CONCRETO (por su nombre: personaje, escena, técnica, canción…) con una razón específica; nada de puestos genéricos o anónimos, tampoco el número 1. Usa solo elementos que conozcas con seguridad de esta obra.` : ""}${d.focusCharacter ? `\nPERSONAJE CENTRAL: ${d.focusCharacter}. Todo el guion gira en torno a este personaje.` : d.contentType === "analysis" ? "\nPERSONAJE CENTRAL: elige al personaje más interesante de la lista para analizarlo." : ""}
CÓMO CONTARLO (tono): ${TONES[d.tone]}.
El tipo de contenido y el tono son independientes: el tono cambia la actitud, el vocabulario, el ritmo, la puntuación y la emoción de la voz, pero NO cambia el tema ni la estructura del tipo de contenido. El tono debe notarse con claridad desde la primera frase y mantenerse de principio a fin (hook, narración, voiceover y CTA): el mismo tema contado con otro tono tendría que sonar a otra persona. No lo suavices hacia un tono neutro.

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
