import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CONTRACTS } from "@predictions/config";

export const config = getDefaultConfig({
  appName: "Predictions Admin",
  projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

// Re-export CONTRACTS for hooks to use
export { CONTRACTS };
