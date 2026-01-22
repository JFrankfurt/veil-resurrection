# Predictions V2

A modern prediction market protocol built on Base. Create markets on real-world events, trade outcome tokens, and earn rewards for accurate predictions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Web App   │  │ Admin Panel │                               │
│  │   (Vite)    │  │  (Next.js)  │                               │
│  └──────┬──────┘  └──────┬──────┘                               │
│         │                │                                       │
│         └───────┬────────┘                                       │
│                 │                                                │
└─────────────────┼────────────────────────────────────────────────┘
                  │
┌─────────────────┼────────────────────────────────────────────────┐
│                 │         Data Layer                             │
│                 ▼                                                 │
│         ┌─────────────┐                                          │
│         │  REST API   │ ◄──── Express.js                         │
│         └──────┬──────┘                                          │
│                │                                                 │
│                ▼                                                 │
│         ┌─────────────┐        ┌─────────────┐                   │
│         │  PostgreSQL │ ◄──────│   Shovel    │ ◄─── Blockchain   │
│         │  (Indexed)  │        │  (Indexer)  │      Events       │
│         └─────────────┘        └─────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
                  │
┌─────────────────┼────────────────────────────────────────────────┐
│                    Smart Contracts                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Market    │  │  OutcomeAMM │  │    MarketFactory        │  │
│  │  (ERC20s)   │  │   (CPMM)    │  │   (Clone Factory)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │  Resolver   │  │   Router    │                               │
│  │(Centralized)│  │  (Trading)  │                               │
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
| `packages/config` | Shared TypeScript types, ABIs, and utilities |
| `packages/indexer` | Shovel configuration for blockchain indexing |
| `packages/api` | REST API for serving indexed data |
| `packages/web` | Public-facing Vite + React web app |
| `packages/admin` | Admin panel for market creation/resolution (Next.js) |

## Tech Stack

- **Contracts**: Solidity 0.8.20, Foundry, OpenZeppelin
- **Web App**: Vite, React 18, React Router, TailwindCSS, wagmi/viem, RainbowKit
- **Admin**: Next.js 14, TailwindCSS, wagmi/viem
- **Indexer**: Shovel (blockchain event indexer)
- **Database**: PostgreSQL 16
- **API**: Express.js, Node.js
- **Monorepo**: pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (for local development)
- Foundry (for contracts)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Local Development

The easiest way to run the full stack locally is with Docker Compose:

```bash
# Start all services (Postgres, Shovel indexer, API)
docker-compose up -d

# View indexer logs
docker-compose logs -f shovel

# Stop all services
docker-compose down

# Stop and remove data volumes
docker-compose down -v
```

Then run the web app:

```bash
cd packages/web
pnpm dev
```

### Manual Development Setup

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

# Run the API server
cd packages/api
pnpm dev

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
VITE_API_URL=http://localhost:3001/api

# Admin Panel (.env)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# API Server (.env)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/predictions
PORT=3001

# Contracts (.env)
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key
```

### Data Layer

The web app fetches data from the REST API (`packages/api`), which queries a PostgreSQL database populated by the Shovel indexer. For development without a running indexer, you can enable mock data:

```bash
# In packages/web/.env
VITE_USE_MOCK_DATA=true
```

## Indexer (Shovel + PostgreSQL)

The indexer uses [Shovel](https://indexsupply.com/shovel/docs/) to listen for blockchain events and store them in PostgreSQL.

### Indexed Events

| Event | Contract | Description |
|-------|----------|-------------|
| `MarketCreated` | MarketFactory | New market deployment |
| `MarketResolved` | Market | Market resolution |
| `Buy` | OutcomeAMM | Outcome token purchase |
| `Sell` | OutcomeAMM | Outcome token sale |
| `LiquidityAdded` | OutcomeAMM | LP deposit |
| `LiquidityRemoved` | OutcomeAMM | LP withdrawal |

### Configuration Files

- `packages/indexer/schema.sql` - PostgreSQL table definitions
- `packages/indexer/triggers.sql` - Computed field triggers
- `packages/indexer/shovel.json` - Shovel event configuration

See `packages/indexer/README.md` for detailed setup instructions.

## REST API

The API (`packages/api`) provides endpoints for the frontend:

| Endpoint | Description |
|----------|-------------|
| `GET /api/markets` | List all markets |
| `GET /api/markets/:id` | Get single market details |
| `GET /api/markets/:id/trades` | Get market trade history |
| `GET /api/users/:address/positions` | Get user's positions |
| `GET /api/stats` | Get protocol statistics |

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

### Why Shovel over The Graph?

- Self-hosted, no third-party dependencies
- Full SQL access for complex queries
- Lower operational costs
- Easier debugging with direct database access
- PostgreSQL triggers for computed fields

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
