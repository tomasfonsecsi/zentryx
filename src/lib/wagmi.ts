import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { WAGMI_CHAINS, arcTestnet } from "@/lib/chains";
import { APP_NAME, WALLETCONNECT_PROJECT_ID } from "@/lib/config";
import { sepolia, baseSepolia, arbitrumSepolia } from "viem/chains";

/**
 * Manual wagmi config — avoids RainbowKit's getDefaultConfig which
 * bundles MetaMask SDK (conflicts with injected provider), Coinbase SDK,
 * and creates multiple WalletConnect instances.
 *
 * We use only:
 * - injected() — picks up MetaMask / Rabby / any injected wallet natively
 * - walletConnect() — single WC v2 instance for QR / mobile wallets
 */
export const wagmiConfig = createConfig({
  chains: WAGMI_CHAINS,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    ...(WALLETCONNECT_PROJECT_ID !== "YOUR_PROJECT_ID"
      ? [
          walletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            metadata: {
              name: APP_NAME,
              description: "USDC Bridge powered by Circle CCTP",
              url: typeof window !== "undefined" ? window.location.origin : "",
              icons: [],
            },
            showQrModal: false, // RainbowKit handles the modal
          }),
        ]
      : []),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: true,
});
