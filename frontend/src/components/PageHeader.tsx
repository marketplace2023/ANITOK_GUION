import type { ReactNode } from "react";
import { BlurFade } from "@/components/ui/blur-fade";

export default function PageHeader({ eyebrow, title, highlight, subtitle, action }: {
  eyebrow: string; title: string; highlight?: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <BlurFade className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-[#9c87e8]">
          <span className="h-px w-5 bg-[#9c87e8]" /> {eyebrow}
        </div>
        <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
          {title} {highlight && <span className="text-gradient">{highlight}</span>}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </BlurFade>
  );
}
