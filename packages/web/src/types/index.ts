/**
 * Shared types for frontend components and hooks
 */

import type { Address } from "viem";

/**
 * Represents a single outcome in a prediction market
 */
export interface Outcome {
  /** Display name of the outcome */
  name: string;
  /** Current price as a bigint (18 decimals, 1e18 = 100%) */
  price: bigint;
  /** ERC20 token address for this outcome */
  token?: Address;
  /** Current reserve in the AMM pool */
  reserve?: bigint;
}

/**
 * State of a prediction market
 */
export interface MarketState {
  /** Whether the market has been resolved */
  resolved: boolean;
  /** Index of the winning outcome (undefined if not resolved) */
  winningOutcome?: number;
  /** Whether the market was invalidated */
  invalid?: boolean;
}

/**
 * User's position in a market outcome
 */
export interface Position {
  /** Outcome name */
  outcome: string;
  /** Token address */
  tokenAddress: Address;
  /** Token balance */
  balance: bigint;
  /** Whether this is the winning outcome */
  isWinning: boolean;
}

/**
 * Common props for trading-related components
 */
export interface TradingComponentProps {
  /** Market contract address */
  marketAddress: Address;
  /** AMM contract address */
  ammAddress: Address;
  /** Available outcomes */
  outcomes: Outcome[];
  /** Whether the market is resolved */
  resolved: boolean;
  /** Index of winning outcome if resolved */
  winningOutcome?: number;
  /** Whether user is connected */
  isConnected: boolean;
}

/**
 * Props for amount input components
 */
export interface AmountInputProps {
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
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Quick amount buttons (e.g., [100, 500, 1000]) */
  quickAmounts?: number[];
}

/**
 * Props for outcome selector components
 */
export interface OutcomeSelectorProps {
  /** Available outcomes */
  outcomes: Outcome[];
  /** Currently selected outcome index */
  selectedOutcome: number;
  /** Selection change handler */
  onSelect: (index: number) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

/**
 * Props for transaction button components
 */
export interface TransactionButtonProps {
  /** Button label */
  label: string;
  /** Loading label */
  loadingLabel?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether transaction is pending */
  isPending?: boolean;
  /** Whether transaction is confirming */
  isConfirming?: boolean;
  /** Variant style */
  variant?: "primary" | "secondary" | "danger";
  /** Full width */
  fullWidth?: boolean;
}

/**
 * Props for quote display components
 */
export interface QuoteDisplayProps {
  /** Whether this is a buy or sell quote */
  isBuy: boolean;
  /** Input amount (in smallest units) */
  inputAmount: bigint;
  /** Output amount (in smallest units) */
  outputAmount: bigint;
  /** Input token decimals */
  inputDecimals: number;
  /** Output token decimals */
  outputDecimals: number;
  /** Input token symbol */
  inputSymbol: string;
  /** Output token symbol */
  outputSymbol: string;
  /** Fee amount (optional) */
  fee?: bigint;
  /** Slippage percentage */
  slippage: number;
  /** Whether loading */
  isLoading?: boolean;
}

/**
 * Trade direction
 */
export type TradeDirection = "buy" | "sell";

/**
 * Liquidity action type
 */
export type LiquidityAction = "add" | "remove";
