import { useEffect, useMemo, useState } from "react";
import { RiRefreshLine, RiSearchLine } from "react-icons/ri";
import { getNews } from "../api";
import type { NewsItem } from "../types";
import PageHeader from "../components/PageHeader";
import NewsCard, { timeAgo } from "../components/NewsCard";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

type Lang = "es" | "en" | "all";
const LANGS: [Lang, string][] = [["es", "Español"], ["en", "Inglés"], ["all", "Todo"]];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function savedLang(): Lang {
  try { const v = localStorage.getItem("news-lang"); return v === "en" || v === "all" ? v : "es"; } catch { return "es"; }
}

export default function News() {
  const [lang, setLang] = useState<Lang>(savedLang);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [meta, setMeta] = useState<{ updatedAt: string; failed: string[] } | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(l: Lang) {
    setLoading(true); setError("");
    try {
      const d = await getNews(l, undefined, 120);
      setItems(d.results); setMeta({ updatedAt: d.updatedAt, failed: d.failedSources });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las noticias."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load(lang);
    try { localStorage.setItem("news-lang", lang); } catch { /* sin almacenamiento */ }
  }, [lang]);

  const filtered = useMemo(() => {
    const k = norm(q.trim());
    return k ? items.filter((n) => norm(`${n.title} ${n.summary}`).includes(k)) : items;
  }, [items, q]);

  const [first, ...rest] = filtered;

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader eyebrow="NOTICIAS ANIME" title="Lo último del" highlight="anime" subtitle="Crunchyroll, Ramen Para Dos, Anime News Network y MyAnimeList." />

      <BlurFade delay={0.05} className="grid gap-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line-strong bg-panel p-1">
          {LANGS.map(([v, l]) => (
            <button key={v} onClick={() => setLang(v)} className={cn("h-10 rounded-lg text-sm font-medium transition", lang === v ? "bg-[#30234d] text-violet-soft" : "text-[#9da6b8]")}>{l}</button>
          ))}
        </div>
        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar: One Piece, temporada, película…" className="h-12 w-full rounded-xl border border-line-strong bg-panel pl-11 pr-4 text-white outline-none placeholder:text-subtle focus:border-violet" />
        </div>
        {meta && (
          <div className="flex items-center justify-between gap-2 text-xs text-subtle">
            <span>Actualizado {timeAgo(meta.updatedAt)} · {filtered.length} noticias{meta.failed.length ? ` · sin respuesta: ${meta.failed.join(", ")}` : ""}</span>
            <button onClick={() => load(lang)} disabled={loading} className="inline-flex items-center gap-1 font-medium text-violet-soft disabled:opacity-50"><RiRefreshLine className={cn(loading && "animate-spin")} /> Recargar</button>
          </div>
        )}
      </BlurFade>

      {error && <div className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{error}</div>}

      {loading && !items.length ? (
        <div className="grid gap-3">
          <div className="aspect-video animate-pulse rounded-2xl bg-panel" />
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-panel" />)}
        </div>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {first && <BlurFade className="lg:col-span-2"><NewsCard item={first} featured /></BlurFade>}
          {rest.map((n, i) => <BlurFade key={n.id} delay={0.02 * (i % 10)} inView><NewsCard item={n} /></BlurFade>)}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">No hay noticias que coincidan con “{q}”.</p>
      )}
    </div>
  );
}
