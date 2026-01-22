/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Whether to use mock data instead of real API data (default: true) */
  readonly VITE_USE_MOCK_DATA: string;
  /** REST API URL for fetching indexed market data */
  readonly VITE_API_URL: string;
  /** The Graph subgraph URL for fetching market data (deprecated) */
  readonly VITE_SUBGRAPH_URL: string;
  /** WalletConnect project ID for wallet connections */
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  /** Default chain ID (84532 = Base Sepolia, 8453 = Base Mainnet) */
  readonly VITE_DEFAULT_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
