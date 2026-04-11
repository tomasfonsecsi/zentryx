"use client";

import type { TxStep, ChainConfig } from "@/types";
import { shortenAddress } from "@/lib/utils";

interface SuccessModalProps {
  status: "completed" | "failed";
  sourceChain: ChainConfig;
  destChain: ChainConfig;
  amount: string;
  steps: TxStep[];
  onNewTransfer: () => void;
  onClose: () => void;
}

export function SuccessModal({ status, sourceChain, destChain, amount, steps, onNewTransfer, onClose }: SuccessModalProps) {
  const isSuccess = status === "completed";
  const mintStep = steps.find((s) => s.key === "mint");
  const burnStep = steps.find((s) => s.key === "burn");
  const explorer = destChain.explorerUrl;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-5 z-overlay-enter">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(1,3,8,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[400px] rounded-card p-8 z-modal-enter"
        style={{
          background: "linear-gradient(168deg, rgba(14,28,56,0.95) 0%, rgba(8,16,38,0.9) 50%, rgba(4,9,22,0.88) 100%)",
          border: `1px solid ${isSuccess ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
          boxShadow: isSuccess
            ? "0 0 80px -12px rgba(16,185,129,0.1), 0 0 160px -30px rgba(59,158,255,0.06), 0 30px 60px -12px rgba(0,0,0,0.6)"
            : "0 0 80px -12px rgba(239,68,68,0.08), 0 30px 60px -12px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-[-1px] left-[15%] right-[15%] h-[1px] rounded-full"
          style={{
            background: isSuccess
              ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)"
              : "linear-gradient(90deg, transparent, rgba(248,113,113,0.4), transparent)",
          }}
        />

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: isSuccess ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `2px solid ${isSuccess ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
              boxShadow: isSuccess ? "0 0 32px rgba(16,185,129,0.12)" : "0 0 32px rgba(239,68,68,0.1)",
            }}
          >
            {isSuccess ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[20px] font-semibold text-center mb-1.5 text-txt-1">
          {isSuccess ? "Bridge complete" : "Bridge failed"}
        </h3>
        <p className="text-[13px] text-txt-2 text-center mb-6">
          {isSuccess
            ? `${amount} USDC minted on ${destChain.name}`
            : "An error occurred during the transfer"}
        </p>

        {/* Tx links */}
        {(burnStep?.txHash || mintStep?.txHash) && (
          <div className="rounded-btn px-4 py-3 mb-6 space-y-2" style={{ background: "rgba(3,7,16,0.5)", border: "1px solid rgba(255,255,255,0.03)" }}>
            {burnStep?.txHash && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-txt-3">Burn tx</span>
                <a href={`${sourceChain.explorerUrl}/tx/${burnStep.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-accent/60 font-mono hover:text-accent transition-colors inline-flex items-center gap-1">
                  {shortenAddress(burnStep.txHash)}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}
            {mintStep?.txHash && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-txt-3">Mint tx</span>
                <a href={`${explorer}/tx/${mintStep.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-accent/60 font-mono hover:text-accent transition-colors inline-flex items-center gap-1">
                  {shortenAddress(mintStep.txHash)}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          <button onClick={onNewTransfer} className="w-full z-btn-primary py-3.5 rounded-btn text-[14px]">
            New transfer
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-btn text-[13px] text-txt-2 hover:text-txt-1 transition-colors duration-200"
            style={{ border: "1px solid rgba(255,255,255,0.04)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
