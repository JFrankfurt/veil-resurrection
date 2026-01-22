import { env } from "./env";

// =============================================================================
// Types - Same interface as graphql.ts for easy migration
// =============================================================================

export interface Market {
  id: string;
  question: string;
  amm: string;
  endTime: string;
  resolved: boolean;
  winningOutcome: number | null;
  invalid: boolean;
  totalVolume: string;
  totalLiquidity: string;
  createdAt: string;
  createdTx: string;
  outcomes: {
    id: string;
    index: number;
    name: string;
    token: string;
    price: string;
    reserve: string;
  }[];
}

export interface Trade {
  id: string;
  user: string;
  outcome: number;
  isBuy: boolean;
  collateralAmount: string;
  tokenAmount: string;
  timestamp: string;
  txHash: string;
}

export interface Position {
  id: string;
  user: string;
  market: {
    id: string;
    question: string;
    resolved: boolean;
    winningOutcome: number | null;
    endTime: string;
    outcomes: { name: string }[];
  };
  balances: string[];
  totalCost: string;
  lastUpdated: string;
}

export interface ProtocolStats {
  totalMarkets: number;
  totalVolume: string;
  totalTrades: number;
  totalLiquidity?: string;
}

// =============================================================================
// API Client
// =============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// Initialize client with API URL from environment
const apiClient = new ApiClient(env.apiUrl || "http://localhost:3001/api");

// =============================================================================
// Fetch Functions - Same interface as graphql.ts
// =============================================================================

interface MarketsResponse {
  markets: Market[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Fetch all markets with pagination
 */
export async function fetchAllMarkets(
  first = 20,
  skip = 0,
  orderBy = "createdAt",
  orderDirection = "desc"
): Promise<Market[]> {
  try {
    // Map GraphQL field names to API field names
    const orderByMap: Record<string, string> = {
      createdAt: "created_at",
      endTime: "end_time",
      totalVolume: "total_volume",
      totalLiquidity: "total_liquidity",
    };

    const apiOrderBy = orderByMap[orderBy] || "created_at";
    const order = orderDirection.toUpperCase();

    const data = await apiClient.get<MarketsResponse>(
      `/markets?limit=${first}&offset=${skip}&orderBy=${apiOrderBy}&order=${order}`
    );

    return data.markets;
  } catch (error) {
    console.error("Failed to fetch markets from API:", error);
    return [];
  }
}

/**
 * Fetch a single market by ID (address)
 */
export async function fetchMarket(id: string): Promise<Market | null> {
  try {
    const market = await apiClient.get<Market>(`/markets/${id}`);
    return market;
  } catch (error) {
    console.error("Failed to fetch market from API:", error);
    return null;
  }
}

interface TradesResponse {
  trades: Trade[];
}

/**
 * Fetch trades for a specific market
 */
export async function fetchMarketTrades(
  marketId: string,
  first = 20,
  skip = 0
): Promise<Trade[]> {
  try {
    const data = await apiClient.get<TradesResponse>(
      `/markets/${marketId}/trades?limit=${first}&offset=${skip}`
    );
    return data.trades;
  } catch (error) {
    console.error("Failed to fetch trades from API:", error);
    return [];
  }
}

interface PositionsResponse {
  positions: Position[];
}

/**
 * Fetch positions for a specific user
 */
export async function fetchUserPositions(userId: string): Promise<Position[]> {
  try {
    const data = await apiClient.get<PositionsResponse>(
      `/users/${userId.toLowerCase()}/positions`
    );
    return data.positions;
  } catch (error) {
    console.error("Failed to fetch positions from API:", error);
    return [];
  }
}

/**
 * Fetch protocol-wide statistics
 */
export async function fetchProtocolStats(): Promise<ProtocolStats | null> {
  try {
    const stats = await apiClient.get<ProtocolStats>("/stats");
    return stats;
  } catch (error) {
    console.error("Failed to fetch protocol stats from API:", error);
    return null;
  }
}
