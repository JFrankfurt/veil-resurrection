"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { cn } from "@/lib/utils";

interface LiquidityPanelProps {
  marketAddress: string;
  ammAddress: string;
  totalLiquidity: bigint;
  userLpBalance?: bigint;
}

export function LiquidityPanel({
  marketAddress,
  ammAddress,
  totalLiquidity,
  userLpBalance = BigInt(0),
}: LiquidityPanelProps) {
  const { isConnected } = useAccount();
  const [isAdding, setIsAdding] = useState(true);
  const [amount, setAmount] = useState("");

  const parsedAmount = amount ? parseUnits(amount, isAdding ? 6 : 18) : BigInt(0);

  // Mock share calculation
  const estimatedShares = isAdding
    ? totalLiquidity > BigInt(0)
      ? (parsedAmount * BigInt(1e18)) / totalLiquidity
      : parsedAmount
    : BigInt(0);

  const estimatedReturn = !isAdding && totalLiquidity > BigInt(0)
    ? (parsedAmount * totalLiquidity) / BigInt(1e18)
    : BigInt(0);

  const handleSubmit = async () => {
    if (!isConnected || !amount) return;
    
    // TODO: Call addLiquidity or removeLiquidity via Router
    console.log(isAdding ? "Adding liquidity" : "Removing liquidity", {
      amount: parsedAmount.toString(),
      marketAddress,
      ammAddress,
    });
    
    setAmount("");
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Liquidity</h3>
        <div className="text-sm text-slate-400">
          Pool: ${formatVolume(totalLiquidity)}
        </div>
      </div>

      {/* Add/Remove Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsAdding(true)}
          className={cn(
            "flex-1 py-2 rounded-lg font-medium transition-all text-sm",
            isAdding
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          )}
        >
          Add
        </button>
        <button
          onClick={() => setIsAdding(false)}
          className={cn(
            "flex-1 py-2 rounded-lg font-medium transition-all text-sm",
            !isAdding
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          )}
        >
          Remove
        </button>
      </div>

      {/* Your Position */}
      {userLpBalance > BigInt(0) && (
        <div className="p-3 rounded-lg bg-slate-800/50 space-y-1">
          <div className="text-xs text-slate-400">Your LP Position</div>
          <div className="font-mono font-medium">
            {formatUnits(userLpBalance, 18)} LP
          </div>
          <div className="text-xs text-slate-500">
            ≈ ${formatVolume((userLpBalance * totalLiquidity) / BigInt(1e18))} value
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          {isAdding ? "USDC Amount" : "LP Tokens"}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 font-mono focus:outline-none focus:border-blue-500"
          />
          {!isAdding && userLpBalance > BigInt(0) && (
            <button
              onClick={() => setAmount(formatUnits(userLpBalance, 18))}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-700 rounded hover:bg-slate-600"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Estimated Output */}
      {amount && (
        <div className="p-3 rounded-lg bg-slate-800/50 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">
              {isAdding ? "LP tokens received" : "USDC received"}
            </span>
            <span className="font-mono">
              {isAdding
                ? formatUnits(estimatedShares, 18)
                : `$${formatVolume(estimatedReturn)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Pool share</span>
            <span className="font-mono">
              {totalLiquidity > BigInt(0)
                ? (
                    (Number(isAdding ? estimatedShares : parsedAmount) /
                      Number(totalLiquidity + (isAdding ? estimatedShares : BigInt(0)))) *
                    100
                  ).toFixed(2)
                : "100.00"}
              %
            </span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>• LP providers earn fees from all trades in this market</p>
        <p>• Liquidity can be removed at any time before resolution</p>
        <p>• After resolution, LPs receive proportional payouts</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isConnected || !amount}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-blue-600 hover:bg-blue-500 text-white"
        )}
      >
        {!isConnected
          ? "Connect Wallet"
          : isAdding
          ? "Add Liquidity"
          : "Remove Liquidity"}
      </button>
    </div>
  );
}

function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(2);
}
