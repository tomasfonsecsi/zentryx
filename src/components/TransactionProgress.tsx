"use client";

import type { TxStep, TxStatus, ChainConfig } from "@/types";
import { formatElapsed, shortenAddress, cn } from "@/lib/utils";

interface TransactionProgressProps {
  steps: TxStep[];
  txStatus: TxStatus;
  elapsed: number;
  sourceChain: ChainConfig;
  destChain: ChainConfig;
  amount: string;
}

function StepIcon({ status }: { status: TxStep["status"] }) {
  if (status === "done") return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
  if (status === "failed") return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if (status === "active") return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>;
  return null;
}

export function TransactionProgress({ steps, txStatus, elapsed, sourceChain, destChain, amount }: TransactionProgressProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-accent-dim/50 rounded-btn px-4 py-3 border border-border-accent/20">
        <span className="text-[12px] font-medium text-accent tracking-wide">{txStatus === "completed" ? "Completed in" : "Elapsed"}</span>
        <span className="text-[15px] font-semibold text-accent font-mono">{formatElapsed(elapsed)}</span>
      </div>

      <div className="flex items-center gap-3 text-[13px] font-medium px-1">
        <span className="text-txt-2">{sourceChain.name}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border-accent to-transparent" />
        <span className="text-txt-2">{destChain.name}</span>
        <span className="font-mono text-txt-1 ml-2">{amount} USDC</span>
      </div>

      <div className="py-1">
        {steps.map((step, i) => {
          const explorerBase = i < 2 ? sourceChain.explorerUrl : destChain.explorerUrl;
          return (
            <div key={step.key} className="flex items-start gap-4 py-3 relative">
              {i < steps.length - 1 && <div className={cn("absolute left-[15px] top-[42px] bottom-[-4px] w-px", step.status === "done" ? "bg-status-green/25" : step.status === "active" ? "bg-accent/25" : "bg-border-subtle")}/>}
              <div className={cn("w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border-2 z-[1] text-xs transition-all duration-300",
                step.status === "done" && "border-status-green text-status-green bg-status-green-bg",
                step.status === "active" && "border-accent text-accent bg-accent-dim animate-pulse-ring",
                step.status === "failed" && "border-status-red text-status-red bg-status-red-bg",
                step.status === "waiting" && "border-border-subtle text-txt-3 bg-bg-app")}>
                {step.status === "waiting" ? <span className="text-[11px] opacity-30">{i+1}</span> : <StepIcon status={step.status} />}
              </div>
              <div className="flex-1 pt-0.5">
                <div className={cn("text-[13px] font-medium", (step.status === "done" || step.status === "active") ? "text-txt-1" : "text-txt-3")}>{step.label}</div>
                <div className={cn("text-[11px] mt-1",
                  step.status === "done" && "text-status-green-text", step.status === "active" && "text-accent-hover",
                  step.status === "failed" && "text-status-red-text", step.status === "waiting" && "text-txt-3")}>
                  {step.status === "done" ? "Confirmed" : step.status === "active" ? step.description : step.status === "failed" ? "Transaction failed" : "Waiting"}
                </div>
                {step.txHash && (
                  <a href={`${explorerBase}/tx/${step.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-accent/60 font-mono mt-1.5 hover:text-accent transition-colors">
                    {shortenAddress(step.txHash)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
