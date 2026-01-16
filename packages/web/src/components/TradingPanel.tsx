import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, type Address, maxUint256, erc20Abi } from "viem";
import { RouterABI, OutcomeAMMABI } from "@predictions/config/abis";
import {
  DEFAULT_SLIPPAGE_BPS,
  withSlippage,
  getDeadline,
} from "@predictions/config";
import { useContracts } from "@/hooks/useContracts";
import { useClaim } from "@/hooks/useClaim";
import toast from "react-hot-toast";

interface Outcome {
  name: string;
  price: bigint;
  token?: Address;
}

interface TradingPanelProps {
  marketAddress: string;
  ammAddress: string;
  outcomes: Outcome[];
  resolved: boolean;
  winningOutcome?: number;
}

export function TradingPanel({
  marketAddress,
  ammAddress,
  outcomes,
  resolved,
  winningOutcome,
}: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const contracts = useContracts();
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);

  const parsedAmount = amount
    ? parseUnits(amount, isBuying ? 6 : 18)
    : BigInt(0);

  // Check USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.usdc as Address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address || "0x0", contracts.router as Address],
    query: { enabled: !!address && !!contracts.router },
  });

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address },
  });

  // Check outcome token balance (for selling)
  const { data: tokenBalance } = useReadContract({
    address: outcomes[selectedOutcome]?.token || "0x0",
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: {
      enabled: !!address && !!outcomes[selectedOutcome]?.token && !isBuying,
    },
  });

  // Get quote
  const { data: quoteRaw } = useReadContract({
    address: ammAddress as Address,
    abi: OutcomeAMMABI,
    functionName: isBuying ? "quoteBuy" : "quoteSell",
    args: [BigInt(selectedOutcome), parsedAmount],
    query: { enabled: parsedAmount > BigInt(0) },
  });
  const quote = quoteRaw as bigint | undefined;

  // Write contract for approval
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Write contract for buy
  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: isBuyPending,
    reset: resetBuy,
  } = useWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  // Write contract for sell
  const {
    writeContract: writeSell,
    data: sellHash,
    isPending: isSellPending,
    reset: resetSell,
  } = useWriteContract();

  const { isLoading: isSellConfirming, isSuccess: isSellSuccess } =
    useWaitForTransactionReceipt({ hash: sellHash });

  // Calculate needs approval
  const needsApproval =
    isBuying && usdcAllowance !== undefined && parsedAmount > usdcAllowance;

  // Show success toast and reset form on success
  useEffect(() => {
    if (isBuySuccess) {
      toast.success(
        `Successfully bought ${outcomes[selectedOutcome].name} tokens!`
      );
      setAmount("");
      refetchAllowance();
      resetBuy();
    }
  }, [isBuySuccess, selectedOutcome, outcomes, refetchAllowance, resetBuy]);

  useEffect(() => {
    if (isSellSuccess) {
      toast.success(
        `Successfully sold ${outcomes[selectedOutcome].name} tokens!`
      );
      setAmount("");
      refetchAllowance();
      resetSell();
    }
  }, [isSellSuccess, selectedOutcome, outcomes, refetchAllowance, resetSell]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("USDC approved! You can now trade.");
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  const handleApprove = () => {
    toast.loading("Approving USDC...", { id: "approve" });
    writeApprove({
      address: contracts.usdc as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [contracts.router as Address, maxUint256],
    });
  };

  const handleTrade = () => {
    if (!amount || !isConnected || !quote) return;

    const deadline = getDeadline();
    const minOut = withSlippage(quote);

    toast.loading(isBuying ? "Buying..." : "Selling...", { id: "trade" });

    if (isBuying) {
      writeBuy({
        address: contracts.router as Address,
        abi: RouterABI,
        functionName: "buy",
        args: [
          marketAddress as Address,
          BigInt(selectedOutcome),
          parsedAmount,
          minOut,
          deadline,
        ],
      });
    } else {
      writeSell({
        address: contracts.router as Address,
        abi: RouterABI,
        functionName: "sell",
        args: [
          marketAddress as Address,
          BigInt(selectedOutcome),
          parsedAmount,
          minOut,
          deadline,
        ],
      });
    }
  };

  // Dismiss loading toasts on success/error
  useEffect(() => {
    if (isApproveConfirming)
      toast.loading("Confirming approval...", { id: "approve" });
    if (isApproveSuccess) toast.dismiss("approve");
  }, [isApproveConfirming, isApproveSuccess]);

  useEffect(() => {
    if (isBuyConfirming || isSellConfirming)
      toast.loading("Confirming...", { id: "trade" });
    if (isBuySuccess || isSellSuccess) toast.dismiss("trade");
  }, [isBuyConfirming, isSellConfirming, isBuySuccess, isSellSuccess]);

  const isLoading =
    isApprovePending ||
    isApproveConfirming ||
    isBuyPending ||
    isBuyConfirming ||
    isSellPending ||
    isSellConfirming;

  // Render resolved market panel with claim functionality
  if (resolved) {
    return (
      <ResolvedMarketPanel
        marketAddress={marketAddress}
        outcomes={outcomes}
        winningOutcome={winningOutcome}
        isConnected={isConnected}
      />
    );
  }

  return (
    <div className="card-elevated p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Buy/Sell Toggle */}
      <div className="flex gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl bg-[rgb(var(--bg-elevated))]">
        <button
          onClick={() => setIsBuying(true)}
          className={`flex-1 py-3 sm:py-3.5 rounded-lg font-semibold text-sm transition-all ${
            isBuying
              ? "bg-[rgb(var(--success))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setIsBuying(false)}
          className={`flex-1 py-3 sm:py-3.5 rounded-lg font-semibold text-sm transition-all ${
            !isBuying
              ? "bg-[rgb(var(--accent-primary))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Selection */}
      <div className="space-y-2">
        <label className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))]">
          Outcome
        </label>
        <div className="space-y-2">
          {outcomes.map((outcome, i) => {
            const isSelected = selectedOutcome === i;
            const pricePercent = Number(formatUnits(outcome.price, 16));

            return (
              <button
                key={i}
                onClick={() => setSelectedOutcome(i)}
                className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  isSelected
                    ? "border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-light))]"
                    : "border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border-prominent))] bg-[rgb(var(--bg-card))]"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? "border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary))]"
                        : "border-[rgb(var(--border-prominent))]"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-medium text-sm sm:text-base text-[rgb(var(--text-primary))]">
                    {outcome.name}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-semibold text-sm sm:text-base tabular-nums ${
                      isSelected
                        ? "text-[rgb(var(--accent-primary))]"
                        : "text-[rgb(var(--text-primary))]"
                    }`}
                  >
                    {pricePercent.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))]">
            {isBuying ? "You pay" : "You sell"}
          </label>
          {isConnected && (
            <span className="text-[10px] sm:text-xs text-[rgb(var(--text-muted))]">
              Balance:{" "}
              {isBuying
                ? `${Number(formatUnits(usdcBalance || BigInt(0), 6)).toFixed(2)} USDC`
                : `${Number(formatUnits(tokenBalance || BigInt(0), 18)).toFixed(2)}`}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input text-lg sm:text-xl font-mono pr-16 sm:pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-[rgb(var(--text-muted))] text-xs sm:text-sm font-medium">
              {isBuying ? "USDC" : "tokens"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Amounts - Scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {(isBuying ? [10, 25, 50, 100] : [25, 50, 75, 100]).map((val) => (
          <button
            key={val}
            onClick={() => {
              if (isBuying) {
                setAmount(val.toString());
              } else if (tokenBalance) {
                const percentage = BigInt(val);
                const tokenVal = (tokenBalance * percentage) / BigInt(100);
                setAmount(formatUnits(tokenVal, 18));
              }
            }}
            className="flex-1 min-w-[60px] py-2.5 sm:py-3 rounded-lg bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--bg-muted))] text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors border border-transparent hover:border-[rgb(var(--border-subtle))]"
          >
            {isBuying ? `$${val}` : `${val}%`}
          </button>
        ))}
      </div>

      {/* Estimated Output */}
      {amount && Number(amount) > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] space-y-2 sm:space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[rgb(var(--text-muted))]">
              {isBuying ? "You receive (est.)" : "You get (est.)"}
            </span>
            <span className="font-mono font-semibold text-[rgb(var(--accent-primary))]">
              {quote
                ? Number(formatUnits(quote, isBuying ? 18 : 6)).toFixed(2)
                : "..."}{" "}
              {isBuying ? outcomes[selectedOutcome].name : "USDC"}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[rgb(var(--text-muted))]">Protocol fee</span>
            <span className="font-mono text-[rgb(var(--text-secondary))]">
              1%
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[rgb(var(--text-muted))]">Max slippage</span>
            <span className="font-mono text-[rgb(var(--warning))]">
              {DEFAULT_SLIPPAGE_BPS / 100}%
            </span>
          </div>
        </div>
      )}

      {/* Trade Button */}
      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading}
          className="w-full py-4 rounded-xl font-semibold text-base transition-all bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          {isApprovePending || isApproveConfirming
            ? "Approving..."
            : "Approve USDC"}
        </button>
      ) : (
        <button
          onClick={handleTrade}
          disabled={!isConnected || !amount || isLoading || !quote}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98] ${
            isBuying
              ? "bg-[rgb(var(--success))] hover:brightness-105 text-white"
              : "bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white"
          }`}
        >
          {!isConnected
            ? "Connect Wallet"
            : isLoading
              ? "Confirming..."
              : isBuying
                ? `Buy ${outcomes[selectedOutcome].name}`
                : `Sell ${outcomes[selectedOutcome].name}`}
        </button>
      )}
    </div>
  );
}

/**
 * Panel shown when market is resolved - allows claiming winnings
 */
function ResolvedMarketPanel({
  marketAddress,
  outcomes,
  winningOutcome,
  isConnected,
}: {
  marketAddress: string;
  outcomes: Outcome[];
  winningOutcome?: number;
  isConnected: boolean;
}) {
  const {
    claim,
    isLoading,
    isClaimSuccess,
    canClaim,
    estimatedPayout,
    winningTokenBalance,
    resetClaim,
  } = useClaim({
    marketAddress: marketAddress as Address,
  });

  // Handle claim success
  useEffect(() => {
    if (isClaimSuccess) {
      toast.success("Winnings claimed successfully!");
      resetClaim();
    }
  }, [isClaimSuccess, resetClaim]);

  // Handle loading toast
  useEffect(() => {
    if (isLoading) {
      toast.loading("Claiming winnings...", { id: "claim" });
    } else {
      toast.dismiss("claim");
    }
  }, [isLoading]);

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
