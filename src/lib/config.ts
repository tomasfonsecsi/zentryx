// Zentryx — app-wide configuration

export const APP_NAME = "Zentryx";
export const APP_DESCRIPTION = "USDC Bridge powered by Circle CCTP";
export const APP_VERSION = "0.1.0";

// Circle testnet faucet — update this if Circle changes the URL
export const FAUCET_URL = "https://faucet.circle.com";

// CCTP settings
export const CCTP_TRANSFER_SPEED = "FAST" as const;
export const CCTP_FAST_ESTIMATE_SECONDS = 20;

// USDC decimals — always 6 on all EVM chains
export const USDC_DECIMALS = 6;

// WalletConnect project ID — replace with your own
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_PROJECT_ID";
