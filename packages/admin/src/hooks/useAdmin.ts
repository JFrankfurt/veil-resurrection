"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useContracts } from "./useContracts";
import { Address } from "viem";

interface CreateMarketParams {
  question: string;
  outcomeNames: string[];
  endTime: bigint;
  initialLiquidity: bigint;
}

export function useCreateMarket() {
  const { address } = useAccount();
  const { marketFactory, usdc, isSupportedChain } = useContracts();
  const [error, setError] = useState<Error | null>(null);

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const createMarket = async ({
    question,
    outcomeNames,
    endTime,
    initialLiquidity,
  }: CreateMarketParams) => {
    if (!address || !marketFactory || !usdc || !isSupportedChain) {
      setError(new Error("Wallet not connected or unsupported chain"));
      return;
    }

    try {
      setError(null);

      // First approve USDC spending if there's initial liquidity
      if (initialLiquidity > BigInt(0)) {
        writeContract({
          address: usdc.address,
          abi: usdc.abi,
          functionName: "approve",
          args: [marketFactory.address, initialLiquidity],
        });

        // Wait a bit for approval to be mined
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Create the market
      writeContract({
        address: marketFactory.address,
        abi: marketFactory.abi,
        functionName: "createMarket",
        args: [question, outcomeNames, endTime, initialLiquidity],
      });
    } catch (err) {
      setError(err as Error);
    }
  };

  return {
    createMarket,
    isLoading: isWritePending || isConfirming,
    isSuccess,
    isError: !!error || !!writeError,
    error: error || writeError,
    txHash: hash,
  };
}

interface ResolveMarketParams {
  marketAddress: Address;
  winningOutcome: bigint;
  invalid: boolean;
}

export function useResolveMarket() {
  const { address } = useAccount();
  const { resolver, isSupportedChain } = useContracts();
  const [error, setError] = useState<Error | null>(null);

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const resolveMarket = async ({
    marketAddress,
    winningOutcome,
    invalid,
  }: ResolveMarketParams) => {
    if (!address || !resolver || !isSupportedChain) {
      setError(new Error("Wallet not connected or unsupported chain"));
      return;
    }

    try {
      setError(null);

      writeContract({
        address: resolver.address,
        abi: resolver.abi,
        functionName: "resolve",
        args: [marketAddress, winningOutcome, invalid],
      });
    } catch (err) {
      setError(err as Error);
    }
  };

  return {
    resolveMarket,
    isLoading: isWritePending || isConfirming,
    isSuccess,
    isError: !!error || !!writeError,
    error: error || writeError,
    txHash: hash,
  };
}
