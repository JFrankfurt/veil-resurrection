import { formatUnits, type Address } from "viem";
import { useClaim } from "@/hooks/useClaim";
import { useTransactionToast } from "@/hooks/useTransactionToast";
import type { Outcome } from "@/types";

interface ResolvedMarketPanelProps {
  marketAddress: string;
  outcomes: Outcome[];
  winningOutcome?: number;
  isConnected: boolean;
}

/**
 * Panel shown when market is resolved - allows claiming winnings
 */
export function ResolvedMarketPanel({
  marketAddress,
  outcomes,
  winningOutcome,
  isConnected,
}: ResolvedMarketPanelProps) {
  const {
    claim,
    isLoading,
    isClaimPending,
    isClaimConfirming,
    isClaimSuccess,
    claimError,
    claimHash,
    canClaim,
    estimatedPayout,
    winningTokenBalance,
    resetClaim,
  } = useClaim({
    marketAddress: marketAddress as Address,
  });

  // Transaction toast handler for claim
  useTransactionToast({
    id: "claim-winnings",
    pendingMessage: "Claiming winnings...",
    confirmingMessage: "Confirming claim...",
    successMessage: "Winnings claimed successfully!",
    hash: claimHash,
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimSuccess,
    error: claimError,
    onSuccess: () => resetClaim(),
  });

  const handleClaim = () => {
    claim();
  };

  const winnerName =
    winningOutcome !== undefined ? outcomes[winningOutcome]?.name : "Unknown";
  const payoutFormatted = Number(formatUnits(estimatedPayout, 6)).toFixed(2);
  const tokensFormatted = Number(formatUnits(winningTokenBalance, 18)).toFixed(
    2
  );

  return (
    <div className="card-elevated p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Resolution Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[rgb(var(--success-light))] flex items-center justify-center flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[rgb(var(--success))] sm:w-6 sm:h-6"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-base sm:text-lg text-[rgb(var(--text-primary))]">
            Market Resolved
          </h3>
          <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))] truncate">
            Winner:{" "}
            <span className="text-[rgb(var(--success))] font-medium">
              {winnerName}
            </span>
          </p>
        </div>
      </div>

      {/* User Position Summary */}
      {isConnected && winningTokenBalance > BigInt(0) && (
        <div className="p-3 sm:p-4 rounded-xl bg-[rgb(var(--success-light))] border border-[rgb(var(--success))]/30 space-y-2 sm:space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[rgb(var(--text-secondary))]">
              Your winning tokens
            </span>
            <span className="font-mono font-semibold text-[rgb(var(--text-primary))]">
              {tokensFormatted} {winnerName}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs sm:text-sm text-[rgb(var(--text-secondary))]">
              Claimable amount
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-[rgb(var(--success))]">
              ${payoutFormatted}
            </span>
          </div>
        </div>
      )}

      {/* No Position */}
      {isConnected && winningTokenBalance === BigInt(0) && (
        <div className="p-3 sm:p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] text-center">
          <p className="text-sm text-[rgb(var(--text-muted))]">
            You don't have any winning tokens to claim
          </p>
        </div>
      )}

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={!isConnected || !canClaim || isLoading}
        className="w-full py-4 rounded-xl font-semibold text-base transition-all bg-[rgb(var(--success))] hover:brightness-105 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        {!isConnected
          ? "Connect Wallet to Claim"
          : isLoading
            ? "Claiming..."
            : canClaim
              ? `Claim $${payoutFormatted}`
              : "Nothing to Claim"}
      </button>

      {/* Info */}
      <div className="text-[10px] sm:text-xs text-[rgb(var(--text-muted))] text-center">
        <p>Winning tokens can be redeemed 1:1 for USDC</p>
      </div>
    </div>
  );
}
