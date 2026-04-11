"use client";

import { useCallback, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import type { EIP1193Provider } from "viem";
import { useBridgeStore, useHistoryStore } from "@/store";
import { executeBridge, executeMintOnly, getUsdcBalance } from "@/lib/cctp";
import { getChainById } from "@/lib/chains";
import type { TxStatus, BridgeTransaction } from "@/types";

let transferCounter = 0;

export function useBridge() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [balanceChecking, setBalanceChecking] = useState(false);

  // Read reactive state for UI rendering
  const {
    sourceChain, destChain, amount, txStatus, txSteps, elapsed, error,
    updateStep, setTxStatus, setElapsed, setError, reset,
  } = useBridgeStore();

  const { addTransaction, updateTransaction } = useHistoryStore();

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [stopTimer, setElapsed]);

  const execute = useCallback(async () => {
    // ============================================================
    // Read ALL state fresh from the store at execution time.
    // Do NOT use closed-over sourceChain/destChain/amount from render.
    // This prevents stale closures on repeated transfers.
    // ============================================================
    const store = useBridgeStore.getState();
    const currentSource = store.sourceChain;
    const currentDest = store.destChain;
    const currentAmount = store.amount;

    const attemptId = ++transferCounter;
    const tag = `[Transfer #${attemptId}]`;

    console.group(`${tag} === NEW TRANSFER ===`);
    console.log("Source:", currentSource.name, "chainId:", currentSource.chainId);
    console.log("Dest:", currentDest.name, "chainId:", currentDest.chainId);
    console.log("Amount:", currentAmount, "USDC");
    console.log("Wallet:", address);
    console.log("Wagmi chainId:", chainId);
    console.groupEnd();

    // Validate
    if (!isConnected || !address) { setError("Connect your wallet first"); return; }
    if (!connector) { setError("Wallet connector not available"); return; }
    if (!currentAmount || parseFloat(currentAmount) <= 0) { setError("Enter a valid amount"); return; }
    if (currentSource.id === currentDest.id) { setError("Source and destination must differ"); return; }

    // ============================================================
    // Kill any stale timer from a previous transfer
    // ============================================================
    stopTimer();

    // ============================================================
    // Clear any previous error state
    // ============================================================
    setError(null);

    // ============================================================
    // Get provider FIRST, before any chain switching
    // ============================================================
    let provider: EIP1193Provider;
    try { provider = (await connector.getProvider()) as EIP1193Provider; }
    catch { setError("Failed to access wallet provider"); return; }

    // ============================================================
    // Force switch to source chain via BOTH wagmi AND the raw provider.
    // This ensures the provider's internal chain state is correct
    // even if a previous transfer left it on a different chain.
    // ============================================================
    console.log(`${tag} Ensuring wallet is on source chain ${currentSource.name} (${currentSource.chainId})`);
    try {
      // Always attempt the switch — don't trust wagmi's cached chainId
      await switchChainAsync({ chainId: currentSource.chainId });
    } catch {
      // Wagmi switch failed — try raw provider switch
      try {
        const hex = `0x${currentSource.chainId.toString(16)}`;
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      } catch {
        setError(`Failed to switch to ${currentSource.name}. Please switch manually.`);
        return;
      }
    }
    // Give the provider time to settle on the new chain
    await new Promise((r) => setTimeout(r, 1000));

    // Verify the provider is actually on the source chain now
    try {
      const providerChainHex = await provider.request({ method: "eth_chainId" }) as string;
      const providerChainId = parseInt(providerChainHex, 16);
      console.log(`${tag} Provider chain after switch: ${providerChainId} (expected: ${currentSource.chainId})`);
      if (providerChainId !== currentSource.chainId) {
        setError(`Wallet is on chain ${providerChainId}, expected ${currentSource.chainId}. Please switch manually.`);
        return;
      }
    } catch {
      console.warn(`${tag} Could not verify provider chain`);
    }

    // ============================================================
    // Balance check
    // ============================================================
    setBalanceChecking(true);
    try {
      const balance = await getUsdcBalance(currentSource.chainId, currentSource.usdcAddress, address as `0x${string}`);
      const balanceNum = parseFloat(balance);
      const amountNum = parseFloat(currentAmount);
      console.log(`${tag} Balance: ${balanceNum} USDC, need: ${amountNum}`);
      if (balanceNum < amountNum) {
        setError(`Insufficient USDC. Have ${balanceNum.toFixed(2)}, need ${amountNum.toFixed(2)}.`);
        setBalanceChecking(false); return;
      }
    } catch (err: any) {
      setError(`Balance check failed: ${err?.shortMessage || err?.message || "Unknown"}`);
      setBalanceChecking(false); return;
    }
    setBalanceChecking(false);

    // ============================================================
    // Start bridge — fresh state in store
    // ============================================================
    const { startBridge: storeStartBridge } = useBridgeStore.getState();
    const txId = storeStartBridge();
    startTimer();

    console.log(`${tag} Store txId: ${txId}`);

    addTransaction({
      id: txId, date: new Date().toISOString(),
      sourceChainId: currentSource.id, destChainId: currentDest.id,
      amount: currentAmount, status: "pending", txHash: null, elapsed: 0,
      attestationMessage: null, attestationSignature: null,
    });

    // ============================================================
    // Execute CCTP bridge — all params taken fresh, not from closure
    // ============================================================
    await executeBridge(
      {
        sourceChain: currentSource,
        destChain: currentDest,
        amount: currentAmount,
        walletAddress: address!,
      },
      provider,
      {
        onStepStart: (index, step) => {
          console.log(`${tag} Step ${step.key}: started`);
          useBridgeStore.getState().updateStep(index, step);
          const m: Record<string, TxStatus> = { approve: "pending", burn: "pending", attestation: "attesting", mint: "minting" };
          useBridgeStore.getState().setTxStatus(m[step.key] || "pending");
        },
        onStepComplete: (index, step) => {
          console.log(`${tag} Step ${step.key}: complete${step.txHash ? ` tx=${step.txHash}` : ""}`);
          useBridgeStore.getState().updateStep(index, step);
          if (step.key === "burn" && step.txHash) {
            updateTransaction(txId, { txHash: step.txHash, status: "attesting" });
          }
        },
        onStepFail: (index, step, errorMsg) => {
          console.error(`${tag} Step ${step.key}: FAILED — ${errorMsg}`);
          useBridgeStore.getState().updateStep(index, step);
          useBridgeStore.getState().setTxStatus("failed");
          useBridgeStore.getState().setError(errorMsg);
          stopTimer();
          const el = Math.floor((Date.now() - startTimeRef.current) / 1000);
          updateTransaction(txId, { status: "failed", elapsed: el });
        },
        onComplete: () => {
          console.log(`${tag} === TRANSFER COMPLETE ===`);
          useBridgeStore.getState().setTxStatus("completed");
          stopTimer();
          const el = Math.floor((Date.now() - startTimeRef.current) / 1000);
          useBridgeStore.getState().setElapsed(el);
          updateTransaction(txId, { status: "completed", elapsed: el });
        },
        onError: (errorMsg) => {
          console.error(`${tag} === TRANSFER ERROR === ${errorMsg}`);
          useBridgeStore.getState().setTxStatus("failed");
          useBridgeStore.getState().setError(errorMsg);
          stopTimer();
          const el = Math.floor((Date.now() - startTimeRef.current) / 1000);
          updateTransaction(txId, { status: "failed", elapsed: el });
        },
        onAttestationReceived: (message: string, attestation: string) => {
          console.log(`${tag} Attestation persisted for resumability`);
          updateTransaction(txId, {
            attestationMessage: message,
            attestationSignature: attestation,
            status: "minting",
          });
        },
      }
    );
  }, [
    // Minimal deps — we read fresh state from store inside the callback
    address, isConnected, connector, chainId,
    switchChainAsync, startTimer, stopTimer,
    addTransaction, updateTransaction, setError, setBalanceChecking,
  ]);

  // Resume mint for a pending transfer that has attestation data
  const resumeMint = useCallback(async (tx: BridgeTransaction) => {
    if (!tx.attestationMessage || !tx.attestationSignature) {
      setError("No attestation data available to resume mint");
      return;
    }
    if (!isConnected || !connector || !address) {
      setError("Connect your wallet to resume");
      return;
    }

    const dst = getChainById(tx.destChainId);
    if (!dst) { setError("Unknown destination chain"); return; }

    let provider: EIP1193Provider;
    try { provider = (await connector.getProvider()) as EIP1193Provider; }
    catch { setError("Failed to access wallet provider"); return; }

    stopTimer();

    const { startBridge: storeStart } = useBridgeStore.getState();
    storeStart();
    const su = useBridgeStore.getState().updateStep;
    const ss = useBridgeStore.getState().setTxStatus;
    const se = useBridgeStore.getState().setError;

    for (let i = 0; i < 3; i++) {
      su(i, { ...useBridgeStore.getState().txSteps[i], status: "done", txHash: i === 1 ? tx.txHash : null });
    }
    ss("minting");
    su(3, { key: "mint", label: "Mint on destination", description: "Resuming mint...", status: "active", txHash: null });
    startTimer();

    try {
      const mintTx = await executeMintOnly(
        dst,
        tx.attestationMessage as `0x${string}`,
        tx.attestationSignature as `0x${string}`,
        address,
        provider
      );
      stopTimer();
      su(3, { key: "mint", label: "Mint on destination", description: "USDC minted", status: "done", txHash: mintTx });
      ss("completed");
      updateTransaction(tx.id, { status: "completed", elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000) });
    } catch (err: any) {
      stopTimer();
      const msg = err?.shortMessage || err?.message || "Mint failed";
      su(3, { key: "mint", label: "Mint on destination", description: msg, status: "failed", txHash: null });
      ss("failed");
      se(msg);
      updateTransaction(tx.id, { status: "failed" });
    }
  }, [isConnected, connector, address, startTimer, stopTimer, updateTransaction, setError]);

  return {
    sourceChain, destChain, amount, txStatus, txSteps, elapsed, error,
    isConnected, balanceChecking, validate: useCallback(() => null, []), execute, reset, resumeMint,
  };
}
