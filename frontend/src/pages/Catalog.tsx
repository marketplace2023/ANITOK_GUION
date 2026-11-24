import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { RiCloseLine, RiEqualizerLine, RiFilmLine, RiFireFill, RiNewspaperLine, RiSearchLine, RiSparkling2Fill, RiStarFill } from "react-icons/ri";
import { browseAnime, getAnime, getAnimeNews, getGenres } from "../api";
import type { Anime, BrowseFilters, NewsItem } from "../types";
import AnimeCard from "../components/AnimeCard";
import NewsCard from "../components/NewsCard";
import PageHeader from "../components/PageHeader";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";

const placeholders = ["Busca un anime (opcional)…", "Frieren", "Jujutsu Kaisen", "Solo Leveling", "Dandadan"];
const SORTS: [NonNullable<BrowseFilters["sort"]>, string][] = [["TRENDING_DESC", "Tendencia"], ["POPULARITY_DESC", "Más populares"], ["SCORE_DESC", "Mejor valorados"], ["START_DATE_DESC", "Más recientes"]];
const GENRE_ES: Record<string, string> = {
  Action: "Acción", Adventure: "Aventura", Comedy: "Comedia", Drama: "Drama", Ecchi: "Ecchi", Fantasy: "Fantasía", Horror: "Terror",
  "Mahou Shoujo": "Mahou Shoujo", Mecha: "Mecha", Music: "Música", Mystery: "Misterio", Psychological: "Psicológico", Romance: "Romance",
  "Sci-Fi": "Ciencia ficción", "Slice of Life": "Vida cotidiana", Sports: "Deportes", Supernatural: "Sobrenatural", Thriller: "Thriller",
};
const SEASONS: [NonNullable<BrowseFilters["season"]>, string][] = [["WINTER", "Invierno"], ["SPRING", "Primavera"], ["SUMMER", "Verano"], ["FALL", "Otoño"]];
const FORMATS: [NonNullable<BrowseFilters["format"]>, string][] = [["TV", "Serie TV"], ["MOVIE", "Película"], ["ONA", "ONA (web)"], ["OVA", "OVA"], ["SPECIAL", "Especial"], ["TV_SHORT", "Corto"]];
const STATUSES: [NonNullable<BrowseFilters["status"]>, string][] = [["RELEASING", "En emisión"], ["FINISHED", "Finalizado"], ["NOT_YET_RELEASED", "Próximamente"]];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 1 - 1980 + 1 }, (_, i) => thisYear + 1 - i);

