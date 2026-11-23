import { useEffect, useRef, useState } from "react";
import { RiCloseLine, RiFireFill, RiLoader4Line, RiSearchLine } from "react-icons/ri";
import { getAnime, getTrendingAnime, searchAnime } from "../api";
import type { Anime } from "../types";

const titleOf = (a: Anime) => a.title.english || a.title.romaji || "Anime";

// Elegir anime sin salir del generador: tendencias con un toque o búsqueda mientras escribes.
export default function AnimePicker({ onPick, onCancel }: { onPick: (a: Anime) => void; onCancel?: () => void }) {
  const [q, setQ] = useState("");
  const [trending, setTrending] = useState<Anime[]>([]);
  const [results, setResults] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const reqId = useRef(0);

  useEffect(() => { getTrendingAnime().then((d) => setTrending(d.results)).catch(() => {}); }, []);

  // Búsqueda con espera de 350 ms; descarta respuestas viejas si el usuario sigue escribiendo
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const id = ++reqId.current;
    const t = setTimeout(() => {
      searchAnime(term).then((d) => { if (id === reqId.current) setResults(d.results.slice(0, 8)); })
        .catch(() => {}).finally(() => { if (id === reqId.current) setSearching(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Pedimos la ficha completa para tener los personajes (mejoran el guion)
  async function pick(a: Anime) {
    setPicking(a.id);
    try { onPick(await getAnime(a.id)); } catch { onPick(a); } finally { setPicking(null); }
  }

  return (
    <div className="rounded-2xl border border-[#34304c] bg-[#19182a] p-3">
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-subtle" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe para buscar…" className="h-12 w-full rounded-xl border border-line-strong bg-ink/70 pl-11 pr-11 text-white outline-none placeholder:text-subtle focus:border-violet" />
        {searching ? <RiLoader4Line className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin text-violet-soft" />
          : q && <button onClick={() => setQ("")} aria-label="Borrar" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted"><RiCloseLine className="size-5" /></button>}
      </div>

      {q.trim().length >= 2 ? (
        <ul className="mt-2 grid max-h-80 gap-1 overflow-y-auto">
          {results.map((a) => (
            <li key={a.id}>
              <button onClick={() => pick(a)} disabled={picking !== null} className="flex w-full items-center gap-3 rounded-xl p-2 text-left active:bg-panel-2 disabled:opacity-60">
                <img src={a.coverImage?.large} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{titleOf(a)}</b>
                  <small className="block truncate text-xs text-muted">{[a.format, a.seasonYear, a.genres?.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</small>
                </span>
                {picking === a.id && <RiLoader4Line className="size-5 animate-spin text-violet-soft" />}
              </button>
            </li>
          ))}
          {!searching && !results.length && <li className="p-3 text-center text-sm text-muted">Sin resultados para “{q}”.</li>}
        </ul>
      ) : (
        <>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-[#ffad8a]"><RiFireFill /> EN TENDENCIA · TOCA PARA ELEGIR</p>
          <div className="no-scrollbar -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
            {trending.length ? trending.map((a) => (
              <button key={a.id} onClick={() => pick(a)} disabled={picking !== null} className="relative w-22 shrink-0 text-left active:scale-95 disabled:opacity-60">
                <img src={a.coverImage?.large} alt="" className="aspect-3/4 w-full rounded-xl object-cover" />
                {picking === a.id && <span className="absolute inset-0 grid place-items-center rounded-xl bg-ink/60"><RiLoader4Line className="size-6 animate-spin text-white" /></span>}
                <span className="mt-1 line-clamp-2 block text-[11px] leading-tight text-[#c6cbd8]">{titleOf(a)}</span>
              </button>
            )) : Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-3/4 w-22 shrink-0 animate-pulse rounded-xl bg-panel-2" />)}
          </div>
        </>
      )}
      {onCancel && <button onClick={onCancel} className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-muted active:bg-panel-2">Cancelar</button>}
    </div>
  );
}
