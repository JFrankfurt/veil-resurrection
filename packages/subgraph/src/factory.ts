import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { MarketCreated } from "../generated/MarketFactory/MarketFactory";
import { Market, Outcome, ProtocolStats } from "../generated/schema";
import { Market as MarketTemplate, OutcomeAMM as OutcomeAMMTemplate } from "../generated/templates";
import { Market as MarketContract } from "../generated/templates/Market/Market";

export function handleMarketCreated(event: MarketCreated): void {
  // Create Market entity
  let market = new Market(event.params.market);
  market.question = event.params.question;
  market.amm = event.params.amm;
  market.endTime = event.params.endTime;
  market.resolved = false;
  market.invalid = false;
  market.totalVolume = BigInt.fromI32(0);
  market.totalLiquidity = BigInt.fromI32(0);
  market.createdAt = event.block.timestamp;
  market.createdTx = event.transaction.hash;
  market.save();

  // Create Outcome entities
  let marketContract = MarketContract.bind(event.params.market);
  let numOutcomes = event.params.numOutcomes;

  for (let i: i32 = 0; i < numOutcomes; i++) {
    let outcomeId = event.params.market.concat(Bytes.fromI32(i));
    let outcome = new Outcome(outcomeId);
    outcome.market = event.params.market;
    outcome.index = i;
    
    let nameResult = marketContract.try_getOutcomeName(BigInt.fromI32(i));
    outcome.name = nameResult.reverted ? "Outcome " + i.toString() : nameResult.value;
    
    let tokenResult = marketContract.try_getOutcomeToken(BigInt.fromI32(i));
    outcome.token = tokenResult.reverted ? Bytes.empty() : tokenResult.value;
    
    // Initial price is 1/numOutcomes (in 18 decimals)
    let scale = BigInt.fromI32(10).pow(18);
    outcome.price = scale.div(BigInt.fromI32(numOutcomes));
    outcome.reserve = BigInt.fromI32(0);
    outcome.save();
  }

  // Update protocol stats
  let stats = ProtocolStats.load("1");
  if (stats == null) {
    stats = new ProtocolStats("1");
    stats.totalMarkets = 0;
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalTrades = 0;
  }
  stats.totalMarkets = stats.totalMarkets + 1;
  stats.save();

  // Create data source templates for tracking events
  MarketTemplate.create(event.params.market);
  OutcomeAMMTemplate.create(event.params.amm);
}
