import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    foundry({
      project: "../contracts",
      include: [
        "Market.sol/**",
        "MarketFactory.sol/**",
        "OutcomeAMM.sol/**",
        "Router.sol/**",
        "Resolver.sol/**",
        "OutcomeToken.sol/**",
      ],
    }),
  ],
});
