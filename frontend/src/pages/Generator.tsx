import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  RiArrowDownLine, RiArrowUpLine, RiCalendarEventLine, RiCheckLine, RiCompass3Line, RiDownload2Line, RiExternalLinkLine,
  RiFileCopyLine, RiFireFill, RiHashtag, RiLineChartLine, RiMagicLine, RiSearchLine, RiShareForwardLine, RiSparkling2Fill,
} from "react-icons/ri";
import { generateScript, getAnimeTrends } from "../api";
import type { Anime, AnimeTrends, GenerateResponse } from "../types";
import PageHeader from "../components/PageHeader";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { cn } from "@/lib/utils";

const typeGroups: [string, [string, string][]][] = [
  ["Descubrir", [["general", "Ideas generales"], ["recommendation", "Recomendaciones (si te gustó X…)"], ["review", "Reseña rápida: ¿vale la pena?"], ["watch_order", "Guía para empezar"], ["underrated", "Joya infravalorada"], ["story", "Historias y resúmenes"]]],
  ["Profundizar", [["analysis", "Análisis de personajes"], ["lore", "Lore y worldbuilding"], ["theory", "Teorías"], ["hidden_details", "Detalles ocultos y easter eggs"], ["ending_explained", "Final explicado"], ["curiosities", "Curiosidades"]]],
  ["Entretener", [["ranking", "Rankings y tops"], ["top_moments", "Mejores momentos"], ["versus", "Versus: ¿quién ganaría?"], ["comparison", "Comparaciones"], ["emotional", "Historias emotivas"]]],
  ["Actualidad", [["news", "Novedades"], ["episode_reaction", "Reacción al último episodio"]]],
];
const tones = [["energetic", "Enérgico y viral"], ["dramatic", "Dramático y cinematográfico"], ["epic", "Épico (voz de tráiler)"], ["mysterious", "Misterioso y de suspense"], ["informative", "Informativo y analítico"], ["conversational", "Cercano, como con un amigo"], ["fan", "Fan apasionado (hype otaku)"], ["humorous", "Humorístico"], ["sarcastic", "Sarcástico e irónico"], ["nostalgic", "Nostálgico"], ["inspirational", "Inspirador y motivacional"], ["calm", "Relajado y reflexivo"], ["controversial", "Polémico (sin desinformar)"]];
const lengths = [300, 600, 900, 1200, 1500];
const spoilerOptions = [["none", "Sin spoilers"], ["light", "Leves"], ["full", "Completos"]];
const CREATIVE_CENTER = "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/es";
const momentumStyle: Record<AnimeTrends["momentum"], string> = {
  "explosivo": "bg-[#3b1d1d] text-[#ffad8a]",
  "en alza": "bg-[#18302a] text-[#8ce5bf]",
  "estable": "bg-[#1d2436] text-[#a9b5cf]",
  "en baja": "bg-[#2a2233] text-[#b7a5c9]",
};

const tag = (h: string) => (h.startsWith("#") ? h : `#${h}`);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-[11px] font-bold tracking-[0.14em] text-[#a3acc0]">{label}</label>
        {hint && <span className="text-[11px] text-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const selectCls = "h-12 w-full rounded-xl border border-line-strong bg-ink/60 pl-4 pr-10 text-white outline-none transition focus:border-violet";

function TrendPanel({ trends }: { trends: AnimeTrends }) {
  const next = trends.nextEpisode;
  return (
    <div className="mt-3 rounded-2xl border border-line bg-ink/50 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold tracking-wide", momentumStyle[trends.momentum])}>
          {trends.momentum === "en baja" ? <RiArrowDownLine /> : trends.momentum === "explosivo" ? <RiFireFill /> : <RiLineChartLine />} {trends.momentum.toUpperCase()}
        </span>
        <span className="text-[11px] text-subtle">Tendencia AniList · alimenta el guion y el SEO</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Ranking">{trends.globalTrendingRank ? <>#<NumberTicker value={trends.globalTrendingRank} className="text-white" /></> : "—"}</Stat>
        <Stat label="Crecim. 7 días">
          {trends.popularityGrowth7d !== null ? (
            <span className={cn("inline-flex items-center", trends.popularityGrowth7d >= 0 ? "text-[#8ce5bf]" : "text-[#ffad8a]")}>
              {trends.popularityGrowth7d >= 0 ? <RiArrowUpLine className="size-4" /> : <RiArrowDownLine className="size-4" />}
              <NumberTicker value={Math.abs(trends.popularityGrowth7d)} decimalPlaces={1} className="text-inherit" />%
            </span>
          ) : "—"}
        </Stat>
        <Stat label={next ? `Episodio ${next.episode}` : "Emisión"}>
          {next ? (next.airsInHours < 48 ? `${next.airsInHours} h` : `${Math.round(next.airsInHours / 24)} d`) : trends.status === "FINISHED" ? "Fin" : "—"}
        </Stat>
      </div>
      {trends.topTags.length > 0 && (
        <div className="no-scrollbar -mx-3.5 mt-3 flex gap-1.5 overflow-x-auto px-3.5">
          {trends.topTags.map((t) => <span key={t} className="shrink-0 rounded-md bg-[#1f1a33] px-2 py-1 text-[11px] text-[#b9a3ff]">{t}</span>)}
        </div>
      )}
      <a href={CREATIVE_CENTER} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-soft">
        Ver hashtags en tendencia en TikTok Creative Center <RiExternalLinkLine />
      </a>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-panel-2 px-2.5 py-2">
      <b className="block truncate font-display text-base font-semibold text-white">{children}</b>
      <small className="mt-0.5 block truncate text-[10px] tracking-wide text-subtle">{label}</small>
    </div>
  );
}

