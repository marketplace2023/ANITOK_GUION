import { useState, type FormEvent } from "react";
import { RiEyeLine, RiEyeOffLine, RiLock2Line, RiMovie2Line, RiUser3Line } from "react-icons/ri";
import { useAuth } from "../auth";
import type { ApiError } from "../api";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Spotlight } from "@/components/ui/spotlight-new";

export default function Login({ reason }: { reason?: "expired" | "not-configured" | "offline" }) {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user.trim() || !password) { setError("Escribe usuario y contraseña."); return; }
    setBusy(true); setError("");
    try { await login(user.trim(), password); }
    catch (err) { setError((err as ApiError).message || "No se pudo iniciar sesión."); setPassword(""); }
    finally { setBusy(false); }
  }

  const inputCls = "h-13 w-full rounded-xl border border-line-strong bg-ink/70 pl-11 pr-4 text-white outline-none transition placeholder:text-subtle focus:border-violet";

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <Spotlight width={480} height={1000} smallWidth={200} translateY={-300} duration={10} />
      <DotPattern className="text-violet/20 [mask-image:radial-gradient(420px_circle_at_50%_30%,white,transparent)]" />

      <BlurFade className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-violet to-[#4c35b5] shadow-[0_12px_40px_-8px_#8b5cf6]">
            <RiMovie2Line className="size-8 text-white" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">AnimeTok <span className="text-gradient">AI</span></h1>
          <p className="mt-1.5 text-sm text-muted">Tu estudio privado de guiones para TikTok</p>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-line bg-panel/90 p-5 backdrop-blur sm:p-6">
          {reason === "expired" && <Notice tone="info">Tu sesión ha caducado. Vuelve a entrar.</Notice>}
          {reason === "offline" && <Notice tone="warn">No hay conexión con el servidor. Comprueba que el backend esté encendido.</Notice>}
          {reason === "not-configured" && (
            <Notice tone="warn">
              El login aún no está configurado. En tu ordenador ejecuta <code className="rounded bg-ink px-1">npm run set-password -w backend</code> y reinicia la app.
              En Netlify, añade <code className="rounded bg-ink px-1">APP_USER</code>, <code className="rounded bg-ink px-1">APP_PASSWORD_HASH</code> y <code className="rounded bg-ink px-1">AUTH_SECRET</code>.
            </Notice>
          )}

          <label className="grid gap-2">
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#a3acc0]">USUARIO</span>
            <span className="relative">
              <RiUser3Line className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" />
              <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="admin" className={inputCls} />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#a3acc0]">CONTRASEÑA</span>
            <span className="relative">
              <RiLock2Line className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" className={`${inputCls} pr-12`} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted active:bg-panel-2">
                {show ? <RiEyeOffLine className="size-5" /> : <RiEyeLine className="size-5" />}
              </button>
            </span>
          </label>

          {error && <div role="alert" className="rounded-xl border border-[#743b49] bg-[#321c28] p-3 text-sm text-danger">{error}</div>}

          <ShimmerButton type="submit" disabled={busy || reason === "not-configured"} background="linear-gradient(100deg,#8b5cf6,#6247d6)" className="mt-1 h-13 w-full text-base font-semibold disabled:opacity-50">
            {busy ? "Entrando…" : "Entrar"}
          </ShimmerButton>
        </form>
        <p className="mt-5 text-center text-xs text-subtle">Acceso privado · la sesión dura 30 días en este dispositivo</p>
      </BlurFade>
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div className={tone === "warn" ? "rounded-xl border border-[#5c4520] bg-[#2b2214] p-3 text-sm leading-relaxed text-[#ffcf8a]" : "rounded-xl border border-violet/30 bg-violet-deep/60 p-3 text-sm text-violet-soft"}>
      {children}
    </div>
  );
}
