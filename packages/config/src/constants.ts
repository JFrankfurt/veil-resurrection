/**
 * Shared constants used across the predictions platform
 */

// Decimal constants
export const USDC_DECIMALS = 6;
export const TOKEN_DECIMALS = 18;
export const PRICE_DECIMALS = 18;

// Scale factors
export const SCALE = 10n ** 18n;
export const BPS = 10_000n;

// Protocol configuration
export const PROTOCOL_FEE_BPS = 100; // 1%
export const DEFAULT_SLIPPAGE_BPS = 500; // 5%
export const MIN_LIQUIDITY = 1000n;

// Market constraints
export const MIN_OUTCOMES = 2;
export const MAX_OUTCOMES = 8;

// Time constants
export const DEFAULT_DEADLINE_SECONDS = 3600; // 1 hour
