import { type Address } from "viem";

// =============================================================================
// Core Domain Types
// =============================================================================

/**
 * Outcome in a prediction market
 */
export interface Outcome {
  index: number;
  name: string;
  token: Address;
  price: bigint; // 18 decimals, 0-1e18
  reserve: bigint;
}

/**
 * Prediction market
 */
export interface Market {
  address: Address;
  question: string;
  outcomes: Outcome[];
  endTime: bigint;
  resolved: boolean;
  winningOutcome: number | null;
  invalid: boolean;
  amm: Address;
  totalVolume: bigint;
  totalLiquidity: bigint;
  createdAt: bigint;
}

/**
 * User position in a market
 */
export interface Position {
  market: Address;
  balances: bigint[]; // Balance for each outcome
  totalCost: bigint;
}

/**
 * Trade event
 */
export interface Trade {
  id: string;
  market: Address;
  user: Address;
  outcome: number;
  isBuy: boolean;
  collateralAmount: bigint;
  tokenAmount: bigint;
  timestamp: bigint;
  txHash: string;
}

// =============================================================================
// Subgraph Types (string-based for GraphQL responses)
// =============================================================================

/**
 * Outcome as returned from subgraph (string values)
 */
export interface SubgraphOutcome {
  id: string;
  index: number;
  name: string;
  token: string;
  price: string;
  reserve: string;
}

/**
 * Market as returned from subgraph (string values)
 */
export interface SubgraphMarket {
  id: string;
  question: string;
  amm: string;
  endTime: string;
  resolved: boolean;
  winningOutcome: number | null;
  invalid: boolean;
  totalVolume: string;
  totalLiquidity: string;
  createdAt: string;
  createdTx: string;
  outcomes: SubgraphOutcome[];
}

/**
 * Trade as returned from subgraph (string values)
 */
export interface SubgraphTrade {
  id: string;
  user: string;
  outcome: number;
  isBuy: boolean;
  collateralAmount: string;
  tokenAmount: string;
  timestamp: string;
  txHash: string;
}

/**
 * Position as returned from subgraph (string values)
 */
export interface SubgraphPosition {
  id: string;
  user: string;
  market: {
    id: string;
    question: string;
    resolved: boolean;
    winningOutcome: number | null;
    endTime: string;
    outcomes: { name: string }[];
  };
  balances: string[];
  totalCost: string;
  lastUpdated: string;
}

/**
 * Protocol stats from subgraph
 */
export interface ProtocolStats {
  totalMarkets: number;
  totalVolume: string;
  totalTrades: number;
}

// =============================================================================
// Utility Types
// =============================================================================

export type MarketStatus = "active" | "ended" | "resolved";

/**
 * Get the current status of a market
 */
export function getMarketStatus(market: Market | SubgraphMarket): MarketStatus {
  if (market.resolved) return "resolved";
  const endTime =
    typeof market.endTime === "bigint"
      ? market.endTime
      : BigInt(market.endTime);
  if (BigInt(Math.floor(Date.now() / 1000)) > endTime) return "ended";
  return "active";
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Market data as returned by useMarket hook
 */
export interface MarketData {
  address: Address;
  ammAddress: Address;
  question: string;
  endTime: bigint;
  resolved: boolean;
  winningOutcome: number;
  invalid: boolean;
  outcomes: {
    name: string;
    token: Address;
    price: bigint;
    reserve: bigint;
  }[];
  totalLiquidity: bigint;
}
