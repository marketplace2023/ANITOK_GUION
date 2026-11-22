import { Link } from "react-router-dom";
import { RiBookmark3Line, RiSparkling2Fill } from "react-icons/ri";
import PageHeader from "../components/PageHeader";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function Library() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="TU CONTENIDO" title="Mis" highlight="guiones" subtitle="Tu espacio para organizar ideas y contenido creado." />
      <BlurFade delay={0.05}>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-panel/50 px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-violet-deep text-violet-soft"><RiBookmark3Line className="size-6" /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Tu biblioteca está lista</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Guardar guiones se activará al conectar PostgreSQL y el inicio de sesión. Por ahora puedes copiar, compartir o descargar cada guion generado.
          </p>
          <Link to="/generator" className="mt-6 w-full sm:w-auto">
            <ShimmerButton background="linear-gradient(100deg,#8b5cf6,#6247d6)" className="h-12 w-full gap-2 px-6 text-[15px] font-semibold">
              <RiSparkling2Fill className="size-5" /> Crear mi primer guion
            </ShimmerButton>
          </Link>
        </div>
      </BlurFade>
    </div>
  );
}