const chip = (active: boolean) => cn(
  "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95",
  active ? "border-violet bg-[#30234d] text-violet-soft" : "border-line-strong bg-panel text-[#9da6b8]"
);
const selectCls = "h-11 w-full rounded-xl border border-line-strong bg-ink/60 pl-3 pr-9 text-sm text-white outline-none focus:border-violet";

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<BrowseFilters>({ sort: "TRENDING_DESC" });
  const [typed, setTyped] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [results, setResults] = useState<Anime[]>([]);
  const [selected, setSelected] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => { getGenres().then((d) => setGenres(d.genres)).catch(() => {}); }, []);

  async function load(f: BrowseFilters, nextPage = 1) {
    setLoading(true); setError("");
    try {
      const d = await browseAnime(f, nextPage);
      setResults((prev) => (nextPage === 1 ? d.results : [...prev, ...d.results]));
      setHasNext(d.pageInfo.hasNextPage); setPage(nextPage); setTotal(d.pageInfo.total);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo."); }
    finally { setLoading(false); }
  }

  // Al entrar ya hay resultados (en tendencia); cada cambio de filtro recarga
  useEffect(() => { load(filters, 1); }, [filters]);

  useEffect(() => {
    const id = Number(params.get("anime"));
    if (id) getAnime(id).then(setSelected).catch(() => {});
    else setSelected(null);
  }, [params]);

  const close = () => { params.delete("anime"); setParams(params, { replace: true }); };
  const set = (patch: Partial<BrowseFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const extraCount = [filters.year, filters.season, filters.format, filters.status].filter(Boolean).length;
  const anyFilter = Boolean(filters.q || filters.genre || extraCount);
  const clearAll = () => setFilters({ sort: "TRENDING_DESC" });

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader eyebrow="BASE DE DATOS ANIME" title="Explorar" highlight="anime" subtitle="Filtra por género, temporada o popularidad. Escribir es opcional." />

      <BlurFade delay={0.05} className="grid gap-3">
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={(e) => setTyped(e.target.value)}
          onSubmit={(e) => { e.preventDefault(); if (typed.trim()) set({ q: typed.trim(), sort: undefined }); }}
        />

        {/* Orden */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {SORTS.map(([v, l]) => (
            <button key={v} onClick={() => set({ sort: v })} className={cn(chip(filters.sort === v), "inline-flex items-center gap-1")}>
              {v === "TRENDING_DESC" && <RiFireFill className="text-[#ffad8a]" />}{l}
            </button>
          ))}
          <button onClick={() => setShowMore((s) => !s)} className={cn(chip(showMore || extraCount > 0), "inline-flex items-center gap-1.5")}>
            <RiEqualizerLine /> Filtros{extraCount ? ` (${extraCount})` : ""}
          </button>
        </div>

        {/* Géneros */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => set({ genre: undefined })} className={chip(!filters.genre)}>Todos</button>
          {genres.map((g) => (
            <button key={g} onClick={() => set({ genre: filters.genre === g ? undefined : g })} className={chip(filters.genre === g)}>{GENRE_ES[g] ?? g}</button>
          ))}
        </div>

        {/* Más filtros */}
        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-panel p-3 sm:grid-cols-4">
                <select aria-label="Año" value={filters.year ?? ""} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })} className={selectCls}>
                  <option value="">Año</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select aria-label="Temporada" value={filters.season ?? ""} onChange={(e) => set({ season: (e.target.value || undefined) as BrowseFilters["season"] })} className={selectCls}>
                  <option value="">Temporada</option>{SEASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select aria-label="Formato" value={filters.format ?? ""} onChange={(e) => set({ format: (e.target.value || undefined) as BrowseFilters["format"] })} className={selectCls}>
                  <option value="">Formato</option>{FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select aria-label="Estado" value={filters.status ?? ""} onChange={(e) => set({ status: (e.target.value || undefined) as BrowseFilters["status"] })} className={selectCls}>
                  <option value="">Estado</option>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(anyFilter || total > 0) && (
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span className="min-w-0 truncate">
              {filters.q ? <>Resultados para <b className="text-white">“{filters.q}”</b></> : <>{total.toLocaleString("es")} animes</>}
            </span>
            {anyFilter && <button onClick={clearAll} className="inline-flex shrink-0 items-center gap-1 font-medium text-violet-soft"><RiCloseLine /> Limpiar filtros</button>}
          </div>
        )}
      </BlurFade>

      {error && <div className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{error}</div>}

      {loading && !results.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-3/4 animate-pulse rounded-2xl bg-panel" />)}
        </div>
      ) : results.length ? (
        <>
          <div className={cn("grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5", loading && page === 1 && "opacity-50")}>
            {results.map((a, i) => (
              <BlurFade key={a.id} delay={0.03 * (i % 12)} inView><AnimeCard anime={a} /></BlurFade>
            ))}
          </div>
          {hasNext && (
            <button disabled={loading} onClick={() => load(filters, page + 1)} className="mx-auto h-12 w-full rounded-xl border border-line-strong bg-panel-2 px-6 text-sm font-semibold text-[#c6cbd8] disabled:opacity-50 sm:w-auto">
              {loading ? "Cargando…" : "Cargar más"}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-panel/50 px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-violet-deep text-violet-soft"><RiSearchLine className="size-6" /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Sin resultados</h3>
          <p className="mt-1 max-w-xs text-sm text-muted">Prueba con otros filtros.</p>
          <button onClick={clearAll} className="mt-4 text-sm font-semibold text-violet-soft">Limpiar filtros</button>
        </div>
      )}

      <AnimatePresence>{selected && <AnimeSheet anime={selected} onClose={close} />}</AnimatePresence>
    </div>
  );
}

