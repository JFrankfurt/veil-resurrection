import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { formatUnits, type Address } from "viem";
import { getUserPositions, getClaimableAmount, type Position as DataPosition } from "@/lib/data";
import { useClaim } from "@/hooks/useClaim";
import toast from "react-hot-toast";

export function PortfolioPage() {
  const { address, isConnected } = useAccount();

  // Fetch positions from data layer
  const { data: rawPositions = [], isLoading } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => getUserPositions(address || ""),
    enabled: !!address && isConnected,
  });

  // Transform positions to include computed fields
  const positions: Position[] = rawPositions.map((p) => {
    const claimable = getClaimableAmount(p);
    const currentValue = calculateCurrentValue(p);
    return {
      market: {
        address: p.market.id,
        question: p.market.question,
        resolved: p.market.resolved,
        winningOutcome: p.market.winningOutcome ?? undefined,
        endTime: BigInt(p.market.endTime),
      },
      balances: p.balances.map((b) => BigInt(b)),
      outcomes: p.market.outcomes.map((o) => o.name),
      totalCost: BigInt(p.totalCost),
      currentValue: currentValue,
      claimable: claimable ?? undefined,
    };
  });

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[rgb(var(--accent-light))] flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(var(--accent-primary))"
              strokeWidth="1.5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3 text-[rgb(var(--text-primary))]">Your Portfolio</h1>
          <p className="text-[rgb(var(--text-secondary))] mb-8">
            Connect your wallet to view your positions, track performance, and
            claim winnings.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PortfolioSkeleton address={address} />;
  }

  const totalValue = positions.reduce(
    (sum, p) => sum + p.currentValue,
    BigInt(0)
  );
  const totalCost = positions.reduce(
    (sum, p) => sum + p.totalCost,
    BigInt(0)
  );
  const totalPnL = totalValue - totalCost;
  const pnlPercent =
    totalCost > 0 ? (Number(totalPnL) / Number(totalCost)) * 100 : 0;

  const claimablePositions = positions.filter((p) => p.claimable);
  const totalClaimable = claimablePositions.reduce(
    (sum, p) => sum + (p.claimable || BigInt(0)),
    BigInt(0)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[rgb(var(--text-primary))]">Portfolio</h1>
            <div className="flex items-center gap-2 text-[rgb(var(--text-muted))]">
              <span className="w-2 h-2 rounded-full bg-[rgb(var(--success))]" />
              <span className="font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Portfolio Value"
          value={`$${formatVolume(totalValue)}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
        <SummaryCard
          label="Total P&L"
          value={`${totalPnL >= 0 ? "+" : ""}$${formatVolume(totalPnL)}`}
          subtitle={`${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%`}
          valueColor={totalPnL >= 0 ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 6l-9.5 9.5-5-5L1 18" />
              <path d="M17 6h6v6" />
            </svg>
          }
        />
        <SummaryCard
          label="Active Positions"
          value={positions.filter((p) => !p.market.resolved).length.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          }
        />
        <SummaryCard
          label="Claimable"
          value={`$${formatVolume(totalClaimable)}`}
          valueColor={totalClaimable > 0 ? "text-[rgb(var(--success))]" : undefined}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          }
        />
      </div>

      {/* Claimable Winnings */}
      {claimablePositions.length > 0 && (
        <section className="mb-8">
          <div className="card border-[rgb(var(--success))]/30 bg-[rgb(var(--success-light))] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--success))]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[rgb(var(--success))]">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-[rgb(var(--text-primary))]">Winnings Available</h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  Claim your rewards from resolved markets
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {claimablePositions.map((position, i) => (
                <ClaimablePositionRow key={i} position={position} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--bg-elevated))] flex items-center justify-center border border-[rgb(var(--border-subtle))]">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[rgb(var(--text-muted))]"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--text-primary))]">No positions yet</h3>
          <p className="text-[rgb(var(--text-muted))] mb-6">
            Start trading to build your portfolio
          </p>
          <Link to="/" className="btn btn-primary">
            Browse Markets
          </Link>
        </div>
      )}

      {/* Positions List */}
      {positions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">All Positions</h2>
            <span className="text-sm text-[rgb(var(--text-muted))]">
              {positions.length} total
            </span>
          </div>
          <div className="space-y-4">
            {positions.map((position, i) => (
              <PositionCard key={i} position={position} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Component for claimable position row with claim button
 */
function ClaimablePositionRow({ position }: { position: Position }) {
  const queryClient = useQueryClient();
  
  const {
    claim,
    isLoading,
    isClaimSuccess,
    resetClaim,
  } = useClaim({
    marketAddress: position.market.address as Address,
  });

  // Handle claim success
  useEffect(() => {
    if (isClaimSuccess) {
      toast.success(`Successfully claimed $${formatVolume(position.claimable!)}!`);
      // Refetch positions to update the UI
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      resetClaim();
    }
  }, [isClaimSuccess, position.claimable, queryClient, resetClaim]);

  // Handle loading toast
  useEffect(() => {
    if (isLoading) {
      toast.loading("Claiming winnings...", { id: `claim-${position.market.address}` });
    } else {
      toast.dismiss(`claim-${position.market.address}`);
    }
  }, [isLoading, position.market.address]);

  const handleClaim = () => {
    claim();
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-subtle))]">
      <div className="flex-1 min-w-0 mr-4">
        <div className="font-medium truncate mb-1 text-[rgb(var(--text-primary))]">
          {position.market.question}
        </div>
        <div className="text-sm text-[rgb(var(--success))]">
          Won with "{position.outcomes[position.market.winningOutcome!]}"
        </div>
      </div>
      <button 
        onClick={handleClaim}
        disabled={isLoading}
        className="btn btn-success whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Claiming..." : `Claim $${formatVolume(position.claimable!)}`}
      </button>
    </div>
  );
}

function PortfolioSkeleton({ address }: { address?: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <header className="mb-8">
        <div className="h-10 w-40 bg-[rgb(var(--bg-muted))] rounded mb-2" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[rgb(var(--bg-muted))]" />
          <span className="font-mono text-sm text-[rgb(var(--text-muted))]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 h-24 bg-[rgb(var(--bg-muted))]" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 h-32 bg-[rgb(var(--bg-muted))]" />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-[rgb(var(--text-muted))] mb-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${valueColor || "text-[rgb(var(--text-primary))]"}`}>
        {value}
      </div>
      {subtitle && (
        <div className={`text-sm font-mono mt-1 ${valueColor || "text-[rgb(var(--text-muted))]"}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

interface Position {
  market: {
    address: string;
    question: string;
    resolved: boolean;
    winningOutcome?: number;
    endTime: bigint;
  };
  balances: bigint[];
  outcomes: string[];
  totalCost: bigint;
  currentValue: bigint;
  claimable?: bigint;
}

function PositionCard({ position }: { position: Position }) {
  const pnl = position.currentValue - position.totalCost;
  const pnlPercent =
    position.totalCost > 0 ? (Number(pnl) / Number(position.totalCost)) * 100 : 0;
  const isPositive = pnl >= BigInt(0);

  return (
    <Link to={`/market/${position.market.address}`}>
      <div className="card p-5 hover:border-[rgb(var(--border-prominent))] transition-all">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate mb-2 text-[rgb(var(--text-primary))]">
              {position.market.question}
            </div>
            <div className="flex flex-wrap gap-2">
              {position.balances.map((balance, i) => {
                if (balance === BigInt(0)) return null;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-[rgb(var(--accent-light))] text-[rgb(var(--accent-primary))] border border-[rgb(var(--accent-primary))]/20"
                  >
                    <span className="font-mono">{formatTokens(balance)}</span>
                    <span>{position.outcomes[i]}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-lg text-[rgb(var(--text-primary))]">
              ${formatVolume(position.currentValue)}
            </div>
            <div
              className={`text-sm font-mono ${
                isPositive ? "text-[rgb(var(--success))]" : "text-[rgb(var(--error))]"
              }`}
            >
              {isPositive ? "+" : ""}
              {pnlPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-[rgb(var(--text-muted))] pt-4 border-t border-[rgb(var(--border-subtle))]">
          <span>Cost basis: ${formatVolume(position.totalCost)}</span>
          <span>
            {position.market.resolved ? (
              <span className="text-[rgb(var(--accent-primary))]">Resolved</span>
            ) : (
              `Ends ${new Date(
                Number(position.market.endTime) * 1000
              ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Calculate current value based on mock prices
 * In production, this would use actual market prices from the subgraph
 */
function calculateCurrentValue(position: DataPosition): bigint {
  // For mock data, use a simple estimation based on cost + 10% gain
  // In production, multiply each balance by current outcome price
  const costBasis = BigInt(position.totalCost);
  
  // Check if any position won
  if (position.market.resolved && position.market.winningOutcome !== null) {
    const winningBalance = BigInt(position.balances[position.market.winningOutcome]);
    // Each winning token is worth $1
    return winningBalance / BigInt(10 ** 12); // Convert 18 decimals to 6
  }
  
  // For unresolved markets, estimate based on typical market movements
  // This would be replaced with actual price lookups from the subgraph
  return costBasis + (costBasis * BigInt(8)) / BigInt(100); // +8% mock gain
}

function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}

function formatTokens(amount: bigint): string {
  const num = Number(formatUnits(amount, 18));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}
