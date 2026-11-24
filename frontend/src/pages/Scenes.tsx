import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  RiExternalLinkLine, RiFilmLine, RiImageAddLine, RiLoader4Line, RiMagicLine, RiPlayFill, RiScan2Line,
  RiTimeLine, RiUserSearchLine, RiYoutubeFill,
} from "react-icons/ri";
import {
  ApiError, getAnime, getEpisodes, getSakugaClips, getSceneVideos, traceByFile, traceByUrl, traceQuota,
} from "../api";
import type { Anime, EpisodeThumb, SakugaClip, SceneVideo, TraceResult, VideoProvider } from "../types";
import PageHeader from "../components/PageHeader";
import AnimePicker from "../components/AnimePicker";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

type Tab = "sakuga" | "episodes" | "characters" | "identify";
const TABS: [Tab, string, typeof RiFilmLine][] = [
  ["sakuga", "Sakuga", RiFilmLine],
  ["episodes", "Episodios", RiPlayFill],
  ["characters", "Personajes", RiUserSearchLine],
  ["identify", "Identificar", RiScan2Line],
];
const SCENE_TYPES: [string, string][] = [
  ["", "Todo"], ["fighting", "Peleas"], ["effects", "Efectos"], ["character_acting", "Actuación"], ["running", "Carreras"],
  ["crying", "Llanto"], ["explosions", "Explosiones"], ["hair", "Pelo y viento"], ["liquid", "Agua"], ["dancing", "Baile"],
  ["vehicle", "Vehículos"], ["food", "Comida"],
];
const TAG_ES: Record<string, string> = Object.fromEntries([...SCENE_TYPES.slice(1), ["smoke", "Humo"], ["fire", "Fuego"], ["lightning", "Rayos"], ["beams", "Rayos de energía"], ["debris", "Escombros"], ["wind", "Viento"], ["smears", "Smears"], ["background_animation", "Fondo animado"], ["flying", "Vuelo"], ["falling", "Caída"], ["impact_frames", "Impacto"]]);

const titleOf = (a: { title: { english?: string | null; romaji?: string } }) => a.title.english || a.title.romaji || "Anime";
// Vídeo de vista previa de trace.moe en calidad media (la URL puede traer ya parámetros o no)
const traceVideo = (url: string) => `${url}${url.includes("?") ? "&" : "?"}size=m`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const chip = (active: boolean) => cn(
  "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95",
  active ? "border-violet bg-[#30234d] text-violet-soft" : "border-line-strong bg-panel text-[#9da6b8]"
);

export default function Scenes() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [anime, setAnime] = useState<Anime | null>((location.state as { anime?: Anime } | null)?.anime ?? null);
  const [picking, setPicking] = useState(false);
  const tab = (params.get("tab") as Tab) || "sakuga";
  const setTab = (t: Tab) => { params.set("tab", t); setParams(params, { replace: true }); };

  // El anime vive en la URL (?anime=ID) para poder volver atrás o compartir el enlace
  useEffect(() => {
    const id = Number(params.get("anime"));
    if (id && anime?.id !== id) getAnime(id).then(setAnime).catch(() => {});
  }, [params]);

  const pick = (a: Anime) => {
    setAnime(a); setPicking(false);
    params.set("anime", String(a.id)); setParams(params, { replace: true });
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader eyebrow="BUSCADOR DE ESCENAS" title="Encuentra la" highlight="escena" subtitle="Clips por anime y tipo de escena, minuto exacto de cada episodio y escenas de personajes." />

      <BlurFade delay={0.05}>
        {anime && !picking ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#34304c] bg-[#19182a] p-2.5">
            <img src={anime.coverImage?.large} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[15px]">{titleOf(anime)}</b>
              <small className="mt-0.5 block truncate text-xs text-muted">{anime.genres?.slice(0, 3).join(" · ")}</small>
            </div>
            <button onClick={() => setPicking(true)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-violet-soft active:bg-violet-deep">Cambiar</button>
          </div>
        ) : (
          <AnimePicker onPick={pick} onCancel={anime ? () => setPicking(false) : undefined} />
        )}
      </BlurFade>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-line-strong bg-panel p-1">
        {TABS.map(([v, l, Icon]) => (
          <button key={v} onClick={() => setTab(v)} className={cn("flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition sm:flex-row sm:gap-1.5 sm:text-sm", tab === v ? "bg-[#30234d] text-violet-soft" : "text-[#9da6b8]")}>
            <Icon className="size-4" /> {l}
          </button>
        ))}
      </div>

      {tab === "identify" ? <IdentifyTab anime={anime} />
        : !anime ? <Hint>Elige un anime arriba para ver sus escenas. Para identificar una captura de cualquier anime, usa <b className="text-violet-soft">Identificar</b>.</Hint>
        : tab === "sakuga" ? <SakugaTab anime={anime} key={`s${anime.id}`} />
        : tab === "episodes" ? <EpisodesTab anime={anime} key={`e${anime.id}`} />
        : <CharactersTab anime={anime} key={`c${anime.id}`} />}

      <p className="text-center text-xs leading-relaxed text-subtle">
        Los clips son de sus autores y plataformas. Úsalos como referencia y respeta los derechos de autor al publicar.
      </p>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong bg-panel/50 p-6 text-center text-sm leading-relaxed text-muted">{children}</div>;
}
const Spinner = () => <div className="grid place-items-center py-10"><RiLoader4Line className="size-7 animate-spin text-violet-soft" /></div>;
const ErrorBox = ({ children }: { children: ReactNode }) => <div className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{children}</div>;

