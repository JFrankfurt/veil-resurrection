export { useContracts } from "./useContracts";
export { useMarket, type MarketData } from "./useMarket";
export { useTrade } from "./useTrade";
export {
  usePosition,
  useClaimWinnings,
  type Position,
} from "./usePosition";
export { useLiquidity } from "./useLiquidity";
export { useClaim } from "./useClaim";

// Re-export utilities from config for convenience
export {
  formatPrice,
  formatVolume,
  formatTokenBalance,
  withSlippage,
  formatTimeAgo,
  getDeadline,
} from "@predictions/config";
