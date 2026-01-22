// =============================================================================
// Database row types (raw from Postgres)
// =============================================================================

export interface MarketRow {
  id: Buffer;
  question: string;
  amm: Buffer;
  end_time: string; // numeric comes as string
  resolved: boolean;
  winning_outcome: number | null;
  invalid: boolean;
  total_volume: string;
  total_liquidity: string;
  created_at: string;
  created_tx: Buffer;
}

export interface OutcomeRow {
  id: Buffer;
  market_id: Buffer;
  outcome_index: number;
  name: string;
  token: Buffer;
  price: string;
  reserve: string;
}

export interface TradeRow {
  id: Buffer;
  market_id: Buffer | null;
  amm_address: Buffer;
  user_address: Buffer;
  outcome: number;
  is_buy: boolean;
  collateral_amount: string;
  token_amount: string;
  timestamp: string;
  tx_hash: Buffer;
}

export interface PositionRow {
  id: Buffer;
  user_address: Buffer;
  market_id: Buffer;
  balances: string[];
  total_cost: string;
  last_updated: string;
}

export interface LiquidityEventRow {
  id: Buffer;
  market_id: Buffer | null;
  amm_address: Buffer;
  provider: Buffer;
  is_add: boolean;
  collateral_amount: string;
  lp_tokens: string;
  timestamp: string;
  tx_hash: Buffer;
}

export interface ProtocolStatsRow {
  id: number;
  total_markets: number;
  total_volume: string;
  total_trades: number;
  total_liquidity: string;
  last_updated: string;
}

// =============================================================================
// API response types (formatted for frontend)
// =============================================================================

export interface Market {
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
  outcomes?: Outcome[];
}

export interface Outcome {
  id: string;
  index: number;
  name: string;
  token: string;
  price: string;
  reserve: string;
}

export interface Trade {
  id: string;
  user: string;
  outcome: number;
  isBuy: boolean;
  collateralAmount: string;
  tokenAmount: string;
  timestamp: string;
  txHash: string;
}

export interface Position {
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

export interface ProtocolStats {
  totalMarkets: number;
  totalVolume: string;
  totalTrades: number;
  totalLiquidity: string;
}

// =============================================================================
// Utility functions for converting between formats
// =============================================================================

/**
 * Convert a Buffer to a hex string with 0x prefix
 */
export function bufferToHex(buffer: Buffer | null | undefined): string {
  if (!buffer) return "";
  return "0x" + buffer.toString("hex");
}

/**
 * Convert a hex string to Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}

/**
 * Convert a MarketRow to Market API response
 */
export function formatMarket(row: MarketRow, outcomes?: OutcomeRow[]): Market {
  return {
    id: bufferToHex(row.id),
    question: row.question,
    amm: bufferToHex(row.amm),
    endTime: row.end_time,
    resolved: row.resolved,
    winningOutcome: row.winning_outcome,
    invalid: row.invalid,
    totalVolume: row.total_volume,
    totalLiquidity: row.total_liquidity,
    createdAt: row.created_at,
    createdTx: bufferToHex(row.created_tx),
    outcomes: outcomes?.map(formatOutcome),
  };
}

/**
 * Convert an OutcomeRow to Outcome API response
 */
export function formatOutcome(row: OutcomeRow): Outcome {
  return {
    id: bufferToHex(row.id),
    index: row.outcome_index,
    name: row.name,
    token: bufferToHex(row.token),
    price: row.price,
    reserve: row.reserve,
  };
}

/**
 * Convert a TradeRow to Trade API response
 */
export function formatTrade(row: TradeRow): Trade {
  return {
    id: bufferToHex(row.id),
    user: bufferToHex(row.user_address),
    outcome: row.outcome,
    isBuy: row.is_buy,
    collateralAmount: row.collateral_amount,
    tokenAmount: row.token_amount,
    timestamp: row.timestamp,
    txHash: bufferToHex(row.tx_hash),
  };
}

/**
 * Convert ProtocolStatsRow to ProtocolStats API response
 */
export function formatProtocolStats(row: ProtocolStatsRow): ProtocolStats {
  return {
    totalMarkets: row.total_markets,
    totalVolume: row.total_volume,
    totalTrades: row.total_trades,
    totalLiquidity: row.total_liquidity,
  };
}
