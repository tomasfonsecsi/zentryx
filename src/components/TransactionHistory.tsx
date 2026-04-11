"use client";

import { useState } from "react";
import type { BridgeTransaction } from "@/types";
import { getChainById } from "@/lib/chains";
import { shortenAddress, cn } from "@/lib/utils";

interface TransactionHistoryProps {
  transactions: BridgeTransaction[];
}

const COLLAPSED_COUNT = 3;

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (txDay.getTime() === today.getTime()) return "Today";
  if (txDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(txs: BridgeTransaction[]): { label: string; items: BridgeTransaction[] }[] {
  const map = new Map<string, BridgeTransaction[]>();
  for (const tx of txs) {
    const label = dateLabel(tx.date);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(tx);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function statusConfig(status: string): { label: string; color: string; dot: string } {
  switch (status) {
    case "completed": return { label: "Completed", color: "text-emerald-400", dot: "bg-emerald-400" };
    case "failed": return { label: "Failed", color: "text-red-400", dot: "bg-red-400" };
    default: return { label: "Pending", color: "text-amber-400", dot: "bg-amber-400" };
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(s: number): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function TxRow({ tx }: { tx: BridgeTransaction }) {
  const [expanded, setExpanded] = useState(false);
  const src = getChainById(tx.sourceChainId);
  const dst = getChainById(tx.destChainId);
  const st = statusConfig(tx.status);
  const explorer = src?.explorerUrl;

  return (
    <div
      className="rounded-[10px] transition-all duration-200 hover:bg-white/[0.02] cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Route icon */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(59,158,255,0.06)", border: "1px solid rgba(59,158,255,0.08)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(59,158,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
          </svg>
        </div>

        {/* Left: route + time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-txt-1">{src?.short || "?"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-txt-3 shrink-0">
              <path d="M5 12h14" /><polyline points="12 5 19 12 12 19" />
            </svg>
            <span className="text-[13px] font-medium text-txt-1">{dst?.short || "?"}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-txt-3">{formatTime(tx.date)}</span>
            {tx.txHash && explorer && (
              <>
                <span className="text-txt-3 opacity-30 text-[10px]">·</span>
                <a
                  href={`${explorer}/tx/${tx.txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-accent/50 font-mono hover:text-accent transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortenAddress(tx.txHash)}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Right: amount + status */}
        <div className="text-right shrink-0">
          <div className="text-[13px] font-semibold font-mono text-txt-1">{tx.amount} <span className="text-txt-3 text-[11px] font-normal">USDC</span></div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
            <span className={cn("text-[10px] font-medium", st.color)}>{st.label}</span>
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={cn("text-txt-3/40 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="rounded-[8px] px-3 py-2.5" style={{ background: "rgba(3,7,16,0.5)", border: "1px solid rgba(255,255,255,0.03)" }}>
            {/* Steps */}
            <div className="grid grid-cols-4 gap-1 mb-2.5">
              {["Approve", "Burn", "Attest", "Mint"].map((step, i) => {
                const done = tx.status === "completed" || (tx.status !== "failed" && (
                  (i === 0) ||
                  (i === 1 && tx.txHash) ||
                  (i === 2 && tx.attestationMessage) ||
                  false
                ));
                const failed = tx.status === "failed";
                return (
                  <div key={step} className="text-center">
                    <div className={cn(
                      "w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center text-[9px] font-bold",
                      done ? "bg-emerald-400/15 text-emerald-400" :
                      failed ? "bg-red-400/10 text-red-400/60" :
                      "bg-white/[0.03] text-txt-3/40"
                    )}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="text-[9px] text-txt-3">{step}</div>
                  </div>
                );
              })}
            </div>

            {/* Meta */}
            <div className="space-y-1.5">
              {tx.elapsed > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-txt-3">Duration</span>
                  <span className="text-txt-2 font-mono">{formatElapsed(tx.elapsed)}</span>
                </div>
              )}
              {tx.txHash && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-txt-3">Burn tx</span>
                  <a
                    href={`${explorer}/tx/${tx.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-accent/60 font-mono hover:text-accent transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  </a>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span className="text-txt-3">Status</span>
                <span className={cn("font-medium", st.color)}>{st.label}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(59,158,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <p className="text-[13px] text-txt-3">No transactions yet</p>
      </div>
    );
  }

  const visibleTxs = expanded ? transactions : transactions.slice(0, COLLAPSED_COUNT);
  const hiddenCount = transactions.length - COLLAPSED_COUNT;
  const showToggle = transactions.length > COLLAPSED_COUNT;

  const groups = groupByDate(visibleTxs);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          <div className="text-[10px] text-txt-3 font-semibold uppercase tracking-[0.12em] px-3 mb-1.5">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      ))}

      {showToggle && (
        <div className="flex justify-center mt-5">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] text-accent/60 hover:text-accent transition-colors duration-200 rounded-btn"
          >
            <span>{expanded ? "View less" : `View more (${hiddenCount})`}</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"
              className={cn("transition-transform duration-200", expanded && "rotate-180")}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
