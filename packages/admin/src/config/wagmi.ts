import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

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

export const CONTRACTS = {
  [base.id]: {
    marketFactory: "0x0000000000000000000000000000000000000000" as const,
    resolver: "0x0000000000000000000000000000000000000000" as const,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  },
  [baseSepolia.id]: {
    marketFactory: "0x0000000000000000000000000000000000000000" as const,
    resolver: "0x0000000000000000000000000000000000000000" as const,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  },
} as const;
