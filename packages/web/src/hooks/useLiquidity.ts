import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { type Address, erc20Abi } from "viem";
import { routerAbi, outcomeAmmAbi, withSlippage, getDeadline } from "@predictions/config";
import { useContracts } from "./useContracts";

interface UseLiquidityParams {
  marketAddress: Address;
  ammAddress: Address;
}

/**
 * Hook for managing liquidity in prediction markets
 */
export function useLiquidity({
  marketAddress,
  ammAddress,
}: UseLiquidityParams) {
  const { address } = useAccount();
  const contracts = useContracts();

  // Check USDC allowance for Router (for adding liquidity)
  const { data: usdcAllowanceRaw, refetch: refetchUsdcAllowance } =
    useReadContract({
      address: contracts.usdc as Address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address || "0x0", contracts.router as Address],
      query: { enabled: !!address && !!contracts.router },
    });
  const usdcAllowance = usdcAllowanceRaw as bigint | undefined;

  // Check USDC balance
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: contracts.usdc as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address },
  });
  const usdcBalance = usdcBalanceRaw as bigint | undefined;

  // Check LP token allowance for Router (for removing liquidity)
  const { data: lpAllowanceRaw, refetch: refetchLpAllowance } = useReadContract({
    address: ammAddress,
    abi: outcomeAmmAbi,
    functionName: "allowance",
    args: [address || "0x0", contracts.router as Address],
    query: { enabled: !!address && !!contracts.router && !!ammAddress },
  });
  const lpAllowance = lpAllowanceRaw as bigint | undefined;

  // Check LP token balance
  const { data: lpBalanceRaw, refetch: refetchLpBalance } = useReadContract({
    address: ammAddress,
    abi: outcomeAmmAbi,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address && !!ammAddress },
  });
  const lpBalance = lpBalanceRaw as bigint | undefined;

  // Check total LP supply (for share calculation)
  const { data: lpTotalSupplyRaw } = useReadContract({
    address: ammAddress,
    abi: outcomeAmmAbi,
    functionName: "totalSupply",
    query: { enabled: !!ammAddress },
  });
  const lpTotalSupply = lpTotalSupplyRaw as bigint | undefined;

  // USDC approval
  const {
    writeContract: writeApproveUsdc,
    data: approveUsdcHash,
    isPending: isApproveUsdcPending,
    reset: resetApproveUsdc,
  } = useWriteContract();

  const {
    isLoading: isApproveUsdcConfirming,
    isSuccess: isApproveUsdcSuccess,
  } = useWaitForTransactionReceipt({ hash: approveUsdcHash });

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

  const {
    isLoading: isAddLiquidityConfirming,
    isSuccess: isAddLiquiditySuccess,
  } = useWaitForTransactionReceipt({ hash: addLiquidityHash });

  // Remove liquidity
  const {
    writeContract: writeRemoveLiquidity,
    data: removeLiquidityHash,
    isPending: isRemoveLiquidityPending,
    error: removeLiquidityError,
    reset: resetRemoveLiquidity,
  } = useWriteContract();

  const {
    isLoading: isRemoveLiquidityConfirming,
    isSuccess: isRemoveLiquiditySuccess,
  } = useWaitForTransactionReceipt({ hash: removeLiquidityHash });

  /**
   * Approve USDC for Router (for adding liquidity)
   */
  const approveUsdc = (amount: bigint) => {
    writeApproveUsdc({
      address: contracts.usdc as Address,
      abi: erc20Abi,
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
      abi: outcomeAmmAbi,
      functionName: "approve",
      args: [contracts.router as Address, amount],
    });
  };

  /**
   * Add liquidity to the market
   */
  const addLiquidity = (
    collateralAmount: bigint,
    minLpTokens: bigint = BigInt(0)
  ) => {
    const deadline = getDeadline();

    // Apply slippage to minLpTokens if not specified
    const minOut =
      minLpTokens > 0 ? minLpTokens : withSlippage(collateralAmount);

    writeAddLiquidity({
      address: contracts.router as Address,
      abi: routerAbi,
      functionName: "addLiquidity",
      args: [marketAddress, collateralAmount, minOut, deadline],
    });
  };

  /**
   * Remove liquidity from the market
   */
  const removeLiquidity = (
    lpTokens: bigint,
    minCollateralOut: bigint = BigInt(0)
  ) => {
    const deadline = getDeadline();

    // Apply slippage to minCollateralOut if not specified
    const minOut =
      minCollateralOut > 0 ? minCollateralOut : withSlippage(lpTokens);

    writeRemoveLiquidity({
      address: contracts.router as Address,
      abi: routerAbi,
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
      return collateralAmount > BigInt(1000)
        ? collateralAmount - BigInt(1000)
        : BigInt(0);
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
    isApproving:
      isApproveUsdcPending ||
      isApproveUsdcConfirming ||
      isApproveLpPending ||
      isApproveLpConfirming,
    isAddingLiquidity: isAddLiquidityPending || isAddLiquidityConfirming,
    isRemovingLiquidity:
      isRemoveLiquidityPending || isRemoveLiquidityConfirming,
    isLoading:
      isApproveUsdcPending ||
      isApproveUsdcConfirming ||
      isApproveLpPending ||
      isApproveLpConfirming ||
      isAddLiquidityPending ||
      isAddLiquidityConfirming ||
      isRemoveLiquidityPending ||
      isRemoveLiquidityConfirming,
  };
}
