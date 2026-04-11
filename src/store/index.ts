import { create } from "zustand";
import type {
  ChainConfig,
  TxStatus,
  TxStep,
  BridgeTransaction,
} from "@/types";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { createInitialSteps } from "@/lib/cctp";
import { generateId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Transaction History Store — scoped by wallet address
// ---------------------------------------------------------------------------

interface HistoryState {
  currentAddress: string | null;
  transactions: BridgeTransaction[];
  switchUser: (address: string | null) => void;
  addTransaction: (tx: BridgeTransaction) => void;
  updateTransaction: (id: string, updates: Partial<BridgeTransaction>) => void;
  clearHistory: () => void;
}

function storageKey(address: string): string {
  return `zentryx_history_${address.toLowerCase()}`;
}

function loadHistory(address: string | null): BridgeTransaction[] {
  if (!address || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(address: string | null, txs: BridgeTransaction[]) {
  if (!address || typeof window === "undefined") return;
  localStorage.setItem(storageKey(address), JSON.stringify(txs));
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  currentAddress: null,
  transactions: [],

  switchUser: (address) => {
    const txs = loadHistory(address);
    set({ currentAddress: address, transactions: txs });
  },

  addTransaction: (tx) => {
    const { currentAddress } = get();
    const updated = [tx, ...get().transactions];
    set({ transactions: updated });
    persistHistory(currentAddress, updated);
  },

  updateTransaction: (id, updates) => {
    const { currentAddress } = get();
    const updated = get().transactions.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ transactions: updated });
    persistHistory(currentAddress, updated);
  },

  clearHistory: () => {
    const { currentAddress } = get();
    set({ transactions: [] });
    persistHistory(currentAddress, []);
  },
}));

// ---------------------------------------------------------------------------
// Avatar Store — scoped by wallet address
// ---------------------------------------------------------------------------

interface AvatarState {
  avatar: string | null;
  loadAvatar: (address: string | null) => void;
  setAvatar: (address: string | null, dataUrl: string) => void;
}

function avatarKey(address: string): string {
  return `zentryx_avatar_${address.toLowerCase()}`;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatar: null,

  loadAvatar: (address) => {
    if (!address || typeof window === "undefined") {
      set({ avatar: null });
      return;
    }
    try {
      const raw = localStorage.getItem(avatarKey(address));
      set({ avatar: raw || null });
    } catch {
      set({ avatar: null });
    }
  },

  setAvatar: (address, dataUrl) => {
    if (!address || typeof window === "undefined") return;
    localStorage.setItem(avatarKey(address), dataUrl);
    set({ avatar: dataUrl });
  },
}));

// ---------------------------------------------------------------------------
// Bridge Flow Store (ephemeral — not persisted)
// ---------------------------------------------------------------------------

interface BridgeState {
  sourceChain: ChainConfig;
  destChain: ChainConfig;
  amount: string;
  txStatus: TxStatus;
  txSteps: TxStep[];
  activeTxId: string | null;
  elapsed: number;
  error: string | null;

  setSourceChain: (chain: ChainConfig) => void;
  setDestChain: (chain: ChainConfig) => void;
  setAmount: (amount: string) => void;
  swapChains: () => void;
  startBridge: () => string;
  updateStep: (index: number, step: TxStep) => void;
  setTxStatus: (status: TxStatus) => void;
  setElapsed: (seconds: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useBridgeStore = create<BridgeState>((set, get) => ({
  sourceChain: SUPPORTED_CHAINS[0],
  destChain: SUPPORTED_CHAINS[3],
  amount: "",
  txStatus: "idle",
  txSteps: createInitialSteps(),
  activeTxId: null,
  elapsed: 0,
  error: null,

  setSourceChain: (chain) => set({ sourceChain: chain }),
  setDestChain: (chain) => set({ destChain: chain }),
  setAmount: (amount) => set({ amount }),

  swapChains: () => {
    const { sourceChain, destChain } = get();
    set({ sourceChain: destChain, destChain: sourceChain });
  },

  startBridge: () => {
    const id = generateId();
    set({
      txStatus: "pending",
      txSteps: createInitialSteps(),
      activeTxId: id,
      elapsed: 0,
      error: null,
    });
    return id;
  },

  updateStep: (index, step) => {
    const steps = [...get().txSteps];
    steps[index] = step;
    set({ txSteps: steps });
  },

  setTxStatus: (status) => set({ txStatus: status }),
  setElapsed: (seconds) => set({ elapsed: seconds }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      txStatus: "idle",
      txSteps: createInitialSteps(),
      activeTxId: null,
      elapsed: 0,
      error: null,
      amount: "",
    }),
}));
