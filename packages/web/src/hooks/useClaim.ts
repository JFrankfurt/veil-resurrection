import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { type Address, erc20Abi } from "viem";
import { routerAbi, marketAbi } from "@predictions/config";
import { useContracts } from "./useContracts";

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
  const { data: isResolvedRaw } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: "resolved",
    query: { enabled: !!marketAddress },
  });
  const isResolved = isResolvedRaw as boolean | undefined;

  // Get winning outcome
  const { data: winningOutcomeRaw } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: "winningOutcome",
    query: { enabled: !!marketAddress && !!isResolved },
  });
  const winningOutcome = winningOutcomeRaw as bigint | undefined;

  // Check if market is invalid
  const { data: isInvalidRaw } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: "invalid",
    query: { enabled: !!marketAddress && !!isResolved },
  });
  const isInvalid = isInvalidRaw as boolean | undefined;

  // Get number of outcomes
  const { data: numOutcomesRaw } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: "numOutcomes",
    query: { enabled: !!marketAddress },
  });
  const numOutcomes = numOutcomesRaw as bigint | undefined;

  // Get winning outcome token address
  const { data: winningTokenAddressRaw } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: "getOutcomeToken",
    args: [winningOutcome ?? BigInt(0)],
    query: {
      enabled: !!marketAddress && !!isResolved && winningOutcome !== undefined,
    },
  });
  const winningTokenAddress = winningTokenAddressRaw as Address | undefined;

  // Get user's balance of winning tokens
  const { data: winningTokenBalance, refetch: refetchBalance } = useReadContract(
    {
      address: winningTokenAddress as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address || "0x0"],
      query: { enabled: !!address && !!winningTokenAddress },
    }
  );

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
      abi: routerAbi,
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

    if (isInvalid && numOutcomes && numOutcomes > BigInt(0)) {
      // Invalid market - simplified estimate (actual may differ based on all token holdings)
      return winningTokenBalance / numOutcomes;
    }

    // Normal resolution - winning tokens are worth 1:1
    return winningTokenBalance;
  };

  // Check if user can claim
  const canClaim =
    isResolved &&
    winningTokenBalance !== undefined &&
    winningTokenBalance > BigInt(0);

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
