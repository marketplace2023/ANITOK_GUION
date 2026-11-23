import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import type { IconType } from "react-icons";
import {
  RiBookmark3Fill, RiBookmark3Line, RiCompass3Fill, RiCompass3Line, RiHome5Fill, RiHome5Line,
  RiMagicFill, RiMagicLine, RiMovie2Line, RiNewspaperFill, RiNewspaperLine, RiSettings4Fill, RiSettings4Line,
} from "react-icons/ri";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import News from "./pages/News";
import { cn } from "@/lib/utils";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import Generator from "./pages/Generator";
import Library from "./pages/Library";
import Settings from "./pages/Settings";

type NavItem = { to: string; label: string; short: string; icon: IconType; activeIcon: IconType; mobile?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Inicio", short: "Inicio", icon: RiHome5Line, activeIcon: RiHome5Fill },
  { to: "/catalog", label: "Explorar anime", short: "Explorar", icon: RiCompass3Line, activeIcon: RiCompass3Fill },
  { to: "/generator", label: "Generador IA", short: "Crear", icon: RiMagicLine, activeIcon: RiMagicFill },
  { to: "/news", label: "Noticias", short: "Noticias", icon: RiNewspaperLine, activeIcon: RiNewspaperFill },
  { to: "/library", label: "Mis guiones", short: "Guiones", icon: RiBookmark3Line, activeIcon: RiBookmark3Fill, mobile: false },
  { to: "/settings", label: "Configuración", short: "Ajustes", icon: RiSettings4Line, activeIcon: RiSettings4Fill },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-violet to-[#4c35b5] shadow-[0_8px_25px_-6px_#8b5cf6]">
        <RiMovie2Line className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <b className="font-display text-lg font-bold tracking-tight">AnimeTok <span className="text-violet-soft">AI</span></b>
        {!compact && <small className="block text-[11px] tracking-[0.18em] text-subtle">CREATOR STUDIO</small>}
      </div>
    </div>
  );
}

export default function App() {
  const { state } = useAuth();
  if (state.status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="grid size-14 animate-pulse place-items-center rounded-2xl bg-linear-to-br from-violet to-[#4c35b5]"><RiMovie2Line className="size-7 text-white" /></div>
      </div>
    );
  }
  if (state.status === "anonymous") return <Login reason={state.reason} />;
  return <Shell />;
}

function Shell() {
  const location = useLocation();
  // Cuerpo entre llaves: en Chrome reciente scrollTo devuelve una Promise y React
  // la interpretaría como función de limpieza del efecto (rompe la navegación).
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  const isActive = (to: string) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <div className="min-h-dvh">
      {/* Escritorio: barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-[#0d1019]/95 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2"><Brand /></div>
        <nav className="mt-10 grid gap-1.5">
          {nav.map((item) => {
            const active = isActive(item.to);
            const Icon = active ? item.activeIcon : item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "text-violet-soft" : "text-muted hover:bg-panel-2 hover:text-white"
              )}>
                {active && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl border border-violet/30 bg-linear-to-r from-violet-deep to-[#1d1a30]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <Icon className="relative size-5" />
                <span className="relative">{item.label}</span>
                {item.to === "/generator" && <i className="relative ml-auto rounded-md bg-violet/25 px-1.5 py-0.5 text-[10px] font-bold not-italic text-violet-soft">IA</i>}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#29253e] bg-linear-to-br from-[#1b1830] to-[#141827] p-4">
          <b className="text-sm">Tu estudio creativo</b>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">Convierte cada anime en una idea para tu próximo TikTok.</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        {/* Móvil: barra superior */}
        <header className="pt-safe sticky top-0 z-20 border-b border-line/70 bg-ink/80 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Brand compact />
            <span className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[11px] font-medium text-muted">
              <span className="size-2 rounded-full bg-mint shadow-[0_0_10px_#34d399]" /> En línea
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
          <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/news" element={<News />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          </ErrorBoundary>
        </main>
        <footer className="hidden border-t border-line px-10 py-4 text-[11px] tracking-widest text-subtle lg:flex lg:justify-between">
          <span>ANIMETOK AI <i className="not-italic text-violet">•</i> CREATOR STUDIO</span>
          <span>AniList · Gemini · OpenRouter</span>
        </footer>
      </div>

      {/* Móvil: barra de pestañas inferior */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-[#0b0e16]/90 backdrop-blur-xl lg:hidden" aria-label="Navegación principal">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
          {nav.filter((item) => item.mobile !== false).map((item) => {
            const active = isActive(item.to);
            const Icon = active ? item.activeIcon : item.icon;
            if (item.to === "/generator") {
              return (
                <NavLink key={item.to} to={item.to} aria-label={item.label} className="flex flex-col items-center gap-1">
                  <span className={cn(
                    "-mt-7 grid size-14 place-items-center rounded-2xl border-4 border-ink bg-linear-to-br from-violet to-[#5b43c8] text-white shadow-[0_10px_28px_-6px_#8b5cf6] transition-transform active:scale-95",
                    active && "ring-2 ring-violet-soft/60"
                  )}>
                    <Icon className="size-6" />
                  </span>
                  <span className={cn("text-[11px] font-semibold", active ? "text-violet-soft" : "text-muted")}>{item.short}</span>
                </NavLink>
              );
            }
            return (
              <NavLink key={item.to} to={item.to} aria-label={item.label} className="relative flex h-full flex-col items-center justify-center gap-1">
                {active && <motion.span layoutId="tab-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-violet-soft" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <Icon className={cn("size-6 transition-colors", active ? "text-violet-soft" : "text-muted")} />
                <span className={cn("text-[11px] font-medium", active ? "text-violet-soft" : "text-muted")}>{item.short}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
