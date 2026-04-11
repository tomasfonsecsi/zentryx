"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, title, className, elevated }: CardProps) {
  return (
    <div className={cn(
      "rounded-card p-6 mb-5 animate-fade-up overflow-hidden",
      elevated ? "z-card-elevated" : "z-card",
      className
    )}>
      {title && (
        <h3 className="text-[11px] text-txt-2 font-semibold uppercase tracking-[0.1em] mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
