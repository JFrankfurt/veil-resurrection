import { type Address } from "viem";

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

export interface Outcome {
  index: number;
  name: string;
  token: Address;
  price: bigint; // 18 decimals, 0-1e18
  reserve: bigint;
}

export interface Position {
  market: Address;
  balances: bigint[]; // Balance for each outcome
  totalCost: bigint;
}

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

export type MarketStatus = "active" | "ended" | "resolved";

export function getMarketStatus(market: Market): MarketStatus {
  if (market.resolved) return "resolved";
  if (BigInt(Date.now()) / 1000n > market.endTime) return "ended";
  return "active";
}
