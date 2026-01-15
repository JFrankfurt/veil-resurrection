"use client";

import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  user: string;
  outcome: number;
  outcomeName: string;
  isBuy: boolean;
  collateralAmount: bigint;
  tokenAmount: bigint;
  timestamp: bigint;
  txHash: string;
}

interface RecentTradesProps {
  marketAddress?: string; // Used for fetching from subgraph
  outcomes: { name: string }[];
}

// Mock trades for development - will be replaced by subgraph data
function getMockTrades(outcomes: { name: string }[]): Trade[] {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return [
    {
      id: "1",
      user: "0x1234...5678",
      outcome: 0,
      outcomeName: outcomes[0]?.name || "Yes",
      isBuy: true,
      collateralAmount: BigInt("500000000"), // 500 USDC
      tokenAmount: BigInt("520000000000000000000"), // 520 tokens
      timestamp: now - BigInt(120),
      txHash: "0xabc...def",
    },
    {
      id: "2",
      user: "0xabcd...efgh",
      outcome: 1,
      outcomeName: outcomes[1]?.name || "No",
      isBuy: true,
      collateralAmount: BigInt("1000000000"), // 1000 USDC
      tokenAmount: BigInt("2100000000000000000000"), // 2100 tokens
      timestamp: now - BigInt(300),
      txHash: "0x123...456",
    },
    {
      id: "3",
      user: "0x9876...5432",
      outcome: 0,
      outcomeName: outcomes[0]?.name || "Yes",
      isBuy: false,
      collateralAmount: BigInt("250000000"), // 250 USDC
      tokenAmount: BigInt("260000000000000000000"), // 260 tokens
      timestamp: now - BigInt(600),
      txHash: "0xdef...789",
    },
    {
      id: "4",
      user: "0x5555...6666",
      outcome: 0,
      outcomeName: outcomes[0]?.name || "Yes",
      isBuy: true,
      collateralAmount: BigInt("2500000000"), // 2500 USDC
      tokenAmount: BigInt("2600000000000000000000"), // 2600 tokens
      timestamp: now - BigInt(1200),
      txHash: "0x789...abc",
    },
    {
      id: "5",
      user: "0x7777...8888",
      outcome: 1,
      outcomeName: outcomes[1]?.name || "No",
      isBuy: true,
      collateralAmount: BigInt("100000000"), // 100 USDC
      tokenAmount: BigInt("210000000000000000000"), // 210 tokens
      timestamp: now - BigInt(1800),
      txHash: "0xcba...321",
    },
  ];
}

export function RecentTrades({ outcomes }: RecentTradesProps) {
  // In production, this would fetch from the subgraph using marketAddress
  const trades = getMockTrades(outcomes);

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

      <div className="space-y-3">
        {trades.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>

      {trades.length === 0 && (
        <p className="text-center text-slate-500 py-8">No trades yet</p>
      )}
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const timeAgo = formatTimeAgo(trade.timestamp);
  const amount = formatUnits(trade.collateralAmount, 6);

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        {/* Action indicator */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
            trade.isBuy
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          )}
        >
          {trade.isBuy ? "B" : "S"}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {trade.isBuy ? "Buy" : "Sell"}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded-full",
                "bg-slate-700 text-slate-300"
              )}
            >
              {trade.outcomeName}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {trade.user} • {timeAgo}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono font-medium">
          ${Number(amount).toLocaleString()}
        </div>
        <div className="text-sm text-slate-500">
          {formatUnits(trade.tokenAmount, 18)} shares
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diff = Number(now - timestamp);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
