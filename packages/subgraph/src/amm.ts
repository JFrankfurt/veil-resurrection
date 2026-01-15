import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  Buy,
  Sell,
  LiquidityAdded,
  LiquidityRemoved,
  OutcomeAMM,
} from "../generated/templates/OutcomeAMM/OutcomeAMM";
import { Market, Trade, LiquidityEvent, Outcome, Position, ProtocolStats } from "../generated/schema";

export function handleBuy(event: Buy): void {
  let amm = OutcomeAMM.bind(event.address);
  let marketAddress = amm.market();
  let market = Market.load(marketAddress);

  if (market == null) return;

  // Create trade entity
  let tradeId = event.transaction.hash.concat(Bytes.fromI32(event.logIndex.toI32()));
  let trade = new Trade(tradeId);
  trade.market = marketAddress;
  trade.user = event.params.user;
  trade.outcome = event.params.outcome.toI32();
  trade.isBuy = true;
  trade.collateralAmount = event.params.collateralIn;
  trade.tokenAmount = event.params.tokensOut;
  trade.timestamp = event.block.timestamp;
  trade.txHash = event.transaction.hash;
  trade.save();

  // Update market volume
  market.totalVolume = market.totalVolume.plus(event.params.collateralIn);
  market.save();

  // Update outcome prices
  updateOutcomePrices(marketAddress, event.address);

  // Update position
  updatePositionAfterBuy(
    event.params.user,
    marketAddress,
    event.params.outcome.toI32(),
    event.params.collateralIn,
    event.params.tokensOut,
    event.block.timestamp
  );

  // Update protocol stats
  let stats = ProtocolStats.load("1");
  if (stats != null) {
    stats.totalVolume = stats.totalVolume.plus(event.params.collateralIn);
    stats.totalTrades = stats.totalTrades + 1;
    stats.save();
  }
}

export function handleSell(event: Sell): void {
  let amm = OutcomeAMM.bind(event.address);
  let marketAddress = amm.market();
  let market = Market.load(marketAddress);

  if (market == null) return;

  // Create trade entity
  let tradeId = event.transaction.hash.concat(Bytes.fromI32(event.logIndex.toI32()));
  let trade = new Trade(tradeId);
  trade.market = marketAddress;
  trade.user = event.params.user;
  trade.outcome = event.params.outcome.toI32();
  trade.isBuy = false;
  trade.collateralAmount = event.params.collateralOut;
  trade.tokenAmount = event.params.tokensIn;
  trade.timestamp = event.block.timestamp;
  trade.txHash = event.transaction.hash;
  trade.save();

  // Update market volume
  market.totalVolume = market.totalVolume.plus(event.params.collateralOut);
  market.save();

  // Update outcome prices
  updateOutcomePrices(marketAddress, event.address);

  // Update position
  updatePositionAfterSell(
    event.params.user,
    marketAddress,
    event.params.outcome.toI32(),
    event.params.collateralOut,
    event.params.tokensIn,
    event.block.timestamp
  );

  // Update protocol stats
  let stats = ProtocolStats.load("1");
  if (stats != null) {
    stats.totalVolume = stats.totalVolume.plus(event.params.collateralOut);
    stats.totalTrades = stats.totalTrades + 1;
    stats.save();
  }
}

export function handleLiquidityAdded(event: LiquidityAdded): void {
  let amm = OutcomeAMM.bind(event.address);
  let marketAddress = amm.market();
  let market = Market.load(marketAddress);

  if (market == null) return;

  // Create liquidity event
  let eventId = event.transaction.hash.concat(Bytes.fromI32(event.logIndex.toI32()));
  let liquidityEvent = new LiquidityEvent(eventId);
  liquidityEvent.market = marketAddress;
  liquidityEvent.provider = event.params.provider;
  liquidityEvent.isAdd = true;
  liquidityEvent.collateralAmount = event.params.collateralAmount;
  liquidityEvent.lpTokens = event.params.lpTokens;
  liquidityEvent.timestamp = event.block.timestamp;
  liquidityEvent.txHash = event.transaction.hash;
  liquidityEvent.save();

  // Update market liquidity
  market.totalLiquidity = market.totalLiquidity.plus(event.params.collateralAmount);
  market.save();

  // Update outcome reserves
  updateOutcomePrices(marketAddress, event.address);
}

