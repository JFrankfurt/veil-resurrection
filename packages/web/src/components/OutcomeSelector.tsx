import { formatUnits } from "viem";
import type { Outcome } from "@/types";

interface OutcomeSelectorProps {
  outcomes: Outcome[];
  selectedOutcome: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

/**
 * Radio-button style outcome selector for prediction markets
 */
export function OutcomeSelector({
  outcomes,
  selectedOutcome,
  onSelect,
  disabled = false,
}: OutcomeSelectorProps) {
  return (
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
              onClick={() => !disabled && onSelect(i)}
              disabled={disabled}
              className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                isSelected
                  ? "border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-light))]"
                  : "border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border-prominent))] bg-[rgb(var(--bg-card))]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
  );
}
