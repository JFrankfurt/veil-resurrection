import { base, baseSepolia, foundry } from "viem/chains";

export const SUPPORTED_CHAINS = [base, baseSepolia, foundry] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

export const DEFAULT_CHAIN = base;

export { base, baseSepolia, foundry };
