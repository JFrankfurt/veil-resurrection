interface TransactionButtonProps {
  /** Button label */
  label: string;
  /** Loading label (shown when pending/confirming) */
  loadingLabel?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether transaction is pending (wallet interaction) */
  isPending?: boolean;
  /** Whether transaction is confirming (on-chain) */
  isConfirming?: boolean;
  /** Variant style */
  variant?: "primary" | "secondary" | "success" | "danger";
  /** Full width */
  fullWidth?: boolean;
  /** Additional class names */
  className?: string;
}

const variantStyles = {
  primary:
    "bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white",
  secondary:
    "bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--bg-muted))] text-[rgb(var(--text-primary))] border border-[rgb(var(--border-subtle))]",
  success: "bg-[rgb(var(--success))] hover:bg-[rgb(var(--success-hover))] text-white",
  danger: "bg-[rgb(var(--error))] hover:bg-[rgb(var(--error-hover))] text-white",
};

/**
 * Smart button for blockchain transactions
 * Handles pending, confirming, and disabled states automatically
 */
export function TransactionButton({
  label,
  loadingLabel,
  onClick,
  disabled = false,
  isPending = false,
  isConfirming = false,
  variant = "primary",
  fullWidth = true,
  className = "",
}: TransactionButtonProps) {
  const isLoading = isPending || isConfirming;
  const buttonLabel = isLoading
    ? loadingLabel ||
      (isPending ? "Waiting for wallet..." : "Confirming...")
    : label;

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        py-3.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${fullWidth ? "w-full" : ""}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {isLoading && (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {buttonLabel}
        </span>
      )}
      {!isLoading && buttonLabel}
    </button>
  );
}
