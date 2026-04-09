import type { ReactNode } from "react";
import { SPORT_GRADIENTS, type Sport } from "@/lib/sports";

type SportGradientProps = {
  sport: string;
  className?: string;
  children: ReactNode;
};

function SportGradient({ sport, className, children }: SportGradientProps) {
  const gradient = SPORT_GRADIENTS[sport as Sport] ?? SPORT_GRADIENTS.autre;

  return (
    <div style={{ background: gradient }} className={`text-white ${className ?? ""}`}>
      {children}
    </div>
  );
}

export { SportGradient };
