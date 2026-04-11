"use client";

import type { ChainConfig } from "@/types";

interface ChainIconProps {
  chain: ChainConfig;
  size?: number;
}

export function ChainIcon({ chain, size = 20 }: ChainIconProps) {
  return (
    <div
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: chain.color,
        boxShadow: `0 0 8px ${chain.color}25`,
      }}
    />
  );
}
