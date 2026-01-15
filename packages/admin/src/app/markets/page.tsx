"use client";

import { useAllMarkets, useMarket } from "@/hooks";
import { Skeleton } from "@/components/Skeleton";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";
import { Address } from "viem";

export default function MarketsPage() {
  const { data: marketAddresses, isLoading, isError, count } = useAllMarkets();

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Markets</h1>
        <p className="text-[rgb(var(--text-secondary))]">
          View and manage all deployed prediction markets.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-sm text-[rgb(var(--text-muted))] mb-1">Total Markets</div>
          <div className="text-2xl font-bold font-mono">{count}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[rgb(var(--text-muted))] mb-1">Active</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">-</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[rgb(var(--text-muted))] mb-1">Pending Resolution</div>
          <div className="text-2xl font-bold font-mono text-amber-400">-</div>
        </div>
      </div>

      {/* Markets List */}
      <div className="card overflow-hidden">
        <div className="border-b border-[rgb(var(--border-subtle))] px-6 py-4 bg-[rgb(var(--bg-secondary))]/50">
          <h2 className="font-semibold">Markets</h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-400">
            Failed to load markets. Make sure you&apos;re connected to the correct network.
          </div>
        ) : marketAddresses.length === 0 ? (
          <div className="p-8 text-center text-[rgb(var(--text-muted))]">
            No markets found. Create your first market to get started.
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--border-subtle))]">
            {marketAddresses.map((address) => (
              <MarketRow key={address} address={address} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketRow({ address }: { address: Address }) {
  const { data: market, isLoading } = useMarket(address);

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-sm text-[rgb(var(--text-muted))]">
          {shortenAddress(address)}
        </span>
        <span className="text-red-400 text-sm">Failed to load</span>
      </div>
    );
  }

  const now = Date.now() / 1000;
  const isEnded = Number(market.endTime) <= now;
  const needsResolution = isEnded && !market.resolved;

  return (
    <div className="px-6 py-4 hover:bg-[rgb(var(--bg-elevated))]/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate mb-1">{market.question}</div>
          <div className="flex items-center gap-3 text-sm text-[rgb(var(--text-muted))]">
            <span className="font-mono">{shortenAddress(address)}</span>
            <span>•</span>
            <span>{market.outcomes.length} outcomes</span>
            <span>•</span>
            <span>
              {market.resolved
                ? "Resolved"
                : isEnded
                ? "Ended"
                : `Ends ${new Date(Number(market.endTime) * 1000).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {market.resolved ? (
            <span className="badge badge-success">Resolved</span>
          ) : needsResolution ? (
            <span className="badge badge-warning">Needs Resolution</span>
          ) : (
            <span className="badge bg-[rgb(var(--accent-secondary))]/20 text-[rgb(var(--accent-secondary))] border border-[rgb(var(--accent-secondary))]/30">
              Active
            </span>
          )}

          {/* Actions */}
          {needsResolution && (
            <Link
              href={`/resolve?market=${address}`}
              className="btn btn-secondary text-sm"
            >
              Resolve
            </Link>
          )}
        </div>
      </div>

      {/* Outcome chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {market.outcomes.map((outcome, i) => (
          <span
            key={i}
            className={`px-2 py-1 text-xs rounded-lg ${
              market.resolved && market.winningOutcome === i
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-secondary))]"
            }`}
          >
            {outcome.name}
            {market.resolved && market.winningOutcome === i && " ✓"}
          </span>
        ))}
      </div>
    </div>
  );
}
