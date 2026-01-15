import { type Address } from "viem";

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
