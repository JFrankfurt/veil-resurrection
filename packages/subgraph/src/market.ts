import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  MarketResolved,
  CompleteSetsIssued,
  CompleteSetsRedeemed,
  WinningsClaimed,
} from "../generated/templates/Market/Market";
import { Market, Position } from "../generated/schema";

export function handleMarketResolved(event: MarketResolved): void {
  let market = Market.load(event.address);
  if (market == null) return;

  market.resolved = true;
  market.winningOutcome = event.params.winningOutcome.toI32();
  market.invalid = event.params.invalid;
  market.save();
}

export function handleCompleteSetsIssued(event: CompleteSetsIssued): void {
  let market = Market.load(event.address);
  if (market == null) return;

  // Update position
  let positionId = event.params.to.concat(event.address);
  let position = Position.load(positionId);

  if (position == null) {
    position = new Position(positionId);
    position.user = event.params.to;
    position.market = event.address;
    position.balances = [];
    position.totalCost = BigInt.fromI32(0);
  }

  // Add amount to all outcome balances
  let balances = position.balances;
  let numOutcomes = market.totalVolume.equals(BigInt.fromI32(0)) ? 2 : balances.length;
  
  if (balances.length == 0) {
    for (let i = 0; i < numOutcomes; i++) {
      balances.push(event.params.amount);
    }
  } else {
    for (let i = 0; i < balances.length; i++) {
      balances[i] = balances[i].plus(event.params.amount);
    }
  }

  position.balances = balances;
  position.totalCost = position.totalCost.plus(event.params.amount);
  position.lastUpdated = event.block.timestamp;
  position.save();
}

export function handleCompleteSetsRedeemed(event: CompleteSetsRedeemed): void {
  let positionId = event.params.from.concat(event.address);
  let position = Position.load(positionId);

  if (position == null) return;

  // Subtract amount from all outcome balances
  let balances = position.balances;
  for (let i = 0; i < balances.length; i++) {
    balances[i] = balances[i].minus(event.params.amount);
    if (balances[i].lt(BigInt.fromI32(0))) {
      balances[i] = BigInt.fromI32(0);
    }
  }

  position.balances = balances;
  position.totalCost = position.totalCost.minus(event.params.amount);
  if (position.totalCost.lt(BigInt.fromI32(0))) {
    position.totalCost = BigInt.fromI32(0);
  }
  position.lastUpdated = event.block.timestamp;
  position.save();
}

export function handleWinningsClaimed(event: WinningsClaimed): void {
  let positionId = event.params.user.concat(event.address);
  let position = Position.load(positionId);

  if (position == null) return;

  // Zero out the winning outcome balance
  let balances = position.balances;
  let outcomeIndex = event.params.outcome.toI32();
  
  if (outcomeIndex < balances.length) {
    balances[outcomeIndex] = BigInt.fromI32(0);
  }

  position.balances = balances;
  position.lastUpdated = event.block.timestamp;
  position.save();
}