function AnimeSheet({ anime, onClose }: { anime: Anime; onClose: () => void }) {
  const title = anime.title.english || anime.title.romaji || "Anime";
  const dragControls = useDragControls();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    setNews(null);
    getAnimeNews(anime.id).then((d) => setNews(d.results)).catch(() => setNews([]));
  }, [anime.id]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
      <motion.button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        drag="y" dragListener={false} dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
        className="pb-safe relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-line-strong bg-[#121626] lg:max-w-2xl lg:rounded-3xl"
      >
        {/* Asa para deslizar y cerrar (solo móvil); el resto de la hoja hace scroll normal */}
        <div onPointerDown={(e) => dragControls.start(e)} className="sticky top-0 z-10 flex h-7 touch-none justify-center pt-2.5 lg:hidden"><span className="h-1.5 w-12 rounded-full bg-white/30" /></div>
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/15 bg-ink/80 text-white backdrop-blur">
          <RiCloseLine className="size-5" />
        </button>
        {anime.bannerImage && <img src={anime.bannerImage} alt="" className="-mt-7 h-36 w-full object-cover opacity-60 lg:mt-0" />}
        <div className="px-5 pb-6">
          <div className="flex gap-4">
            <img src={anime.coverImage?.large} alt={title} className={`${anime.bannerImage ? "-mt-12" : "mt-4"} relative h-36 w-26 shrink-0 rounded-xl border-2 border-[#25263c] object-cover shadow-xl`} />
            <div className="min-w-0 pt-3">
              <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>{anime.format || "—"}</span><span>{anime.episodes || "?"} ep.</span><span>{anime.seasonYear || "—"}</span>
                {anime.averageScore ? <span className="flex items-center gap-1 text-amber"><RiStarFill /> {(anime.averageScore / 10).toFixed(1)}</span> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {anime.genres?.map((g) => <span key={g} className="rounded-lg border border-[#4b3d68] bg-violet-deep px-2.5 py-1 text-xs text-[#c9b8ff]">{g}</span>)}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#a3aabe]">{(anime.description || "Sin descripción disponible.").replace(/<[^>]*>/g, " ").slice(0, 700)}</p>
          {anime.characters?.edges?.length ? (
            <p className="mt-3 text-xs text-muted"><b className="text-[#c6cbd8]">Personajes:</b> {anime.characters.edges.map((e) => e.node.name.full).join(", ")}</p>
          ) : null}
          <Link to="/generator" state={{ anime }} className="mt-5 block">
            <ShimmerButton background="linear-gradient(100deg,#8b5cf6,#6247d6)" className="h-12 w-full gap-2 text-[15px] font-semibold">
              <RiSparkling2Fill className="size-5" /> Crear guion con este anime
            </ShimmerButton>
          </Link>
          <Link to={`/scenes?anime=${anime.id}`} state={{ anime }} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line-strong text-[15px] font-semibold text-[#c6cbd8] active:bg-panel-2">
            <RiFilmLine className="size-5" /> Ver escenas y clips
          </Link>

          <section className="mt-6 border-t border-line pt-5">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#9c87e8]"><RiNewspaperLine className="size-4" /> NOTICIAS DE ESTE ANIME</h3>
            {news === null ? (
              <div className="mt-3 grid gap-2">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-panel" />)}</div>
            ) : news.length ? (
              <div className="mt-3 grid gap-2">
                {news.slice(0, 4).map((n) => (
                  <NewsCard key={n.id} item={n} onUse={(item) => navigate("/generator", { state: { anime, news: item } })} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No hay noticias recientes sobre este anime en las fuentes conectadas.</p>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
