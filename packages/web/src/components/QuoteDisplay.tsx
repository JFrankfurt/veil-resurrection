import { formatUnits } from "viem";

interface QuoteDisplayProps {
  /** Whether this is a buy or sell quote */
  isBuy: boolean;
  /** Output amount (in smallest units) */
  outputAmount: bigint;
  /** Output token decimals */
  outputDecimals: number;
  /** Output token symbol */
  outputSymbol: string;
  /** Fee amount (optional, in basis points) */
  feeBps?: number;
  /** Slippage in basis points */
  slippageBps: number;
  /** Whether loading */
  isLoading?: boolean;
}

/**
 * Display estimated trade output with fees and slippage
 */
export function QuoteDisplay({
  isBuy,
  outputAmount,
  outputDecimals,
  outputSymbol,
  feeBps = 100, // Default 1% fee
  slippageBps,
  isLoading = false,
}: QuoteDisplayProps) {
  const formattedOutput = Number(formatUnits(outputAmount, outputDecimals));
  const feePercent = feeBps / 100;
  const slippagePercent = slippageBps / 100;

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[rgb(var(--bg-muted))] rounded w-3/4" />
          <div className="h-4 bg-[rgb(var(--bg-muted))] rounded w-1/2" />
          <div className="h-4 bg-[rgb(var(--bg-muted))] rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] space-y-2 sm:space-y-3">
      {/* Output Amount */}
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-[rgb(var(--text-muted))]">
          {isBuy ? "You receive (est.)" : "You get (est.)"}
        </span>
        <span className="font-mono font-semibold text-[rgb(var(--accent-primary))] tabular-nums">
          {formattedOutput > 0 ? (
            <>
              {isBuy
                ? formattedOutput.toFixed(4)
                : `$${formattedOutput.toFixed(2)}`}{" "}
              {outputSymbol}
            </>
          ) : (
            "-"
          )}
        </span>
      </div>

      {/* Fee */}
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-[rgb(var(--text-muted))]">Fee</span>
        <span className="font-mono text-[rgb(var(--text-secondary))] tabular-nums">
          {feePercent.toFixed(1)}%
        </span>
      </div>

      {/* Max Slippage */}
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-[rgb(var(--text-muted))]">Max slippage</span>
        <span className="font-mono text-[rgb(var(--warning))] tabular-nums">
          {slippagePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
