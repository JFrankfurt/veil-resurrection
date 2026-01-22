import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { type Address, erc20Abi } from "viem";
import { routerAbi, outcomeAmmAbi } from "@predictions/config";
import { useContracts } from "./useContracts";

// Re-export withSlippage from config for backwards compatibility
export { withSlippage } from "@predictions/config";

interface UseTradeParams {
  marketAddress: Address;
  ammAddress: Address;
}

/**
 * Hook for trading outcome tokens
 */
export function useTrade({ marketAddress, ammAddress }: UseTradeParams) {
  const contracts = useContracts();

  // Write contract hooks
  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: isBuyPending,
    error: buyError,
    reset: resetBuy,
  } = useWriteContract();

  const {
    writeContract: writeSell,
    data: sellHash,
    isPending: isSellPending,
    error: sellError,
    reset: resetSell,
  } = useWriteContract();

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  const { isLoading: isSellConfirming, isSuccess: isSellSuccess } =
    useWaitForTransactionReceipt({ hash: sellHash });

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  /**
   * Get a quote for buying outcome tokens
   */
  const useQuoteBuy = (outcome: number, collateralAmount: bigint) => {
    return useReadContract({
      address: ammAddress,
      abi: outcomeAmmAbi,
      functionName: "quoteBuy",
      args: [BigInt(outcome), collateralAmount],
      query: {
        enabled: collateralAmount > 0,
      },
    });
  };

  /**
   * Get a quote for selling outcome tokens
   */
  const useQuoteSell = (outcome: number, tokenAmount: bigint) => {
    return useReadContract({
      address: ammAddress,
      abi: outcomeAmmAbi,
      functionName: "quoteSell",
      args: [BigInt(outcome), tokenAmount],
      query: {
        enabled: tokenAmount > 0,
      },
    });
  };

  /**
   * Buy outcome tokens
   */
  const buy = async (
    outcome: number,
    collateralAmount: bigint,
    minTokensOut: bigint,
    deadline: bigint
  ) => {
    writeBuy({
      address: contracts.router as Address,
      abi: routerAbi,
      functionName: "buy",
      args: [marketAddress, BigInt(outcome), collateralAmount, minTokensOut, deadline],
    });
  };

  /**
   * Sell outcome tokens
   */
  const sell = async (
    outcome: number,
    tokenAmount: bigint,
    minCollateralOut: bigint,
    deadline: bigint
  ) => {
    writeSell({
      address: contracts.router as Address,
      abi: routerAbi,
      functionName: "sell",
      args: [marketAddress, BigInt(outcome), tokenAmount, minCollateralOut, deadline],
    });
  };

  /**
   * Approve USDC spending for the router
   */
  const approveUsdc = async (amount: bigint) => {
    writeApprove({
      address: contracts.usdc as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [contracts.router as Address, amount],
    });
  };

  /**
   * Approve outcome token spending for the router
   */
  const approveToken = async (tokenAddress: Address, amount: bigint) => {
    writeApprove({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contracts.router as Address, amount],
    });
  };

  return {
    // Actions
    buy,
    sell,
    approveUsdc,
    approveToken,
    useQuoteBuy,
    useQuoteSell,
    resetBuy,
    resetSell,

    // State
    isBuyPending,
    isBuyConfirming,
    isBuySuccess,
    buyError,
    buyHash,

    isSellPending,
    isSellConfirming,
    isSellSuccess,
    sellError,
    sellHash,

    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
    approveHash,

    // Combined loading state
    isLoading:
      isBuyPending || isBuyConfirming || isSellPending || isSellConfirming,
  };
}
