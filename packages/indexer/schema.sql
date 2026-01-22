-- =============================================================================
-- Predictions V2 - Postgres Schema
-- Replaces The Graph subgraph with Shovel + Postgres indexing
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Markets table - stores prediction market contracts
CREATE TABLE IF NOT EXISTS markets (
    id BYTEA PRIMARY KEY,                    -- market contract address
    question TEXT NOT NULL,
    amm BYTEA NOT NULL,                      -- AMM contract address
    end_time NUMERIC NOT NULL,               -- Unix timestamp
    resolved BOOLEAN DEFAULT FALSE,
    winning_outcome INT,
    invalid BOOLEAN DEFAULT FALSE,
    total_volume NUMERIC DEFAULT 0,          -- Aggregated from trades
    total_liquidity NUMERIC DEFAULT 0,       -- Aggregated from liquidity events
    created_at NUMERIC NOT NULL,             -- Block timestamp
    created_tx BYTEA NOT NULL,               -- Transaction hash
    -- Shovel metadata columns (auto-added)
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_end_time ON markets(end_time);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);

-- Outcomes table - stores outcome options for each market
CREATE TABLE IF NOT EXISTS outcomes (
    id BYTEA PRIMARY KEY,                    -- market_address || outcome_index (concatenated)
    market_id BYTEA NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    outcome_index INT NOT NULL,
    name TEXT NOT NULL,
    token BYTEA NOT NULL,                    -- Outcome token contract address
    price NUMERIC DEFAULT 0,                 -- 18 decimals (0 to 1e18 = 0% to 100%)
    reserve NUMERIC DEFAULT 0,               -- Token reserve in AMM
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_outcomes_market ON outcomes(market_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outcomes_market_index ON outcomes(market_id, outcome_index);

-- Trades table - stores Buy and Sell events
CREATE TABLE IF NOT EXISTS trades (
    id BYTEA PRIMARY KEY,                    -- tx_hash || log_index
    market_id BYTEA NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    user_address BYTEA NOT NULL,
    outcome INT NOT NULL,
    is_buy BOOLEAN NOT NULL,
    collateral_amount NUMERIC NOT NULL,      -- USDC amount (6 decimals)
    token_amount NUMERIC NOT NULL,           -- Outcome token amount (18 decimals)
    timestamp NUMERIC NOT NULL,              -- Block timestamp
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_address);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_market_timestamp ON trades(market_id, timestamp DESC);

-- Positions table - tracks user positions per market
CREATE TABLE IF NOT EXISTS positions (
    id BYTEA PRIMARY KEY,                    -- user_address || market_address
    user_address BYTEA NOT NULL,
    market_id BYTEA NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    balances NUMERIC[] NOT NULL DEFAULT '{}', -- Array of balances per outcome
    total_cost NUMERIC DEFAULT 0,            -- Cost basis for P&L
    last_updated NUMERIC NOT NULL,           -- Block timestamp
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_address);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_user_market ON positions(user_address, market_id);

-- Liquidity events table - stores LiquidityAdded and LiquidityRemoved events
CREATE TABLE IF NOT EXISTS liquidity_events (
    id BYTEA PRIMARY KEY,                    -- tx_hash || log_index
    market_id BYTEA NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    provider BYTEA NOT NULL,
    is_add BOOLEAN NOT NULL,
    collateral_amount NUMERIC NOT NULL,      -- USDC amount
    lp_tokens NUMERIC NOT NULL,              -- LP token amount
    timestamp NUMERIC NOT NULL,
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE INDEX IF NOT EXISTS idx_liquidity_market ON liquidity_events(market_id);
CREATE INDEX IF NOT EXISTS idx_liquidity_provider ON liquidity_events(provider);
CREATE INDEX IF NOT EXISTS idx_liquidity_timestamp ON liquidity_events(timestamp DESC);

-- Protocol stats table - single row aggregate statistics
CREATE TABLE IF NOT EXISTS protocol_stats (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Enforce single row
    total_markets INT DEFAULT 0,
    total_volume NUMERIC DEFAULT 0,
    total_trades INT DEFAULT 0,
    total_liquidity NUMERIC DEFAULT 0,
    last_updated NUMERIC DEFAULT 0
);

-- Initialize protocol stats row
INSERT INTO protocol_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Market Resolution Events (for updating market state)
-- These are indexed by Shovel and trigger updates to markets table
-- =============================================================================

CREATE TABLE IF NOT EXISTS market_resolutions (
    id BYTEA PRIMARY KEY,                    -- tx_hash || log_index
    market_id BYTEA NOT NULL,
    winning_outcome INT NOT NULL,
    invalid BOOLEAN NOT NULL,
    timestamp NUMERIC NOT NULL,
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE INDEX IF NOT EXISTS idx_resolutions_market ON market_resolutions(market_id);

-- =============================================================================
-- Complete Sets Events (for position tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS complete_sets_issued (
    id BYTEA PRIMARY KEY,
    market_id BYTEA NOT NULL,
    to_address BYTEA NOT NULL,
    amount NUMERIC NOT NULL,
    timestamp NUMERIC NOT NULL,
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE TABLE IF NOT EXISTS complete_sets_redeemed (
    id BYTEA PRIMARY KEY,
    market_id BYTEA NOT NULL,
    from_address BYTEA NOT NULL,
    amount NUMERIC NOT NULL,
    timestamp NUMERIC NOT NULL,
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

CREATE TABLE IF NOT EXISTS winnings_claimed (
    id BYTEA PRIMARY KEY,
    market_id BYTEA NOT NULL,
    user_address BYTEA NOT NULL,
    outcome INT NOT NULL,
    payout NUMERIC NOT NULL,
    timestamp NUMERIC NOT NULL,
    tx_hash BYTEA NOT NULL,
    -- Shovel metadata columns
    ig_name TEXT,
    src_name TEXT,
    block_num NUMERIC,
    tx_idx NUMERIC,
    log_idx INT
);

-- =============================================================================
-- Views for common queries
-- =============================================================================

-- Markets with outcomes (denormalized for API efficiency)
CREATE OR REPLACE VIEW markets_with_outcomes AS
SELECT 
    m.id,
    encode(m.id, 'hex') as address,
    m.question,
    encode(m.amm, 'hex') as amm,
    m.end_time,
    m.resolved,
    m.winning_outcome,
    m.invalid,
    m.total_volume,
    m.total_liquidity,
    m.created_at,
    encode(m.created_tx, 'hex') as created_tx,
    COALESCE(
        json_agg(
            json_build_object(
                'index', o.outcome_index,
                'name', o.name,
                'token', encode(o.token, 'hex'),
                'price', o.price,
                'reserve', o.reserve
            ) ORDER BY o.outcome_index
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::json
    ) as outcomes
FROM markets m
LEFT JOIN outcomes o ON o.market_id = m.id
GROUP BY m.id;

-- User positions with market details
CREATE OR REPLACE VIEW positions_with_markets AS
SELECT 
    p.id,
    encode(p.user_address, 'hex') as user_address,
    encode(p.market_id, 'hex') as market_id,
    p.balances,
    p.total_cost,
    p.last_updated,
    m.question,
    m.resolved,
    m.winning_outcome,
    m.end_time,
    COALESCE(
        json_agg(
            json_build_object('name', o.name)
            ORDER BY o.outcome_index
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::json
    ) as outcome_names
FROM positions p
JOIN markets m ON m.id = p.market_id
LEFT JOIN outcomes o ON o.market_id = m.id
GROUP BY p.id, m.id;

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Convert hex string to bytea
CREATE OR REPLACE FUNCTION hex_to_bytea(hex TEXT) RETURNS BYTEA AS $$
BEGIN
    RETURN decode(REPLACE(hex, '0x', ''), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Convert bytea to hex string (with 0x prefix)
CREATE OR REPLACE FUNCTION bytea_to_hex(b BYTEA) RETURNS TEXT AS $$
BEGIN
    RETURN '0x' || encode(b, 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate composite ID from two bytea values
CREATE OR REPLACE FUNCTION make_composite_id(a BYTEA, b BYTEA) RETURNS BYTEA AS $$
BEGIN
    RETURN a || b;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate composite ID from bytea and integer
CREATE OR REPLACE FUNCTION make_composite_id_int(a BYTEA, i INT) RETURNS BYTEA AS $$
BEGIN
    RETURN a || int4send(i);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
