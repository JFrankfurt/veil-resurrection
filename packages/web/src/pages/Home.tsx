import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketCard } from "@/components/MarketCard";
import { getMarkets, getProtocolStats } from "@/lib/data";

type SortOption = "volume" | "endTime" | "newest";
type FilterOption = "all" | "active" | "resolved";

export function HomePage() {
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch markets from data layer
  const { data: markets = [], isLoading } = useQuery({
    queryKey: ["markets"],
    queryFn: getMarkets,
  });

  // Fetch protocol stats
  const { data: protocolStats } = useQuery({
    queryKey: ["protocolStats"],
    queryFn: getProtocolStats,
  });

  // Filter and sort markets
  const filteredMarkets = markets
    .filter((market) => {
      if (filter === "active" && market.resolved) return false;
      if (filter === "resolved" && !market.resolved) return false;
      if (
        searchQuery &&
        !market.question.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return Number(BigInt(b.totalVolume) - BigInt(a.totalVolume));
        case "endTime":
          return Number(BigInt(a.endTime) - BigInt(b.endTime));
        case "newest":
          return Number(BigInt(b.createdAt) - BigInt(a.createdAt));
        default:
          return 0;
      }
    });

  // Calculate stats from fetched data
  const stats = {
    totalMarkets: protocolStats?.totalMarkets ?? markets.length,
    totalVolume: BigInt(protocolStats?.totalVolume ?? "0"),
    activeMarkets: markets.filter((m) => !m.resolved).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero Section - Compact on mobile */}
      <section className="text-center py-8 sm:py-16 md:py-24">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-subtle))] text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[rgb(var(--success))] animate-pulse" />
          <span className="text-[rgb(var(--text-secondary))]">Live on</span>
          <svg width="14" height="14" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-4 sm:h-4">
            <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
          </svg>
          <span className="text-[rgb(var(--accent-primary))] font-semibold">Base</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight text-[rgb(var(--text-primary))]">
          Trade on the future.
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-[rgb(var(--text-secondary))] max-w-2xl mx-auto mb-6 sm:mb-10 px-4">
          Make predictions on real-world events. Earn rewards for being right.
        </p>

        {/* Stats - Horizontal scroll on mobile */}
        <div className="flex justify-center gap-6 sm:gap-8 md:gap-16 overflow-x-auto no-scrollbar px-4 -mx-4">
          <Stat label="Markets" value={stats.totalMarkets.toString()} />
          <Stat label="Volume" value={formatLargeNumber(stats.totalVolume)} prefix="$" />
          <Stat label="Active" value={stats.activeMarkets.toString()} />
        </div>
      </section>

      {/* Controls - Stack on mobile */}
      <section className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 sm:items-center sm:justify-between mb-6 sm:mb-8">
        {/* Filters - Horizontal scroll on mobile */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 p-1.5 rounded-xl bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-subtle))] shadow-sm">
            {(["all", "active", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-[rgb(var(--accent-light))] text-[rgb(var(--accent-primary))]"
                    : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-elevated))]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "active" && (
                  <span className="ml-1.5 text-xs text-[rgb(var(--text-muted))]">
                    ({stats.activeMarkets})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full sm:w-48 md:w-72"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input appearance-none cursor-pointer pr-8 sm:pr-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTI1MjUyIiBzdHJva2Utd2lkdGg9IjIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0ibTYgOSA2IDYgNi02Ii8+PC9zdmc+')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat w-auto sm:w-auto"
          >
            <option value="volume">Volume</option>
            <option value="endTime">Ending</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </section>
      )}

      {/* Market Grid */}
      {!isLoading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              address={market.id}
              question={market.question}
              outcomes={market.outcomes.map((o) => ({
                name: o.name,
                price: BigInt(o.price),
              }))}
              endTime={BigInt(market.endTime)}
              totalVolume={BigInt(market.totalVolume)}
              resolved={market.resolved}
              winningOutcome={market.winningOutcome ?? undefined}
            />
          ))}
        </section>
      )}

      {/* Empty State */}
      {!isLoading && filteredMarkets.length === 0 && (
        <div className="text-center py-16 sm:py-20">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--bg-elevated))] flex items-center justify-center border border-[rgb(var(--border-subtle))]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[rgb(var(--text-muted))] sm:w-8 sm:h-8"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-[rgb(var(--text-primary))]">No markets found</h3>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, prefix = "" }: { label: string; value: string; prefix?: string }) {
  return (
    <div className="text-center flex-shrink-0">
      <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tabular-nums text-[rgb(var(--text-primary))]">
        <span className="text-[rgb(var(--accent-primary))]">{prefix}</span>
        {value}
      </div>
      <div className="text-xs sm:text-sm text-[rgb(var(--text-muted))] mt-1">{label}</div>
    </div>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="card p-4 sm:p-5 h-full animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="h-6 w-16 bg-[rgb(var(--bg-muted))] rounded-full" />
        <div className="h-4 w-12 bg-[rgb(var(--bg-muted))] rounded" />
      </div>
      <div className="h-5 sm:h-6 w-full bg-[rgb(var(--bg-muted))] rounded mb-2" />
      <div className="h-5 sm:h-6 w-3/4 bg-[rgb(var(--bg-muted))] rounded mb-4" />
      <div className="space-y-2 mb-4">
        <div className="h-11 sm:h-12 w-full bg-[rgb(var(--bg-muted))] rounded-xl" />
        <div className="h-11 sm:h-12 w-full bg-[rgb(var(--bg-muted))] rounded-xl" />
      </div>
      <div className="h-4 w-24 bg-[rgb(var(--bg-muted))] rounded" />
    </div>
  );
}

function formatLargeNumber(num: bigint): string {
  const n = Number(num) / 1e6; // Convert from USDC decimals
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}
