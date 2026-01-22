import { Router, type Router as RouterType } from "express";
import { query } from "../db.js";
import { type ProtocolStatsRow, formatProtocolStats } from "../types.js";

const router: RouterType = Router();

/**
 * GET /api/stats
 * Get protocol-wide statistics
 */
router.get("/", async (req, res) => {
  try {
    const result = await query<ProtocolStatsRow>(
      "SELECT * FROM protocol_stats WHERE id = 1"
    );

    if (result.rows.length === 0) {
      // Return default stats if not initialized
      return res.json({
        totalMarkets: 0,
        totalVolume: "0",
        totalTrades: 0,
        totalLiquidity: "0",
      });
    }

    res.json(formatProtocolStats(result.rows[0]));
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
