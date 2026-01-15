import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, formatUnits } from "viem";

// ABIs
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const MARKET_ABI = [
  {
    name: "claimWinnings",
    type: "function",
    inputs: [],
    outputs: [{ name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
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
] as const;

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
  const { data: balances, isLoading: balancesLoading, refetch } = useReadContracts({
    contracts:
      userAddress && outcomes.length > 0
        ? outcomes.map((outcome) => ({
            address: outcome.token,
            abi: ERC20_ABI,
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
          { address: marketAddress, abi: MARKET_ABI, functionName: "resolved" },
          { address: marketAddress, abi: MARKET_ABI, functionName: "winningOutcome" },
        ]
      : [],
    query: {
      enabled: !!marketAddress,
    },
  });

  const resolved = marketState?.[0]?.result as boolean || false;
  const winningOutcome = Number(marketState?.[1]?.result || 0);

  // Parse positions
  const positions: Position[] = outcomes.map((outcome, i) => ({
    outcome: outcome.name,
    tokenAddress: outcome.token,
    balance: (balances?.[i]?.result as bigint) || BigInt(0),
    isWinning: resolved && winningOutcome === i,
  }));

  const hasPosition = positions.some((p) => p.balance > BigInt(0));
  const winningPosition = positions.find((p) => p.isWinning && p.balance > BigInt(0));

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
      abi: MARKET_ABI,
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

/**
 * Format token balance from 18 decimals to readable string
 */
export function formatTokenBalance(balance: bigint): string {
  const num = Number(formatUnits(balance, 18));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}
