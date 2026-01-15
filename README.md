# Predictions V2

A modern prediction market protocol built on Base. Create markets on real-world events, trade outcome tokens, and earn rewards for accurate predictions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web App   │  │ Admin Panel │  │       Subgraph          │  │
│  │   (Vite)    │  │  (Next.js)  │  │    (The Graph)          │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    Smart Contracts                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Market    │  │  OutcomeAMM │  │    MarketFactory        │  │
│  │  (ERC20s)   │  │   (CPMM)    │  │   (Clone Factory)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │  Resolver   │  │   Router    │                               │
│  │ (Centralized)│  │  (Trading)  │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                           │
                     ┌─────┴─────┐
                     │   Base    │
                     │    L2     │
                     └───────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `packages/contracts` | Solidity smart contracts (Foundry) |
| `packages/config` | Shared TypeScript types and ABIs |
| `packages/subgraph` | The Graph indexer for market data |
| `packages/web` | Public-facing Vite + React web app |
| `packages/admin` | Admin panel for market creation/resolution (Next.js) |

## Tech Stack

- **Contracts**: Solidity 0.8.20, Foundry, OpenZeppelin
- **Web App**: Vite, React 18, React Router, TailwindCSS, wagmi/viem, RainbowKit
- **Admin**: Next.js 14, TailwindCSS, wagmi/viem
- **Indexer**: The Graph (AssemblyScript)
- **Monorepo**: pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Foundry (for contracts)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run the web app in development mode
cd packages/web
pnpm dev

# Run contract tests
cd packages/contracts
pnpm test

# Build contracts and export ABIs
cd packages/contracts
forge build
pnpm abi-export

# Build all packages
pnpm build  # from root
```

## Smart Contracts

### Core Contracts

#### Market

Each market represents a prediction question with 2-8 possible outcomes. Users can:

- Buy/sell outcome tokens through the AMM
- Redeem winning tokens after resolution
- Claim pro-rata refunds if market is invalidated

#### OutcomeAMM

Constant Product Market Maker (CPMM) for pricing outcome tokens:

- Automated price discovery based on supply/demand
- 1% protocol fee on trades
- LP token for liquidity providers

#### MarketFactory

Factory contract for deploying new markets:

- Uses minimal proxies (EIP-1167) for gas efficiency
- Configurable protocol fees
- Market registry

#### Resolver

Centralized oracle for market resolution:

- Owner-controlled operator whitelist
- Batch resolution support
- Invalid market handling

### Deployment

```bash
cd packages/contracts

# Set environment variables
export PRIVATE_KEY=your_private_key
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export BASESCAN_API_KEY=your_api_key

# Deploy to Base Sepolia
pnpm deploy
```

## Frontend

### Web App (Vite + React)

- Browse active and resolved markets
- Trade outcome tokens via AMM
- Portfolio tracking with P&L calculations
- Mobile-responsive Base-inspired design
- RainbowKit wallet connection

### Admin Panel (Next.js)

- Create new prediction markets
- Resolve markets as operator
- Manage protocol settings

### Environment Variables

```bash
# Web App (.env)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/YOUR_ID/predictions-v2/version/latest

# Contracts (.env)
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key
```

### Data Layer

The web app uses a centralized data layer (`src/lib/data.ts`) with a mock/live toggle:

```typescript
// Toggle this to switch between mock and live data
const USE_MOCK = true;
```

When `USE_MOCK` is `true`, the app displays realistic mock data for development. Set it to `false` and configure `VITE_SUBGRAPH_URL` to fetch live data from your deployed subgraph.

## Subgraph

The subgraph indexes all market events for fast querying:

```bash
cd packages/subgraph

# Generate types
pnpm codegen

# Build
pnpm build

# Deploy (requires Graph CLI auth)
pnpm deploy
```

### Example Query

```graphql
query GetMarkets {
  markets(first: 10, orderBy: totalVolume, orderDirection: desc) {
    id
    question
    endTime
    resolved
    outcomes {
      name
      price
    }
    totalVolume
  }
}
```

## Testing

```bash
# Run all contract tests (from packages/contracts)
cd packages/contracts
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/Market.t.sol

# Run with gas reporting
forge test --gas-report
```

## Design Decisions

### Why Base?

- Low transaction fees (~$0.01 per trade)
- Fast block times (~2 seconds)
- EVM-compatible
- Strong ecosystem

### Why CPMM over LMSR?

- Simpler implementation
- More familiar to DeFi users
- Better composability with existing tooling
- Gas efficient

### Why Centralized Resolver?

- Faster resolution (no oracle delays)
- Lower costs (no Chainlink fees)
- Flexibility for subjective outcomes
- Can upgrade to decentralized later

### Why Minimal Proxies?

- 10x cheaper market deployment
- Same security as full contracts
- Upgradeable implementations

## Security Considerations

- All contracts use OpenZeppelin's battle-tested libraries
- ReentrancyGuard on all external functions
- Pausable emergency controls on Market and AMM
- Maximum fee cap (10%) enforced on-chain
- Minimum initial liquidity requirement to prevent LP inflation attacks
- Safe math using OpenZeppelin's Math.mulDiv for overflow protection
- Extensive test coverage (49+ tests)
- No external dependencies in core logic

### Emergency Controls

Markets and AMMs can be paused by the factory owner in case of discovered vulnerabilities:

- Trading halted during pause
- Liquidity removal and winnings claims still allowed (users can exit)
- Factory owner can pause/unpause individual markets

### Known Limitations

- Centralized resolution (trusted operator)
- No on-chain price oracles
- Single collateral token (USDC)
- No timelock on admin operations (recommended for production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

## License

MIT
