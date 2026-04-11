/**
 * CCTP Bridge — Direct Implementation (official Circle quickstart flow)
 *
 * approve(TokenMessengerV2) → depositForBurn(TokenMessengerV2) →
 * poll attestation(iris API) → receiveMessage(MessageTransmitterV2)
 *
 * Fixes:
 * - Attestation polling correctly assigns variables before exiting
 * - Handles case where mint already happened (Forwarding Service or prior attempt)
 * - Checks destination balance as fallback completion detection
 * - No infinite waiting — timeout with clear error
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  http,
  type Chain,
  type EIP1193Provider,
} from "viem";
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  arcTestnet,
} from "viem/chains";
import type { BridgeParams, TxStep, ChainConfig } from "@/types";
import { USDC_DECIMALS } from "@/lib/config";

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export const BRIDGE_STEPS: Omit<TxStep, "status" | "txHash">[] = [
  { key: "approve", label: "Approve USDC", description: "Granting allowance to TokenMessenger" },
  { key: "burn", label: "Burn on source chain", description: "Calling depositForBurn" },
  { key: "attestation", label: "Circle attestation", description: "Waiting for Circle attestation" },
  { key: "mint", label: "Mint on destination", description: "Calling receiveMessage" },
];

export function createInitialSteps(): TxStep[] {
  return BRIDGE_STEPS.map((s) => ({ ...s, status: "waiting", txHash: null }));
}

// ---------------------------------------------------------------------------
// Chain config
// ---------------------------------------------------------------------------

interface CctpChain {
  chain: Chain;
  domain: number;
  usdc: `0x${string}`;
  tokenMessenger: `0x${string}`;
  messageTransmitter: `0x${string}`;
}

const CCTP: Record<number, CctpChain> = {
  [sepolia.id]: {
    chain: sepolia, domain: 0,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
    messageTransmitter: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  },
  [baseSepolia.id]: {
    chain: baseSepolia, domain: 6,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
    messageTransmitter: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  },
  [arbitrumSepolia.id]: {
    chain: arbitrumSepolia, domain: 3,
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  [arcTestnet.id]: {
    chain: arcTestnet, domain: 26,
    usdc: "0x3600000000000000000000000000000000000000",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
};

const IRIS_API = "https://iris-api-sandbox.circle.com/v2/messages";

// Browser-side attestation polling goes through our Next.js API route
// to avoid CORS blocks from iris-api-sandbox.circle.com.
// The API route at /api/attestation proxies to Iris server-side.
function attestationUrl(srcDomain: number, burnTxHash: string): string {
  // Use our own API route (server-side proxy) — no CORS issues
  return `/api/attestation?sourceDomain=${srcDomain}&transactionHash=${burnTxHash}`;
}

const DEPOSIT_FOR_BURN_ABI = [{
  type: "function" as const, name: "depositForBurn" as const, stateMutability: "nonpayable" as const,
  inputs: [
    { name: "amount", type: "uint256" }, { name: "destinationDomain", type: "uint32" },
    { name: "mintRecipient", type: "bytes32" }, { name: "burnToken", type: "address" },
    { name: "destinationCaller", type: "bytes32" }, { name: "maxFee", type: "uint256" },
    { name: "minFinalityThreshold", type: "uint32" },
  ],
  outputs: [],
}] as const;

const RECEIVE_MESSAGE_ABI = [{
  type: "function" as const, name: "receiveMessage" as const, stateMutability: "nonpayable" as const,
  inputs: [{ name: "message", type: "bytes" }, { name: "attestation", type: "bytes" }],
  outputs: [],
}] as const;

const ZERO_BYTES32: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";

function toBytes32(addr: string): `0x${string}` {
  return `0x000000000000000000000000${addr.slice(2).toLowerCase()}` as `0x${string}`;
}

function makePublicClient(chainId: number) {
  const c = CCTP[chainId];
  if (!c) throw new Error(`No CCTP config for chain ${chainId}`);
  return createPublicClient({
    chain: c.chain,
    transport: chainId === arcTestnet.id ? http("https://rpc.testnet.arc.network") : http(),
  });
}

// ---------------------------------------------------------------------------
// Balance check (exported for useBridge hook)
// ---------------------------------------------------------------------------

export async function getUsdcBalance(
  chainId: number, usdcAddress: `0x${string}`, walletAddress: `0x${string}`
): Promise<string> {
  const client = makePublicClient(chainId);
  const raw = await client.readContract({
    address: usdcAddress, abi: erc20Abi, functionName: "balanceOf", args: [walletAddress],
  });
  return formatUnits(raw, USDC_DECIMALS);
}

// ---------------------------------------------------------------------------
// Error extraction
// ---------------------------------------------------------------------------

function extractError(e: any): string {
  const p: string[] = [];
  let c = e;
  const s = new Set();
  while (c && !s.has(c)) {
    s.add(c);
    if (c.shortMessage && !p.includes(c.shortMessage)) p.push(c.shortMessage);
    if (c.details && !p.includes(c.details)) p.push(c.details);
    if (c.message && p.length === 0) p.push(c.message);
    if (c.data) p.push(`[revert: ${c.data}]`);
    c = c.cause || c.error;
  }
  return p.join(" — ") || "Unknown error";
}

// ---------------------------------------------------------------------------
// Attestation polling — returns { message, attestation } or throws
// ---------------------------------------------------------------------------

interface AttestationResult {
  message: `0x${string}`;
  attestation: `0x${string}`;
}

async function pollAttestation(
  srcDomain: number,
  burnTxHash: string,
  onAttempt: (n: number) => void
): Promise<AttestationResult> {
  const url = attestationUrl(srcDomain, burnTxHash);
  const maxAttempts = 120; // 10 min at 5s intervals

  console.log("[CCTP] Attestation polling via proxy:", url);
  console.log("[CCTP] Source domain:", srcDomain, "Burn tx:", burnTxHash);

  for (let i = 1; i <= maxAttempts; i++) {
    onAttempt(i);

    try {
      const res = await fetch(url);
      const statusCode = res.status;

      if (res.ok) {
        const data = await res.json() as any;
        const msg = data?.messages?.[0];
        const status = msg?.status || "no_message";

        console.log(`[CCTP] Poll #${i}: HTTP ${statusCode}, status="${status}"${msg?.eventNonce ? `, nonce=${msg.eventNonce}` : ""}`);

        // Log full response on first successful poll or when status changes
        if (i === 1 || status === "complete") {
          console.log("[CCTP] Full API response:", JSON.stringify(data).slice(0, 500));
        }

        if (status === "complete" && msg.message && msg.attestation) {
          console.log("[CCTP] Attestation received!");
          console.log("[CCTP] Message (first 80 chars):", msg.message.slice(0, 80));
          console.log("[CCTP] Attestation (first 80 chars):", msg.attestation.slice(0, 80));
          return {
            message: msg.message as `0x${string}`,
            attestation: msg.attestation as `0x${string}`,
          };
        }

        // Log delay reasons if present
        if (msg?.delayReason) {
          console.warn("[CCTP] Delay reason:", msg.delayReason);
        }
      } else {
        // Log non-ok responses in detail
        let body = "";
        try { body = await res.text(); } catch { /* */ }
        console.log(`[CCTP] Poll #${i}: HTTP ${statusCode}${body ? ` — ${body.slice(0, 200)}` : ""}`);
      }
    } catch (err: any) {
      // This is the critical log — if this fires on every attempt, CORS is blocking
      console.error(`[CCTP] Poll #${i}: FETCH FAILED — ${err?.message || err}`);
      console.error("[CCTP] This may indicate CORS or network issues. URL:", url);
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error(`Attestation not received after ${maxAttempts} attempts (${Math.round(maxAttempts * 5 / 60)} min). Check console for fetch errors.`);
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type StepCb = (i: number, s: TxStep) => void;

export interface BridgeCallbacks {
  onStepStart: StepCb;
  onStepComplete: StepCb;
  onStepFail: (i: number, s: TxStep, err: string) => void;
  onComplete: () => void;
  onError: (err: string) => void;
  onAttestationReceived?: (message: string, attestation: string) => void;
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------

export async function executeBridge(
  params: BridgeParams,
  provider: EIP1193Provider,
  callbacks: BridgeCallbacks
): Promise<void> {
  const { sourceChain, destChain, amount, walletAddress } = params;
  const src = CCTP[sourceChain.chainId];
  const dst = CCTP[destChain.chainId];

  if (!src || !dst) {
    callbacks.onError(`Unsupported chain: ${sourceChain.chainId} → ${destChain.chainId}`);
    return;
  }

  const rawAmount = parseUnits(amount, USDC_DECIMALS);
  const recipientBytes32 = toBytes32(walletAddress);

  // ============================================================
  // Fetch fee rate from Circle API and compute maxFee dynamically.
  // maxFee is proportional to transfer amount — a hardcoded value
  // causes burns to revert for larger amounts.
  // ============================================================
  let maxFee: bigint;
  try {
    const feeRes = await fetch(`/api/fees?sourceDomain=${src.domain}&destDomain=${dst.domain}`);
    if (feeRes.ok) {
      const feeData = await feeRes.json() as any;
      const fastFee = Array.isArray(feeData)
        ? feeData.find((f: any) => f.finalityThreshold === 1000)
        : null;

      if (fastFee?.minimumFee !== undefined) {
        const bps = fastFee.minimumFee as number; // basis points, e.g. 1.3
        // protocolFee = rawAmount * bps / 10000, but bps can be fractional
        // Use integer math: multiply bps*100 first, then divide by 1_000_000
        const protocolFee = (rawAmount * BigInt(Math.round(bps * 100))) / BigInt(1_000_000);
        // Add 50% buffer to avoid edge-case reverts from fee fluctuation
        maxFee = (protocolFee * BigInt(150)) / BigInt(100);
        // Ensure minimum of 500 subunits (0.0005 USDC)
        if (maxFee < BigInt(500)) maxFee = BigInt(500);
        console.log("[CCTP] Fee API: bps=", bps, "protocolFee=", protocolFee.toString(), "maxFee=", maxFee.toString());
      } else {
        console.warn("[CCTP] Fee API: no fast transfer fee found, using fallback");
        // Fallback: 0.1% of amount with minimum 500
        maxFee = rawAmount / BigInt(1000);
        if (maxFee < BigInt(500)) maxFee = BigInt(500);
      }
    } else {
      console.warn("[CCTP] Fee API: HTTP", feeRes.status, "— using fallback");
      maxFee = rawAmount / BigInt(1000);
      if (maxFee < BigInt(500)) maxFee = BigInt(500);
    }
  } catch (err) {
    console.warn("[CCTP] Fee API: fetch failed — using fallback");
    // Fallback: 0.1% of amount with minimum 500 subunits
    maxFee = rawAmount / BigInt(1000);
    if (maxFee < BigInt(500)) maxFee = BigInt(500);
  }

  console.group("[CCTP] Bridge config");
  console.log("Source:", sourceChain.name, "domain:", src.domain, "chainId:", sourceChain.chainId);
  console.log("Dest:", destChain.name, "domain:", dst.domain, "chainId:", destChain.chainId);
  console.log("Wallet:", walletAddress);
  console.log("Recipient bytes32:", recipientBytes32);
  console.log("Source USDC:", src.usdc);
  console.log("Source TokenMessengerV2:", src.tokenMessenger);
  console.log("Dest MessageTransmitterV2:", dst.messageTransmitter);
  console.log("Dest USDC:", dst.usdc);
  console.log("Amount (human):", amount, "USDC");
  console.log("Amount (raw):", rawAmount.toString(), "subunits");
  console.log("maxFee:", maxFee.toString(), "subunits (", formatUnits(maxFee, USDC_DECIMALS), "USDC )");
  console.groupEnd();

  // Verify provider is on source chain before proceeding
  try {
    const provChainHex = await provider.request({ method: "eth_chainId" }) as string;
    const provChainId = parseInt(provChainHex, 16);
    console.log("[CCTP] Provider chain:", provChainId, "expected:", sourceChain.chainId);
    if (provChainId !== sourceChain.chainId) {
      console.log("[CCTP] Provider on wrong chain — switching to source...");
      const hex = `0x${sourceChain.chainId.toString(16)}`;
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    console.warn("[CCTP] Could not verify/switch provider chain:", e);
  }

  // Create wallet client AFTER chain verification
  const walletClient = createWalletClient({
    account: walletAddress as `0x${string}`,
    chain: src.chain,
    transport: custom(provider),
  });
  const srcPublic = makePublicClient(sourceChain.chainId);
  const dstPublic = makePublicClient(destChain.chainId);

  // Snapshot destination balance for later comparison
  let dstBalanceBefore: bigint;
  try {
    dstBalanceBefore = await dstPublic.readContract({
      address: dst.usdc, abi: erc20Abi, functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });
    console.log("[CCTP] Dest balance before:", formatUnits(dstBalanceBefore, USDC_DECIMALS), "USDC");
  } catch {
    dstBalanceBefore = BigInt(0);
  }

  // ==== STEP 1: APPROVE ====
  callbacks.onStepStart(0, { ...BRIDGE_STEPS[0], status: "active", txHash: null });
  try {
    const allowance = await srcPublic.readContract({
      address: src.usdc, abi: erc20Abi, functionName: "allowance",
      args: [walletAddress as `0x${string}`, src.tokenMessenger],
    });

    const balance = await srcPublic.readContract({
      address: src.usdc, abi: erc20Abi, functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });

    console.group("[CCTP] Amount details");
    console.log("User input:", amount, "USDC");
    console.log("Parsed raw:", rawAmount.toString(), "subunits");
    console.log("Balance raw:", balance.toString(), "subunits (", formatUnits(balance, USDC_DECIMALS), "USDC )");
    console.log("Allowance raw:", allowance.toString(), "subunits (", formatUnits(allowance, USDC_DECIMALS), "USDC )");
    console.log("maxFee raw:", maxFee.toString(), "subunits (", formatUnits(maxFee, USDC_DECIMALS), "USDC )");
    console.log("Spender (TokenMessengerV2):", src.tokenMessenger);
    console.log("Allowance sufficient?", allowance >= rawAmount);
    console.log("Balance sufficient?", balance >= rawAmount);
    console.groupEnd();

    if (allowance < rawAmount) {
      const approveTx = await walletClient.sendTransaction({
        to: src.usdc,
        data: encodeFunctionData({
          abi: erc20Abi, functionName: "approve",
          args: [src.tokenMessenger, rawAmount * BigInt(10)],
        }),
      });
      console.log("[CCTP] Approve tx:", approveTx);
      await srcPublic.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 });
      callbacks.onStepComplete(0, { key: "approve", label: BRIDGE_STEPS[0].label, description: "Approved", status: "done", txHash: approveTx });
    } else {
      callbacks.onStepComplete(0, { key: "approve", label: BRIDGE_STEPS[0].label, description: "Already approved", status: "done", txHash: null });
    }
  } catch (err: any) {
    const msg = extractError(err);
    callbacks.onStepFail(0, { ...BRIDGE_STEPS[0], status: "failed", txHash: null }, msg);
    callbacks.onError(msg);
    return;
  }

  // ==== STEP 2: BURN ====
  callbacks.onStepStart(1, { ...BRIDGE_STEPS[1], status: "active", txHash: null });
  let burnTxHash: `0x${string}`;
  try {
    burnTxHash = await walletClient.sendTransaction({
      to: src.tokenMessenger,
      data: encodeFunctionData({
        abi: DEPOSIT_FOR_BURN_ABI, functionName: "depositForBurn",
        args: [rawAmount, dst.domain, recipientBytes32, src.usdc, ZERO_BYTES32, maxFee, 1000],
      }),
    });
    console.log("[CCTP] Burn tx:", burnTxHash);
    const receipt = await srcPublic.waitForTransactionReceipt({ hash: burnTxHash, confirmations: 1 });
    if (receipt.status === "reverted") {
      callbacks.onStepFail(1, { ...BRIDGE_STEPS[1], status: "failed", txHash: burnTxHash }, "Burn reverted");
      callbacks.onError("Burn transaction reverted on-chain");
      return;
    }
    console.log("[CCTP] Burn confirmed, block:", receipt.blockNumber);
    callbacks.onStepComplete(1, { key: "burn", label: BRIDGE_STEPS[1].label, description: "USDC burned", status: "done", txHash: burnTxHash });
  } catch (err: any) {
    const msg = extractError(err);
    callbacks.onStepFail(1, { ...BRIDGE_STEPS[1], status: "failed", txHash: null }, msg);
    callbacks.onError(msg);
    return;
  }

  // ==== STEP 3: ATTESTATION ====
  callbacks.onStepStart(2, { ...BRIDGE_STEPS[2], status: "active", txHash: null });
  let attest: AttestationResult;
  try {
    attest = await pollAttestation(src.domain, burnTxHash, (n) => {
      if (n % 6 === 0) console.log(`[CCTP] Still polling attestation... attempt ${n}`);
    });
    console.log("[CCTP] Attestation complete");
    callbacks.onStepComplete(2, { key: "attestation", label: BRIDGE_STEPS[2].label, description: "Attestation received", status: "done", txHash: null });
    // Persist attestation data for resumability
    callbacks.onAttestationReceived?.(attest.message, attest.attestation);
  } catch (err: any) {
    // Before failing, check if tokens already arrived on destination
    try {
      const dstBalanceNow = await dstPublic.readContract({
        address: dst.usdc, abi: erc20Abi, functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      if (dstBalanceNow > dstBalanceBefore) {
        console.log("[CCTP] Tokens arrived on destination despite attestation timeout — completing");
        callbacks.onStepComplete(2, { key: "attestation", label: BRIDGE_STEPS[2].label, description: "Completed via forwarder", status: "done", txHash: null });
        callbacks.onStepComplete(3, { key: "mint", label: BRIDGE_STEPS[3].label, description: "Already minted", status: "done", txHash: null });
        callbacks.onComplete();
        return;
      }
    } catch { /* ignore balance check failure */ }

    const msg = extractError(err);
    callbacks.onStepFail(2, { ...BRIDGE_STEPS[2], status: "failed", txHash: null }, msg);
    callbacks.onError(msg);
    return;
  }

  // ==== STEP 4: MINT ====
  callbacks.onStepStart(3, { ...BRIDGE_STEPS[3], status: "active", txHash: null });

  // First check if already minted (Forwarding Service or previous attempt)
  try {
    const dstBalanceNow = await dstPublic.readContract({
      address: dst.usdc, abi: erc20Abi, functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });
    if (dstBalanceNow > dstBalanceBefore) {
      console.log("[CCTP] Tokens already on destination — mint not needed");
      callbacks.onStepComplete(3, { key: "mint", label: BRIDGE_STEPS[3].label, description: "Already minted", status: "done", txHash: null });
      callbacks.onComplete();
      return;
    }
  } catch { /* proceed to manual mint */ }

  // Switch wallet to destination chain
  try {
    const hex = `0x${destChain.chainId.toString(16)}`;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: dst.chain.name,
            nativeCurrency: dst.chain.nativeCurrency,
            rpcUrls: [dst.chain.rpcUrls.default.http[0]],
            blockExplorerUrls: dst.chain.blockExplorers ? [dst.chain.blockExplorers.default.url] : [],
          }],
        });
      } else { throw e; }
    }
    await new Promise((r) => setTimeout(r, 1500));
  } catch (err: any) {
    // If chain switch fails, try mint anyway — wallet might already be on dest
    console.warn("[CCTP] Chain switch issue:", extractError(err));
  }

  try {
    const dstWallet = createWalletClient({
      account: walletAddress as `0x${string}`,
      chain: dst.chain,
      transport: custom(provider),
    });

    console.log("[CCTP] Calling receiveMessage on", destChain.name);
    console.log("[CCTP] MessageTransmitterV2:", dst.messageTransmitter);
    console.log("[CCTP] Message bytes length:", attest.message.length);
    console.log("[CCTP] Attestation bytes length:", attest.attestation.length);
    const mintTx = await dstWallet.sendTransaction({
      to: dst.messageTransmitter,
      data: encodeFunctionData({
        abi: RECEIVE_MESSAGE_ABI, functionName: "receiveMessage",
        args: [attest.message, attest.attestation],
      }),
    });
    console.log("[CCTP] Mint tx:", mintTx);
    await dstPublic.waitForTransactionReceipt({ hash: mintTx, confirmations: 1 });
    console.log("[CCTP] Mint confirmed!");
    callbacks.onStepComplete(3, { key: "mint", label: BRIDGE_STEPS[3].label, description: "USDC minted", status: "done", txHash: mintTx });
    callbacks.onComplete();
  } catch (err: any) {
    // Mint tx failed — check if tokens arrived anyway (already-used nonce)
    try {
      await new Promise((r) => setTimeout(r, 3000));
      const dstBalanceFinal = await dstPublic.readContract({
        address: dst.usdc, abi: erc20Abi, functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      if (dstBalanceFinal > dstBalanceBefore) {
        console.log("[CCTP] Mint tx failed but tokens arrived — already minted");
        callbacks.onStepComplete(3, { key: "mint", label: BRIDGE_STEPS[3].label, description: "Already minted", status: "done", txHash: null });
        callbacks.onComplete();
        return;
      }
    } catch { /* ignore */ }

    const msg = extractError(err);
    callbacks.onStepFail(3, { ...BRIDGE_STEPS[3], status: "failed", txHash: null }, msg);
    callbacks.onError(msg);
  }
}

// ---------------------------------------------------------------------------
// Standalone mint — for resuming a pending transfer that has attestation
// ---------------------------------------------------------------------------

export async function executeMintOnly(
  destChain: ChainConfig,
  attestationMessage: `0x${string}`,
  attestationSignature: `0x${string}`,
  walletAddress: string,
  provider: EIP1193Provider
): Promise<string> {
  const dst = CCTP[destChain.chainId];
  if (!dst) throw new Error(`No CCTP config for chain ${destChain.chainId}`);

  // Switch to destination chain
  const hex = `0x${destChain.chainId.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hex,
          chainName: dst.chain.name,
          nativeCurrency: dst.chain.nativeCurrency,
          rpcUrls: [dst.chain.rpcUrls.default.http[0]],
          blockExplorerUrls: dst.chain.blockExplorers ? [dst.chain.blockExplorers.default.url] : [],
        }],
      });
    } else { throw e; }
  }
  await new Promise((r) => setTimeout(r, 1500));

  const dstWallet = createWalletClient({
    account: walletAddress as `0x${string}`,
    chain: dst.chain,
    transport: custom(provider),
  });

  const mintTx = await dstWallet.sendTransaction({
    to: dst.messageTransmitter,
    data: encodeFunctionData({
      abi: RECEIVE_MESSAGE_ABI, functionName: "receiveMessage",
      args: [attestationMessage, attestationSignature],
    }),
  });

  const dstPublic = makePublicClient(destChain.chainId);
  await dstPublic.waitForTransactionReceipt({ hash: mintTx, confirmations: 1 });
  return mintTx;
}
