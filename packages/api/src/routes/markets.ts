import { Router, type Router as RouterType } from "express";
import { query } from "../db.js";
import {
  type MarketRow,
  type OutcomeRow,
  formatMarket,
  hexToBuffer,
} from "../types.js";

const router: RouterType = Router();

/**
 * GET /api/markets
 * List all markets with optional pagination and ordering
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.orderBy as string) || "created_at";
    const order = (req.query.order as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    
    // Validate orderBy to prevent SQL injection
    const validOrderBy = ["created_at", "end_time", "total_volume", "total_liquidity"];
    const safeOrderBy = validOrderBy.includes(orderBy) ? orderBy : "created_at";

    // Fetch markets
    const marketsResult = await query<MarketRow>(
      `SELECT * FROM markets ORDER BY ${safeOrderBy} ${order} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Fetch all outcomes for these markets in one query
    const marketIds = marketsResult.rows.map((m) => m.id);
    let outcomesMap = new Map<string, OutcomeRow[]>();

    if (marketIds.length > 0) {
      const outcomesResult = await query<OutcomeRow>(
        `SELECT * FROM outcomes WHERE market_id = ANY($1) ORDER BY market_id, outcome_index`,
        [marketIds]
      );

      // Group outcomes by market
      for (const outcome of outcomesResult.rows) {
        const key = outcome.market_id.toString("hex");
        if (!outcomesMap.has(key)) {
          outcomesMap.set(key, []);
        }
        outcomesMap.get(key)!.push(outcome);
      }
    }

    // Format response
    const markets = marketsResult.rows.map((market) => {
      const outcomes = outcomesMap.get(market.id.toString("hex")) || [];
      return formatMarket(market, outcomes);
    });

    // Get total count for pagination
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM markets"
    );
    const total = parseInt(countResult.rows[0]?.count || "0");

    res.json({
      markets,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + markets.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

/**
 * GET /api/markets/:address
 * Get a single market by address
 */
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const marketId = hexToBuffer(address);

    // Fetch market
    const marketResult = await query<MarketRow>(
      "SELECT * FROM markets WHERE id = $1",
      [marketId]
    );

    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: "Market not found" });
    }

    // Fetch outcomes
    const outcomesResult = await query<OutcomeRow>(
      "SELECT * FROM outcomes WHERE market_id = $1 ORDER BY outcome_index",
      [marketId]
    );

    const market = formatMarket(marketResult.rows[0], outcomesResult.rows);
    res.json(market);
  } catch (error) {
    console.error("Error fetching market:", error);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

/**
 * GET /api/markets/:address/trades
 * Get trades for a specific market
 */
router.get("/:address/trades", async (req, res) => {
  try {
    const { address } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const marketId = hexToBuffer(address);

    // First get the AMM address for this market
    const marketResult = await query<MarketRow>(
      "SELECT amm FROM markets WHERE id = $1",
      [marketId]
    );

    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: "Market not found" });
    }

    const ammAddress = marketResult.rows[0].amm;

    // Fetch trades for this AMM
    const tradesResult = await query<{
      id: Buffer;
      user_address: Buffer;
      outcome: number;
      is_buy: boolean;
      collateral_amount: string;
      token_amount: string;
      timestamp: string;
      tx_hash: Buffer;
    }>(
      `SELECT id, user_address, outcome, is_buy, collateral_amount, token_amount, timestamp, tx_hash 
       FROM trades 
       WHERE amm_address = $1 
       ORDER BY timestamp DESC 
       LIMIT $2 OFFSET $3`,
      [ammAddress, limit, offset]
    );

    const trades = tradesResult.rows.map((row) => ({
      id: "0x" + row.id.toString("hex"),
      user: "0x" + row.user_address.toString("hex"),
      outcome: row.outcome,
      isBuy: row.is_buy,
      collateralAmount: row.collateral_amount,
      tokenAmount: row.token_amount,
      timestamp: row.timestamp,
      txHash: "0x" + row.tx_hash.toString("hex"),
    }));

    res.json({ trades });
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

export default router;
