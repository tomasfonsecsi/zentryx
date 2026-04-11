"use client";

import type { BridgeTransaction } from "@/types";
import { getChainById } from "@/lib/chains";
import { cn } from "@/lib/utils";

interface PendingTransfersProps {
  transactions: BridgeTransaction[];
  onResume: (tx: BridgeTransaction) => void;
}

function statusLabel(tx: BridgeTransaction): { text: string; color: string; actionable: boolean } {
  if (tx.status === "completed") return { text: "Completed", color: "text-status-green-text", actionable: false };
  if (tx.status === "failed") return { text: "Failed", color: "text-status-red-text", actionable: false };
  if (tx.attestationMessage && tx.attestationSignature) {
    return { text: "Ready to mint", color: "text-accent", actionable: true };
  }
  if (tx.status === "attesting") return { text: "Awaiting attestation", color: "text-status-amber-text", actionable: false };
  if (tx.txHash) return { text: "Burn confirmed", color: "text-status-amber-text", actionable: false };
  return { text: "Pending", color: "text-txt-2", actionable: false };
}

function elapsedStr(tx: BridgeTransaction): string {
  if (!tx.elapsed) return "";
  const m = Math.floor(tx.elapsed / 60);
  const s = tx.elapsed % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function PendingTransfers({ transactions, onResume }: PendingTransfersProps) {
  // Show non-completed, non-idle transfers
  const pending = transactions.filter(
    (t) => t.status !== "completed" && t.status !== "idle"
  );

  if (pending.length === 0) return null;

  return (
    <div className="mb-5 animate-fade-up">
      <h3 className="text-[11px] text-txt-2 font-semibold uppercase tracking-[0.1em] mb-3 px-1">
        Pending transfers
      </h3>
      <div className="space-y-2">
        {pending.map((tx) => {
          const src = getChainById(tx.sourceChainId);
          const dst = getChainById(tx.destChainId);
          const st = statusLabel(tx);
          const dateStr = new Date(tx.date).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          });

          return (
            <div
              key={tx.id}
              className={cn(
                "z-card rounded-btn px-4 py-3.5 flex items-center gap-3 transition-all duration-300 opacity-80 hover:opacity-100",
                st.actionable && "cursor-pointer hover:border-accent/20 hover:shadow-[0_0_20px_rgba(59,158,255,0.08)]"
              )}
              onClick={() => { if (st.actionable) onResume(tx); }}
            >
              {/* Status dot */}
              <div className={cn("w-2 h-2 rounded-full shrink-0",
                tx.status === "failed" ? "bg-status-red" :
                st.actionable ? "bg-accent" :
                "bg-status-amber animate-pulse"
              )} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <span>{src?.short || "?"} → {dst?.short || "?"}</span>
                  <span className="text-txt-3 font-mono text-[12px]">{tx.amount} USDC</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] mt-0.5">
                  <span className={st.color}>{st.text}</span>
                  {tx.elapsed > 0 && <span className="text-txt-3">· {elapsedStr(tx)}</span>}
                  <span className="text-txt-3">· {dateStr}</span>
                </div>
              </div>

              {/* Action */}
              {st.actionable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onResume(tx); }}
                  className="text-[11px] font-semibold text-accent bg-accent-dim px-3 py-1.5 rounded-full border border-accent/15 hover:bg-accent-strong transition-colors shrink-0"
                >
                  Complete mint
                </button>
              )}

              {tx.status === "failed" && (
                <span className="text-[10px] text-status-red-text font-medium uppercase tracking-wider shrink-0">
                  Failed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
