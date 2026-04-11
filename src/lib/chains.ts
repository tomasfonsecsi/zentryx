import { type ChainConfig } from "@/types";
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  arcTestnet,
  type Chain,
} from "viem/chains";

// Re-export for convenience
export { arcTestnet };

// Supported chains — add new testnet chains here
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: "eth_sepolia",
    name: "Ethereum Sepolia",
    short: "ETH",
    chainId: 11155111,
    bridgeKitName: "Ethereum_Sepolia",
    color: "#627eea",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    explorerUrl: "https://sepolia.etherscan.io",
  },
  {
    id: "base_sepolia",
    name: "Base Sepolia",
    short: "BASE",
    chainId: 84532,
    bridgeKitName: "Base_Sepolia",
    color: "#0052ff",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl: "https://sepolia.basescan.org",
  },
  {
    id: "arb_sepolia",
    name: "Arbitrum Sepolia",
    short: "ARB",
    chainId: 421614,
    bridgeKitName: "Arbitrum_Sepolia",
    color: "#28a0f0",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    explorerUrl: "https://sepolia.arbiscan.io",
  },
  {
    id: "arc_testnet",
    name: "Arc Testnet",
    short: "ARC",
    chainId: 5042002,
    bridgeKitName: "Arc_Testnet",
    color: "#6366f1",
    usdcAddress: "0x3600000000000000000000000000000000000000",
    explorerUrl: "https://testnet.arcscan.app",
    rpcUrl: "https://rpc.testnet.arc.network",
  },
];

// Map viem chain objects for wagmi config
export const WAGMI_CHAINS: [Chain, ...Chain[]] = [
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  arcTestnet,
];

export function getChainById(id: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === id);
}

export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}
