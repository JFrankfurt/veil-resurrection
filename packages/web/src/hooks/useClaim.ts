import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { type Address } from "viem";
import { useContracts } from "./useContracts";

// Router ABI for claim function
const ROUTER_ABI = [
  {
    name: "claimWinnings",
    type: "function",
    inputs: [{ name: "market", type: "address" }],
    outputs: [{ name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

// Market ABI for checking resolution status and outcome token balances
const MARKET_ABI = [
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
    name: "getOutcomeToken",
    type: "function",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "numOutcomes",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface UseClaimParams {
  marketAddress: Address;
}

/**
 * Hook for claiming winnings from resolved prediction markets
 */
export function useClaim({ marketAddress }: UseClaimParams) {
  const { address } = useAccount();
  const contracts = useContracts();

  // Check if market is resolved
  const { data: isResolved } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "resolved",
    query: { enabled: !!marketAddress },
  });

  // Get winning outcome
  const { data: winningOutcome } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "winningOutcome",
    query: { enabled: !!marketAddress && isResolved },
  });

  // Check if market is invalid
  const { data: isInvalid } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "invalid",
    query: { enabled: !!marketAddress && isResolved },
  });

  // Get number of outcomes
  const { data: numOutcomes } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "numOutcomes",
    query: { enabled: !!marketAddress },
  });

  // Get winning outcome token address
  const { data: winningTokenAddress } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getOutcomeToken",
    args: [winningOutcome ?? BigInt(0)],
    query: { enabled: !!marketAddress && isResolved && winningOutcome !== undefined },
  });

  // Get user's balance of winning tokens
  const { data: winningTokenBalance, refetch: refetchBalance } = useReadContract({
    address: winningTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address && !!winningTokenAddress },
  });

  // Claim winnings transaction
  const {
    writeContract: writeClaim,
    data: claimHash,
    isPending: isClaimPending,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  /**
   * Claim winnings from the resolved market
   */
  const claim = () => {
    writeClaim({
      address: contracts.router as Address,
      abi: ROUTER_ABI,
      functionName: "claimWinnings",
      args: [marketAddress],
    });
  };

  /**
   * Calculate estimated payout
   * For valid markets: payout = balance of winning tokens (1:1 with collateral)
   * For invalid markets: payout = total tokens / numOutcomes
   */
  const estimatePayout = (): bigint => {
    if (!isResolved || winningTokenBalance === undefined) {
      return BigInt(0);
    }

    if (isInvalid && numOutcomes) {
      // Invalid market - simplified estimate (actual may differ based on all token holdings)
      return winningTokenBalance / numOutcomes;
    }

    // Normal resolution - winning tokens are worth 1:1
    return winningTokenBalance;
  };

  // Check if user can claim
  const canClaim = isResolved && winningTokenBalance !== undefined && winningTokenBalance > BigInt(0);

  return {
    // Actions
    claim,
    resetClaim,
    refetchBalance,

    // Market state
    isResolved: isResolved ?? false,
    isInvalid: isInvalid ?? false,
    winningOutcome: winningOutcome ?? null,

    // User's claimable amount
    winningTokenBalance: winningTokenBalance ?? BigInt(0),
    estimatedPayout: estimatePayout(),
    canClaim,

    // Transaction state
    isClaimPending,
    isClaimConfirming,
    isClaimSuccess,
    claimError,
    claimHash,

    // Combined loading state
    isLoading: isClaimPending || isClaimConfirming,
  };
}