function CopyButton({ text, label = "Copiar", id, copied, onCopy }: { text: string; label?: string; id: string; copied: string; onCopy: (id: string, text: string) => void }) {
  const done = copied === id;
  return (
    <button onClick={() => onCopy(id, text)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition", done ? "border-mint/40 text-[#8ce5bf]" : "border-line-strong text-muted active:bg-panel-2")}>
      {done ? <RiCheckLine /> : <RiFileCopyLine />} {done ? "Copiado" : label}
    </button>
  );
}

function Section({ n, title, action, children }: { n?: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-line py-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <small className="text-[11px] font-bold tracking-[0.14em] text-[#9c87e8]">{n && `${n} · `}{title}</small>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Generator() {
  const location = useLocation();
  const anime = (location.state as { anime?: Anime } | null)?.anime;
  const [type, setType] = useState("general");
  const [targetChars, setTargetChars] = useState(900);
  const [tone, setTone] = useState("energetic");
  const [spoilers, setSpoilers] = useState("none");
  const [extra, setExtra] = useState("");
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [trends, setTrends] = useState<AnimeTrends | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const result = response?.script ?? null;
  const title = anime ? anime.title.english || anime.title.romaji || "Anime" : "";

  useEffect(() => {
    setTrends(null);
    if (!anime) return;
    let alive = true;
    getAnimeTrends(anime.id).then((t) => alive && setTrends(t)).catch(() => {});
    return () => { alive = false; };
  }, [anime?.id]);

  async function create() {
    if (!anime) return;
    setBusy(true); setError(""); setResponse(null);
    // En móvil el resultado queda debajo del formulario: lo mostramos mientras se genera
    if (window.innerWidth < 1024) setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try {
      const d = await generateScript({
        anime: { id: anime.id, title, description: anime.description || "", genres: anime.genres || [], characters: anime.characters?.edges.map((e) => e.node.name.full) || [] },
        contentType: type, targetChars, tone, spoilerLevel: spoilers, language: "es", extraInstructions: extra,
      });
      setResponse(d);
      if (d.trends) setTrends(d.trends);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo generar el guion."); }
    finally { setBusy(false); }
  }

  async function copy(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied((c) => (c === id ? "" : c)), 1800); } catch { /* sin permiso de portapapeles */ }
  }

  const captionText = result ? [result.caption, (result.hashtags || []).map(tag).join(" ")].join("\n\n") : "";
  const fullText = result ? [
    result.title, "", `GANCHO: ${result.hook}`, "", result.narration, "", `CTA: ${result.cta}`, "", captionText,
    ...(result.seoKeywords?.length ? ["", `PALABRAS CLAVE SEO: ${result.seoKeywords.join(", ")}`] : []),
    ...(result.postingTip ? ["", `CUÁNDO PUBLICAR: ${result.postingTip}`] : []),
  ].join("\n") : "";
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const share = () => navigator.share?.({ title: result?.title, text: fullText }).catch(() => {});
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([fullText], { type: "text/plain;charset=utf-8" }));
    a.download = "animetok-guion.txt"; a.click(); URL.revokeObjectURL(a.href);
  };
  const charDiff = response ? Math.round(((response.stats.narrationChars - response.stats.targetChars) / response.stats.targetChars) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="AI SCRIPT STUDIO" title="Generador de" highlight="guiones" subtitle="Configura tu vídeo y deja que la IA escriba el guion." />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Formulario */}
        <BlurFade delay={0.05}>
          <section className="grid grid-cols-1 gap-5 rounded-3xl border border-line bg-panel p-4 sm:p-6">
            <Field label="ANIME">
              {anime ? (
                <div>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#34304c] bg-[#19182a] p-2.5">
                    <img src={anime.coverImage?.large} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[15px]">{title}</b>
                      <small className="mt-0.5 block truncate text-xs text-muted">{anime.genres?.slice(0, 3).join(" · ")}</small>
                    </div>
                    <Link to="/catalog" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-violet-soft active:bg-violet-deep">Cambiar</Link>
                  </div>
                  {trends ? <TrendPanel trends={trends} /> : <div className="mt-3 h-36 animate-pulse rounded-2xl bg-ink/50" />}
                </div>
              ) : (
                <Link to="/catalog" className="flex items-center gap-3 rounded-2xl border border-dashed border-[#45405b] p-4 text-sm text-muted active:bg-panel-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-deep text-violet-soft"><RiCompass3Line className="size-5" /></span>
                  <span>Primero elige un anime en <b className="text-violet-soft">Explorar</b>.</span>
                </Link>
              )}
            </Field>

            <Field label="TIPO DE CONTENIDO">
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                {typeGroups.map(([g, opts]) => <optgroup label={g} key={g}>{opts.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</optgroup>)}
              </select>
            </Field>

            <Field label="LONGITUD DE LA NARRACIÓN" hint="caracteres · voz aprox.">
              <div className="grid grid-cols-5 gap-1.5">
                {lengths.map((n) => (
                  <button key={n} onClick={() => setTargetChars(n)} className={cn(
                    "flex h-14 flex-col items-center justify-center rounded-xl border transition active:scale-95",
                    targetChars === n ? "border-violet bg-[#30234d] text-violet-soft" : "border-line-strong bg-ink/60 text-[#9da6b8]"
                  )}>
                    <b className="font-display text-[15px] font-semibold">{n}</b>
                    <small className={cn("text-[10px]", targetChars === n ? "text-[#a993e8]" : "text-subtle")}>~{Math.round(n / 15)} s</small>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="TONO NARRATIVO">
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectCls}>
                {tones.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
              </select>
            </Field>

            <Field label="NIVEL DE SPOILERS">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-line-strong bg-ink/60 p-1">
                {spoilerOptions.map(([v, l]) => (
                  <button key={v} onClick={() => setSpoilers(v)} className={cn("h-10 rounded-lg text-sm font-medium transition", spoilers === v ? "bg-[#30234d] text-violet-soft" : "text-[#9da6b8]")}>{l}</button>
                ))}
              </div>
            </Field>

            <Field label="INSTRUCCIONES ADICIONALES" hint={`opcional · ${extra.length}/500`}>
              <textarea value={extra} maxLength={500} onChange={(e) => setExtra(e.target.value)} rows={3}
                placeholder="Ej. Empieza con una pregunta impactante y céntrate en el protagonista…"
                className="w-full resize-none rounded-xl border border-line-strong bg-ink/60 px-4 py-3 text-white outline-none placeholder:text-subtle focus:border-violet" />
            </Field>

            {error && <div className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{error}</div>}

            {/* En móvil el botón queda fijo sobre la barra de pestañas */}
            <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 -mx-1 lg:static lg:mx-0">
              <ShimmerButton
                onClick={create}
                disabled={busy || !anime}
                background="linear-gradient(100deg,#8b5cf6,#6247d6)"
                className="h-13 w-full gap-2 text-base font-semibold shadow-[0_10px_30px_-8px_#8b5cf6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RiSparkling2Fill className={cn("size-5", busy && "animate-spin")} /> {busy ? "Generando tu guion…" : "Generar guion con IA"}
              </ShimmerButton>
            </div>
          </section>
        </BlurFade>

        {/* Resultado */}
        <BlurFade delay={0.1}>
          <section ref={outputRef} className="relative scroll-mt-20 overflow-hidden rounded-3xl border border-line bg-panel p-4 sm:p-6">
            {busy && <BorderBeam size={120} duration={4} colorFrom="#8b5cf6" colorTo="#22d3ee" />}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold tracking-[0.2em] text-[#9c87e8]">RESULTADO</div>
                <h2 className="mt-1 font-display text-lg font-semibold">Tu guion</h2>
              </div>
              {result && (
                <div className="flex gap-1.5">
                  {canShare && <IconBtn label="Compartir" onClick={share}><RiShareForwardLine /></IconBtn>}
                  <IconBtn label={copied === "all" ? "Copiado" : "Copiar todo"} onClick={() => copy("all", fullText)}>{copied === "all" ? <RiCheckLine className="text-[#8ce5bf]" /> : <RiFileCopyLine />}</IconBtn>
                  <IconBtn label="Descargar .txt" onClick={download}><RiDownload2Line /></IconBtn>
                </div>
              )}
            </div>

            {busy ? (
              <div className="mt-5 grid grid-cols-1 gap-3">
                <p className="text-sm text-muted">Analizando tendencias y escribiendo… puede tardar unos 20 segundos.</p>
                {[80, 100, 95, 70, 100, 60].map((w, i) => <div key={i} className="h-3.5 animate-pulse rounded bg-panel-2" style={{ width: `${w}%` }} />)}
              </div>
            ) : result && response ? (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-deep px-2 py-1 text-[10px] font-bold tracking-wider text-violet-soft">
                  <RiSparkling2Fill /> {response.provider === "openrouter" ? "OPENROUTER" : "GEMINI"} · {response.model}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold leading-snug">{result.title}</h3>

                <Section n="01" title="HOOK" action={<CopyButton id="hook" text={result.hook} copied={copied} onCopy={copy} />}>
                  <p className="text-lg font-semibold leading-snug text-[#e4dcff]">{result.hook}</p>
                </Section>

                <Section n="02" title="NARRACIÓN" action={<CopyButton id="narration" text={result.narration} copied={copied} onCopy={copy} />}>
                  <span className={cn("mb-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium", Math.abs(charDiff) <= 15 ? "bg-[#18302a] text-[#8ce5bf]" : "bg-[#3a2a17] text-[#ffcf8a]")}>
                    {response.stats.narrationChars} / {response.stats.targetChars} caracteres{Math.abs(charDiff) > 15 ? ` (${charDiff > 0 ? "+" : ""}${charDiff}%)` : ""}
                  </span>
                  <TextGenerateEffect words={result.narration} staggerDelay={0.012} duration={0.4} className="text-[15px] leading-relaxed text-[#d5d9e6]" />
                </Section>

                {result.scenes?.length > 0 && (
                  <Section n="03" title="PLAN VISUAL">
                    <ol className="relative grid grid-cols-1 gap-4 border-l border-line-strong pl-4">
                      {result.scenes.map((s, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-violet ring-4 ring-panel" />
                          <b className="text-xs font-semibold text-violet-soft">{s.time}</b>
                          <p className="mt-0.5 text-sm font-semibold">{s.visual}</p>
                          <p className="mt-1 text-sm leading-relaxed text-[#aeb6c8]">{s.voiceover}</p>
                          <small className="mt-1.5 inline-block rounded-md bg-panel-2 px-2 py-1 text-[11px] text-muted">EN PANTALLA: {s.onScreenText}</small>
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

                <Section n="04" title="CTA"><p className="text-[15px] text-[#d5d9e6]">{result.cta}</p></Section>

                <Section title="CAPTION + HASHTAGS" action={<CopyButton id="caption" text={captionText} label="Copiar para TikTok" copied={copied} onCopy={copy} />}>
                  <p className="text-[15px] text-[#d5d9e6]">{result.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.hashtags?.map((h) => <span key={h} className="inline-flex items-center rounded-lg border border-[#4b3d68] bg-violet-deep px-2.5 py-1 text-[13px] text-[#c9b8ff]"><RiHashtag className="size-3" />{tag(h).slice(1)}</span>)}
                  </div>
                </Section>

                {result.seoKeywords && result.seoKeywords.length > 0 && (
                  <Section n="05" title="SEO · BÚSQUEDAS EN TIKTOK">
                    <div className="flex flex-wrap gap-1.5">
                      {result.seoKeywords.map((k) => <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-[#3a3159] bg-[#221c38] px-3 py-1.5 text-[13px] text-violet-soft"><RiSearchLine className="size-3.5" /> {k}</span>)}
                    </div>
                  </Section>
                )}

                {result.postingTip && (
                  <Section n="06" title="CUÁNDO PUBLICAR">
                    <p className="flex gap-2.5 text-[15px] leading-relaxed text-[#d5d9e6]"><RiCalendarEventLine className="mt-0.5 size-5 shrink-0 text-violet-soft" />{result.postingTip}</p>
                  </Section>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-violet/30 to-cyan/10 text-violet-soft shadow-[0_0_50px_-10px_#8b5cf6]"><RiMagicLine className="size-7" /></span>
                <h3 className="mt-5 font-display text-lg font-semibold">Tu próxima gran idea está a un toque.</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">Recibirás hook, narración, plan visual, CTA, hashtags, palabras clave SEO y el mejor momento para publicar.</p>
              </div>
            )}
          </section>
        </BlurFade>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid size-10 place-items-center rounded-xl border border-line-strong bg-ink/60 text-lg text-[#c6cbd8] transition active:scale-95 active:bg-panel-2">
      {children}
    </button>
  );
}
