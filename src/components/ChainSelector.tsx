"use client";

import { useState, useRef, useEffect } from "react";
import type { ChainConfig } from "@/types";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { cn } from "@/lib/utils";

interface ChainSelectorProps {
  label: string;
  selected: ChainConfig;
  exclude: ChainConfig;
  onChange: (chain: ChainConfig) => void;
}

export function ChainSelector({ label, selected, exclude, onChange }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = SUPPORTED_CHAINS.filter((c) => c.id !== exclude.id);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-btn px-4 py-[14px] text-left group outline-none z-input"
      >
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] leading-tight" style={{ color: "var(--z-text-3)" }}>{label}</div>
          <div className="text-[15px] font-medium mt-1" style={{ color: "var(--z-text-1)" }}>{selected.name}</div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={cn("transition-all duration-150 shrink-0", open && "rotate-180")}
          style={{ color: "var(--z-text-3)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-btn p-1.5 z-50 animate-fade-in"
          style={{
            background: "var(--z-dropdown-bg)",
            border: "1px solid var(--z-border-card)",
            boxShadow: "0 16px 48px -8px rgba(0,0,0,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {available.map((chain) => (
            <button
              key={chain.id}
              onClick={() => { onChange(chain); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 rounded-xs text-[14px] font-medium transition-colors duration-100 outline-none"
              style={{ color: "var(--z-text-2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--z-text-1)"; e.currentTarget.style.background = "rgba(59,158,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--z-text-2)"; e.currentTarget.style.background = "transparent"; }}
            >
              {chain.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
