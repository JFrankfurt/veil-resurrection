/**
 * Data layer with mock/live toggle
 *
 * Set VITE_USE_MOCK_DATA=false in .env.local and configure VITE_API_URL to use live data.
 */

import {
  fetchAllMarkets,
  fetchMarket,
  fetchMarketTrades,
  fetchUserPositions,
  fetchProtocolStats,
  type Market,
  type Trade,
  type Position,
  type ProtocolStats,
} from "./api";
import { env } from "./env";

// Re-export types for convenience
export type { Market, Trade, Position, ProtocolStats };

// =============================================================================
// Data Fetching Functions
// =============================================================================

export async function getMarkets(): Promise<Market[]> {
  if (env.useMockData) return MOCK_MARKETS;
  return fetchAllMarkets();
}

export async function getMarket(address: string): Promise<Market | null> {
  if (env.useMockData) {
    return MOCK_MARKETS.find((m) => m.id.toLowerCase() === address.toLowerCase()) || null;
  }
  return fetchMarket(address);
}

export async function getTrades(marketAddress: string): Promise<Trade[]> {
  if (env.useMockData) {
    return MOCK_TRADES.filter(
      (t) => t.id.startsWith(marketAddress.toLowerCase())
    );
  }
  return fetchMarketTrades(marketAddress);
}

export async function getUserPositions(userAddress: string): Promise<Position[]> {
  if (env.useMockData) {
    // In mock mode, return all positions (simulate being the owner)
    return MOCK_POSITIONS;
  }
  return fetchUserPositions(userAddress);
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  if (env.useMockData) {
    return {
      totalMarkets: MOCK_MARKETS.length,
      totalVolume: MOCK_MARKETS.reduce(
        (sum, m) => (BigInt(sum) + BigInt(m.totalVolume)).toString(),
        "0"
      ),
      totalTrades: MOCK_TRADES.length,
    };
  }
  const stats = await fetchProtocolStats();
  return stats || { totalMarkets: 0, totalVolume: "0", totalTrades: 0 };
}

// =============================================================================
// Mock Data - Matches Subgraph Schema
// =============================================================================

const now = Math.floor(Date.now() / 1000);

