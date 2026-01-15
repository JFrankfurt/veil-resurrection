"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { MarketABI } from "@predictions/config/abis";
import { Address, Abi } from "viem";
import { useContracts } from "./useContracts";

const MarketAbi = MarketABI as Abi;

interface Outcome {
  name: string;
  token: Address;
}

interface Market {
  address: Address;
  question: string;
  outcomes: Outcome[];
  endTime: bigint;
  resolved: boolean;
  winningOutcome: number | null;
  invalid: boolean;
}

export function useMarket(marketAddress: Address) {
  const { isSupportedChain } = useContracts();
  const isValidAddress = marketAddress && marketAddress !== "0x" && marketAddress.length === 42;

  const { data: marketData, isLoading: isMarketLoading } = useReadContracts({
    contracts: [
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "question",
      },
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "endTime",
      },
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "numOutcomes",
      },
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "resolved",
      },
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "winningOutcome",
      },
      {
        address: marketAddress,
        abi: MarketAbi,
        functionName: "invalid",
      },
    ],
    query: {
      enabled: isSupportedChain && isValidAddress,
    },
  });

  const question = marketData?.[0]?.result as string | undefined;
  const endTime = marketData?.[1]?.result as bigint | undefined;
  const numOutcomes = marketData?.[2]?.result as bigint | undefined;
  const resolved = marketData?.[3]?.result as boolean | undefined;
  const winningOutcome = marketData?.[4]?.result as bigint | undefined;
  const invalid = marketData?.[5]?.result as boolean | undefined;

  const outcomeCount = numOutcomes ? Number(numOutcomes) : 0;

  const outcomeTokenCalls = Array.from({ length: outcomeCount }).flatMap((_, i) => [
    {
      address: marketAddress,
      abi: MarketAbi,
      functionName: "getOutcomeName",
      args: [BigInt(i)],
    },
    {
      address: marketAddress,
      abi: MarketAbi,
      functionName: "getOutcomeToken",
      args: [BigInt(i)],
    },
  ]);

  const { data: outcomeData, isLoading: isOutcomeLoading } = useReadContracts({
    contracts: outcomeTokenCalls,
    query: {
      enabled: isSupportedChain && isValidAddress && outcomeCount > 0,
    },
  });

  const outcomes: Outcome[] = [];
  if (outcomeData) {
    for (let i = 0; i < outcomeCount; i++) {
      const name = outcomeData[i * 2]?.result as string;
      const token = outcomeData[i * 2 + 1]?.result as Address;
      if (name && token) {
        outcomes.push({ name, token });
      }
    }
  }

  const market: Market | undefined =
    question !== undefined && endTime !== undefined && resolved !== undefined
      ? {
          address: marketAddress,
          question,
          outcomes,
          endTime,
          resolved,
          winningOutcome: resolved && winningOutcome !== undefined ? Number(winningOutcome) : null,
          invalid: invalid || false,
        }
      : undefined;

  return {
    data: market,
    isLoading: isMarketLoading || isOutcomeLoading,
    isError: !isSupportedChain || (!isMarketLoading && !market && isValidAddress),
  };
}

export function useAllMarkets() {
  const { marketFactory, isSupportedChain } = useContracts();

  const { data: marketCount, isLoading: isCountLoading } = useReadContract({
    address: marketFactory?.address,
    abi: marketFactory?.abi,
    functionName: "marketCount",
    query: {
      enabled: isSupportedChain && !!marketFactory,
    },
  });

  const numMarkets = marketCount ? Number(marketCount) : 0;

  const marketAddressesCalls = Array.from({ length: numMarkets }).map((_, i) => ({
    address: marketFactory?.address as Address,
    abi: marketFactory?.abi,
    functionName: "getMarkets" as const,
    args: [BigInt(i), BigInt(1)],
  }));

  const { data: marketAddressesRaw, isLoading: isAddressesLoading } = useReadContracts({
    contracts: marketAddressesCalls,
    query: {
      enabled: isSupportedChain && numMarkets > 0,
    },
  });

  const marketAddresses = (marketAddressesRaw || [])
    .map((item) => (item.result as Address[] | undefined)?.[0])
    .filter((addr): addr is Address => !!addr);

  return {
    data: marketAddresses,
    isLoading: isCountLoading || isAddressesLoading,
    isError: !isSupportedChain,
    count: numMarkets,
  };
}
