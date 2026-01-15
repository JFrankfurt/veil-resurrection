import { useChainId } from "wagmi";
import { CONTRACTS } from "@/config/wagmi";
import {
  MarketFactoryABI,
  ResolverABI,
} from "@predictions/config/abis";
import { erc20Abi, Abi } from "viem";

const MarketFactoryAbi = MarketFactoryABI as Abi;
const ResolverAbi = ResolverABI as Abi;

export function useContracts() {
  const chainId = useChainId();
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS];

  if (!contracts) {
    return {
      marketFactory: undefined,
      resolver: undefined,
      usdc: undefined,
      isSupportedChain: false,
    };
  }

  return {
    marketFactory: {
      address: contracts.marketFactory,
      abi: MarketFactoryAbi,
    },
    resolver: {
      address: contracts.resolver,
      abi: ResolverAbi,
    },
    usdc: {
      address: contracts.usdc,
      abi: erc20Abi,
    },
    isSupportedChain: true,
  };
}