// Lleva una escena al generador como punto de partida del guion
function useSceneToScript(anime: Pick<Anime, "id" | "title"> & Partial<Anime>) {
  const navigate = useNavigate();
  return (hint: string) => navigate("/generator", { state: { anime, extra: hint } });
}

/* ---------- Sakuga: clips por anime y tipo de escena ---------- */
function SakugaTab({ anime }: { anime: Anime }) {
  const [type, setType] = useState("");
  const [clips, setClips] = useState<SakugaClip[]>([]);
  const [tag, setTag] = useState<string | null | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<number | null>(null);

  async function load(t: string, p: number) {
    setLoading(true); setError("");
    try {
      const d = await getSakugaClips(anime.id, t || undefined, p);
      setTag(d.tag); setHasMore(d.hasMore); setPage(p);
      setClips((prev) => (p === 1 ? d.results : [...prev, ...d.results]));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { setPlaying(null); load(type, 1); }, [type]);

  return (
    <div className="grid gap-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {SCENE_TYPES.map(([v, l]) => <button key={v} onClick={() => setType(v)} className={chip(type === v)}>{l}</button>)}
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {loading && page === 1 ? <Spinner /> : tag === null ? (
        <Hint>Sakugabooru no tiene clips de este anime. Prueba la pestaña <b className="text-violet-soft">Personajes</b> o <b className="text-violet-soft">Episodios</b>.</Hint>
      ) : !clips.length ? (
        <Hint>No hay clips de este tipo. Prueba con <b className="text-violet-soft">Todo</b>.</Hint>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {clips.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                <div className="relative aspect-video bg-ink">
                  {playing === c.id ? (
                    <video src={c.video} poster={c.preview} controls autoPlay loop muted playsInline preload="metadata" className="size-full object-contain" />
                  ) : (
                    <button onClick={() => setPlaying(c.id)} aria-label="Reproducir clip" className="group size-full">
                      <img src={c.preview} alt="" loading="lazy" className="size-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-ink/30"><span className="grid size-11 place-items-center rounded-full bg-violet/90 text-white shadow-lg transition group-active:scale-90"><RiPlayFill className="size-6" /></span></span>
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-muted">{c.sizeMB} MB</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {c.tags.slice(0, 2).map((t) => <span key={t} className="truncate rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">{TAG_ES[t] ?? t}</span>)}
                  </div>
                  <a href={c.source} target="_blank" rel="noreferrer" aria-label="Ver en Sakugabooru" className="grid size-8 shrink-0 place-items-center rounded-lg text-violet-soft active:bg-panel-2"><RiExternalLinkLine /></a>
                </div>
              </article>
            ))}
          </div>
          {hasMore && (
            <button disabled={loading} onClick={() => load(type, page + 1)} className="mx-auto h-12 w-full rounded-xl border border-line-strong bg-panel-2 px-6 text-sm font-semibold text-[#c6cbd8] disabled:opacity-50 sm:w-auto">
              {loading ? "Cargando…" : "Cargar más clips"}
            </button>
          )}
          <p className="text-center text-[11px] text-subtle">Fuente: Sakugabooru · etiqueta <code>{tag}</code></p>
        </>
      )}
    </div>
  );
}

/* ---------- Episodios: miniaturas reales + minuto exacto con trace.moe ---------- */
function EpisodesTab({ anime }: { anime: Anime }) {
  const [data, setData] = useState<{ trailer: string | null; episodes: EpisodeThumb[] } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<EpisodeThumb | null>(null);
  useEffect(() => { getEpisodes(anime.id).then(setData).catch((e) => setError((e as Error).message)); }, [anime.id]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Spinner />;
  return (
    <div className="grid gap-4">
      {data.trailer && (
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <iframe title="Tráiler" src={`https://www.youtube-nocookie.com/embed/${data.trailer}`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full" />
          <p className="p-2.5 text-xs font-semibold text-muted">Tráiler oficial</p>
        </div>
      )}
      {data.episodes.length ? (
        <>
          <p className="text-sm text-muted">Toca un episodio para encontrar el <b className="text-white">minuto exacto</b> de su escena y ver el clip.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {data.episodes.map((ep) => (
              <button key={ep.url} onClick={() => setOpen(ep)} className="overflow-hidden rounded-2xl border border-line bg-panel text-left active:scale-[0.98]">
                <img src={ep.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                <p className="line-clamp-2 p-2 text-xs leading-snug text-[#c6cbd8]">{ep.title}</p>
              </button>
            ))}
          </div>
        </>
      ) : <Hint>AniList no tiene miniaturas de episodios de este anime. Usa <b className="text-violet-soft">Identificar</b> con tu propia captura.</Hint>}
      {open && <TraceSheet anime={anime} imageUrl={open.thumbnail} label={open.title} episodeUrl={open.url} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TraceSheet({ anime, imageUrl, label, episodeUrl, onClose }: { anime: Anime; imageUrl: string; label: string; episodeUrl: string; onClose: () => void }) {
  const [res, setRes] = useState<TraceResult | null>(null);
  const [error, setError] = useState("");
  const toScript = useSceneToScript(anime);
  useEffect(() => {
    traceByUrl(imageUrl, anime.id).then((d) => { if (d.result[0]) setRes(d.result[0]); else setError("No se encontró la escena."); })
      .catch((e) => setError((e as ApiError).message));
  }, [imageUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="pb-safe relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-line-strong bg-[#121626] p-5 lg:max-w-lg lg:rounded-3xl">
        <h3 className="pr-8 font-display text-lg font-semibold leading-snug">{label}</h3>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg px-2 py-1 text-sm text-muted">Cerrar</button>
        {error ? <div className="mt-4"><ErrorBox>{error}</ErrorBox></div> : !res ? (
          <div className="mt-6 grid place-items-center gap-2 py-6 text-sm text-muted"><RiLoader4Line className="size-7 animate-spin text-violet-soft" />Buscando el minuto exacto con trace.moe…</div>
        ) : (
          <div className="mt-4 grid gap-3">
            <video src={traceVideo(res.video)} controls autoPlay muted loop playsInline className="aspect-video w-full rounded-xl bg-ink" />
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-deep px-2.5 py-1 text-violet-soft"><RiTimeLine /> Ep. {res.episode ?? "?"} · {mmss(res.from)}</span>
              <span className={cn("rounded-lg px-2.5 py-1", res.similarity >= 0.9 ? "bg-[#18302a] text-[#8ce5bf]" : "bg-[#3a2a17] text-[#ffcf8a]")}>{(res.similarity * 100).toFixed(1)}% de coincidencia</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => toScript(`Basa el guion en la escena del episodio ${res.episode ?? "?"} (minuto ${mmss(res.from)}) de ${titleOf(anime)}: "${label}".`)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-violet text-sm font-semibold text-white active:scale-95"><RiMagicLine /> Crear guion</button>
              <a href={episodeUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong text-sm font-medium text-[#c6cbd8]">Ver episodio <RiExternalLinkLine /></a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Personajes: escenas en Dailymotion (o YouTube si hay clave) ---------- */
function CharactersTab({ anime }: { anime: Anime }) {
  const chars = anime.characters?.edges?.map((e) => e.node) ?? [];
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<{ provider: VideoProvider; playerId: string | null; results: SceneVideo[] } | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const title = titleOf(anime);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selected} ${title} escena`.trim())}`;

  useEffect(() => {
    let alive = true;
    setData(null); setError(""); setPlaying(null);
    getSceneVideos(title, selected || undefined)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError((e as ApiError).message); });
    return () => { alive = false; };
  }, [selected, anime.id]);

  return (
    <div className="grid gap-4">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => setSelected("")} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
          <span className={cn("grid size-16 place-items-center rounded-full border-2 bg-panel text-xs font-bold", !selected ? "border-violet text-violet-soft" : "border-line-strong text-muted")}>TODO</span>
          <span className="text-[11px] text-muted">Todo</span>
        </button>
        {chars.map((c) => (
          <button key={c.name.full} onClick={() => setSelected(c.name.full)} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
            <img src={c.image?.large} alt="" className={cn("size-16 rounded-full border-2 object-cover", selected === c.name.full ? "border-violet" : "border-line-strong")} />
            <span className={cn("line-clamp-2 text-center text-[11px] leading-tight", selected === c.name.full ? "text-violet-soft" : "text-muted")}>{c.name.full}</span>
          </button>
        ))}
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : !data ? <Spinner /> : !data.results.length ? (
        <Hint>Sin clips de “{selected || title}”. <a href={searchUrl} target="_blank" rel="noreferrer" className="text-violet-soft">Buscar en YouTube ↗</a></Hint>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((v) => (
              <article key={v.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                {data.provider === "dailymotion" && !data.playerId ? (
                  // Dailymotion solo permite incrustar con un Player ID propio: sin él, abrimos el clip en su web/app
                  <a href={`https://www.dailymotion.com/video/${v.id}`} target="_blank" rel="noreferrer" className="relative block w-full" aria-label={`Ver ${v.title} en Dailymotion`}>
                    <img src={v.thumbnail ?? ""} alt="" loading="lazy" className="aspect-video w-full bg-ink object-cover" />
                    <span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full bg-violet text-white shadow-lg"><RiPlayFill className="size-6" /></span></span>
                    {v.duration != null && <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">{mmss(v.duration)}</span>}
                    <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-black/70 text-white"><RiExternalLinkLine /></span>
                  </a>
                ) : playing === v.id ? (
                  <iframe
                    title={v.title}
                    src={data.provider === "youtube" ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1` : `https://geo.dailymotion.com/player/${data.playerId}.html?video=${v.id}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share"
                    className="aspect-video w-full"
                  />
                ) : (
                  <button onClick={() => setPlaying(v.id)} className="relative block w-full" aria-label={`Reproducir ${v.title}`}>
                    <img src={v.thumbnail ?? ""} alt="" loading="lazy" className="aspect-video w-full bg-ink object-cover" />
                    <span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full bg-violet text-white shadow-lg"><RiPlayFill className="size-6" /></span></span>
                    {v.duration != null && <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">{mmss(v.duration)}</span>}
                  </button>
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{v.title}</p>
                  <p className="mt-1 truncate text-xs text-subtle">{v.channel}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="text-center text-xs text-subtle">
            Clips de {data.provider === "youtube" ? "YouTube" : "Dailymotion"} subidos por fans ·{" "}
            <a href={searchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-soft"><RiYoutubeFill /> Ver más en YouTube</a>
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Identificar: captura → anime, episodio y minuto ---------- */
// Reduce la foto a 720 px antes de enviarla: más rápido en móvil y trace.moe no necesita más
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
  } catch { return file; }
}

function IdentifyTab({ anime }: { anime: Anime | null }) {
  const [url, setUrl] = useState("");
  const [onlyThis, setOnlyThis] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<TraceResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quota, setQuota] = useState<{ quota: number; quotaUsed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const filterId = anime && onlyThis ? anime.id : undefined;

  useEffect(() => { traceQuota().then(setQuota).catch(() => {}); }, []);

  async function run(fn: () => Promise<{ result: TraceResult[] }>) {
    setBusy(true); setError(""); setResults(null);
    try {
      const d = await fn();
      setResults(d.result.filter((r) => !r.anilist.isAdult).slice(0, 3));
      traceQuota().then(setQuota).catch(() => {});
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Elige una imagen (captura de pantalla)."); return; }
    setPreview(URL.createObjectURL(f));
    const small = await shrink(f);
    run(() => traceByFile(small, filterId));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4">
        <p className="text-sm leading-relaxed text-muted">Sube una <b className="text-white">captura de una escena</b> y te diré de qué anime es, el episodio y el minuto exacto.</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
          className="grid place-items-center gap-2 rounded-2xl border-2 border-dashed border-violet/40 bg-violet-deep/30 px-4 py-8 text-sm text-violet-soft active:scale-[0.99] disabled:opacity-60">
          {preview ? <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" /> : <RiImageAddLine className="size-9" />}
          <span className="font-semibold">{busy ? "Analizando…" : preview ? "Elegir otra captura" : "Elegir captura o foto"}</span>
        </button>
        <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) { setPreview(url.trim()); run(() => traceByUrl(url.trim(), filterId)); } }} className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…o pega el enlace de una imagen" className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-ink/60 px-3 text-white outline-none placeholder:text-subtle focus:border-violet" />
          <button disabled={busy || !url.trim()} className="h-11 shrink-0 rounded-xl bg-violet px-4 text-sm font-semibold text-white disabled:opacity-50">Buscar</button>
        </form>
        {anime && (
          <label className="flex items-center gap-2.5 text-sm text-[#c6cbd8]">
            <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} className="size-5 accent-violet" />
            <span className="min-w-0 truncate">Solo en <b className="text-white">{titleOf(anime)}</b></span>
          </label>
        )}
        {quota && <p className="text-[11px] text-subtle">trace.moe gratis: te quedan {Math.max(0, quota.quota - quota.quotaUsed)} de {quota.quota} búsquedas este mes.</p>}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {busy && <Spinner />}
      {results && !results.length && <Hint>No se encontró la escena. Prueba con una captura más nítida y sin bordes ni texto encima.</Hint>}
      {results?.map((r, i) => (
        <article key={`${r.anilist.id}-${r.from}`} className={cn("overflow-hidden rounded-2xl border bg-panel", i === 0 ? "border-violet/50" : "border-line")}>
          <video src={traceVideo(r.video)} controls muted loop playsInline autoPlay={i === 0} preload="metadata" poster={r.image} className="aspect-video w-full bg-ink" />
          <div className="grid gap-2 p-3">
            <b className="font-display text-[15px] leading-snug">{titleOf(r.anilist)}</b>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-deep px-2 py-1 text-violet-soft"><RiTimeLine /> Ep. {r.episode ?? "?"} · {mmss(r.from)}</span>
              <span className={cn("rounded-lg px-2 py-1", r.similarity >= 0.9 ? "bg-[#18302a] text-[#8ce5bf]" : "bg-[#3a2a17] text-[#ffcf8a]")}>
                {(r.similarity * 100).toFixed(1)}%{r.similarity < 0.9 ? " · dudoso" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate("/generator", { state: { anime: { id: r.anilist.id, title: { english: r.anilist.title.english ?? undefined, romaji: r.anilist.title.romaji } }, extra: `Basa el guion en la escena del episodio ${r.episode ?? "?"} (minuto ${mmss(r.from)}).` } })}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet text-sm font-semibold text-white active:scale-95"><RiMagicLine /> Crear guion</button>
              <button onClick={() => navigate(`/catalog?anime=${r.anilist.id}`)} className="h-10 rounded-xl border border-line-strong text-sm font-medium text-[#c6cbd8]">Ver anime</button>
            </div>
          </div>
        </article>
      ))}
      <p className="text-center text-[11px] text-subtle">Identificación por <a href="https://trace.moe" target="_blank" rel="noreferrer" className="text-violet-soft">trace.moe</a></p>
    </div>
  );
}
