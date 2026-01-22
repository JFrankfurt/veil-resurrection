-- =============================================================================
-- Predictions V2 - Postgres Triggers for Computed Fields
-- These triggers maintain derived data that Shovel cannot compute directly
-- =============================================================================

-- =============================================================================
-- Protocol Stats Triggers
-- =============================================================================

-- Initialize protocol_stats if not exists
INSERT INTO protocol_stats (id, total_markets, total_volume, total_trades, total_liquidity, last_updated)
VALUES (1, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Update protocol stats when a new market is created
CREATE OR REPLACE FUNCTION update_protocol_stats_on_market()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE protocol_stats 
    SET total_markets = total_markets + 1,
        last_updated = NEW.created_at
    WHERE id = 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER market_created_stats_trigger
AFTER INSERT ON markets
FOR EACH ROW EXECUTE FUNCTION update_protocol_stats_on_market();

-- Update protocol stats when a new trade is created
CREATE OR REPLACE FUNCTION update_protocol_stats_on_trade()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE protocol_stats 
    SET total_trades = total_trades + 1,
        total_volume = total_volume + NEW.collateral_amount,
        last_updated = NEW.timestamp
    WHERE id = 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trade_created_stats_trigger
AFTER INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION update_protocol_stats_on_trade();

-- Update protocol liquidity when liquidity is added/removed
CREATE OR REPLACE FUNCTION update_protocol_stats_on_liquidity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_add THEN
        UPDATE protocol_stats 
        SET total_liquidity = total_liquidity + NEW.collateral_amount,
            last_updated = NEW.timestamp
        WHERE id = 1;
    ELSE
        UPDATE protocol_stats 
        SET total_liquidity = GREATEST(0, total_liquidity - NEW.collateral_amount),
            last_updated = NEW.timestamp
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER liquidity_event_stats_trigger
AFTER INSERT ON liquidity_events
FOR EACH ROW EXECUTE FUNCTION update_protocol_stats_on_liquidity();

-- =============================================================================
-- Market Volume and Liquidity Triggers
-- =============================================================================

-- Update market total_volume when trades occur
-- Note: This requires knowing which market the AMM belongs to
-- We need to join through the markets table via the amm address
CREATE OR REPLACE FUNCTION update_market_volume_on_trade()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the market that has this AMM
    UPDATE markets 
    SET total_volume = total_volume + NEW.collateral_amount
    WHERE amm = NEW.amm_address;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trade_market_volume_trigger
AFTER INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION update_market_volume_on_trade();

-- Update market total_liquidity when liquidity events occur
CREATE OR REPLACE FUNCTION update_market_liquidity_on_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_add THEN
        UPDATE markets 
        SET total_liquidity = total_liquidity + NEW.collateral_amount
        WHERE amm = NEW.amm_address;
    ELSE
        UPDATE markets 
        SET total_liquidity = GREATEST(0, total_liquidity - NEW.collateral_amount)
        WHERE amm = NEW.amm_address;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER liquidity_event_market_trigger
AFTER INSERT ON liquidity_events
FOR EACH ROW EXECUTE FUNCTION update_market_liquidity_on_event();

-- =============================================================================
-- Market Resolution Trigger
-- =============================================================================

-- Update markets table when a resolution event is indexed
CREATE OR REPLACE FUNCTION update_market_on_resolution()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE markets 
    SET resolved = TRUE,
        winning_outcome = NEW.winning_outcome,
        invalid = NEW.invalid
    WHERE id = NEW.market_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER market_resolution_trigger
AFTER INSERT ON market_resolutions
FOR EACH ROW EXECUTE FUNCTION update_market_on_resolution();

-- =============================================================================
-- Position Tracking Triggers
-- These maintain the positions table based on trade events
-- =============================================================================

-- Create or update position when a buy trade occurs
CREATE OR REPLACE FUNCTION update_position_on_buy()
RETURNS TRIGGER AS $$
DECLARE
    v_market_id BYTEA;
    v_position_id BYTEA;
    v_current_balances NUMERIC[];
    v_num_outcomes INT;
BEGIN
    -- Only process buy trades
    IF NOT NEW.is_buy THEN
        RETURN NEW;
    END IF;
    
    -- Get the market_id from the AMM address
    SELECT id INTO v_market_id FROM markets WHERE amm = NEW.amm_address;
    IF v_market_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get number of outcomes (stored when market was created)
    SELECT COALESCE(
        (SELECT array_length(balances, 1) FROM positions WHERE market_id = v_market_id LIMIT 1),
        (SELECT num_outcomes FROM markets WHERE id = v_market_id)
    ) INTO v_num_outcomes;
    
    IF v_num_outcomes IS NULL OR v_num_outcomes < 2 THEN
        v_num_outcomes := 2; -- Default to 2 outcomes
    END IF;
    
    -- Create composite position ID: user_address || market_id
    v_position_id := NEW.user_address || v_market_id;
    
    -- Try to get existing position
    SELECT balances INTO v_current_balances 
    FROM positions 
    WHERE id = v_position_id;
    
    IF v_current_balances IS NULL THEN
        -- Create new position with zero balances
        v_current_balances := ARRAY(SELECT 0::NUMERIC FROM generate_series(1, v_num_outcomes));
    END IF;
    
    -- Ensure array is large enough
    WHILE array_length(v_current_balances, 1) < NEW.outcome + 1 LOOP
        v_current_balances := array_append(v_current_balances, 0::NUMERIC);
    END LOOP;
    
    -- Update balance for this outcome
    v_current_balances[NEW.outcome + 1] := v_current_balances[NEW.outcome + 1] + NEW.token_amount;
    
    -- Upsert position
    INSERT INTO positions (id, user_address, market_id, balances, total_cost, last_updated)
    VALUES (v_position_id, NEW.user_address, v_market_id, v_current_balances, NEW.collateral_amount, NEW.timestamp)
    ON CONFLICT (id) DO UPDATE SET
        balances = EXCLUDED.balances,
        total_cost = positions.total_cost + EXCLUDED.total_cost,
        last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER buy_trade_position_trigger
AFTER INSERT ON trades
FOR EACH ROW 
WHEN (NEW.is_buy = TRUE)
EXECUTE FUNCTION update_position_on_buy();

-- Update position when a sell trade occurs
CREATE OR REPLACE FUNCTION update_position_on_sell()
RETURNS TRIGGER AS $$
DECLARE
    v_market_id BYTEA;
    v_position_id BYTEA;
    v_current_balances NUMERIC[];
BEGIN
    -- Only process sell trades
    IF NEW.is_buy THEN
        RETURN NEW;
    END IF;
    
    -- Get the market_id from the AMM address
    SELECT id INTO v_market_id FROM markets WHERE amm = NEW.amm_address;
    IF v_market_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Create composite position ID
    v_position_id := NEW.user_address || v_market_id;
    
    -- Get existing position
    SELECT balances INTO v_current_balances 
    FROM positions 
    WHERE id = v_position_id;
    
    IF v_current_balances IS NOT NULL AND array_length(v_current_balances, 1) > NEW.outcome THEN
        -- Subtract from balance (don't go below 0)
        v_current_balances[NEW.outcome + 1] := GREATEST(0, v_current_balances[NEW.outcome + 1] - NEW.token_amount);
        
        -- Update position
        UPDATE positions 
        SET balances = v_current_balances,
            total_cost = GREATEST(0, total_cost - NEW.collateral_amount),
            last_updated = NEW.timestamp
        WHERE id = v_position_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sell_trade_position_trigger
AFTER INSERT ON trades
FOR EACH ROW 
WHEN (NEW.is_buy = FALSE)
EXECUTE FUNCTION update_position_on_sell();

-- =============================================================================
-- Set is_buy flag based on integration name
-- Shovel doesn't set this automatically, so we use a before trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION set_trade_is_buy()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_buy based on the integration name
    IF NEW.ig_name = 'buy-trades' THEN
        NEW.is_buy := TRUE;
    ELSIF NEW.ig_name = 'sell-trades' THEN
        NEW.is_buy := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trade_set_is_buy_trigger
BEFORE INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION set_trade_is_buy();

-- Set is_add flag for liquidity events
CREATE OR REPLACE FUNCTION set_liquidity_is_add()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ig_name = 'liquidity-added' THEN
        NEW.is_add := TRUE;
    ELSIF NEW.ig_name = 'liquidity-removed' THEN
        NEW.is_add := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER liquidity_set_is_add_trigger
BEFORE INSERT ON liquidity_events
FOR EACH ROW EXECUTE FUNCTION set_liquidity_is_add();

-- =============================================================================
-- Utility function to link trades to markets via amm_address
-- Creates market_id reference after trade is inserted
-- =============================================================================

CREATE OR REPLACE FUNCTION set_trade_market_id()
RETURNS TRIGGER AS $$
DECLARE
    v_market_id BYTEA;
BEGIN
    SELECT id INTO v_market_id FROM markets WHERE amm = NEW.amm_address;
    IF v_market_id IS NOT NULL THEN
        NEW.market_id := v_market_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add market_id column to trades if not exists (for denormalization)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trades' AND column_name = 'market_id'
    ) THEN
        ALTER TABLE trades ADD COLUMN market_id BYTEA;
        CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
    END IF;
END $$;

CREATE OR REPLACE TRIGGER trade_set_market_id_trigger
BEFORE INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION set_trade_market_id();

-- Same for liquidity events
CREATE OR REPLACE FUNCTION set_liquidity_market_id()
RETURNS TRIGGER AS $$
DECLARE
    v_market_id BYTEA;
BEGIN
    SELECT id INTO v_market_id FROM markets WHERE amm = NEW.amm_address;
    IF v_market_id IS NOT NULL THEN
        NEW.market_id := v_market_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add market_id column to liquidity_events if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'liquidity_events' AND column_name = 'market_id'
    ) THEN
        ALTER TABLE liquidity_events ADD COLUMN market_id BYTEA;
        CREATE INDEX IF NOT EXISTS idx_liquidity_market_id ON liquidity_events(market_id);
    END IF;
END $$;

CREATE OR REPLACE TRIGGER liquidity_set_market_id_trigger
BEFORE INSERT ON liquidity_events
FOR EACH ROW EXECUTE FUNCTION set_liquidity_market_id();
