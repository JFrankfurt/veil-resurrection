import { useChainId } from "wagmi";
import { CONTRACTS, getContracts } from "@predictions/config";

/**
 * Hook to get contract addresses for the current chain
 */
export function useContracts() {
  const chainId = useChainId();
  return getContracts(chainId);
}

// Re-export CONTRACTS for direct access
export { CONTRACTS };
