import { formatUnits } from "viem";

interface AmountInputProps {
  /** Current amount value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Token symbol to display */
  symbol: string;
  /** User's balance (optional) */
  balance?: bigint;
  /** Token decimals (default: 6 for USDC) */
  decimals?: number;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Quick amount buttons as values or percentages */
  quickAmounts?: number[];
  /** Whether quick amounts are percentages (default: false for dollar amounts) */
  quickAmountsAsPercentage?: boolean;
  /** Whether to show balance */
  showBalance?: boolean;
}

/**
 * Token amount input with balance display and quick amount buttons
 */
export function AmountInput({
  value,
  onChange,
  symbol,
  balance,
  decimals = 6,
  label = "Amount",
  placeholder = "0.00",
  disabled = false,
  quickAmounts = [10, 25, 50, 100],
  quickAmountsAsPercentage = false,
  showBalance = true,
}: AmountInputProps) {
  const handleQuickAmount = (val: number) => {
    if (quickAmountsAsPercentage && balance) {
      const percentage = BigInt(val);
      const tokenVal = (balance * percentage) / BigInt(100);
      onChange(formatUnits(tokenVal, decimals));
    } else {
      onChange(val.toString());
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Balance */}
      <div className="flex justify-between mb-2">
        <label className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))]">
          {label}
        </label>
        {showBalance && balance !== undefined && (
          <span className="text-[10px] sm:text-xs text-[rgb(var(--text-muted))]">
            Balance: {Number(formatUnits(balance, decimals)).toFixed(2)} {symbol}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input text-lg sm:text-xl font-mono pr-16 sm:pr-20 disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-[rgb(var(--text-muted))] text-xs sm:text-sm font-medium">
            {symbol}
          </span>
        </div>
      </div>

      {/* Quick Amounts */}
      {quickAmounts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {quickAmounts.map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAmount(val)}
              disabled={disabled || (quickAmountsAsPercentage && !balance)}
              className="flex-1 min-w-[60px] py-2.5 sm:py-3 rounded-lg bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--bg-muted))] text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors border border-transparent hover:border-[rgb(var(--border-subtle))] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quickAmountsAsPercentage ? `${val}%` : `$${val}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
