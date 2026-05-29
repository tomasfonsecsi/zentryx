"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import type { EIP1193Provider } from "viem";

import { SUPPORTED_CHAINS, getChainById } from "@/lib/chains";
import { executeMintOnly } from "@/lib/cctp";
import { useHistoryStore } from "@/store";
import { cn } from "@/lib/utils";
import type { ChainConfig } from "@/types";

// ---------------------------------------------------------------------------
// Iris response inspection — minimal, contained here so the recovery flow
// has no dependency on the main bridge engine.
// ---------------------------------------------------------------------------

interface IrisMessage {
  status: string;
  message?: string;
  attestation?: string;
  eventNonce?: string;
  delayReason?: string | null;
  expirationBlock?: string | number;
}

type RecoveryStatus =
  | "idle"
  | "checking"
  | "not_found"
  | "pending"
  | "ready_to_mint"
  | "expired"
  | "minting"
  | "minted"
  | "error";

interface RecoveryState {
  status: RecoveryStatus;
  message?: string;
  irisStatus?: string;
  delayReason?: string | null;
  expirationBlock?: string | number;
  attestationMessage?: string;
  attestationSignature?: string;
  mintTxHash?: string;
}

async function fetchIris(
  sourceDomain: number,
  burnTxHash: string,
): Promise<IrisMessage | null> {
  const res = await fetch(
    `/api/attestation?sourceDomain=${sourceDomain}&transactionHash=${burnTxHash}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { messages?: IrisMessage[] };
  return data.messages?.[0] ?? null;
}

// Quick lookup of source-chain domain numbers — kept in step with src/lib/cctp.ts.
const DOMAIN_BY_CHAIN_ID: Record<number, number> = {
  11155111: 0,   // sepolia
  84532: 6,      // base sepolia
  421614: 3,     // arbitrum sepolia
  5042002: 26,   // arc testnet
};

// ---------------------------------------------------------------------------
// Visual status mapping — uses existing Zentryx CSS tokens.
// ---------------------------------------------------------------------------

function statusVisuals(s: RecoveryStatus): {
  label: string;
  tone: string;
  dot: string;
} {
  switch (s) {
    case "ready_to_mint":
      return { label: "Ready to mint", tone: "text-accent", dot: "bg-accent" };
    case "minted":
      return { label: "Minted", tone: "text-status-green-text", dot: "bg-status-green" };
    case "minting":
      return { label: "Minting…", tone: "text-status-amber-text", dot: "bg-status-amber animate-pulse" };
    case "pending":
      return { label: "Awaiting attestation", tone: "text-status-amber-text", dot: "bg-status-amber animate-pulse" };
    case "expired":
      return { label: "Attestation expired", tone: "text-status-red-text", dot: "bg-status-red" };
    case "not_found":
      return { label: "Not found", tone: "text-txt-3", dot: "bg-txt-3" };
    case "error":
      return { label: "Error", tone: "text-status-red-text", dot: "bg-status-red" };
    case "checking":
      return { label: "Checking…", tone: "text-txt-2", dot: "bg-txt-3 animate-pulse" };
    case "idle":
      return { label: "Idle", tone: "text-txt-3", dot: "bg-txt-3" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecoveryCard() {
  const { address, isConnected, connector } = useAccount();
  const { updateTransaction, transactions } = useHistoryStore();

  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [sourceChain, setSourceChain] = useState<ChainConfig | null>(null);
  const [destChain, setDestChain] = useState<ChainConfig | null>(null);
  const [state, setState] = useState<RecoveryState>({ status: "idle" });

  const reset = useCallback(() => {
    setHash("");
    setState({ status: "idle" });
  }, []);

  // -------------------------------------------------------------------------
  // Inspect — read-only probe against Iris.
  // -------------------------------------------------------------------------

  const inspect = useCallback(async () => {
    setState({ status: "checking" });

    if (!isConnected || !address) {
      setState({ status: "error", message: "Connect your wallet first." });
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash.trim())) {
      setState({
        status: "error",
        message: "Burn tx hash should be 0x followed by 64 hex characters.",
      });
      return;
    }
    if (!sourceChain) {
      setState({ status: "error", message: "Select the source chain." });
      return;
    }
    if (!destChain) {
      setState({ status: "error", message: "Select the destination chain." });
      return;
    }

    const domain = DOMAIN_BY_CHAIN_ID[sourceChain.chainId];
    if (domain === undefined) {
      setState({ status: "error", message: "Unsupported source chain." });
      return;
    }

    try {
      const iris = await fetchIris(domain, hash.trim());
      if (!iris) {
        setState({
          status: "not_found",
          message:
            "No Iris record yet. Either the hash is wrong, the wrong source chain is selected, " +
            "or Circle hasn't observed the burn yet (try again in 10-20 seconds).",
        });
        return;
      }

      if ((iris.delayReason || "").toLowerCase() === "expired") {
        setState({
          status: "expired",
          message:
            "The attestation passed its expiration block. Your USDC is still safe — the burn is on-chain. " +
            "Circle can re-issue an attestation; if it doesn't auto-refresh, contact Circle support with this burn tx.",
          irisStatus: iris.status,
          delayReason: iris.delayReason,
          expirationBlock: iris.expirationBlock,
        });
        return;
      }

      if (iris.status === "complete" && iris.message && iris.attestation) {
        setState({
          status: "ready_to_mint",
          message: "Attestation is ready. Click 'Mint now' to complete the transfer.",
          irisStatus: iris.status,
          expirationBlock: iris.expirationBlock,
          attestationMessage: iris.message,
          attestationSignature: iris.attestation,
        });
        return;
      }

      setState({
        status: "pending",
        message:
          iris.delayReason
            ? `Attestation pending (${iris.delayReason}). Usually clears within 10-20 seconds for fast transfers.`
            : "Attestation pending. Usually clears within 10-20 seconds for fast transfers.",
        irisStatus: iris.status,
        delayReason: iris.delayReason,
        expirationBlock: iris.expirationBlock,
      });
    } catch (err: any) {
      setState({
        status: "error",
        message: err?.message || "Failed to fetch attestation status.",
      });
    }
  }, [hash, sourceChain, destChain, isConnected, address]);

  // -------------------------------------------------------------------------
  // Mint — uses the original executeMintOnly. No BridgeKit involved.
  // -------------------------------------------------------------------------

  const mintNow = useCallback(async () => {
    if (
      !state.attestationMessage ||
      !state.attestationSignature ||
      !destChain ||
      !connector ||
      !address
    ) {
      return;
    }
    setState({ ...state, status: "minting" });

    try {
      const provider = (await connector.getProvider()) as EIP1193Provider;
      const mintTx = await executeMintOnly(
        destChain,
        state.attestationMessage as `0x${string}`,
        state.attestationSignature as `0x${string}`,
        address,
        provider,
      );
      setState({ ...state, status: "minted", mintTxHash: mintTx });

      // If this burn hash matches one of the user's history rows, mark it complete.
      const match = transactions.find((t) => t.txHash === hash.trim());
      if (match) {
        updateTransaction(match.id, {
          status: "completed",
          attestationMessage: state.attestationMessage,
          attestationSignature: state.attestationSignature,
        });
      }
    } catch (err: any) {
      setState({
        ...state,
        status: "error",
        message: err?.shortMessage || err?.message || "Mint failed.",
      });
    }
  }, [state, destChain, connector, address, hash, transactions, updateTransaction]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-5 px-4 py-3.5 z-card rounded-btn text-[13px] text-txt-2 hover:text-txt-1 transition-colors text-left flex items-center justify-between gap-3"
      >
        <span className="flex items-center gap-2.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-txt-3"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Recover or complete a previous transfer</span>
        </span>
        <span className="text-txt-3 text-[11px] font-medium uppercase tracking-wider">Open</span>
      </button>
    );
  }

  const v = statusVisuals(state.status);
  const isBusy = state.status === "checking" || state.status === "minting";
  const canMint =
    state.status === "ready_to_mint" &&
    !!state.attestationMessage &&
    !!state.attestationSignature;

  return (
    <div className="mt-5 z-card rounded-btn px-5 py-5 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-txt-1">Recover transfer</h3>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-txt-3 hover:text-txt-1 text-[11px] uppercase tracking-wider"
        >
          Close
        </button>
      </div>

      <p className="text-[12px] text-txt-3 leading-relaxed mb-4">
        Paste the burn transaction hash from a previous transfer. We&apos;ll check Circle&apos;s
        attestation service and let you complete the mint if it&apos;s ready.
      </p>

      <label className="block text-[11px] uppercase tracking-wider text-txt-3 font-semibold mb-2">
        Burn transaction hash
      </label>
      <input
        type="text"
        value={hash}
        onChange={(e) => setHash(e.target.value)}
        placeholder="0x…"
        spellCheck={false}
        className="w-full z-input rounded-btn px-4 py-3 text-[13px] font-mono text-white placeholder:text-txt-3/40 mb-4"
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-txt-3 font-semibold mb-2">
            Source chain
          </label>
          <select
            value={sourceChain?.id ?? ""}
            onChange={(e) => setSourceChain(getChainById(e.target.value) || null)}
            className="w-full z-input rounded-btn px-3 py-3 text-[13px] text-txt-1"
          >
            <option value="">Select…</option>
            {SUPPORTED_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-txt-3 font-semibold mb-2">
            Destination chain
          </label>
          <select
            value={destChain?.id ?? ""}
            onChange={(e) => setDestChain(getChainById(e.target.value) || null)}
            className="w-full z-input rounded-btn px-3 py-3 text-[13px] text-txt-1"
          >
            <option value="">Select…</option>
            {SUPPORTED_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          disabled={isBusy || !hash || !sourceChain || !destChain}
          onClick={inspect}
          className="flex-1 py-3 z-btn-primary rounded-btn text-[13px]"
        >
          {state.status === "checking" ? "Checking…" : "Check status"}
        </button>
        {state.status !== "idle" && (
          <button
            onClick={reset}
            className="px-4 py-3 rounded-btn text-[12px] text-txt-2 hover:text-txt-1 border border-border-subtle"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status panel */}
      {state.status !== "idle" && (
        <div
          className="rounded-btn px-4 py-4 mb-3"
          style={{
            background: "rgba(3,7,16,0.6)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn("w-2 h-2 rounded-full", v.dot)} />
            <span className={cn("text-[13px] font-semibold", v.tone)}>{v.label}</span>
          </div>
          {state.message && (
            <p className="text-[12px] text-txt-2 leading-relaxed mb-3">{state.message}</p>
          )}
          {(state.irisStatus || state.delayReason || state.expirationBlock !== undefined) && (
            <div className="space-y-1.5 text-[11px]">
              {state.irisStatus && <Detail label="Iris status" value={state.irisStatus} />}
              {state.delayReason && <Detail label="Delay reason" value={state.delayReason} />}
              {state.expirationBlock !== undefined && (
                <Detail label="Expiration block" value={String(state.expirationBlock)} />
              )}
              {state.mintTxHash && (
                <Detail label="Mint tx" value={shortHash(state.mintTxHash)} mono />
              )}
            </div>
          )}
        </div>
      )}

      {canMint && (
        <button
          disabled={isBusy}
          onClick={mintNow}
          className="w-full py-[14px] z-btn-primary rounded-btn text-[13px]"
        >
          {state.status === "minting" ? "Submitting mint…" : `Mint now on ${destChain?.name}`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-txt-3">{label}</span>
      <span className={cn("text-txt-1", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function shortHash(h: string): string {
  if (!h || h.length < 12) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}
