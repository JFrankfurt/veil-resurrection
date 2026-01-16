/**
 * Shared utility functions for formatting and calculations
 */

import { formatUnits } from "viem";
import { DEFAULT_SLIPPAGE_BPS, BPS } from "./constants";

/**
 * Format price from 18 decimals to percentage string
 * @param price - Price in 18 decimal fixed point (0 to 1e18)
 * @returns Formatted percentage string (e.g., "65.0")
 */
export function formatPrice(price: bigint): string {
  return Number(formatUnits(price, 16)).toFixed(1);
}

/**
 * Format volume from 6 decimals (USDC) to readable string
 * @param volume - Volume in USDC (6 decimals)
 * @returns Human-readable string (e.g., "1.2M", "500K", "100")
 */
export function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}

/**
 * Format token balance from 18 decimals to readable string
 * @param balance - Token balance in 18 decimals
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted balance string
 */
export function formatTokenBalance(balance: bigint, decimals = 2): string {
  return Number(formatUnits(balance, 18)).toFixed(decimals);
}

/**
 * Calculate slippage-adjusted minimum output
 * @param amount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (default: 500 = 5%)
 * @returns Minimum acceptable output after slippage
 */
export function withSlippage(
  amount: bigint,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS
): bigint {
  return (amount * BigInt(10000 - slippageBps)) / BigInt(10000);
}

/**
 * Format time ago from timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Human-readable relative time (e.g., "5m ago", "2h ago")
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Calculate deadline timestamp for transactions
 * @param seconds - Number of seconds from now (default: 3600 = 1 hour)
 * @returns Unix timestamp as bigint
 */
export function getDeadline(seconds = 3600): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}
