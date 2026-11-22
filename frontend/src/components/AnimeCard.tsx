import { useNavigate } from "react-router-dom";
import { RiFireFill, RiStarFill } from "react-icons/ri";
import { MagicCard } from "@/components/ui/magic-card";
import type { Anime } from "../types";

export default function AnimeCard({ anime, rank }: { anime: Anime; rank?: number }) {
  const navigate = useNavigate();
  const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
  return (
    <button
      type="button"
      onClick={() => navigate(`/catalog?anime=${anime.id}`)}
      className="group block w-full min-w-0 text-left transition-transform active:scale-[0.97]"
    >
      <MagicCard className="rounded-2xl p-px" gradientFrom="#8b5cf6" gradientTo="#22d3ee" gradientColor="#1f1a33">
        <div className="relative aspect-3/4 overflow-hidden rounded-[15px] bg-panel-2">
          <img
            src={anime.coverImage?.extraLarge || anime.coverImage?.large}
            alt={title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/95 via-ink/40 to-transparent" />
          {rank && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-[#3b1d1d]/90 px-2 py-1 text-[11px] font-bold text-[#ffad8a] backdrop-blur">
              <RiFireFill className="size-3" /> #{rank}
            </span>
          )}
          {anime.averageScore ? (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-white/10 bg-ink/80 px-2 py-1 text-[11px] font-semibold text-amber backdrop-blur">
              <RiStarFill className="size-3" /> {(anime.averageScore / 10).toFixed(1)}
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <b className="line-clamp-2 text-sm font-semibold leading-snug text-white">{title}</b>
            <small className="mt-1 block text-xs text-muted">{anime.format || "Anime"}{anime.seasonYear ? ` · ${anime.seasonYear}` : ""}</small>
          </div>
        </div>
      </MagicCard>
    </button>
  );
}
