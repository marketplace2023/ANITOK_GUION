import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RiArrowRightUpLine, RiCompass3Line, RiFireFill, RiHashtag, RiMagicLine, RiSparkling2Fill, RiTiktokFill } from "react-icons/ri";
import { getTrendingAnime } from "../api";
import type { Anime } from "../types";
import AnimeCard from "../components/AnimeCard";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Spotlight } from "@/components/ui/spotlight-new";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

const titleOf = (a: Anime) => a.title.english || a.title.romaji || "Anime";

export default function Dashboard() {
  const [trending, setTrending] = useState<Anime[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => { getTrendingAnime().then((d) => setTrending(d.results)).catch(() => setFailed(true)); }, []);

  return (
    <div className="grid grid-cols-1 gap-7 lg:gap-9">
      {/* Hero */}
      <BlurFade>
        <section className="relative overflow-hidden rounded-3xl border border-[#34304d] bg-linear-to-br from-[#1c1930] via-[#17172b] to-[#111a29] px-5 pb-6 pt-7 sm:px-8 sm:py-10">
          <Spotlight width={420} height={900} smallWidth={180} translateY={-260} duration={9} />
          <DotPattern className="[mask-image:radial-gradient(300px_circle_at_85%_10%,white,transparent)] text-violet/30" />
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center rounded-full border border-violet/30 bg-violet-deep/60 px-3 py-1">
              <AnimatedShinyText className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-soft">
                <RiSparkling2Fill className="size-3.5" /> GENERADOR DE GUIONES CON IA
              </AnimatedShinyText>
            </div>
            <h1 className="mt-4 font-display text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Del anime al <span className="text-gradient">viral</span>.<br />En segundos.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#a0a2b9] sm:text-base">
              Elige un anime, aprovecha lo que está en tendencia y obtén un guion con hook, narración, hashtags y SEO para TikTok.
            </p>
            <Link to="/generator" className="mt-6 inline-block w-full sm:w-auto">
              <ShimmerButton background="linear-gradient(100deg,#8b5cf6,#6247d6)" shimmerColor="#e9ddff" className="h-12 w-full gap-2 px-6 text-[15px] font-semibold sm:w-auto">
                <RiMagicLine className="size-5" /> Crear un guion <RiArrowRightUpLine className="size-4" />
              </ShimmerButton>
            </Link>
          </div>
        </section>
      </BlurFade>

      {/* Ticker de tendencias */}
      {trending.length > 0 && (
        <BlurFade delay={0.1}>
          <div className="relative -mx-4 sm:mx-0">
            <Marquee pauseOnHover className="[--duration:45s] [--gap:0.6rem] py-1">
              {trending.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted">
                  <RiHashtag className="size-3.5 text-violet-soft" /> {titleOf(a)}
                </span>
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-ink" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-ink" />
          </div>
        </BlurFade>
      )}

      {/* En tendencia */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] text-[#ffad8a]"><RiFireFill className="size-3.5" /> EN TENDENCIA AHORA</div>
            <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">Lo que se está viendo</h2>
          </div>
          <Link to="/catalog" className="flex shrink-0 items-center gap-1 text-sm font-medium text-violet-soft">Explorar <RiArrowRightUpLine /></Link>
        </div>
        {trending.length ? (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {trending.map((a, i) => (
              <BlurFade key={a.id} delay={0.04 * i} inView className="w-[40vw] max-w-44 shrink-0 snap-start sm:w-auto sm:max-w-none">
                <AnimeCard anime={a} rank={i + 1} />
              </BlurFade>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("aspect-3/4 w-[40vw] max-w-44 shrink-0 rounded-2xl bg-panel", !failed && "animate-pulse")} />
            ))}
          </div>
        )}
        {failed && <p className="mt-3 text-sm text-muted">No se pudo conectar con AniList. Revisa que el backend esté encendido.</p>}
      </section>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { to: "/catalog", icon: RiCompass3Line, title: "Explorar anime", text: "Busca títulos y personajes en AniList.", tint: "bg-violet-deep text-violet-soft" },
          { to: "/generator", icon: RiMagicLine, title: "Crear con IA", text: "Guion, hashtags y SEO en un paso.", tint: "bg-[#15303b] text-[#67d9e8]" },
          { to: "/generator", icon: RiTiktokFill, title: "Formato 9:16", text: "Pensado para TikTok, Reels y Shorts.", tint: "bg-[#342b1c] text-amber" },
        ].map((c, i) => (
          <BlurFade key={c.title} delay={0.05 * i} inView>
            <Link to={c.to} className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 transition-colors active:bg-panel-2 hover:border-line-strong">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", c.tint)}><c.icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15px]">{c.title}</b>
                <small className="mt-0.5 block text-[13px] text-muted">{c.text}</small>
              </span>
              <RiArrowRightUpLine className="size-5 text-subtle" />
            </Link>
          </BlurFade>
        ))}
      </section>
    </div>
  );
}
