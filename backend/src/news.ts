import { XMLParser } from "fast-xml-parser";

// Noticias de anime gratuitas vía RSS público (sin claves). Se leen en paralelo,
// se normalizan y se guardan en caché 20 minutos. Si una fuente falla, el resto sigue.

export type NewsItem = {
  id: string; title: string; summary: string; link: string; image: string | null;
  date: string; source: string; lang: "es" | "en";
};

const SOURCES: { name: string; url: string; lang: "es" | "en" }[] = [
  { name: "Crunchyroll Noticias", url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/es-419/rss", lang: "es" },
  { name: "Ramen Para Dos", url: "https://ramenparados.com/feed/", lang: "es" },
  { name: "Anime News Network", url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=w", lang: "en" },
  { name: "MyAnimeList", url: "https://myanimelist.net/rss/news.xml", lang: "en" },
];

const CACHE_MS = 20 * 60_000;
type NewsCache = { at: number; items: NewsItem[]; failed: string[] };
let cache: NewsCache | null = null;
let inflight: Promise<NewsCache> | null = null;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
function decode(s: string): string {
  // Dos pasadas: algunos feeds vienen con entidades doblemente escapadas (&amp;#039;)
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
  }
  return out;
}
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return text((v as Record<string, unknown>)["#text"]);
  return decode(String(v)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};
const firstImg = (html: unknown) => String(html ?? "").match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;

function normalize(raw: Record<string, unknown>, src: (typeof SOURCES)[number]): NewsItem | null {
  const title = text(raw.title);
  const link = text(raw.link) || text(raw.guid);
  if (!title || !link.startsWith("http")) return null;
  const thumb = raw["media:thumbnail"] ?? raw["media:content"] ?? raw.enclosure;
  const thumbUrl = (Array.isArray(thumb) ? thumb[0] : thumb) as Record<string, string> | undefined;
  const image = thumbUrl?.["@url"] ?? firstImg(raw["content:encoded"]) ?? firstImg(raw.description);
  const summary = text(raw.description) || text(raw["content:encoded"]);
  const date = new Date(text(raw.pubDate) || Date.now());
  return {
    id: Buffer.from(link).toString("base64url").slice(-24),
    title, link, image: image && image.startsWith("http") ? image : null,
    summary: summary.length > 280 ? `${summary.slice(0, 277).trimEnd()}…` : summary,
    date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    source: src.name, lang: src.lang,
  };
}

async function fetchSource(src: (typeof SOURCES)[number]): Promise<NewsItem[]> {
  const res = await fetch(src.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AnimeTokAI/1.0; RSS reader)", Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status}`);
  const xml = parser.parse(await res.text());
  const items = [].concat(xml?.rss?.channel?.item ?? []) as Record<string, unknown>[];
  return items.map((it) => normalize(it, src)).filter((x): x is NewsItem => x !== null);
}

export async function getNews(): Promise<NewsCache> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  inflight ??= (async (): Promise<NewsCache> => {
    const results = await Promise.allSettled(SOURCES.map(fetchSource));
    const items: NewsItem[] = [];
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") items.push(...r.value);
      else { failed.push(SOURCES[i].name); console.warn("Noticias:", r.reason?.message ?? r.reason); }
    });
    items.sort((a, b) => b.date.localeCompare(a.date));
    // Si todo falló, conservamos la caché anterior en vez de quedarnos sin nada
    if (!items.length && cache) return cache;
    cache = { at: Date.now(), items, failed };
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Noticias que mencionan alguno de los títulos del anime (romaji, inglés, sinónimos, o la parte antes de ":")
export function filterByTitles(items: NewsItem[], titles: (string | null | undefined)[]): NewsItem[] {
  const keys = new Set<string>();
  for (const t of titles) {
    if (!t) continue;
    for (const variant of [t, t.split(/[:：\-–]/)[0]]) {
      const k = norm(variant);
      if (k.length >= 5) keys.add(k);
    }
  }
  if (!keys.size) return [];
  return items.filter((n) => {
    const hay = ` ${norm(`${n.title} ${n.summary}`)} `;
    for (const k of keys) if (hay.includes(` ${k} `)) return true;
    return false;
  });
}

export function filterNews(items: NewsItem[], lang: string, q?: string) {
  let out = lang === "es" || lang === "en" ? items.filter((n) => n.lang === lang) : items;
  if (q) {
    const k = norm(q);
    if (k) out = out.filter((n) => norm(`${n.title} ${n.summary}`).includes(k));
  }
  return out;
}
