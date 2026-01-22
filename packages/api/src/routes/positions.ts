import { Router, type Router as RouterType } from "express";
import { query } from "../db.js";
import { hexToBuffer, bufferToHex, type PositionRow, type MarketRow } from "../types.js";

const router: RouterType = Router();

/**
 * GET /api/users/:address/positions
 * Get all positions for a user
 */
router.get("/:address/positions", async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const userAddress = hexToBuffer(address);

    // Fetch positions with market details
    const result = await query<
      PositionRow & {
        question: string;
        resolved: boolean;
        winning_outcome: number | null;
        end_time: string;
        outcome_names: string | null;
      }
    >(
      `SELECT 
        p.id,
        p.user_address,
        p.market_id,
        p.balances,
        p.total_cost,
        p.last_updated,
        m.question,
        m.resolved,
        m.winning_outcome,
        m.end_time,
        (
          SELECT json_agg(json_build_object('name', o.name) ORDER BY o.outcome_index)
          FROM outcomes o
          WHERE o.market_id = p.market_id
        ) as outcome_names
       FROM positions p
       JOIN markets m ON m.id = p.market_id
       WHERE p.user_address = $1
       ORDER BY p.last_updated DESC`,
      [userAddress]
    );

    const positions = result.rows.map((row) => {
      // Parse outcome_names JSON if it exists
      let outcomeNames: { name: string }[] = [];
      if (row.outcome_names) {
        try {
          outcomeNames = typeof row.outcome_names === "string" 
            ? JSON.parse(row.outcome_names)
            : row.outcome_names;
        } catch {
          outcomeNames = [];
        }
      }

      return {
        id: bufferToHex(row.id),
        user: bufferToHex(row.user_address),
        market: {
          id: bufferToHex(row.market_id),
          question: row.question,
          resolved: row.resolved,
          winningOutcome: row.winning_outcome,
          endTime: row.end_time,
          outcomes: outcomeNames,
        },
        balances: row.balances,
        totalCost: row.total_cost,
        lastUpdated: row.last_updated,
      };
    });

    // Filter out positions with zero balances
    const nonZeroPositions = positions.filter((p) =>
      p.balances.some((b) => parseFloat(b) > 0)
    );

    res.json({ positions: nonZeroPositions });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

export default router;
