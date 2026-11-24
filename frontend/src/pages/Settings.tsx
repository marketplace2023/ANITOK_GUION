import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { Link } from "react-router-dom";
import {
  RiArrowDownSLine, RiArrowRightSLine, RiArrowUpSLine, RiBookmark3Line, RiBrainLine, RiDatabase2Line, RiExternalLinkLine,
  RiLogoutBoxRLine, RiNewspaperLine, RiShieldCheckLine, RiSmartphoneLine,
} from "react-icons/ri";
import { getHealth } from "../api";
import { loadAiOrder, PROVIDER_IDS, PROVIDER_LABELS, saveAiOrder } from "../aiOrder";
import type { AiProviderInfo, ProviderId } from "../types";
import { useAuth } from "../auth";
import PageHeader from "../components/PageHeader";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

type State = "ok" | "pending" | "loading";

function Card({ icon: Icon, title, text, state, stateText, link }: {
  icon: IconType; title: string; text: string; state: State; stateText: string; link?: { href: string; label: string };
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-panel p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-deep text-violet-soft"><Icon className="size-5" /></span>
      <div className="min-w-0">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{text}</p>
        <span className={cn("mt-2.5 inline-flex items-center gap-2 text-xs font-medium",
          state === "ok" ? "text-[#8ce5bf]" : state === "pending" ? "text-[#ffcf8a]" : "text-subtle")}>
          <i className={cn("size-2 rounded-full", state === "ok" ? "bg-mint shadow-[0_0_8px_#34d399]" : state === "pending" ? "bg-amber" : "animate-pulse bg-subtle")} />
          {stateText}
        </span>
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-sm font-medium text-violet-soft">
            {link.label} <RiExternalLinkLine />
          </a>
        )}
      </div>
    </div>
  );
}

const PROVIDER_META: Record<ProviderId, { text: string; env: string; link: { href: string; label: string } }> = {
  gemini: { text: "La mejor calidad, pero a veces se satura.", env: "GEMINI_API_KEY", link: { href: "https://aistudio.google.com/", label: "AI Studio" } },
  nemotron: { text: "Muy rápido (~10 s).", env: "NVIDIA_API_KEY", link: { href: "https://build.nvidia.com", label: "NVIDIA Build" } },
  gemma: { text: "Buena calidad, pero lento (20-30 s).", env: "NVIDIA_GEMMA_API_KEY", link: { href: "https://build.nvidia.com", label: "NVIDIA Build" } },
  openrouter: { text: "Modelos gratuitos variados, último recurso.", env: "OPENROUTER_API_KEY", link: { href: "https://openrouter.ai/keys", label: "OpenRouter" } },
};

