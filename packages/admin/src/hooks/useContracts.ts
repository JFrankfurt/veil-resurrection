import { useChainId } from "wagmi";
import { erc20Abi } from "viem";
import { CONTRACTS, getContracts } from "@predictions/config";
import { MarketFactoryABI, ResolverABI } from "@predictions/config/abis";

export function useContracts() {
  const chainId = useChainId();
  const contracts = getContracts(chainId);

  return {
    marketFactory: {
      address: contracts.marketFactory,
      abi: MarketFactoryABI,
    },
    resolver: {
      address: contracts.resolver,
      abi: ResolverABI,
    },
    usdc: {
      address: contracts.usdc,
      abi: erc20Abi,
    },
    isSupportedChain: chainId in CONTRACTS,
  };
}
