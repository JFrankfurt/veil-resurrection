// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "./TestHelper.sol";
import {Market} from "../src/core/Market.sol";
import {OutcomeAMM} from "../src/amm/OutcomeAMM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IntegrationTest
/// @notice End-to-end integration tests for the prediction market system
contract IntegrationTest is TestHelper {
    function test_FullMarketLifecycle() public {
        // 1. Create market
        uint256 endTime = block.timestamp + 1 days;
        (address marketAddr, address ammAddr) = createYesNoMarket(
            "Will it rain tomorrow?",
            endTime,
            10_000e6
        );
        Market market = Market(marketAddr);
        OutcomeAMM amm = OutcomeAMM(ammAddr);

        // 2. Bob buys "Yes" tokens
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        uint256 bobYesTokens = amm.buy(0, 5000e6, 0);
        vm.stopPrank();

        // 3. Carol buys "No" tokens
        vm.startPrank(carol);
        usdc.approve(address(amm), 3000e6);
        uint256 carolNoTokens = amm.buy(1, 3000e6, 0);
        vm.stopPrank();

        // 4. Verify prices moved
        uint256 yesPrice = amm.getPrice(0);
        uint256 noPrice = amm.getPrice(1);
        assertTrue(yesPrice > noPrice); // More buying pressure on Yes

        // 5. Time passes, market ends
        vm.warp(endTime + 1);

        // 6. Resolve market - "Yes" wins
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        // 7. Bob claims winnings (he bet correctly)
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        uint256 bobPayout = market.claimWinnings();

        assertEq(bobPayout, bobYesTokens);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + bobPayout);

        // 8. Carol's "No" tokens are worthless
        vm.prank(carol);
        vm.expectRevert(Market.NothingToClaim.selector);
        market.claimWinnings();

        // Carol still has her No tokens
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(carol), carolNoTokens);
    }

    function test_MultiOutcomeMarket() public {
        // Create 4-outcome market
        string[] memory outcomes = new string[](4);
        outcomes[0] = "Trump";
        outcomes[1] = "Biden";
        outcomes[2] = "DeSantis";
        outcomes[3] = "Other";

        uint256 endTime = block.timestamp + 30 days;

        (address marketAddr, address ammAddr) = createMarket(
            "Who wins 2024 election?",
            outcomes,
            endTime,
            20_000e6
        );
        Market market = Market(marketAddr);
        OutcomeAMM amm = OutcomeAMM(ammAddr);

        // Verify 4 outcomes
        assertEq(market.numOutcomes(), 4);

        // Check initial prices (should be ~25% each for 4 outcomes with equal reserves)
        for (uint256 i = 0; i < 4; i++) {
            uint256 price = amm.getPrice(i);
            assertApproxEqRel(price, 0.25e18, 0.1e18); // 10% tolerance for rounding
        }

        // Buy some Trump tokens
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        amm.buy(0, 5000e6, 0);
        vm.stopPrank();

        // Trump price should be higher now
        assertTrue(amm.getPrice(0) > 0.20e18); // At least 20%

        // Resolve: Trump wins
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 0);
    }

    function test_LiquidityProviderFlow() public {
        uint256 endTime = block.timestamp + 1 days;
        (, address ammAddr) = createYesNoMarket("Test?", endTime, 10_000e6);
        OutcomeAMM amm = OutcomeAMM(ammAddr);

        // Alice is initial LP with 10k (minus MIN_LIQUIDITY burned for inflation protection)
        assertEq(amm.balanceOf(alice), 10_000e6 - amm.MIN_LIQUIDITY());

        // Bob adds liquidity
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        uint256 bobLpTokens = amm.addLiquidity(bob, 5000e6);
        vm.stopPrank();

        assertEq(amm.balanceOf(bob), bobLpTokens);

        // Carol trades
        vm.startPrank(carol);
        usdc.approve(address(amm), 2000e6);
        amm.buy(0, 2000e6, 0);
        vm.stopPrank();

        // Bob removes half liquidity
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        uint256 withdrawn = amm.removeLiquidity(bobLpTokens / 2);
        vm.stopPrank();

        assertTrue(withdrawn > 0);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + withdrawn);
    }

    function test_RouterFlow() public {
        uint256 endTime = block.timestamp + 1 days;
        (address marketAddr,) = createYesNoMarket("Router test?", endTime, 10_000e6);
        Market market = Market(marketAddr);

        // Buy via router
        vm.startPrank(bob);
        usdc.approve(address(router), 1000e6);
        uint256 tokensOut = router.buy(
            marketAddr,
            0,
            1000e6,
            0,
            block.timestamp + 1 hours
        );
        vm.stopPrank();

        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), tokensOut);

        // Sell via router
        vm.startPrank(bob);
        IERC20(market.getOutcomeToken(0)).approve(address(router), tokensOut);
        uint256 collateralOut = router.sell(
            marketAddr,
            0,
            tokensOut,
            0,
            block.timestamp + 1 hours
        );
        vm.stopPrank();

        assertTrue(collateralOut > 0);
    }

    function test_BatchResolve() public {
        // Create 3 markets
        address[] memory markets = new address[](3);
        for (uint256 i = 0; i < 3; i++) {
            (address m,) = createYesNoMarket(
                string.concat("Question ", vm.toString(i)),
                block.timestamp + 1 days,
                1000e6
            );
            markets[i] = m;
        }

        vm.warp(block.timestamp + 2 days);

        // Batch resolve
        uint256[] memory outcomes = new uint256[](3);
        outcomes[0] = 0;
        outcomes[1] = 1;
        outcomes[2] = 0;

        bool[] memory invalids = new bool[](3);
        invalids[0] = false;
        invalids[1] = false;
        invalids[2] = true;

        vm.prank(operator);
        resolver.resolveBatch(markets, outcomes, invalids);

        // Verify all resolved correctly
        assertEq(Market(markets[0]).winningOutcome(), 0);
        assertFalse(Market(markets[0]).invalid());

        assertEq(Market(markets[1]).winningOutcome(), 1);
        assertFalse(Market(markets[1]).invalid());

        assertTrue(Market(markets[2]).invalid());
    }

    function test_InvalidMarketRefund() public {
        uint256 endTime = block.timestamp + 1 days;
        (address marketAddr, address ammAddr) = createYesNoMarket("Invalid test?", endTime, 10_000e6);
        Market market = Market(marketAddr);
        OutcomeAMM amm = OutcomeAMM(ammAddr);

        // Both Bob and Carol buy different outcomes
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        amm.buy(0, 5000e6, 0);
        vm.stopPrank();

        vm.startPrank(carol);
        usdc.approve(address(amm), 5000e6);
        amm.buy(1, 5000e6, 0);
        vm.stopPrank();

        // Resolve as invalid
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, true);

        // Both should get proportional refunds
        uint256 bobBefore = usdc.balanceOf(bob);
        uint256 carolBefore = usdc.balanceOf(carol);

        vm.prank(bob);
        market.claimWinnings();

        vm.prank(carol);
        market.claimWinnings();

        // Both got refunds
        assertTrue(usdc.balanceOf(bob) > bobBefore);
        assertTrue(usdc.balanceOf(carol) > carolBefore);
    }
}
