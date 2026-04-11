export interface ChainConfig {
  id: string;
  name: string;
  short: string;
  chainId: number;
  bridgeKitName: string;
  color: string;
  usdcAddress: `0x${string}`;
  explorerUrl: string;
  rpcUrl?: string;
}

export type TxStatus =
  | "idle"
  | "pending"
  | "attesting"
  | "minting"
  | "completed"
  | "failed";

export type StepStatus = "waiting" | "active" | "done" | "failed";

export interface TxStep {
  key: string;
  label: string;
  description: string;
  status: StepStatus;
  txHash: string | null;
}

export interface BridgeTransaction {
  id: string;
  date: string;
  sourceChainId: string;
  destChainId: string;
  amount: string;
  status: TxStatus;
  txHash: string | null; // burn tx hash
  elapsed: number;
  // For resumability — persisted attestation data
  attestationMessage?: string | null;
  attestationSignature?: string | null;
}

export interface BridgeParams {
  sourceChain: ChainConfig;
  destChain: ChainConfig;
  amount: string;
  walletAddress: string;
}
