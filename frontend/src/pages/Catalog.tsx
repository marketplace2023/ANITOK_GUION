import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { RiCloseLine, RiSearchLine, RiSparkling2Fill, RiStarFill } from "react-icons/ri";
import { getAnime, searchAnime } from "../api";
import type { Anime } from "../types";
import AnimeCard from "../components/AnimeCard";
import PageHeader from "../components/PageHeader";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const placeholders = ["Busca un anime: Frieren…", "Jujutsu Kaisen", "One Piece", "Solo Leveling", "Chainsaw Man", "Dandadan"];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [selected, setSelected] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  async function search(query: string, nextPage = 1) {
    if (!query.trim()) return;
    setLoading(true); setError("");
    try {
      const d = await searchAnime(query, nextPage);
      setResults((prev) => (nextPage === 1 ? d.results : [...prev, ...d.results]));
      setHasNext(d.pageInfo.hasNextPage); setPage(nextPage); setLastQuery(query);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo buscar."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const id = Number(params.get("anime"));
    if (id) getAnime(id).then(setSelected).catch(() => {});
    else setSelected(null);
  }, [params]);

  const close = () => { params.delete("anime"); setParams(params, { replace: true }); };

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="BASE DE DATOS ANIME" title="Explorar" highlight="anime" subtitle="Encuentra títulos y personajes para tu próximo vídeo." />

      <BlurFade delay={0.05}>
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={(e) => setQ(e.target.value)}
          onSubmit={(e) => { e.preventDefault(); search(q, 1); }}
        />
      </BlurFade>

      {error && <div className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{error}</div>}

      {loading && !results.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-3/4 animate-pulse rounded-2xl bg-panel" />)}
        </div>
      ) : results.length ? (
        <>
          <p className="-mb-2 text-sm text-muted">{results.length} resultados para <b className="text-white">“{lastQuery}”</b></p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {results.map((a, i) => (
              <BlurFade key={a.id} delay={0.03 * (i % 12)} inView><AnimeCard anime={a} /></BlurFade>
            ))}
          </div>
          {hasNext && (
            <button disabled={loading} onClick={() => search(lastQuery, page + 1)} className="mx-auto h-12 w-full rounded-xl border border-line-strong bg-panel-2 px-6 text-sm font-semibold text-[#c6cbd8] disabled:opacity-50 sm:w-auto">
              {loading ? "Cargando…" : "Cargar más resultados"}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-panel/50 px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-violet-deep text-violet-soft"><RiSearchLine className="size-6" /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Busca tu próximo anime</h3>
          <p className="mt-1 max-w-xs text-sm text-muted">Escribe un título y pulsa Enter para consultar el catálogo de AniList.</p>
        </div>
      )}

      <AnimatePresence>{selected && <AnimeSheet anime={selected} onClose={close} />}</AnimatePresence>
    </div>
  );
}

function AnimeSheet({ anime, onClose }: { anime: Anime; onClose: () => void }) {
  const title = anime.title.english || anime.title.romaji || "Anime";
  const dragControls = useDragControls();
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
        </div>
      </motion.div>
    </div>
  );
}
