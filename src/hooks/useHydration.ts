"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useHistoryStore, useAvatarStore, useBridgeStore } from "@/store";

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  const { address } = useAccount();
  const prevAddress = useRef<string | null>(null);

  const switchUser = useHistoryStore((s) => s.switchUser);
  const loadAvatar = useAvatarStore((s) => s.loadAvatar);
  const resetBridge = useBridgeStore((s) => s.reset);

  useEffect(() => {
    const addr = address ?? null;
    const prev = prevAddress.current;

    // Only act if address actually changed
    if (addr !== prev) {
      prevAddress.current = addr;

      // Load user-scoped data
      switchUser(addr);
      loadAvatar(addr);

      // If switching between two different connected wallets (not initial load),
      // reset the ephemeral bridge flow state
      if (prev !== null && addr !== prev) {
        resetBridge();
      }

      setHydrated(true);
    } else if (!hydrated) {
      // First mount with no address — still mark hydrated
      switchUser(addr);
      loadAvatar(addr);
      setHydrated(true);
    }
  }, [address, switchUser, loadAvatar, resetBridge, hydrated]);

  return hydrated;
}
