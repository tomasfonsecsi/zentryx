"use client";

import { useState } from "react";
import { Card } from "@/components";
import { cn } from "@/lib/utils";

const FAUCETS = [
  { id: "arc", name: "Arc Testnet", url: "https://faucet.circle.com/" },
  { id: "eth", name: "Ethereum Sepolia", url: "https://www.alchemy.com/faucets/ethereum-sepolia" },
  { id: "arb", name: "Arbitrum Sepolia", url: "https://www.alchemy.com/faucets/arbitrum-sepolia" },
  { id: "base", name: "Base Sepolia", url: "https://www.alchemy.com/faucets/base-sepolia" },
];

export default function FaucetPage() {
  const [selected, setSelected] = useState(FAUCETS[0]);

  return (
    <Card elevated>
      <div className="text-center mb-8">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] mb-1.5">Claim faucet tokens</h2>
        <p className="text-[13px] text-txt-2">Select a network to receive testnet tokens</p>
      </div>

      <div className="space-y-2 mb-6">
        {FAUCETS.map((f) => {
          const active = selected.id === f.id;
          return (
            <button key={f.id} onClick={() => setSelected(f)}
              className={cn("w-full flex items-center px-4 py-3.5 rounded-btn transition-all duration-200 text-left border",
                active ? "bg-accent-dim/50 border-accent/20 shadow-[0_0_16px_rgba(59,158,255,0.06)]" : "bg-bg-input/40 border-border-subtle hover:border-border-hover")}>
              <span className={cn("text-[14px] font-medium flex-1", active ? "text-txt-1" : "text-txt-2")}>{f.name}</span>
              {active && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b9eff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          );
        })}
      </div>

      <a href={selected.url} target="_blank" rel="noopener noreferrer"
        className="z-btn-primary w-full py-[14px] rounded-btn text-[15px] flex items-center justify-center gap-2.5">
        Claim tokens
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </Card>
  );
}