// Orden de prioridad de los servicios de IA: el primero que responda escribe el guion
function AiPriority({ ai, offline }: { ai: { order: ProviderId[]; providers: AiProviderInfo[] } | null; offline: boolean }) {
  const [custom, setCustom] = useState<ProviderId[] | null>(loadAiOrder);
  const order = custom ?? ai?.order ?? PROVIDER_IDS;
  const byId = new Map(ai?.providers.map((p) => [p.id, p]));
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setCustom(next); saveAiOrder(next);
  };
  const reset = () => { setCustom(null); saveAiOrder(null); };
  const firstActive = order.find((id) => byId.get(id)?.configured && !byId.get(id)?.pausedUntil);

  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-deep text-violet-soft"><RiBrainLine className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Prioridad de IA</h3>
          <p className="mt-1 text-sm text-muted">Se prueban en este orden. Si uno está saturado o tarda más de 25 s, pasa al siguiente y queda en pausa 3 minutos.</p>
        </div>
      </div>
      {offline ? <p className="text-sm text-[#ffcf8a]">Backend sin conexión.</p> : !ai ? <div className="h-40 animate-pulse rounded-xl bg-ink/50" /> : (
        <ol className="grid gap-2">
          {order.map((id, i) => {
            const p = byId.get(id);
            const meta = PROVIDER_META[id];
            const paused = p?.pausedUntil ? Math.max(1, Math.ceil((p.pausedUntil - Date.now()) / 60000)) : 0;
            return (
              <li key={id} className={cn("flex items-center gap-3 rounded-xl border p-2.5", id === firstActive ? "border-violet/60 bg-violet-deep/40" : "border-line-strong bg-ink/50", !p?.configured && "opacity-60")}>
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-panel-2 font-display text-sm font-bold text-violet-soft">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{PROVIDER_LABELS[id]}</b>
                  <small className="block truncate text-xs text-muted">{meta.text}</small>
                  <span className={cn("mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium", !p?.configured ? "text-subtle" : paused ? "text-[#ffcf8a]" : "text-[#8ce5bf]")}>
                    <i className={cn("size-1.5 rounded-full", !p?.configured ? "bg-subtle" : paused ? "bg-amber" : "bg-mint")} />
                    {!p?.configured ? `Sin clave (${meta.env})` : paused ? `Saturado · en pausa ${paused} min` : id === firstActive ? "Activo · se usa primero" : "Listo"}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir ${PROVIDER_LABELS[id]}`} className="grid size-8 place-items-center rounded-lg border border-line-strong text-[#c6cbd8] active:bg-panel-2 disabled:opacity-30"><RiArrowUpSLine className="size-5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Bajar ${PROVIDER_LABELS[id]}`} className="grid size-8 place-items-center rounded-lg border border-line-strong text-[#c6cbd8] active:bg-panel-2 disabled:opacity-30"><RiArrowDownSLine className="size-5" /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-subtle">
        <span>{custom ? "Orden personalizado en este dispositivo" : "Orden predeterminado del servidor"}</span>
        {custom && <button onClick={reset} className="font-medium text-violet-soft">Restablecer</button>}
      </div>
    </section>
  );
}

export default function Settings() {
  const { state, logout } = useAuth();
  const [ai, setAi] = useState<{ order: ProviderId[]; providers: AiProviderInfo[] } | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => { getHealth().then((h) => setAi(h.ai ?? null)).catch(() => setOffline(true)); }, []);
  const user = state.status === "authenticated" ? state.user : "";

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="AJUSTES" title="Configuración" subtitle="Tu sesión y el estado de las integraciones." />

      <BlurFade>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet to-cyan font-display text-lg font-bold uppercase text-white">{user.slice(0, 1) || "?"}</span>
          <div className="min-w-0 flex-1">
            <b className="block truncate">{user}</b>
            <small className="text-xs text-muted">Sesión activa en este dispositivo</small>
          </div>
          <button onClick={logout} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-medium text-[#c6cbd8] active:bg-panel-2">
            <RiLogoutBoxRLine className="size-4" /> Salir
          </button>
        </div>
      </BlurFade>

      <BlurFade delay={0.03}>
        <Link to="/library" className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 active:bg-panel-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-deep text-violet-soft"><RiBookmark3Line className="size-5" /></span>
          <span className="min-w-0 flex-1"><b className="block">Mis guiones</b><small className="text-[13px] text-muted">Tu biblioteca de contenido</small></span>
          <RiArrowRightSLine className="size-5 text-subtle" />
        </Link>
      </BlurFade>

      <BlurFade delay={0.05}><AiPriority ai={ai} offline={offline} /></BlurFade>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          <Card key="a" icon={RiDatabase2Line} title="AniList GraphQL" text="Catálogo, fichas y datos de tendencia." state="ok" stateText="API pública, sin clave" link={{ href: "https://docs.anilist.co/", label: "Documentación" }} />,
          <Card key="n" icon={RiNewspaperLine} title="Noticias" text="Crunchyroll Noticias y Ramen Para Dos (español), Anime News Network y MyAnimeList (inglés)." state="ok" stateText="RSS públicos, sin clave" />,
          <Card key="s" icon={RiShieldCheckLine} title="Seguridad" text="Login privado con contraseña cifrada (scrypt), sesión en cookie segura, límite de intentos, Helmet y validación Zod." state="ok" stateText="Protecciones activas" />,
          <Card key="p" icon={RiSmartphoneLine} title="Instalar en el móvil" text="Abre la app en el navegador del teléfono y elige «Añadir a pantalla de inicio»." state="ok" stateText="Lista como app web (PWA)" />,
        ].map((c, i) => <BlurFade key={i} delay={0.04 * i}>{c}</BlurFade>)}
      </div>
      <BlurFade delay={0.2}>
        <div className="rounded-2xl border border-[#3a3159] bg-[#1b1830] p-4 text-sm leading-relaxed text-[#b8b0d8]">
          <b className="text-white">Para cambiar tu contraseña:</b> ejecuta <code className="rounded bg-ink px-1">npm run set-password -w backend</code> y copia los nuevos valores a Netlify. Cambiar <code className="rounded bg-ink px-1">AUTH_SECRET</code> cierra todas las sesiones abiertas.
        </div>
      </BlurFade>
    </div>
  );
}
