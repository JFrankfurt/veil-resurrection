/**
 * Zod schemas for validating subgraph responses
 *
 * These schemas ensure type safety at runtime when fetching data from The Graph.
 */

import { z } from "zod";

/**
 * Ethereum address schema (0x-prefixed hex string)
 */
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

/**
 * Transaction hash schema
 */
export const TxHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

/**
 * BigInt string schema (numeric string that can be converted to BigInt)
 */
export const BigIntStringSchema = z.string().regex(/^\d+$/);

/**
 * Timestamp schema (Unix timestamp as string)
 */
export const TimestampSchema = BigIntStringSchema;

/**
 * Outcome schema - represents a single outcome in a market
 */
export const OutcomeSchema = z.object({
  id: z.string(),
  index: z.number(),
  name: z.string(),
  token: AddressSchema,
  price: BigIntStringSchema,
  reserve: BigIntStringSchema,
});

export type OutcomeData = z.infer<typeof OutcomeSchema>;

/**
 * Market schema - represents a prediction market
 */
export const MarketSchema = z.object({
  id: AddressSchema,
  question: z.string(),
  amm: AddressSchema,
  endTime: TimestampSchema,
  resolved: z.boolean(),
  winningOutcome: z.number().nullable(),
  invalid: z.boolean(),
  totalVolume: BigIntStringSchema,
  totalLiquidity: BigIntStringSchema,
  createdAt: TimestampSchema,
  createdTx: TxHashSchema,
  outcomes: z.array(OutcomeSchema),
});

export type MarketData = z.infer<typeof MarketSchema>;

/**
 * Trade schema - represents a trade event
 */
export const TradeSchema = z.object({
  id: z.string(),
  user: AddressSchema,
  outcome: z.number(),
  isBuy: z.boolean(),
  collateralAmount: BigIntStringSchema,
  tokenAmount: BigIntStringSchema,
  timestamp: TimestampSchema,
  txHash: TxHashSchema,
});

export type TradeData = z.infer<typeof TradeSchema>;

/**
 * Position market info schema
 */
export const PositionMarketSchema = z.object({
  id: AddressSchema,
  question: z.string(),
  resolved: z.boolean(),
  winningOutcome: z.number().nullable(),
  endTime: TimestampSchema,
  outcomes: z.array(z.object({ name: z.string() })),
});

/**
 * Position schema - represents a user's position in a market
 */
export const PositionSchema = z.object({
  id: z.string(),
  user: AddressSchema,
  market: PositionMarketSchema,
  balances: z.array(BigIntStringSchema),
  totalCost: BigIntStringSchema,
  lastUpdated: TimestampSchema,
});

export type PositionData = z.infer<typeof PositionSchema>;

/**
 * Protocol stats schema
 */
export const ProtocolStatsSchema = z.object({
  totalMarkets: z.number(),
  totalVolume: BigIntStringSchema,
  totalTrades: z.number(),
});

export type ProtocolStatsData = z.infer<typeof ProtocolStatsSchema>;

/**
 * Parse and validate market data from subgraph response
 */
export function parseMarket(data: unknown): MarketData | null {
  const result = MarketSchema.safeParse(data);
  if (!result.success) {
    console.error("Failed to parse market:", result.error.format());
    return null;
  }
  return result.data;
}

/**
 * Parse and validate markets array from subgraph response
 */
export function parseMarkets(data: unknown): MarketData[] {
  if (!Array.isArray(data)) {
    console.error("Expected array of markets");
    return [];
  }
  return data
    .map((item) => parseMarket(item))
    .filter((m): m is MarketData => m !== null);
}

/**
 * Parse and validate trade data from subgraph response
 */
export function parseTrade(data: unknown): TradeData | null {
  const result = TradeSchema.safeParse(data);
  if (!result.success) {
    console.error("Failed to parse trade:", result.error.format());
    return null;
  }
  return result.data;
}

/**
 * Parse and validate trades array from subgraph response
 */
export function parseTrades(data: unknown): TradeData[] {
  if (!Array.isArray(data)) {
    console.error("Expected array of trades");
    return [];
  }
  return data
    .map((item) => parseTrade(item))
    .filter((t): t is TradeData => t !== null);
}

/**
 * Parse and validate position data from subgraph response
 */
export function parsePosition(data: unknown): PositionData | null {
  const result = PositionSchema.safeParse(data);
  if (!result.success) {
    console.error("Failed to parse position:", result.error.format());
    return null;
  }
  return result.data;
}

/**
 * Parse and validate positions array from subgraph response
 */
export function parsePositions(data: unknown): PositionData[] {
  if (!Array.isArray(data)) {
    console.error("Expected array of positions");
    return [];
  }
  return data
    .map((item) => parsePosition(item))
    .filter((p): p is PositionData => p !== null);
}

/**
 * Parse and validate protocol stats from subgraph response
 */
export function parseProtocolStats(data: unknown): ProtocolStatsData | null {
  const result = ProtocolStatsSchema.safeParse(data);
  if (!result.success) {
    console.error("Failed to parse protocol stats:", result.error.format());
    return null;
  }
  return result.data;
}
