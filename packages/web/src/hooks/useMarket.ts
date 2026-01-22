import { useReadContract, useReadContracts } from "wagmi";
import { type Address } from "viem";
import { marketAbi, outcomeAmmAbi, type MarketData } from "@predictions/config";

// Re-export utilities from config for backwards compatibility
export { formatPrice, formatVolume } from "@predictions/config";
export type { MarketData } from "@predictions/config";

/**
 * Hook to fetch market data from the blockchain
 */
export function useMarket(marketAddress: Address | undefined) {
  // First, get basic market info
  const { data: basicInfo, isLoading: basicLoading } = useReadContracts({
    contracts: marketAddress
      ? [
          { address: marketAddress, abi: marketAbi, functionName: "question" },
          { address: marketAddress, abi: marketAbi, functionName: "endTime" },
          { address: marketAddress, abi: marketAbi, functionName: "resolved" },
          {
            address: marketAddress,
            abi: marketAbi,
            functionName: "winningOutcome",
          },
          { address: marketAddress, abi: marketAbi, functionName: "invalid" },
          {
            address: marketAddress,
            abi: marketAbi,
            functionName: "numOutcomes",
          },
          { address: marketAddress, abi: marketAbi, functionName: "amm" },
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
    contracts:
      marketAddress && ammAddress
        ? outcomeIndices.flatMap((i) => [
            {
              address: marketAddress,
              abi: marketAbi,
              functionName: "getOutcomeName",
              args: [i],
            },
            {
              address: marketAddress,
              abi: marketAbi,
              functionName: "getOutcomeToken",
              args: [i],
            },
            {
              address: ammAddress,
              abi: outcomeAmmAbi,
              functionName: "getPrice",
              args: [i],
            },
            {
              address: ammAddress,
              abi: outcomeAmmAbi,
              functionName: "getReserve",
              args: [i],
            },
          ])
        : [],
    query: {
      enabled: !!marketAddress && !!ammAddress && outcomeIndices.length > 0,
    },
  });

  // Get AMM total supply (liquidity)
  const { data: totalSupply } = useReadContract({
    address: ammAddress,
    abi: outcomeAmmAbi,
    functionName: "totalSupply",
    query: {
      enabled: !!ammAddress,
    },
  });

  const isLoading = basicLoading || outcomesLoading;

  // Parse data
  const market: MarketData | undefined =
    basicInfo && marketAddress && ammAddress
      ? {
          address: marketAddress,
          ammAddress,
          question: (basicInfo[0]?.result as string) || "",
          endTime: (basicInfo[1]?.result as bigint) || BigInt(0),
          resolved: (basicInfo[2]?.result as boolean) || false,
          winningOutcome: Number(basicInfo[3]?.result || 0),
          invalid: (basicInfo[4]?.result as boolean) || false,
          outcomes: outcomeIndices.map((_, i) => ({
            name: (outcomeData?.[i * 4]?.result as string) || `Outcome ${i}`,
            token: (outcomeData?.[i * 4 + 1]?.result as Address) || "0x",
            price: (outcomeData?.[i * 4 + 2]?.result as bigint) || BigInt(0),
            reserve: (outcomeData?.[i * 4 + 3]?.result as bigint) || BigInt(0),
          })),
          totalLiquidity: totalSupply ?? BigInt(0),
        }
      : undefined;

  return {
    market,
    isLoading,
  };
}
