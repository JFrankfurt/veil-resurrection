import pg from "pg";
const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

/**
 * Execute a SQL query with parameters
 */
export async function query<T>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log("Executed query", { text: text.slice(0, 100), duration, rows: result.rowCount });
    }
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

/**
 * Get a single client for transactions
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Gracefully shut down the pool
 */
export async function shutdown() {
  await pool.end();
}

export default { query, getClient, shutdown };
