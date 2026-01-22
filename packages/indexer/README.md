# @predictions/indexer

Shovel-based blockchain indexer configuration for Predictions V2. This package replaces The Graph subgraph with a self-hosted PostgreSQL + [Shovel](https://indexsupply.com/shovel/docs/) solution.

## Architecture

```
Contracts → Shovel → PostgreSQL → REST API → Frontend
```

- **Shovel**: Indexes blockchain events into PostgreSQL
- **PostgreSQL**: Stores indexed data with computed fields via triggers
- **REST API**: Serves data to the frontend (`@predictions/api`)

## Files

| File | Description |
|------|-------------|
| `schema.sql` | PostgreSQL table definitions and views |
| `triggers.sql` | Triggers for computed fields (volumes, stats, positions) |
| `shovel.json` | Shovel configuration for indexing contract events |

## Indexed Events

| Event | Contract | Table |
|-------|----------|-------|
| `MarketCreated` | MarketFactory | `markets` |
| `MarketResolved` | Market | `market_resolutions` |
| `CompleteSetsIssued` | Market | `complete_sets_issued` |
| `CompleteSetsRedeemed` | Market | `complete_sets_redeemed` |
| `WinningsClaimed` | Market | `winnings_claimed` |
| `Buy` | OutcomeAMM | `trades` |
| `Sell` | OutcomeAMM | `trades` |
| `LiquidityAdded` | OutcomeAMM | `liquidity_events` |
| `LiquidityRemoved` | OutcomeAMM | `liquidity_events` |

## Local Development

### Using Docker Compose (Recommended)

From the repository root:

```bash
# Start all services (Postgres, Shovel, API)
docker-compose up -d

# View logs
docker-compose logs -f shovel

# Stop services
docker-compose down
```

### Manual Setup

1. **Start PostgreSQL:**
   ```bash
   docker run -d --name predictions-postgres \
     -e POSTGRES_DB=predictions \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:16-alpine
   ```

2. **Initialize database:**
   ```bash
   export DATABASE_URL=postgres://postgres:postgres@localhost:5432/predictions
   psql $DATABASE_URL -f schema.sql
   psql $DATABASE_URL -f triggers.sql
   ```

3. **Start Shovel:**
   ```bash
   export DATABASE_URL=postgres://postgres:postgres@localhost:5432/predictions
   export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   shovel -config shovel.json
   ```

4. **Start API:**
   ```bash
   cd ../api
   pnpm dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `BASE_RPC_URL` | Base Mainnet RPC URL | `https://mainnet.base.org` |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC URL | `https://sepolia.base.org` |

### Modifying the Schema

1. Edit `schema.sql` for table changes
2. Edit `triggers.sql` for computed field logic
3. Run migrations:
   ```bash
   pnpm db:reset  # Warning: drops all data
   ```

### Adding New Events

1. Add integration to `shovel.json`
2. Add table to `schema.sql` if needed
3. Add triggers to `triggers.sql` for computed fields

## Database Views

The schema includes helpful views:

- `markets_with_outcomes` - Markets with nested outcome data
- `positions_with_markets` - User positions with market details

## Differences from Subgraph

| Aspect | Subgraph | Shovel + Postgres |
|--------|----------|-------------------|
| Hosting | The Graph hosted/decentralized | Self-hosted |
| Query Language | GraphQL | SQL / REST |
| Computed Fields | AssemblyScript handlers | PostgreSQL triggers |
| Cost | Query fees / hosting | Infrastructure only |
| Flexibility | Schema-locked | Full SQL access |
| Debugging | Limited | Full database access |
