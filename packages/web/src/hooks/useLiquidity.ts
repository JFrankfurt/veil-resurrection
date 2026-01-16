import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { type Address } from "viem";
import { useContracts } from "./useContracts";

// Router ABI for liquidity functions
const ROUTER_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "collateralAmount", type: "uint256" },
      { name: "minLpTokens", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "lpTokens", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "removeLiquidity",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "lpTokens", type: "uint256" },
      { name: "minCollateralOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

// AMM ABI for LP token balance and quotes
const AMM_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
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
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface UseLiquidityParams {
  marketAddress: Address;
  ammAddress: Address;
}

const SLIPPAGE_BPS = 500; // 5% default slippage

/**
 * Hook for managing liquidity in prediction markets
 */
export function useLiquidity({ marketAddress, ammAddress }: UseLiquidityParams) {
  const { address } = useAccount();
  const contracts = useContracts();

  // Check USDC allowance for Router (for adding liquidity)
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: contracts.usdc as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address || "0x0", contracts.router as Address],
    query: { enabled: !!address && !!contracts.router },
  });

  // Check USDC balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: contracts.usdc as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address },
  });

  // Check LP token allowance for Router (for removing liquidity)
  const { data: lpAllowance, refetch: refetchLpAllowance } = useReadContract({
    address: ammAddress,
    abi: AMM_ABI,
    functionName: "allowance",
    args: [address || "0x0", contracts.router as Address],
    query: { enabled: !!address && !!contracts.router && !!ammAddress },
  });

  // Check LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: ammAddress,
    abi: AMM_ABI,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address && !!ammAddress },
  });

  // Check total LP supply (for share calculation)
  const { data: lpTotalSupply } = useReadContract({
    address: ammAddress,
    abi: AMM_ABI,
    functionName: "totalSupply",
    query: { enabled: !!ammAddress },
  });

  // USDC approval
  const {
    writeContract: writeApproveUsdc,
    data: approveUsdcHash,
    isPending: isApproveUsdcPending,
    reset: resetApproveUsdc,
  } = useWriteContract();

  const { isLoading: isApproveUsdcConfirming, isSuccess: isApproveUsdcSuccess } =
    useWaitForTransactionReceipt({ hash: approveUsdcHash });

  // LP token approval
  const {
    writeContract: writeApproveLp,
    data: approveLpHash,
    isPending: isApproveLpPending,
    reset: resetApproveLp,
  } = useWriteContract();

  const { isLoading: isApproveLpConfirming, isSuccess: isApproveLpSuccess } =
    useWaitForTransactionReceipt({ hash: approveLpHash });

  // Add liquidity
  const {
    writeContract: writeAddLiquidity,
    data: addLiquidityHash,
    isPending: isAddLiquidityPending,
    error: addLiquidityError,
    reset: resetAddLiquidity,
  } = useWriteContract();

  const { isLoading: isAddLiquidityConfirming, isSuccess: isAddLiquiditySuccess } =
    useWaitForTransactionReceipt({ hash: addLiquidityHash });

  // Remove liquidity
  const {
    writeContract: writeRemoveLiquidity,
    data: removeLiquidityHash,
    isPending: isRemoveLiquidityPending,
    error: removeLiquidityError,
    reset: resetRemoveLiquidity,
  } = useWriteContract();

  const { isLoading: isRemoveLiquidityConfirming, isSuccess: isRemoveLiquiditySuccess } =
    useWaitForTransactionReceipt({ hash: removeLiquidityHash });

  /**
   * Approve USDC for Router (for adding liquidity)
   */
  const approveUsdc = (amount: bigint) => {
    writeApproveUsdc({
      address: contracts.usdc as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contracts.router as Address, amount],
    });
  };

  /**
   * Approve LP tokens for Router (for removing liquidity)
   */
  const approveLp = (amount: bigint) => {
    writeApproveLp({
      address: ammAddress,
      abi: AMM_ABI,
      functionName: "approve",
      args: [contracts.router as Address, amount],
    });
  };

  /**
   * Add liquidity to the market
   */
  const addLiquidity = (collateralAmount: bigint, minLpTokens: bigint = BigInt(0)) => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
    
    // Apply slippage to minLpTokens if not specified
    const minOut = minLpTokens > 0 
      ? minLpTokens 
      : (collateralAmount * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000);

    writeAddLiquidity({
      address: contracts.router as Address,
      abi: ROUTER_ABI,
      functionName: "addLiquidity",
      args: [marketAddress, collateralAmount, minOut, deadline],
    });
  };

  /**
   * Remove liquidity from the market
   */
  const removeLiquidity = (lpTokens: bigint, minCollateralOut: bigint = BigInt(0)) => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
    
    // Apply slippage to minCollateralOut if not specified
    const minOut = minCollateralOut > 0 
      ? minCollateralOut 
      : (lpTokens * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000);

    writeRemoveLiquidity({
      address: contracts.router as Address,
      abi: ROUTER_ABI,
      functionName: "removeLiquidity",
      args: [marketAddress, lpTokens, minOut, deadline],
    });
  };

  /**
   * Estimate LP tokens received for adding liquidity
   * For first provider: LP tokens = collateral amount (minus MIN_LIQUIDITY)
   * For subsequent providers: LP tokens = collateralAmount * totalSupply / minReserve
   */
  const estimateLpTokens = (collateralAmount: bigint): bigint => {
    if (!lpTotalSupply || lpTotalSupply === BigInt(0)) {
      // First provider - subtract MIN_LIQUIDITY (1000)
      return collateralAmount > BigInt(1000) ? collateralAmount - BigInt(1000) : BigInt(0);
    }
    // Subsequent providers - approximate 1:1 for simplicity
    // In reality this depends on reserve balances, but for UI estimation this is reasonable
    return collateralAmount;
  };

  /**
   * Estimate collateral received for removing liquidity
   */
  const estimateCollateralOut = (lpTokens: bigint): bigint => {
    if (!lpTotalSupply || lpTotalSupply === BigInt(0)) {
      return BigInt(0);
    }
    // Approximate 1:1 for UI estimation
    return lpTokens;
  };

  /**
   * Refetch all balances and allowances
   */
  const refetchAll = () => {
    refetchUsdcAllowance();
    refetchUsdcBalance();
    refetchLpAllowance();
    refetchLpBalance();
  };

  // Check if approvals are needed
  const needsUsdcApproval = (amount: bigint) => 
    usdcAllowance !== undefined && amount > usdcAllowance;
  
  const needsLpApproval = (amount: bigint) => 
    lpAllowance !== undefined && amount > lpAllowance;

  return {
    // Actions
    approveUsdc,
    approveLp,
    addLiquidity,
    removeLiquidity,
    estimateLpTokens,
    estimateCollateralOut,
    refetchAll,
    resetAddLiquidity,
    resetRemoveLiquidity,
    resetApproveUsdc,
    resetApproveLp,

    // Balances
    usdcBalance: usdcBalance ?? BigInt(0),
    lpBalance: lpBalance ?? BigInt(0),
    lpTotalSupply: lpTotalSupply ?? BigInt(0),

    // Allowances
    usdcAllowance: usdcAllowance ?? BigInt(0),
    lpAllowance: lpAllowance ?? BigInt(0),
    needsUsdcApproval,
    needsLpApproval,

    // USDC Approval State
    isApproveUsdcPending,
    isApproveUsdcConfirming,
    isApproveUsdcSuccess,
    approveUsdcHash,

    // LP Approval State
    isApproveLpPending,
    isApproveLpConfirming,
    isApproveLpSuccess,
    approveLpHash,

    // Add Liquidity State
    isAddLiquidityPending,
    isAddLiquidityConfirming,
    isAddLiquiditySuccess,
    addLiquidityError,
    addLiquidityHash,

    // Remove Liquidity State
    isRemoveLiquidityPending,
    isRemoveLiquidityConfirming,
    isRemoveLiquiditySuccess,
    removeLiquidityError,
    removeLiquidityHash,

    // Combined loading states
    isApproving: isApproveUsdcPending || isApproveUsdcConfirming || isApproveLpPending || isApproveLpConfirming,
    isAddingLiquidity: isAddLiquidityPending || isAddLiquidityConfirming,
    isRemovingLiquidity: isRemoveLiquidityPending || isRemoveLiquidityConfirming,
    isLoading: 
      isApproveUsdcPending || isApproveUsdcConfirming || 
      isApproveLpPending || isApproveLpConfirming ||
      isAddLiquidityPending || isAddLiquidityConfirming ||
      isRemoveLiquidityPending || isRemoveLiquidityConfirming,
  };
}

/**
 * Calculate slippage-adjusted minimum output
 */
export function withSlippage(amount: bigint, slippageBps: number = SLIPPAGE_BPS): bigint {
  return (amount * BigInt(10000 - slippageBps)) / BigInt(10000);
}
