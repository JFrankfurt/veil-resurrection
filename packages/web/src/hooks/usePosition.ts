import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address, erc20Abi } from "viem";
import { MarketABI } from "@predictions/config/abis";

// Re-export formatTokenBalance from config for backwards compatibility
export { formatTokenBalance } from "@predictions/config";

interface Outcome {
  name: string;
  token: Address;
}

export interface Position {
  outcome: string;
  tokenAddress: Address;
  balance: bigint;
  isWinning: boolean;
}

/**
 * Hook to fetch user's position in a market
 */
export function usePosition(
  marketAddress: Address | undefined,
  outcomes: Outcome[]
) {
  const { address: userAddress } = useAccount();

  // Get balance of each outcome token for the user
  const {
    data: balances,
    isLoading: balancesLoading,
    refetch,
  } = useReadContracts({
    contracts:
      userAddress && outcomes.length > 0
        ? outcomes.map((outcome) => ({
            address: outcome.token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [userAddress],
          }))
        : [],
    query: {
      enabled: !!userAddress && outcomes.length > 0,
    },
  });

  // Get market resolution state
  const { data: marketState } = useReadContracts({
    contracts: marketAddress
      ? [
          {
            address: marketAddress,
            abi: MarketABI,
            functionName: "resolved",
          },
          {
            address: marketAddress,
            abi: MarketABI,
            functionName: "winningOutcome",
          },
        ]
      : [],
    query: {
      enabled: !!marketAddress,
    },
  });

  const resolved = (marketState?.[0]?.result as boolean) || false;
  const winningOutcome = Number(marketState?.[1]?.result || 0);

  // Parse positions
  const positions: Position[] = outcomes.map((outcome, i) => ({
    outcome: outcome.name,
    tokenAddress: outcome.token,
    balance: (balances?.[i]?.result as bigint) || BigInt(0),
    isWinning: resolved && winningOutcome === i,
  }));

  const hasPosition = positions.some((p) => p.balance > BigInt(0));
  const winningPosition = positions.find(
    (p) => p.isWinning && p.balance > BigInt(0)
  );

  return {
    positions,
    hasPosition,
    winningPosition,
    resolved,
    isLoading: balancesLoading,
    refetch,
  };
}

/**
 * Hook to claim winnings from a resolved market
 */
export function useClaimWinnings(marketAddress: Address | undefined) {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = () => {
    if (!marketAddress) return;

    writeContract({
      address: marketAddress,
      abi: MarketABI,
      functionName: "claimWinnings",
    });
  };

  return {
    claim,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    reset,
    isLoading: isPending || isConfirming,
  };
}
