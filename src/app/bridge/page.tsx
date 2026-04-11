"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card, ChainSelector, TransactionProgress, SuccessModal } from "@/components";
import { useBridge, useHydration } from "@/hooks";
import { useBridgeStore } from "@/store";
import { CCTP_FAST_ESTIMATE_SECONDS } from "@/lib/config";

export default function BridgePage() {
  const { isConnected } = useAccount();
  useHydration();
  const {
    sourceChain, destChain, amount, txStatus, txSteps, elapsed, error,
    balanceChecking, execute, reset,
  } = useBridge();
  const { setSourceChain, setDestChain, setAmount, swapChains } = useBridgeStore();
  const [modalDismissed, setModalDismissed] = useState(false);

  const isActive = txStatus !== "idle" && txStatus !== "completed" && txStatus !== "failed";
  const isFinished = txStatus === "completed" || txStatus === "failed";
  const showModal = isFinished && !modalDismissed;
  const canBridge = isConnected && amount !== "" && parseFloat(amount) > 0 && sourceChain.id !== destChain.id && !balanceChecking;

  const buttonLabel = !isConnected ? "Connect wallet" : !amount || parseFloat(amount) <= 0 ? "Enter amount"
    : sourceChain.id === destChain.id ? "Select different chains" : balanceChecking ? "Checking balance..." : `Bridge ${amount} USDC`;

  const handleNewTransfer = () => { setModalDismissed(false); reset(); };
  const handleCloseModal = () => { setModalDismissed(true); };

  // Active or finished transfer — show steps card (modal overlays on top when finished)
  if (isActive || isFinished) {
    return (
      <>
        <Card elevated title={isActive ? "Transfer in progress" : txStatus === "completed" ? "Transfer complete" : "Transfer failed"}>
          <TransactionProgress
            steps={txSteps} txStatus={txStatus} elapsed={elapsed}
            sourceChain={sourceChain} destChain={destChain} amount={amount}
          />
          {/* Dismissed modal — show inline reset button */}
          {isFinished && modalDismissed && (
            <div className="mt-6 text-center">
              <button onClick={handleNewTransfer} className="z-btn-primary px-8 py-3 rounded-btn text-[14px]">
                New transfer
              </button>
            </div>
          )}
        </Card>

        {showModal && (
          <SuccessModal
            status={txStatus as "completed" | "failed"}
            sourceChain={sourceChain}
            destChain={destChain}
            amount={amount}
            steps={txSteps}
            onNewTransfer={handleNewTransfer}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  // Bridge form
  return (
    <Card elevated>
      <div className="mb-8">
        <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-txt-1">Bridge USDC</h2>
      </div>

      <div className="flex items-center gap-3 mb-7">
        <ChainSelector label="From" selected={sourceChain} exclude={destChain} onChange={setSourceChain} />
        <button
          onClick={swapChains}
          className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center text-txt-3 hover:text-accent hover:border-accent/25 hover:shadow-[0_0_16px_rgba(59,158,255,0.1)] transition-all duration-200 hover:rotate-180 shrink-0"
          style={{ background: "rgba(3,7,16,0.9)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
            <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
        </button>
        <ChainSelector label="To" selected={destChain} exclude={sourceChain} onChange={setDestChain} />
      </div>

      <div className="relative mb-7">
        <input
          type="number" placeholder="0.00" min="0" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full z-input rounded-btn px-5 py-5 text-[30px] font-medium font-mono text-white placeholder:text-txt-3/20"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2.5 text-[14px] text-txt-2 font-medium">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] text-white font-bold"
            style={{ background: "linear-gradient(135deg, #1a6fd4, #2775ca)", boxShadow: "0 0 10px rgba(39,117,202,0.3)" }}>
            $
          </div>
          USDC
        </div>
      </div>

      <div className="mb-7 rounded-btn overflow-hidden" style={{ background: "rgba(3,7,16,0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          ["Protocol", "Circle CCTP v2"],
          ["Speed", `~${CCTP_FAST_ESTIMATE_SECONDS}s (fast)`],
          ["Network fee", "Gas only"],
        ].map(([l, v], i, a) => (
          <div key={l} className={`flex justify-between items-center px-4 py-3 text-[12px] ${i < a.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
            <span className="text-txt-3">{l}</span>
            <span className="text-txt-1 font-medium">{v}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-btn text-[13px] text-status-red-text leading-relaxed"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)" }}>
          {error}
        </div>
      )}

      <button disabled={!canBridge} onClick={execute} className="w-full py-[17px] z-btn-primary rounded-btn text-[15px]">
        {buttonLabel}
      </button>
    </Card>
  );
}
