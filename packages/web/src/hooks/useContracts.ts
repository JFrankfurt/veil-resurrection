import { useChainId } from "wagmi";
import { CONTRACTS } from "@/config/wagmi";
import { baseSepolia } from "wagmi/chains";

/**
 * Hook to get contract addresses for the current chain
 */
export function useContracts() {
  const chainId = useChainId();
  
  const contracts = chainId && chainId in CONTRACTS
    ? CONTRACTS[chainId as keyof typeof CONTRACTS]
    : CONTRACTS[baseSepolia.id];

  return contracts;
}