const MOCK_MARKETS: Market[] = [
  {
    id: "0x1234567890123456789012345678901234567890",
    question: "Will Bitcoin reach $100,000 by the end of 2025?",
    amm: "0xabcdef1234567890123456789012345678901234",
    endTime: String(now + 86400 * 30),
    resolved: false,
    winningOutcome: null,
    invalid: false,
    totalVolume: "1250000000000", // 1.25M USDC (6 decimals)
    totalLiquidity: "100000000000", // 100K USDC
    createdAt: String(now - 86400 * 7),
    createdTx: "0x1111111111111111111111111111111111111111111111111111111111111111",
    outcomes: [
      {
        id: "0x1234567890123456789012345678901234567890-0",
        index: 0,
        name: "Yes",
        token: "0xaaaa111111111111111111111111111111111111",
        price: "650000000000000000", // 65%
        reserve: "50000000000",
      },
      {
        id: "0x1234567890123456789012345678901234567890-1",
        index: 1,
        name: "No",
        token: "0xaaaa222222222222222222222222222222222222",
        price: "350000000000000000", // 35%
        reserve: "50000000000",
      },
    ],
  },
  {
    id: "0x2345678901234567890123456789012345678901",
    question: "Who will win the 2024 US Presidential Election?",
    amm: "0xbcdef12345678901234567890123456789012345",
    endTime: String(now + 86400 * 60),
    resolved: false,
    winningOutcome: null,
    invalid: false,
    totalVolume: "5800000000000", // 5.8M USDC
    totalLiquidity: "250000000000", // 250K USDC
    createdAt: String(now - 86400 * 14),
    createdTx: "0x2222222222222222222222222222222222222222222222222222222222222222",
    outcomes: [
      {
        id: "0x2345678901234567890123456789012345678901-0",
        index: 0,
        name: "Trump",
        token: "0xbbbb111111111111111111111111111111111111",
        price: "520000000000000000", // 52%
        reserve: "80000000000",
      },
      {
        id: "0x2345678901234567890123456789012345678901-1",
        index: 1,
        name: "Harris",
        token: "0xbbbb222222222222222222222222222222222222",
        price: "420000000000000000", // 42%
        reserve: "65000000000",
      },
      {
        id: "0x2345678901234567890123456789012345678901-2",
        index: 2,
        name: "Other",
        token: "0xbbbb333333333333333333333333333333333333",
        price: "60000000000000000", // 6%
        reserve: "10000000000",
      },
    ],
  },
  {
    id: "0x3456789012345678901234567890123456789012",
    question: "Will Ethereum flip Bitcoin market cap in 2025?",
    amm: "0xcdef123456789012345678901234567890123456",
    endTime: String(now + 86400 * 180),
    resolved: false,
    winningOutcome: null,
    invalid: false,
    totalVolume: "890000000000", // 890K USDC
    totalLiquidity: "45000000000", // 45K USDC
    createdAt: String(now - 86400 * 3),
    createdTx: "0x3333333333333333333333333333333333333333333333333333333333333333",
    outcomes: [
      {
        id: "0x3456789012345678901234567890123456789012-0",
        index: 0,
        name: "Yes",
        token: "0xcccc111111111111111111111111111111111111",
        price: "150000000000000000", // 15%
        reserve: "40000000000",
      },
      {
        id: "0x3456789012345678901234567890123456789012-1",
        index: 1,
        name: "No",
        token: "0xcccc222222222222222222222222222222222222",
        price: "850000000000000000", // 85%
        reserve: "40000000000",
      },
    ],
  },
  {
    id: "0x4567890123456789012345678901234567890123",
    question: "Will GPT-5 be released in 2024?",
    amm: "0xdef1234567890123456789012345678901234567",
    endTime: String(now - 86400), // Ended
    resolved: true,
    winningOutcome: 1, // "No" won
    invalid: false,
    totalVolume: "2100000000000", // 2.1M USDC
    totalLiquidity: "0", // Resolved, no liquidity
    createdAt: String(now - 86400 * 60),
    createdTx: "0x4444444444444444444444444444444444444444444444444444444444444444",
    outcomes: [
      {
        id: "0x4567890123456789012345678901234567890123-0",
        index: 0,
        name: "Yes",
        token: "0xdddd111111111111111111111111111111111111",
        price: "0", // Lost
        reserve: "0",
      },
      {
        id: "0x4567890123456789012345678901234567890123-1",
        index: 1,
        name: "No",
        token: "0xdddd222222222222222222222222222222222222",
        price: "1000000000000000000", // 100% - won
        reserve: "0",
      },
    ],
  },
  {
    id: "0x5678901234567890123456789012345678901234",
    question: "Will Fed cut rates in Q1 2025?",
    amm: "0xef12345678901234567890123456789012345678",
    endTime: String(now + 86400 * 45),
    resolved: false,
    winningOutcome: null,
    invalid: false,
    totalVolume: "3200000000000", // 3.2M USDC
    totalLiquidity: "180000000000", // 180K USDC
    createdAt: String(now - 86400 * 10),
    createdTx: "0x5555555555555555555555555555555555555555555555555555555555555555",
    outcomes: [
      {
        id: "0x5678901234567890123456789012345678901234-0",
        index: 0,
        name: "Yes",
        token: "0xeeee111111111111111111111111111111111111",
        price: "720000000000000000", // 72%
        reserve: "90000000000",
      },
      {
        id: "0x5678901234567890123456789012345678901234-1",
        index: 1,
        name: "No",
        token: "0xeeee222222222222222222222222222222222222",
        price: "280000000000000000", // 28%
        reserve: "90000000000",
      },
    ],
  },
  {
    id: "0x6789012345678901234567890123456789012345",
    question: "Will Apple release AR glasses in 2025?",
    amm: "0xf123456789012345678901234567890123456789",
    endTime: String(now + 86400 * 120),
    resolved: false,
    winningOutcome: null,
    invalid: false,
    totalVolume: "780000000000", // 780K USDC
    totalLiquidity: "55000000000", // 55K USDC
    createdAt: String(now - 86400 * 5),
    createdTx: "0x6666666666666666666666666666666666666666666666666666666666666666",
    outcomes: [
      {
        id: "0x6789012345678901234567890123456789012345-0",
        index: 0,
        name: "Yes",
        token: "0xffff111111111111111111111111111111111111",
        price: "380000000000000000", // 38%
        reserve: "27000000000",
      },
      {
        id: "0x6789012345678901234567890123456789012345-1",
        index: 1,
        name: "No",
        token: "0xffff222222222222222222222222222222222222",
        price: "620000000000000000", // 62%
        reserve: "27000000000",
      },
    ],
  },
];

