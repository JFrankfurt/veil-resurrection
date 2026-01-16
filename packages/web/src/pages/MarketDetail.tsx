import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TradingPanel } from "@/components/TradingPanel";
import { formatUnits } from "viem";
import { formatVolume, formatTimeAgo } from "@predictions/config";
import { getMarket, getTrades, type Trade } from "@/lib/data";

export function MarketDetailPage() {
  const { address } = useParams<{ address: string }>();

  // Fetch market data from data layer
  const { data: market, isLoading: marketLoading } = useQuery({
    queryKey: ["market", address],
    queryFn: () => getMarket(address || ""),
    enabled: !!address,
  });

  // Fetch trades for this market
  const { data: trades = [] } = useQuery({
    queryKey: ["trades", address],
    queryFn: () => getTrades(address || ""),
    enabled: !!address,
  });

  if (marketLoading || !market) {
    return <MarketDetailSkeleton />;
  }

  const endDate = new Date(Number(market.endTime) * 1000);
  const daysRemaining = Math.ceil(
    (Number(market.endTime) - Date.now() / 1000) / 86400
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 pb-8">
      {/* Back Link - Larger touch target on mobile */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors mb-4 sm:mb-6 py-2 -my-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span className="text-sm sm:text-base">Back to markets</span>
      </Link>

      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <StatusBadge
            resolved={market.resolved}
            daysRemaining={daysRemaining}
          />
          <span className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">
            {market.resolved
              ? "Market resolved"
              : `Ends ${endDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}`}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 sm:mb-4 text-[rgb(var(--text-primary))]">
          {market.question}
        </h1>
        <p className="text-sm sm:text-base text-[rgb(var(--text-secondary))] max-w-3xl leading-relaxed">
          This market will be resolved based on official data sources.
        </p>
      </header>

      {/* Main Content - Mobile First */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Trading Panel - First on mobile for prominence */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="lg:sticky lg:top-20">
            <TradingPanel
              marketAddress={market.id}
              ammAddress={market.amm}
              outcomes={market.outcomes.map((o) => ({
                name: o.name,
                price: BigInt(o.price),
                reserve: BigInt(o.reserve),
              }))}
              resolved={market.resolved}
              winningOutcome={market.winningOutcome ?? undefined}
            />
          </div>
        </div>

        {/* Market Info - Second on mobile */}
        <div className="lg:col-span-2 lg:order-1 space-y-4 sm:space-y-6">
          {/* Probability Display */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))] mb-3 sm:mb-4 uppercase tracking-wider">
              Current Probabilities
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {market.outcomes.map((outcome, i) => (
                <ProbabilityBar
                  key={outcome.id}
                  name={outcome.name}
                  price={BigInt(outcome.price)}
                  index={i}
                />
              ))}
            </div>
          </div>

          {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Volume"
              value={`$${formatVolume(BigInt(market.totalVolume))}`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Liquidity"
              value={`$${formatVolume(BigInt(market.totalLiquidity))}`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                </svg>
              }
            />
            <StatCard
              label="Trades"
              value={trades.length.toString()}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Created"
              value={new Date(Number(market.createdAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
            />
          </div>

          {/* Activity Feed */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Recent Activity
              </h2>
              <span className="text-[10px] sm:text-xs text-[rgb(var(--text-muted))]">
                Last 24 hours
              </span>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {trades.length > 0 ? (
                trades.slice(0, 10).map((trade) => (
                  <ActivityRow key={trade.id} trade={trade} outcomes={market.outcomes} />
                ))
              ) : (
                <p className="text-sm text-[rgb(var(--text-muted))] py-4 text-center">
                  No recent trades
                </p>
              )}
            </div>
          </div>

          {/* Resolution Info - Collapsible on mobile */}
          <details className="card group" open>
            <summary className="p-4 sm:p-6 cursor-pointer list-none flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Resolution Criteria
              </h2>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className="text-[rgb(var(--text-muted))] transition-transform group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 text-sm text-[rgb(var(--text-secondary))]">
              <p>
                This market will be resolved by the designated resolver based on official data sources.
              </p>
              <p>
                The market resolves to <strong className="text-[rgb(var(--text-primary))]">{market.outcomes[0]?.name || "Outcome 1"}</strong> if the criteria are met before the resolution date.
              </p>
              <p>
                Otherwise, it resolves to <strong className="text-[rgb(var(--text-primary))]">{market.outcomes[1]?.name || "Outcome 2"}</strong>.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function MarketDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 animate-pulse">
      <div className="h-6 w-28 sm:w-32 bg-[rgb(var(--bg-muted))] rounded mb-4 sm:mb-6" />
      <div className="h-8 sm:h-10 w-full sm:w-3/4 bg-[rgb(var(--bg-muted))] rounded mb-3 sm:mb-4" />
      <div className="h-5 sm:h-6 w-3/4 sm:w-1/2 bg-[rgb(var(--bg-muted))] rounded mb-6 sm:mb-8" />
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1 lg:order-2">
          <div className="card p-4 sm:p-6 h-72 sm:h-96 bg-[rgb(var(--bg-muted))]" />
        </div>
        <div className="lg:col-span-2 lg:order-1 space-y-4 sm:space-y-6">
          <div className="card p-4 sm:p-6 h-48 sm:h-64 bg-[rgb(var(--bg-muted))]" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-3 sm:p-4 h-16 sm:h-20 bg-[rgb(var(--bg-muted))]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  resolved,
  daysRemaining,
}: {
  resolved: boolean;
  daysRemaining: number;
}) {
  if (resolved) {
    return (
      <span className="badge badge-resolved">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Resolved
      </span>
    );
  }

  if (daysRemaining <= 0) {
    return (
      <span className="badge badge-ended">
        <span>◷</span>
        Ended
      </span>
    );
  }

  return (
    <span className="badge badge-live">
      <span className="animate-pulse">●</span>
      Live
    </span>
  );
}

function ProbabilityBar({
  name,
  price,
  index,
}: {
  name: string;
  price: bigint;
  index: number;
}) {
  const percent = Number(formatUnits(price, 16));
  // Base blue for "Yes", complementary colors for others
  const colors = [
    "bg-[rgb(var(--accent-primary))]",
    "bg-[rgb(var(--text-muted))]",
    "bg-violet-500",
    "bg-amber-500",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <span className="font-medium text-sm sm:text-base text-[rgb(var(--text-primary))]">{name}</span>
        <span className="font-mono font-bold text-base sm:text-lg tabular-nums text-[rgb(var(--text-primary))]">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 sm:h-3 rounded-full bg-[rgb(var(--bg-muted))] overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[index % colors.length]} transition-all duration-700 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-2 text-[rgb(var(--text-muted))] mb-1 sm:mb-2">
        {icon}
        <span className="text-[10px] sm:text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[rgb(var(--text-primary))]">{value}</div>
    </div>
  );
}

function ActivityRow({
  trade,
  outcomes,
}: {
  trade: Trade;
  outcomes: { name: string }[];
}) {
  const isBuy = trade.isBuy;
  const outcomeName = outcomes[trade.outcome]?.name || `Outcome ${trade.outcome}`;
  const amount = Number(trade.collateralAmount) / 1e6; // Convert from USDC decimals
  const timeAgo = formatTimeAgo(Number(trade.timestamp));

  return (
    <div className="flex items-center justify-between py-2 sm:py-2.5 border-b border-[rgb(var(--border-subtle))] last:border-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isBuy ? "bg-[rgb(var(--success-light))]" : "bg-[rgb(var(--error-light))]"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`sm:w-[14px] sm:h-[14px] ${isBuy ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"}`}
          >
            {isBuy ? (
              <path d="M12 19V5M5 12l7-7 7 7" />
            ) : (
              <path d="M12 5v14M5 12l7 7 7-7" />
            )}
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm truncate">
            <span className="font-mono text-[rgb(var(--text-muted))]">
              {trade.user.slice(0, 4)}...{trade.user.slice(-3)}
            </span>
            <span className="text-[rgb(var(--text-muted))]"> {isBuy ? "bought" : "sold"} </span>
            <span className={isBuy ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"}>
              {outcomeName}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-[rgb(var(--text-muted))]">{timeAgo}</div>
        </div>
      </div>
      <div className="font-mono font-medium text-sm sm:text-base text-[rgb(var(--text-primary))] flex-shrink-0 ml-2">
        ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

