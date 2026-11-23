import { useNavigate } from "react-router-dom";
import { RiExternalLinkLine, RiMagicLine, RiNewspaperLine } from "react-icons/ri";
import type { NewsItem } from "../types";
import { cn } from "@/lib/utils";

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

// "featured": tarjeta grande con imagen arriba. Por defecto: fila compacta con miniatura.
export default function NewsCard({ item, featured = false, onUse }: { item: NewsItem; featured?: boolean; onUse?: (n: NewsItem) => void }) {
  const navigate = useNavigate();
  const use = () => (onUse ? onUse(item) : navigate("/generator", { state: { news: item } }));

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle">
      <span className="font-semibold text-violet-soft">{item.source}</span>
      <span>·</span><span>{timeAgo(item.date)}</span>
      <span className="rounded bg-panel-2 px-1.5 py-0.5 font-bold uppercase text-muted">{item.lang}</span>
    </div>
  );
  const actions = (
    <div className="mt-3 flex gap-2">
      <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs font-medium text-[#c6cbd8] active:bg-panel-2">
        Leer <RiExternalLinkLine />
      </a>
      <button onClick={use} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-deep px-3 text-xs font-semibold text-violet-soft active:scale-95">
        <RiMagicLine /> Crear guion
      </button>
    </div>
  );

  if (featured) {
    return (
      <article className="overflow-hidden rounded-2xl border border-line bg-panel">
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center bg-panel-2 text-subtle"><RiNewspaperLine className="size-10" /></div>
        )}
        <div className="p-4">
          {meta}
          <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{item.title}</h3>
          {item.summary && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">{item.summary}</p>}
          {actions}
        </div>
      </article>
    );
  }

  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-panel p-3">
      <div className={cn("size-20 shrink-0 overflow-hidden rounded-xl bg-panel-2", !item.image && "grid place-items-center text-subtle")}>
        {item.image ? <img src={item.image} alt="" loading="lazy" className="size-full object-cover" /> : <RiNewspaperLine className="size-7" />}
      </div>
      <div className="min-w-0 flex-1">
        {meta}
        <h3 className="mt-1 line-clamp-3 text-[15px] font-semibold leading-snug">{item.title}</h3>
        {actions}
      </div>
    </article>
  );
}
