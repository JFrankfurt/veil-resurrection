"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { CONTRACTS } from "@/config/wagmi";
import { type Address } from "viem";

// Simplified ABIs
const RESOLVER_ABI = [
  {
    name: "resolve",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "winningOutcome", type: "uint256" },
      { name: "invalid", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "operators",
    type: "function",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// Market ABI for future use when fetching market data from chain
// const MARKET_ABI = [...] as const;

type MarketData = {
  question: string;
  endTime: bigint;
  resolved: boolean;
  outcomeNames: string[];
};

export default function ResolveMarketsPage() {
  const { address, chainId } = useAccount();
  const [marketAddress, setMarketAddress] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [markInvalid, setMarkInvalid] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const contracts = chainId
    ? CONTRACTS[chainId as keyof typeof CONTRACTS]
    : CONTRACTS[baseSepolia.id];

  // Check if connected wallet is an operator
  const { data: isOperator } = useReadContract({
    address: contracts.resolver,
    abi: RESOLVER_ABI,
    functionName: "operators",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleLoadMarket = async () => {
    if (!marketAddress) return;

    setIsLoadingMarket(true);
    setMarketData(null);

    try {
      // In a real implementation, we'd use multicall or fetch from subgraph
      const mockData: MarketData = {
        question: "Sample question for market " + marketAddress.slice(0, 8),
        endTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
        resolved: false,
        outcomeNames: ["Yes", "No"],
      };
      setMarketData(mockData);
    } catch (err) {
      console.error("Failed to load market:", err);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const handleResolve = async () => {
    if (!marketAddress || (selectedOutcome === null && !markInvalid)) return;

    writeContract({
      address: contracts.resolver,
      abi: RESOLVER_ABI,
      functionName: "resolve",
      args: [
        marketAddress as Address,
        BigInt(markInvalid ? 0 : selectedOutcome!),
        markInvalid,
      ],
    });
  };

  const isMarketEnded = marketData
    ? marketData.endTime <= BigInt(Math.floor(Date.now() / 1000))
    : false;

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Resolve Markets</h1>
        <p className="text-[rgb(var(--text-secondary))]">
          Set the winning outcome for ended markets.
        </p>
      </header>

      {!address ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--bg-elevated))] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[rgb(var(--text-muted))]">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="text-[rgb(var(--text-secondary))]">
            Connect your wallet to resolve markets.
          </p>
        </div>
      ) : !isOperator ? (
        <div className="card p-6 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-amber-400 font-medium mb-1">Not Authorized</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Your wallet ({address.slice(0, 6)}...{address.slice(-4)}) is not authorized as an operator on the Resolver contract.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Market Address Input */}
          <div className="card p-6">
            <label className="block mb-4">
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
                Market Address
              </span>
              <div className="flex gap-3 mt-2">
                <input
                  type="text"
                  value={marketAddress}
                  onChange={(e) => setMarketAddress(e.target.value)}
                  placeholder="0x..."
                  className="input flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={handleLoadMarket}
                  disabled={!marketAddress || isLoadingMarket}
                  className="btn btn-secondary"
                >
                  {isLoadingMarket ? "Loading..." : "Load"}
                </button>
              </div>
            </label>
          </div>

          {/* Market Details */}
          {marketData && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">{marketData.question}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="text-[rgb(var(--text-muted))]">End Time</span>
                  <p className="font-mono mt-1">
                    {new Date(Number(marketData.endTime) * 1000).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-muted))]">Status</span>
                  <p className="mt-1">
                    {marketData.resolved ? (
                      <span className="badge badge-success">Resolved</span>
                    ) : isMarketEnded ? (
                      <span className="badge badge-warning">Ready to resolve</span>
                    ) : (
                      <span className="badge bg-[rgb(var(--accent-secondary))]/20 text-[rgb(var(--accent-secondary))] border border-[rgb(var(--accent-secondary))]/30">Active</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Outcome Selection */}
              {!marketData.resolved && isMarketEnded && (
                <div className="space-y-4 pt-4 border-t border-[rgb(var(--border-subtle))]">
                  <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
                    Select Winning Outcome
                  </span>

                  <div className="space-y-3">
                    {marketData.outcomeNames.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedOutcome(i);
                          setMarkInvalid(false);
                        }}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedOutcome === i && !markInvalid
                            ? "border-[rgb(var(--accent-secondary))] bg-[rgb(var(--accent-secondary))]/10"
                            : "border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border-prominent))]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedOutcome === i && !markInvalid
                              ? "border-[rgb(var(--accent-secondary))] bg-[rgb(var(--accent-secondary))]"
                              : "border-[rgb(var(--border-prominent))]"
                          }`} />
                          <span className="font-medium">{name}</span>
                          <span className="text-[rgb(var(--text-muted))] ml-auto">
                            Outcome {i}
                          </span>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setMarkInvalid(true);
                        setSelectedOutcome(null);
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        markInvalid
                          ? "border-red-500 bg-red-500/10"
                          : "border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border-prominent))]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          markInvalid
                            ? "border-red-500 bg-red-500"
                            : "border-[rgb(var(--border-prominent))]"
                        }`} />
                        <span className="font-medium text-red-400">
                          Mark as Invalid
                        </span>
                        <span className="text-[rgb(var(--text-muted))] ml-auto">
                          Refund all positions
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card p-4 border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Success */}
          {isSuccess && hash && (
            <div className="card p-4 border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-emerald-400 font-medium">Market resolved!</p>
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-500 hover:underline"
                  >
                    View transaction →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Resolve Button */}
          {marketData && !marketData.resolved && isMarketEnded && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={
                isPending ||
                isConfirming ||
                (selectedOutcome === null && !markInvalid)
              }
              className={`w-full py-4 text-base font-semibold rounded-xl transition-all disabled:opacity-50 ${
                markInvalid
                  ? "btn btn-danger"
                  : "btn btn-primary"
              }`}
            >
              {isPending
                ? "Confirm in wallet..."
                : isConfirming
                  ? "Resolving..."
                  : markInvalid
                    ? "Mark Invalid & Refund"
                    : "Resolve Market"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
