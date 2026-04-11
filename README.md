# Zentryx — USDC Bridge (Arc Testnet)

A cross-chain USDC bridge powered by Circle CCTP, built for Arc Testnet.

## Supported chains

- Ethereum Sepolia
- Base Sepolia
- Arbitrum Sepolia
- Arc Testnet

## Setup

```bash
# Install dependencies
npm install

# Copy env template and set your WalletConnect project ID
cp .env.local.example .env.local

# Run dev server
npm run dev
```

## Project structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── bridge/           # Bridge page — chain selection, amount, progress
│   ├── faucet/           # Faucet page — link to Circle faucet
│   ├── profile/          # Profile page — wallet, ENS avatar, tx history
│   ├── layout.tsx        # Root layout with providers
│   ├── providers.tsx     # wagmi + RainbowKit + React Query
│   └── globals.css       # Tailwind + global styles
├── components/           # Reusable UI components
│   ├── Navbar.tsx        # App header with connect button
│   ├── TabNav.tsx        # Bridge / Faucet / Profile tabs
│   ├── ChainSelector.tsx # Chain dropdown selector
│   ├── ChainIcon.tsx     # Chain avatar dot
│   ├── Card.tsx          # Card wrapper
│   ├── Avatar.tsx        # Wallet avatar with ENS support
│   ├── TransactionProgress.tsx  # Step-by-step bridge progress
│   └── TransactionHistory.tsx   # Past transactions list
├── hooks/                # Custom React hooks
│   ├── useBridge.ts      # Bridge execution orchestrator
│   └── useHydration.ts   # SSR-safe localStorage hydration
├── lib/                  # Core logic and config
│   ├── chains.ts         # Chain definitions and config
│   ├── config.ts         # App constants (faucet URL, fees, etc.)
│   ├── cctp.ts           # CCTP bridge logic (simulation + real template)
│   ├── utils.ts          # Utility functions
│   └── wagmi.ts          # wagmi + RainbowKit config
├── store/                # Zustand state management
│   └── index.ts          # Bridge state + transaction history store
└── types/                # TypeScript type definitions
    └── index.ts          # ChainConfig, TxStep, BridgeTransaction, etc.
```

## CCTP integration

The bridge logic in `src/lib/cctp.ts` currently simulates the CCTP lifecycle
with realistic timing. To connect to real Circle Bridge Kit:

1. Install: `npm install @circle-fin/bridge-kit @circle-fin/adapter-viem-v2`
2. Uncomment the `executeBridgeReal()` function in `cctp.ts`
3. Replace the `executeBridge` call in `useBridge.ts`

## Adding a new chain

Add an entry to `SUPPORTED_CHAINS` in `src/lib/chains.ts`:

```ts
{
  id: "polygon_amoy",
  name: "Polygon Amoy",
  short: "POL",
  chainId: 80002,
  bridgeKitName: "Polygon_Amoy",
  color: "#8247e5",
  usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  explorerUrl: "https://amoy.polygonscan.com",
}
```

Then add the corresponding viem chain to `WAGMI_CHAINS` and transport in `wagmi.ts`.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- wagmi v2 + viem v2
- RainbowKit v2
- Zustand
- Circle CCTP / Bridge Kit
