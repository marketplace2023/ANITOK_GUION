import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { Link } from "react-router-dom";
import {
  RiArrowRightSLine, RiBookmark3Line, RiBrainLine, RiDatabase2Line, RiExternalLinkLine, RiLogoutBoxRLine, RiNewspaperLine,
  RiRobot2Line, RiShieldCheckLine, RiSmartphoneLine,
} from "react-icons/ri";
import { getHealth } from "../api";
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

export default function Settings() {
  const { state, logout } = useAuth();
  const [providers, setProviders] = useState<{ gemini: boolean; openrouter: boolean } | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => { getHealth().then((h) => setProviders(h.providers ?? null)).catch(() => setOffline(true)); }, []);
  const st = (on?: boolean): State => (offline ? "pending" : providers ? (on ? "ok" : "pending") : "loading");
  const label = (on: boolean | undefined, env: string) => (offline ? "Backend sin conexión" : !providers ? "Comprobando…" : on ? "Clave configurada" : `Falta ${env} en backend/.env`);
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          <Card key="g" icon={RiBrainLine} title="Google Gemini" text="Proveedor principal para generar guiones." state={st(providers?.gemini)} stateText={label(providers?.gemini, "GEMINI_API_KEY")} link={{ href: "https://aistudio.google.com/", label: "Abrir AI Studio" }} />,
          <Card key="o" icon={RiRobot2Line} title="OpenRouter" text="Respaldo con modelos gratuitos si se agota la cuota de Gemini." state={st(providers?.openrouter)} stateText={label(providers?.openrouter, "OPENROUTER_API_KEY")} link={{ href: "https://openrouter.ai/keys", label: "Gestionar claves" }} />,
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
