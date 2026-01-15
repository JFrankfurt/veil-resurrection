import { GraphQLClient, gql } from "graphql-request";

const SUBGRAPH_URL =
  import.meta.env.VITE_SUBGRAPH_URL ||
  "https://api.studio.thegraph.com/query/YOUR_ID/predictions-v2/version/latest";

export const graphqlClient = new GraphQLClient(SUBGRAPH_URL);

// Query fragments
export const MARKET_FIELDS = gql`
  fragment MarketFields on Market {
    id
    question
    amm
    endTime
    resolved
    winningOutcome
    invalid
    totalVolume
    totalLiquidity
    createdAt
    createdTx
    outcomes {
      id
      index
      name
      token
      price
      reserve
    }
  }
`;

// Queries
export const GET_ALL_MARKETS = gql`
  ${MARKET_FIELDS}
  query GetAllMarkets($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    markets(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ...MarketFields
    }
  }
`;

export const GET_MARKET = gql`
  ${MARKET_FIELDS}
  query GetMarket($id: ID!) {
    market(id: $id) {
      ...MarketFields
    }
  }
`;

export const GET_MARKET_TRADES = gql`
  query GetMarketTrades($marketId: ID!, $first: Int!, $skip: Int!) {
    trades(
      first: $first
      skip: $skip
      where: { market: $marketId }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      user
      outcome
      isBuy
      collateralAmount
      tokenAmount
      timestamp
      txHash
    }
  }
`;

export const GET_USER_POSITIONS = gql`
  query GetUserPositions($userId: ID!) {
    positions(where: { user: $userId }) {
      id
      user
      market {
        id
        question
        resolved
        winningOutcome
        endTime
        outcomes {
          name
        }
      }
      balances
      totalCost
      lastUpdated
    }
  }
`;

export const GET_PROTOCOL_STATS = gql`
  query GetProtocolStats {
    protocolStats(id: "1") {
      totalMarkets
      totalVolume
      totalTrades
    }
  }
`;

// Types
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
}

// Fetch functions
export async function fetchAllMarkets(
  first = 20,
  skip = 0,
  orderBy = "createdAt",
  orderDirection = "desc"
): Promise<Market[]> {
  try {
    const data = await graphqlClient.request<{ markets: Market[] }>(
      GET_ALL_MARKETS,
      { first, skip, orderBy, orderDirection }
    );
    return data.markets;
  } catch (error) {
    console.error("Failed to fetch markets from subgraph:", error);
    return [];
  }
}

export async function fetchMarket(id: string): Promise<Market | null> {
  try {
    const data = await graphqlClient.request<{ market: Market | null }>(
      GET_MARKET,
      { id }
    );
    return data.market;
  } catch (error) {
    console.error("Failed to fetch market from subgraph:", error);
    return null;
  }
}

export async function fetchMarketTrades(
  marketId: string,
  first = 20,
  skip = 0
): Promise<Trade[]> {
  try {
    const data = await graphqlClient.request<{ trades: Trade[] }>(
      GET_MARKET_TRADES,
      { marketId, first, skip }
    );
    return data.trades;
  } catch (error) {
    console.error("Failed to fetch trades from subgraph:", error);
    return [];
  }
}

export async function fetchUserPositions(userId: string): Promise<Position[]> {
  try {
    const data = await graphqlClient.request<{ positions: Position[] }>(
      GET_USER_POSITIONS,
      { userId: userId.toLowerCase() }
    );
    return data.positions;
  } catch (error) {
    console.error("Failed to fetch positions from subgraph:", error);
    return [];
  }
}

export async function fetchProtocolStats(): Promise<ProtocolStats | null> {
  try {
    const data = await graphqlClient.request<{
      protocolStats: ProtocolStats | null;
    }>(GET_PROTOCOL_STATS);
    return data.protocolStats;
  } catch (error) {
    console.error("Failed to fetch protocol stats from subgraph:", error);
    return null;
  }
}