export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  let amm = OutcomeAMM.bind(event.address);
  let marketAddress = amm.market();
  let market = Market.load(marketAddress);

  if (market == null) return;

  // Create liquidity event
  let eventId = event.transaction.hash.concat(Bytes.fromI32(event.logIndex.toI32()));
  let liquidityEvent = new LiquidityEvent(eventId);
  liquidityEvent.market = marketAddress;
  liquidityEvent.provider = event.params.provider;
  liquidityEvent.isAdd = false;
  liquidityEvent.collateralAmount = event.params.collateralAmount;
  liquidityEvent.lpTokens = event.params.lpTokens;
  liquidityEvent.timestamp = event.block.timestamp;
  liquidityEvent.txHash = event.transaction.hash;
  liquidityEvent.save();

  // Update market liquidity
  market.totalLiquidity = market.totalLiquidity.minus(event.params.collateralAmount);
  if (market.totalLiquidity.lt(BigInt.fromI32(0))) {
    market.totalLiquidity = BigInt.fromI32(0);
  }
  market.save();

  // Update outcome reserves
  updateOutcomePrices(marketAddress, event.address);
}

function updateOutcomePrices(marketAddress: Bytes, ammAddress: Address): void {
  let amm = OutcomeAMM.bind(ammAddress);

  // Update each outcome's price and reserve
  for (let i = 0; i < 8; i++) {
    let outcomeId = marketAddress.concat(Bytes.fromI32(i));
    let outcome = Outcome.load(outcomeId);

    if (outcome == null) break;

    let priceResult = amm.try_getPrice(BigInt.fromI32(i));
    if (!priceResult.reverted) {
      outcome.price = priceResult.value;
    }

    let reserveResult = amm.try_getReserve(BigInt.fromI32(i));
    if (!reserveResult.reverted) {
      outcome.reserve = reserveResult.value;
    }

    outcome.save();
  }
}

function updatePositionAfterBuy(
  user: Bytes,
  marketAddress: Bytes,
  outcomeIndex: i32,
  collateralIn: BigInt,
  tokensOut: BigInt,
  timestamp: BigInt
): void {
  let positionId = user.concat(marketAddress);
  let position = Position.load(positionId);

  if (position == null) {
    position = new Position(positionId);
    position.user = user;
    position.market = marketAddress;
    position.balances = [];
    position.totalCost = BigInt.fromI32(0);
  }

  // Ensure balances array is large enough
  let balances = position.balances;
  while (balances.length <= outcomeIndex) {
    balances.push(BigInt.fromI32(0));
  }

  balances[outcomeIndex] = balances[outcomeIndex].plus(tokensOut);
  position.balances = balances;
  position.totalCost = position.totalCost.plus(collateralIn);
  position.lastUpdated = timestamp;
  position.save();
}

function updatePositionAfterSell(
  user: Bytes,
  marketAddress: Bytes,
  outcomeIndex: i32,
  collateralOut: BigInt,
  tokensIn: BigInt,
  timestamp: BigInt
): void {
  let positionId = user.concat(marketAddress);
  let position = Position.load(positionId);

  if (position == null) return;

  let balances = position.balances;
  if (outcomeIndex < balances.length) {
    balances[outcomeIndex] = balances[outcomeIndex].minus(tokensIn);
    if (balances[outcomeIndex].lt(BigInt.fromI32(0))) {
      balances[outcomeIndex] = BigInt.fromI32(0);
    }
  }

  position.balances = balances;
  position.totalCost = position.totalCost.minus(collateralOut);
  if (position.totalCost.lt(BigInt.fromI32(0))) {
    position.totalCost = BigInt.fromI32(0);
  }
  position.lastUpdated = timestamp;
  position.save();
}
