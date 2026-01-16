import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits, type Address, maxUint256 } from "viem";
import { useLiquidity } from "@/hooks/useLiquidity";
import toast from "react-hot-toast";

interface LiquidityPanelProps {
  marketAddress: string;
  ammAddress: string;
  totalLiquidity: bigint;
}

export function LiquidityPanel({
  marketAddress,
  ammAddress,
  totalLiquidity,
}: LiquidityPanelProps) {
  const { isConnected } = useAccount();
  const [isAdding, setIsAdding] = useState(true);
  const [amount, setAmount] = useState("");

  const {
    // Actions
    approveUsdc,
    approveLp,
    addLiquidity,
    removeLiquidity,
    estimateLpTokens,
    estimateCollateralOut,
    refetchAll,
    resetAddLiquidity,
    resetRemoveLiquidity,

    // Balances
    usdcBalance,
    lpBalance,
    lpTotalSupply,

    // Allowances
    needsUsdcApproval,
    needsLpApproval,

    // Approval states
    isApproveUsdcPending,
    isApproveUsdcConfirming,
    isApproveUsdcSuccess,
    isApproveLpPending,
    isApproveLpConfirming,
    isApproveLpSuccess,

    // Liquidity states
    isAddLiquidityPending,
    isAddLiquidityConfirming,
    isAddLiquiditySuccess,
    isRemoveLiquidityPending,
    isRemoveLiquidityConfirming,
    isRemoveLiquiditySuccess,

    // Combined
    isLoading,
  } = useLiquidity({
    marketAddress: marketAddress as Address,
    ammAddress: ammAddress as Address,
  });

  const parsedAmount = amount ? parseUnits(amount, isAdding ? 6 : 18) : BigInt(0);

  // Estimated outputs
  const estimatedLpTokens = isAdding ? estimateLpTokens(parsedAmount) : BigInt(0);
  const estimatedCollateral = !isAdding ? estimateCollateralOut(parsedAmount) : BigInt(0);

  // Check if approval is needed
  const requiresApproval = isAdding 
    ? needsUsdcApproval(parsedAmount) 
    : needsLpApproval(parsedAmount);

  // Handle USDC approval success
  useEffect(() => {
    if (isApproveUsdcSuccess) {
      toast.success("USDC approved! You can now add liquidity.");
      refetchAll();
    }
  }, [isApproveUsdcSuccess, refetchAll]);

  // Handle LP approval success
  useEffect(() => {
    if (isApproveLpSuccess) {
      toast.success("LP tokens approved! You can now remove liquidity.");
      refetchAll();
    }
  }, [isApproveLpSuccess, refetchAll]);

  // Handle add liquidity success
  useEffect(() => {
    if (isAddLiquiditySuccess) {
      toast.success("Liquidity added successfully!");
      setAmount("");
      refetchAll();
      resetAddLiquidity();
    }
  }, [isAddLiquiditySuccess, refetchAll, resetAddLiquidity]);

  // Handle remove liquidity success
  useEffect(() => {
    if (isRemoveLiquiditySuccess) {
      toast.success("Liquidity removed successfully!");
      setAmount("");
      refetchAll();
      resetRemoveLiquidity();
    }
  }, [isRemoveLiquiditySuccess, refetchAll, resetRemoveLiquidity]);

  // Handle loading toasts
  useEffect(() => {
    if (isApproveUsdcPending || isApproveUsdcConfirming) {
      toast.loading("Approving USDC...", { id: "approve" });
    } else if (isApproveUsdcSuccess) {
      toast.dismiss("approve");
    }
  }, [isApproveUsdcPending, isApproveUsdcConfirming, isApproveUsdcSuccess]);

  useEffect(() => {
    if (isApproveLpPending || isApproveLpConfirming) {
      toast.loading("Approving LP tokens...", { id: "approve-lp" });
    } else if (isApproveLpSuccess) {
      toast.dismiss("approve-lp");
    }
  }, [isApproveLpPending, isApproveLpConfirming, isApproveLpSuccess]);

  useEffect(() => {
    if (isAddLiquidityPending || isAddLiquidityConfirming) {
      toast.loading("Adding liquidity...", { id: "liquidity" });
    } else if (isAddLiquiditySuccess) {
      toast.dismiss("liquidity");
    }
  }, [isAddLiquidityPending, isAddLiquidityConfirming, isAddLiquiditySuccess]);

  useEffect(() => {
    if (isRemoveLiquidityPending || isRemoveLiquidityConfirming) {
      toast.loading("Removing liquidity...", { id: "liquidity" });
    } else if (isRemoveLiquiditySuccess) {
      toast.dismiss("liquidity");
    }
  }, [isRemoveLiquidityPending, isRemoveLiquidityConfirming, isRemoveLiquiditySuccess]);

  const handleApprove = () => {
    if (isAdding) {
      approveUsdc(maxUint256);
    } else {
      approveLp(maxUint256);
    }
  };

  const handleSubmit = () => {
    if (!isConnected || !amount) return;

    if (isAdding) {
      addLiquidity(parsedAmount);
    } else {
      removeLiquidity(parsedAmount);
    }
  };

  // Calculate pool share
  const poolShare = lpTotalSupply > BigInt(0)
    ? isAdding
      ? (Number(estimatedLpTokens) / Number(lpTotalSupply + estimatedLpTokens)) * 100
      : (Number(lpBalance - parsedAmount) / Number(lpTotalSupply)) * 100
    : isAdding ? 100 : 0;

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[rgb(var(--text-primary))]">Liquidity</h3>
        <div className="text-sm text-[rgb(var(--text-muted))]">
          Pool: ${formatVolume(totalLiquidity)}
        </div>
      </div>

      {/* Add/Remove Toggle */}
      <div className="flex gap-1.5 p-1.5 rounded-xl bg-[rgb(var(--bg-elevated))]">
        <button
          onClick={() => setIsAdding(true)}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
            isAdding
              ? "bg-[rgb(var(--accent-primary))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Add
        </button>
        <button
          onClick={() => setIsAdding(false)}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
            !isAdding
              ? "bg-[rgb(var(--accent-primary))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Remove
        </button>
      </div>

      {/* Your Position */}
      {lpBalance > BigInt(0) && (
        <div className="p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] space-y-2">
          <div className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-wider">Your LP Position</div>
          <div className="font-mono font-semibold text-lg text-[rgb(var(--text-primary))]">
            {Number(formatUnits(lpBalance, 18)).toFixed(4)} LP
          </div>
          <div className="text-xs text-[rgb(var(--text-muted))]">
            ≈ ${formatVolume(lpTotalSupply > 0 ? (lpBalance * totalLiquidity) / lpTotalSupply : BigInt(0))} value
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-[rgb(var(--text-muted))]">
            {isAdding ? "USDC Amount" : "LP Tokens"}
          </label>
          {isConnected && (
            <span className="text-xs text-[rgb(var(--text-muted))]">
              Balance: {isAdding 
                ? `${formatUnits(usdcBalance, 6)} USDC`
                : `${Number(formatUnits(lpBalance, 18)).toFixed(4)} LP`
              }
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input text-lg font-mono pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {!isAdding && lpBalance > BigInt(0) && (
              <button
                onClick={() => setAmount(formatUnits(lpBalance, 18))}
                className="px-2 py-1 text-xs bg-[rgb(var(--bg-muted))] rounded-md hover:bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-secondary))] font-medium"
              >
                MAX
              </button>
            )}
            <span className="text-[rgb(var(--text-muted))] text-sm font-medium">
              {isAdding ? "USDC" : "LP"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2">
        {(isAdding ? [100, 500, 1000, 5000] : [25, 50, 75, 100]).map((val) => (
          <button
            key={val}
            onClick={() => {
              if (isAdding) {
                setAmount(val.toString());
              } else if (lpBalance > BigInt(0)) {
                const percentage = BigInt(val);
                const lpVal = (lpBalance * percentage) / BigInt(100);
                setAmount(formatUnits(lpVal, 18));
              }
            }}
            className="flex-1 py-2 rounded-lg bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--bg-muted))] text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors border border-transparent hover:border-[rgb(var(--border-subtle))]"
          >
            {isAdding ? `$${val}` : `${val}%`}
          </button>
        ))}
      </div>

      {/* Estimated Output */}
      {amount && Number(amount) > 0 && (
        <div className="p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">
              {isAdding ? "LP tokens received" : "USDC received"}
            </span>
            <span className="font-mono font-semibold text-[rgb(var(--accent-primary))]">
              {isAdding
                ? `${Number(formatUnits(estimatedLpTokens, 18)).toFixed(4)} LP`
                : `$${formatVolume(estimatedCollateral)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">Pool share after</span>
            <span className="font-mono text-[rgb(var(--text-secondary))]">
              {poolShare.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">Max slippage</span>
            <span className="font-mono text-[rgb(var(--warning))]">5%</span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-[rgb(var(--text-muted))] space-y-1">
        <p>• LP providers earn 1% fees from all trades</p>
        <p>• Liquidity can be removed at any time</p>
        <p>• After resolution, LPs receive proportional payouts</p>
      </div>

      {/* Action Button */}
      {requiresApproval ? (
        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading}
          className="w-full py-3.5 rounded-xl font-semibold transition-all bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isLoading
            ? "Approving..."
            : isAdding
            ? "Approve USDC"
            : "Approve LP Tokens"}
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !amount || isLoading || parsedAmount === BigInt(0)}
          className="w-full py-3.5 rounded-xl font-semibold transition-all bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {!isConnected
            ? "Connect Wallet"
            : isLoading
            ? isAdding ? "Adding..." : "Removing..."
            : isAdding
            ? "Add Liquidity"
            : "Remove Liquidity"}
        </button>
      )}
    </div>
  );
}

function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(2);
}
