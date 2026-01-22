"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import { CONTRACTS } from "@/config/wagmi";
import { MarketFactoryABI } from "@predictions/config/abis";

export default function CreateMarketPage() {
  const { address, chainId } = useAccount();
  const [question, setQuestion] = useState("");
  const [outcomes, setOutcomes] = useState(["Yes", "No"]);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [initialLiquidity, setInitialLiquidity] = useState("1000");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const contracts = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : CONTRACTS[baseSepolia.id];

  const handleAddOutcome = () => {
    if (outcomes.length < 8) {
      setOutcomes([...outcomes, ""]);
    }
  };

  const handleRemoveOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const handleOutcomeChange = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const endTimestamp = Math.floor(
      new Date(`${endDate}T${endTime}`).getTime() / 1000
    );

    writeContract({
      address: contracts.marketFactory,
      abi: MarketFactoryABI,
      functionName: "createMarket",
      args: [
        question,
        outcomes,
        BigInt(endTimestamp),
        parseUnits(initialLiquidity, 6),
      ],
    });
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Market</h1>
        <p className="text-[rgb(var(--text-secondary))]">
          Launch a new prediction market for users to trade on.
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
            Connect your wallet to create a market.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div className="card p-6">
            <label className="block mb-4">
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
                Question
              </span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will ETH reach $5000 by December 2026?"
                className="input mt-2 h-24"
                required
              />
            </label>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Be specific and include a clear resolution criteria.
            </p>
          </div>

          {/* Outcomes */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
                Outcomes ({outcomes.length}/8)
              </span>
              <button
                type="button"
                onClick={handleAddOutcome}
                disabled={outcomes.length >= 8}
                className="btn btn-secondary text-sm disabled:opacity-50"
              >
                + Add Outcome
              </button>
            </div>

            <div className="space-y-3">
              {outcomes.map((outcome, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => handleOutcomeChange(i, e.target.value)}
                    placeholder={`Outcome ${i + 1}`}
                    className="input flex-1"
                    required
                  />
                  {outcomes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(i)}
                      className="btn btn-danger px-4"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* End Time */}
          <div className="card p-6">
            <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider block mb-4">
              Resolution Time
            </span>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                required
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
                required
              />
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-3">
              Market can only be resolved after this time.
            </p>
          </div>

          {/* Initial Liquidity */}
          <div className="card p-6">
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))] uppercase tracking-wider">
                Initial Liquidity (USDC)
              </span>
              <input
                type="number"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                placeholder="1000"
                min="0"
                step="100"
                className="input mt-2"
                required
              />
            </label>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-3">
              Initial USDC to seed the AMM. You&apos;ll need to approve the factory contract first.
            </p>
          </div>

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
                  <p className="text-emerald-400 font-medium">Market created!</p>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="btn btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
                ? "Creating market..."
                : "Create Market"}
          </button>
        </form>
      )}
    </div>
  );
}