const MOCK_TRADES: Trade[] = [
  {
    id: "0x1234567890123456789012345678901234567890-0x1111-0",
    user: "0x1234000000000000000000000000000000005678",
    outcome: 0,
    isBuy: true,
    collateralAmount: "500000000", // 500 USDC
    tokenAmount: "769230769230769230769", // ~769 tokens
    timestamp: String(now - 120),
    txHash: "0xaaaa111111111111111111111111111111111111111111111111111111111111",
  },
  {
    id: "0x1234567890123456789012345678901234567890-0x2222-0",
    user: "0xabcd000000000000000000000000000000efgh",
    outcome: 1,
    isBuy: false,
    collateralAmount: "1200000000", // 1,200 USDC
    tokenAmount: "3428571428571428571428", // ~3428 tokens
    timestamp: String(now - 300),
    txHash: "0xbbbb222222222222222222222222222222222222222222222222222222222222",
  },
  {
    id: "0x1234567890123456789012345678901234567890-0x3333-0",
    user: "0x9876000000000000000000000000000000004321",
    outcome: 0,
    isBuy: true,
    collateralAmount: "250000000", // 250 USDC
    tokenAmount: "384615384615384615384", // ~384 tokens
    timestamp: String(now - 720),
    txHash: "0xcccc333333333333333333333333333333333333333333333333333333333333",
  },
  {
    id: "0x1234567890123456789012345678901234567890-0x4444-0",
    user: "0xfedc000000000000000000000000000000ba98",
    outcome: 0,
    isBuy: true,
    collateralAmount: "800000000", // 800 USDC
    tokenAmount: "1230769230769230769230", // ~1230 tokens
    timestamp: String(now - 1080),
    txHash: "0xdddd444444444444444444444444444444444444444444444444444444444444",
  },
  {
    id: "0x1234567890123456789012345678901234567890-0x5555-0",
    user: "0x2468000000000000000000000000000000001357",
    outcome: 1,
    isBuy: true,
    collateralAmount: "350000000", // 350 USDC
    tokenAmount: "1000000000000000000000", // ~1000 tokens
    timestamp: String(now - 1500),
    txHash: "0xeeee555555555555555555555555555555555555555555555555555555555555",
  },
];

const MOCK_POSITIONS: Position[] = [
  {
    id: "0xuser1-0x1234567890123456789012345678901234567890",
    user: "0xuser1000000000000000000000000000000000001",
    market: {
      id: "0x1234567890123456789012345678901234567890",
      question: "Will Bitcoin reach $100,000 by the end of 2025?",
      resolved: false,
      winningOutcome: null,
      endTime: String(now + 86400 * 30),
      outcomes: [{ name: "Yes" }, { name: "No" }],
    },
    balances: ["1500000000000000000000", "0"], // 1500 Yes tokens, 0 No tokens
    totalCost: "975000000", // 975 USDC cost basis
    lastUpdated: String(now - 3600),
  },
  {
    id: "0xuser1-0x2345678901234567890123456789012345678901",
    user: "0xuser1000000000000000000000000000000000001",
    market: {
      id: "0x2345678901234567890123456789012345678901",
      question: "Who will win the 2024 US Presidential Election?",
      resolved: false,
      winningOutcome: null,
      endTime: String(now + 86400 * 60),
      outcomes: [{ name: "Trump" }, { name: "Harris" }, { name: "Other" }],
    },
    balances: ["0", "500000000000000000000", "0"], // 500 Harris tokens
    totalCost: "225000000", // 225 USDC cost basis
    lastUpdated: String(now - 7200),
  },
  {
    id: "0xuser1-0x4567890123456789012345678901234567890123",
    user: "0xuser1000000000000000000000000000000000001",
    market: {
      id: "0x4567890123456789012345678901234567890123",
      question: "Will GPT-5 be released in 2024?",
      resolved: true,
      winningOutcome: 1,
      endTime: String(now - 86400),
      outcomes: [{ name: "Yes" }, { name: "No" }],
    },
    balances: ["0", "300000000000000000000"], // 300 No tokens (won!)
    totalCost: "204000000", // 204 USDC cost basis
    lastUpdated: String(now - 86400),
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate current value of a position based on outcome prices
 */
export function calculatePositionValue(
  position: Position,
  market: Market
): bigint {
  let value = BigInt(0);
  position.balances.forEach((balance, i) => {
    const balanceBigInt = BigInt(balance);
    if (balanceBigInt > 0 && market.outcomes[i]) {
      // value = balance * price / 1e18 (convert to USDC with 6 decimals)
      const price = BigInt(market.outcomes[i].price);
      value += (balanceBigInt * price) / BigInt(10 ** 18) / BigInt(10 ** 6);
    }
  });
  return value;
}

/**
 * Check if a position has claimable winnings
 */
export function getClaimableAmount(position: Position): bigint | null {
  if (!position.market.resolved || position.market.winningOutcome === null) {
    return null;
  }
  const winningBalance = position.balances[position.market.winningOutcome];
  if (!winningBalance || BigInt(winningBalance) === BigInt(0)) {
    return null;
  }
  // Each winning token is worth 1 USDC (1e6)
  return BigInt(winningBalance) / BigInt(10 ** 12); // Convert from 18 to 6 decimals
}
