import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { type Address } from "viem";
import { useContracts } from "./useContracts";

// ABIs
const ROUTER_ABI = [
  {
    name: "buy",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "outcome", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "sell",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "outcome", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const AMM_ABI = [
  {
    name: "quoteBuy",
    type: "function",
    inputs: [
      { name: "outcome", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "quoteSell",
    type: "function",
    inputs: [
      { name: "outcome", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

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
      abi: AMM_ABI,
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
      abi: AMM_ABI,
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
    minTokensOut: bigint
  ) => {
    writeBuy({
      address: contracts.router as Address,
      abi: ROUTER_ABI,
      functionName: "buy",
      args: [marketAddress, BigInt(outcome), collateralAmount, minTokensOut],
    });
  };

  /**
   * Sell outcome tokens
   */
  const sell = async (
    outcome: number,
    tokenAmount: bigint,
    minCollateralOut: bigint
  ) => {
    writeSell({
      address: contracts.router as Address,
      abi: ROUTER_ABI,
      functionName: "sell",
      args: [marketAddress, BigInt(outcome), tokenAmount, minCollateralOut],
    });
  };

  /**
   * Approve USDC spending for the router
   */
  const approveUsdc = async (amount: bigint) => {
    writeApprove({
      address: contracts.usdc as Address,
      abi: ERC20_ABI,
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
      abi: ERC20_ABI,
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
    isLoading: isBuyPending || isBuyConfirming || isSellPending || isSellConfirming,
  };
}

/**
 * Calculate slippage-adjusted minimum output
 * @param amount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g., 500 = 5%)
 */
export function withSlippage(amount: bigint, slippageBps: number = 500): bigint {
  return (amount * BigInt(10000 - slippageBps)) / BigInt(10000);
}
