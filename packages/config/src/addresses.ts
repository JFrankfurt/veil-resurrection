import { type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

export interface ContractAddresses {
  marketFactory: Address;
  resolver: Address;
  router: Address;
  collateralToken: Address; // USDC
}

// Base Mainnet addresses (to be filled after deployment)
export const BASE_MAINNET_ADDRESSES: ContractAddresses = {
  marketFactory: "0x0000000000000000000000000000000000000000",
  resolver: "0x0000000000000000000000000000000000000000",
  router: "0x0000000000000000000000000000000000000000",
  collateralToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
};

// Base Sepolia testnet addresses (to be filled after deployment)
export const BASE_SEPOLIA_ADDRESSES: ContractAddresses = {
  marketFactory: "0x0000000000000000000000000000000000000000",
  resolver: "0x0000000000000000000000000000000000000000",
  router: "0x0000000000000000000000000000000000000000",
  collateralToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
};

// Local development addresses (anvil)
export const LOCAL_ADDRESSES: ContractAddresses = {
  marketFactory: "0x0000000000000000000000000000000000000000",
  resolver: "0x0000000000000000000000000000000000000000",
  router: "0x0000000000000000000000000000000000000000",
  collateralToken: "0x0000000000000000000000000000000000000000",
};

export function getAddresses(chainId: number): ContractAddresses {
  switch (chainId) {
    case 8453:
      return BASE_MAINNET_ADDRESSES;
    case 84532:
      return BASE_SEPOLIA_ADDRESSES;
    case 31337:
      return LOCAL_ADDRESSES;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// =============================================================================
// CONTRACTS - Chain-keyed object for direct use with wagmi
// =============================================================================

/**
 * Contract addresses keyed by chain ID for use with wagmi hooks.
 * Uses shorter property names for convenience.
 */
export const CONTRACTS = {
  [base.id]: {
    marketFactory: BASE_MAINNET_ADDRESSES.marketFactory,
    resolver: BASE_MAINNET_ADDRESSES.resolver,
    router: BASE_MAINNET_ADDRESSES.router,
    usdc: BASE_MAINNET_ADDRESSES.collateralToken,
  },
  [baseSepolia.id]: {
    marketFactory: BASE_SEPOLIA_ADDRESSES.marketFactory,
    resolver: BASE_SEPOLIA_ADDRESSES.resolver,
    router: BASE_SEPOLIA_ADDRESSES.router,
    usdc: BASE_SEPOLIA_ADDRESSES.collateralToken,
  },
} as const;

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(
  chainId: number
): chainId is keyof typeof CONTRACTS {
  return chainId in CONTRACTS;
}

/**
 * Get contracts for a chain ID, with fallback to Base Sepolia
 */
export function getContracts(chainId: number) {
  if (isSupportedChain(chainId)) {
    return CONTRACTS[chainId];
  }
  return CONTRACTS[baseSepolia.id];
}
