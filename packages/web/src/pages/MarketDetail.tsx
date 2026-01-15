import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TradingPanel } from "@/components/TradingPanel";
import { formatUnits } from "viem";
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back to markets</span>
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <StatusBadge
            resolved={market.resolved}
            daysRemaining={daysRemaining}
          />
          <span className="text-sm text-[rgb(var(--text-muted))]">
            {market.resolved
              ? "Market resolved"
              : `Ends ${endDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}`}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-[rgb(var(--text-primary))]">
          {market.question}
        </h1>
        <p className="text-[rgb(var(--text-secondary))] max-w-3xl leading-relaxed">
          This market will be resolved based on official data sources.
        </p>
      </header>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Market Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Probability Display */}
          <div className="card p-6">
            <h2 className="text-sm font-medium text-[rgb(var(--text-muted))] mb-4 uppercase tracking-wider">
              Current Probabilities
            </h2>
            <div className="space-y-4">
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Volume"
              value={`$${formatVolume(BigInt(market.totalVolume))}`}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Liquidity"
              value={`$${formatVolume(BigInt(market.totalLiquidity))}`}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                </svg>
              }
            />
            <StatCard
              label="Trades"
              value={trades.length.toString()}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
            />
          </div>

          {/* Activity Feed */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Recent Activity
              </h2>
              <span className="text-xs text-[rgb(var(--text-muted))]">
                Last 24 hours
              </span>
            </div>
            <div className="space-y-3">
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

          {/* Resolution Info */}
          <div className="card p-6">
            <h2 className="text-sm font-medium text-[rgb(var(--text-muted))] mb-4 uppercase tracking-wider">
              Resolution Criteria
            </h2>
            <div className="space-y-4 text-sm text-[rgb(var(--text-secondary))]">
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
          </div>
        </div>

        {/* Right: Trading Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <TradingPanel
              marketAddress={market.id}
              ammAddress={market.amm}
              outcomes={market.outcomes.map((o) => ({
                name: o.name,
                price: BigInt(o.price),
                reserve: BigInt(o.reserve),
              }))}
              resolved={market.resolved}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-6 w-32 bg-[rgb(var(--bg-muted))] rounded mb-6" />
      <div className="h-10 w-3/4 bg-[rgb(var(--bg-muted))] rounded mb-4" />
      <div className="h-6 w-1/2 bg-[rgb(var(--bg-muted))] rounded mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 h-64 bg-[rgb(var(--bg-muted))]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 h-20 bg-[rgb(var(--bg-muted))]" />
            ))}
          </div>
        </div>
        <div className="card p-6 h-96 bg-[rgb(var(--bg-muted))]" />
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
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[rgb(var(--text-primary))]">{name}</span>
        <span className="font-mono font-bold text-lg tabular-nums text-[rgb(var(--text-primary))]">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-[rgb(var(--bg-muted))] overflow-hidden">
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
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[rgb(var(--text-muted))] mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono tabular-nums text-[rgb(var(--text-primary))]">{value}</div>
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
    <div className="flex items-center justify-between py-2 border-b border-[rgb(var(--border-subtle))] last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isBuy ? "bg-[rgb(var(--success-light))]" : "bg-[rgb(var(--error-light))]"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isBuy ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"}
          >
            {isBuy ? (
              <path d="M12 19V5M5 12l7-7 7 7" />
            ) : (
              <path d="M12 5v14M5 12l7 7 7-7" />
            )}
          </svg>
        </div>
        <div>
          <div className="text-sm">
            <span className="font-mono text-[rgb(var(--text-muted))]">
              {trade.user.slice(0, 6)}...{trade.user.slice(-4)}
            </span>
            <span className="text-[rgb(var(--text-muted))]"> {isBuy ? "bought" : "sold"} </span>
            <span className={isBuy ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"}>
              {outcomeName}
            </span>
          </div>
          <div className="text-xs text-[rgb(var(--text-muted))]">{timeAgo}</div>
        </div>
      </div>
      <div className="font-mono font-medium text-[rgb(var(--text-primary))]">
        ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day${diff >= 172800 ? "s" : ""} ago`;
}

function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}
