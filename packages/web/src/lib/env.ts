/**
 * Centralized environment configuration
 *
 * All environment variables should be accessed through this module
 * to ensure type safety and provide sensible defaults.
 */

/**
 * Environment configuration object
 */
export const env = {
  /**
   * Whether to use mock data instead of real API data.
   * Set VITE_USE_MOCK_DATA=false in .env.local to use live data.
   * Defaults to true for development convenience.
   */
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== "false",

  /**
   * REST API URL for fetching indexed market data.
   * Required when useMockData is false.
   */
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3001/api",

  /**
   * The Graph subgraph URL for fetching market data.
   * @deprecated Use apiUrl instead - migrating to Shovel + Postgres
   */
  subgraphUrl: import.meta.env.VITE_SUBGRAPH_URL || "",

  /**
   * WalletConnect project ID for wallet connections.
   * Get one from https://cloud.walletconnect.com
   */
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo",

  /**
   * Default chain ID for the app.
   * 84532 = Base Sepolia (testnet)
   * 8453 = Base (mainnet)
   */
  defaultChainId: Number(import.meta.env.VITE_DEFAULT_CHAIN_ID) || 84532,

  /**
   * Whether the app is running in development mode.
   */
  isDev: import.meta.env.DEV,

  /**
   * Whether the app is running in production mode.
   */
  isProd: import.meta.env.PROD,
} as const;

/**
 * Validate that required environment variables are set.
 * Call this early in app initialization to catch configuration errors.
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // API URL is required when not using mock data
  if (!env.useMockData && !env.apiUrl) {
    errors.push(
      "VITE_API_URL is required when VITE_USE_MOCK_DATA is not 'true'"
    );
  }

  // WalletConnect project ID should be set in production
  if (env.isProd && env.walletConnectProjectId === "demo") {
    console.warn(
      "Warning: VITE_WALLETCONNECT_PROJECT_ID is not set. Wallet connections may not work properly."
    );
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }
}

/**
 * Type for the environment configuration
 */
export type Env = typeof env;
