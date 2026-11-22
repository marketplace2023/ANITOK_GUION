"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

// Aceternity UI · Text Generate Effect
// Ajustado para AnimeTok: retardo por palabra configurable (los guiones largos
// tienen cientos de palabras) y tipografía heredada del contenedor.
export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  staggerDelay = 0.2,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  staggerDelay?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  useEffect(() => {
    animate(
      "span",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration: duration ? duration : 1, delay: stagger(staggerDelay) }
    );
  }, [scope.current, words]);

  return (
    <div className={cn(className)}>
      <motion.div ref={scope} key={words}>
        {wordsArray.map((word, idx) => (
          <motion.span key={word + idx} className="opacity-0" style={{ filter: filter ? "blur(10px)" : "none" }}>
            {word}{" "}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};
