import { Link } from "react-router-dom";
import { formatUnits } from "viem";

interface MarketCardProps {
  address: string;
  question: string;
  outcomes: { name: string; price: bigint }[];
  endTime: bigint;
  totalVolume: bigint;
  resolved: boolean;
  winningOutcome?: number;
}

export function MarketCard({
  address,
  question,
  outcomes,
  endTime,
  totalVolume,
  resolved,
  winningOutcome,
}: MarketCardProps) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isEnded = endTime <= now;
  const daysRemaining = Math.max(0, Math.ceil(Number(endTime - now) / 86400));

  // Get status
  const status = resolved
    ? "resolved"
    : isEnded
    ? "ended"
    : "live";

  // Find leading outcome
  const leadingOutcome = outcomes.reduce((prev, curr) =>
    curr.price > prev.price ? curr : prev
  );

  return (
    <Link to={`/market/${address}`}>
      <article className="card p-5 h-full flex flex-col transition-all duration-300 hover:-translate-y-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <StatusBadge status={status} />
          <TimeDisplay
            endTime={endTime}
            daysRemaining={daysRemaining}
            resolved={resolved}
          />
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold leading-snug mb-4 line-clamp-2 text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors">
          {question}
        </h3>

        {/* Outcomes */}
        <div className="flex-1 space-y-2 mb-4">
          {outcomes.slice(0, 2).map((outcome, i) => (
            <OutcomeRow
              key={i}
              name={outcome.name}
              price={outcome.price}
              isWinner={resolved && winningOutcome === i}
              isLeading={!resolved && outcome.name === leadingOutcome.name}
            />
          ))}
          {outcomes.length > 2 && (
            <div className="text-xs text-[rgb(var(--text-muted))] pt-1">
              +{outcomes.length - 2} more outcomes
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[rgb(var(--border-subtle))] flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-[rgb(var(--text-muted))]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span className="font-mono">{formatVolume(totalVolume)}</span>
            <span className="text-[rgb(var(--text-muted))]">volume</span>
          </div>
          <div className="flex items-center gap-1 text-[rgb(var(--accent-primary))] opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium">Trade</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>
    </Link>
  );
}

function StatusBadge({ status }: { status: "live" | "ended" | "resolved" }) {
  const config = {
    live: { class: "badge-live", icon: "●", text: "Live" },
    ended: { class: "badge-ended", icon: "◷", text: "Ended" },
    resolved: { class: "badge-resolved", icon: "✓", text: "Resolved" },
  }[status];

  return (
    <span className={`badge ${config.class}`}>
      <span className={status === "live" ? "animate-pulse" : ""}>{config.icon}</span>
      {config.text}
    </span>
  );
}

function TimeDisplay({
  endTime,
  daysRemaining,
  resolved,
}: {
  endTime: bigint;
  daysRemaining: number;
  resolved: boolean;
}) {
  if (resolved) {
    return null;
  }

  const date = new Date(Number(endTime) * 1000);

  if (daysRemaining === 0) {
    return (
      <span className="text-xs text-[rgb(var(--warning))] font-medium">
        Ending today
      </span>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <span className="text-xs text-[rgb(var(--text-muted))]">
        {daysRemaining}d left
      </span>
    );
  }

  return (
    <span className="text-xs text-[rgb(var(--text-muted))]">
      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

function OutcomeRow({
  name,
  price,
  isWinner,
  isLeading,
}: {
  name: string;
  price: bigint;
  isWinner: boolean;
  isLeading: boolean;
}) {
  const pricePercent = Number(formatUnits(price, 16));

  return (
    <div
      className={`relative flex items-center justify-between p-3 rounded-xl transition-colors ${
        isWinner
          ? "bg-[rgb(var(--success-light))] border border-[rgb(var(--success))]/20"
          : "bg-[rgb(var(--bg-elevated))]"
      }`}
    >
      {/* Progress bar background */}
      <div
        className="absolute inset-0 rounded-xl opacity-30"
        style={{
          background: isWinner
            ? `linear-gradient(90deg, rgb(var(--success) / 0.2) ${pricePercent}%, transparent ${pricePercent}%)`
            : `linear-gradient(90deg, rgb(var(--accent-primary) / 0.15) ${pricePercent}%, transparent ${pricePercent}%)`,
        }}
      />

      <div className="relative flex items-center gap-2">
        {isWinner && (
          <span className="text-[rgb(var(--success))]">✓</span>
        )}
        {isLeading && !isWinner && (
          <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-primary))]" />
        )}
        <span className={`font-medium ${isWinner ? "text-[rgb(var(--success))]" : "text-[rgb(var(--text-primary))]"}`}>
          {name}
        </span>
      </div>

      <span
        className={`font-mono font-semibold tabular-nums ${
          isWinner ? "text-[rgb(var(--success))]" : "text-[rgb(var(--text-primary))]"
        }`}
      >
        {pricePercent.toFixed(1)}%
      </span>
    </div>
  );
}

function formatVolume(volume: bigint): string {
  const num = Number(formatUnits(volume, 6));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}
