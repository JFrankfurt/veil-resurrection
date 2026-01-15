import { useReadContract, useReadContracts } from "wagmi";
import { type Address, formatUnits } from "viem";

// ABIs - in production these would come from @predictions/config
const MARKET_ABI = [
  {
    name: "question",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "endTime",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "resolved",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "winningOutcome",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "invalid",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "numOutcomes",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getOutcomeName",
    type: "function",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "getOutcomeToken",
    type: "function",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "amm",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const AMM_ABI = [
  {
    name: "getPrice",
    type: "function",
    inputs: [{ name: "outcome", type: "uint256" }],
    outputs: [{ name: "price", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getReserve",
    type: "function",
    inputs: [{ name: "outcome", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export interface MarketData {
  address: Address;
  ammAddress: Address;
  question: string;
  endTime: bigint;
  resolved: boolean;
  winningOutcome: number;
  invalid: boolean;
  outcomes: {
    name: string;
    token: Address;
    price: bigint;
    reserve: bigint;
  }[];
  totalLiquidity: bigint;
}

/**
 * Hook to fetch market data from the blockchain
 */
export function useMarket(marketAddress: Address | undefined) {
  // First, get basic market info
  const { data: basicInfo, isLoading: basicLoading } = useReadContracts({
    contracts: marketAddress
      ? [
          { address: marketAddress, abi: MARKET_ABI, functionName: "question" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "endTime" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "resolved" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "winningOutcome" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "invalid" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "numOutcomes" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "amm" },
        ]
      : [],
    query: {
      enabled: !!marketAddress,
    },
  });

  const ammAddress = basicInfo?.[6]?.result as Address | undefined;
  const numOutcomes = basicInfo?.[5]?.result as bigint | undefined;

  // Get outcome data
  const outcomeIndices = numOutcomes
    ? Array.from({ length: Number(numOutcomes) }, (_, i) => BigInt(i))
    : [];

  const { data: outcomeData, isLoading: outcomesLoading } = useReadContracts({
    contracts: marketAddress && ammAddress
      ? outcomeIndices.flatMap((i) => [
          { address: marketAddress, abi: MARKET_ABI, functionName: "getOutcomeName", args: [i] },
          { address: marketAddress, abi: MARKET_ABI, functionName: "getOutcomeToken", args: [i] },
          { address: ammAddress, abi: AMM_ABI, functionName: "getPrice", args: [i] },
          { address: ammAddress, abi: AMM_ABI, functionName: "getReserve", args: [i] },
        ])
      : [],
    query: {
      enabled: !!marketAddress && !!ammAddress && outcomeIndices.length > 0,
    },
  });

  // Get AMM total supply (liquidity)
  const { data: totalSupply } = useReadContract({
    address: ammAddress,
    abi: AMM_ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!ammAddress,
    },
  });

  const isLoading = basicLoading || outcomesLoading;

  // Parse data
  const market: MarketData | undefined = basicInfo && marketAddress && ammAddress
    ? {
        address: marketAddress,
        ammAddress,
        question: basicInfo[0]?.result as string || "",
        endTime: basicInfo[1]?.result as bigint || BigInt(0),
        resolved: basicInfo[2]?.result as boolean || false,
        winningOutcome: Number(basicInfo[3]?.result || 0),
        invalid: basicInfo[4]?.result as boolean || false,
        outcomes: outcomeIndices.map((_, i) => ({
          name: outcomeData?.[i * 4]?.result as string || `Outcome ${i}`,
          token: outcomeData?.[i * 4 + 1]?.result as Address || "0x",
          price: outcomeData?.[i * 4 + 2]?.result as bigint || BigInt(0),
          reserve: outcomeData?.[i * 4 + 3]?.result as bigint || BigInt(0),
        })),
        totalLiquidity: totalSupply || BigInt(0),
      }
    : undefined;

  return {
    market,
    isLoading,
  };
}

/**
 * Format price from 18 decimals to percentage string
 */
export function formatPrice(price: bigint): string {
  return Number(formatUnits(price, 16)).toFixed(1);
}

/**
 * Format volume from 6 decimals (USDC) to readable string
 */
export function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}
