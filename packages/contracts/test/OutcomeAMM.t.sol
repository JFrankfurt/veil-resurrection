// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "./TestHelper.sol";
import {Market} from "../src/core/Market.sol";
import {OutcomeAMM} from "../src/amm/OutcomeAMM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OutcomeAMMTest is TestHelper {
    Market public market;
    OutcomeAMM public amm;
    uint256 public endTime;
    uint256 public constant INITIAL_LIQUIDITY = 10_000e6;

    function setUp() public override {
        super.setUp();
        endTime = block.timestamp + 1 days;
        (address marketAddr, address ammAddr) = createYesNoMarket(
            "Test market?",
            endTime,
            INITIAL_LIQUIDITY
        );
        market = Market(marketAddr);
        amm = OutcomeAMM(ammAddr);
    }

    function test_AMMInitialization() public view {
        assertEq(amm.market(), address(market));
        // Total supply includes MIN_LIQUIDITY burned to dead address
        assertEq(amm.totalSupply(), INITIAL_LIQUIDITY);
        // Alice gets INITIAL_LIQUIDITY - MIN_LIQUIDITY (inflation attack protection)
        assertEq(amm.balanceOf(alice), INITIAL_LIQUIDITY - amm.MIN_LIQUIDITY());

        // Initial reserves should be equal
        assertEq(amm.getReserve(0), INITIAL_LIQUIDITY);
        assertEq(amm.getReserve(1), INITIAL_LIQUIDITY);
    }

    function test_InitialPricesEqual() public view {
        uint256 price0 = amm.getPrice(0);
        uint256 price1 = amm.getPrice(1);

        // With equal reserves, prices should be 50/50
        assertApproxEqRel(price0, 0.5e18, 0.01e18); // 1% tolerance
        assertApproxEqRel(price1, 0.5e18, 0.01e18);
    }

    function test_Buy() public {
        uint256 buyAmount = 1000e6;

        vm.startPrank(bob);
        usdc.approve(address(amm), buyAmount);

        uint256 quote = amm.quoteBuy(0, buyAmount);
        uint256 tokensOut = amm.buy(0, buyAmount, quote * 99 / 100);
        vm.stopPrank();

        // Bob should have outcome tokens
        assertTrue(tokensOut > 0);
        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), tokensOut);

        // Price of outcome 0 should have increased
        uint256 newPrice0 = amm.getPrice(0);
        assertTrue(newPrice0 > 0.5e18);
    }

    function test_Sell() public {
        // First buy some tokens
        uint256 buyAmount = 1000e6;
        vm.startPrank(bob);
        usdc.approve(address(amm), buyAmount);
        uint256 tokensBought = amm.buy(0, buyAmount, 0);

        // Now sell them back
        IERC20 outcomeToken = IERC20(market.getOutcomeToken(0));
        outcomeToken.approve(address(amm), tokensBought);

        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        uint256 quote = amm.quoteSell(0, tokensBought);
        uint256 collateralOut = amm.sell(0, tokensBought, quote * 99 / 100);
        vm.stopPrank();

        assertTrue(collateralOut > 0);
        assertEq(usdc.balanceOf(bob), bobUsdcBefore + collateralOut);
        assertEq(outcomeToken.balanceOf(bob), 0);
    }

    function test_BuyIncreasesPrice() public {
        uint256 priceBefore = amm.getPrice(0);

        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        amm.buy(0, 5000e6, 0);
        vm.stopPrank();

        uint256 priceAfter = amm.getPrice(0);
        assertTrue(priceAfter > priceBefore);
    }

    function test_SellDecreasesPrice() public {
        // First buy to get tokens
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        uint256 tokensBought = amm.buy(0, 5000e6, 0);

        uint256 priceBefore = amm.getPrice(0);

        // Now sell
        IERC20(market.getOutcomeToken(0)).approve(address(amm), tokensBought);
        amm.sell(0, tokensBought, 0);
        vm.stopPrank();

        uint256 priceAfter = amm.getPrice(0);
        assertTrue(priceAfter < priceBefore);
    }

    function test_PricesAlwaysSumToOne() public {
        // After various trades
        vm.startPrank(bob);
        usdc.approve(address(amm), 5000e6);
        amm.buy(0, 5000e6, 0);
        vm.stopPrank();

        uint256 price0 = amm.getPrice(0);
        uint256 price1 = amm.getPrice(1);

        // Sum should be approximately 1e18
        assertApproxEqRel(price0 + price1, 1e18, 0.05e18); // 5% tolerance
    }

    function test_AddLiquidity() public {
        uint256 addAmount = 5000e6;
        uint256 supplyBefore = amm.totalSupply();

        vm.startPrank(bob);
        usdc.approve(address(amm), addAmount);
        uint256 lpTokens = amm.addLiquidity(bob, addAmount);
        vm.stopPrank();

        assertTrue(lpTokens > 0);
        assertEq(amm.balanceOf(bob), lpTokens);

        // Total liquidity should increase
        assertEq(amm.totalSupply(), supplyBefore + lpTokens);
    }

    function test_RemoveLiquidity() public {
        uint256 lpTokens = amm.balanceOf(alice);
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        uint256 collateralOut = amm.removeLiquidity(lpTokens / 2);
        vm.stopPrank();

        assertTrue(collateralOut > 0);
        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + collateralOut);
        assertEq(amm.balanceOf(alice), lpTokens / 2);
    }

    function test_FeeCollected() public {
        uint256 buyAmount = 10_000e6;
        uint256 feeRecipientBalanceBefore = usdc.balanceOf(feeRecipient);

        vm.startPrank(bob);
        usdc.approve(address(amm), buyAmount);
        amm.buy(0, buyAmount, 0);
        vm.stopPrank();

        // Fee recipient should have received fees
        uint256 expectedFee = buyAmount * PROTOCOL_FEE_BPS / 10_000;
        assertEq(usdc.balanceOf(feeRecipient), feeRecipientBalanceBefore + expectedFee);
    }

    function test_RevertBuyAfterResolution() public {
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        vm.startPrank(bob);
        usdc.approve(address(amm), 1000e6);
        vm.expectRevert(OutcomeAMM.MarketResolved.selector);
        amm.buy(0, 1000e6, 0);
        vm.stopPrank();
    }

    function test_RevertSellAfterResolution() public {
        // Buy first
        vm.startPrank(bob);
        usdc.approve(address(amm), 1000e6);
        uint256 tokens = amm.buy(0, 1000e6, 0);
        vm.stopPrank();

        // Resolve
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        // Try to sell
        vm.startPrank(bob);
        IERC20(market.getOutcomeToken(0)).approve(address(amm), tokens);
        vm.expectRevert(OutcomeAMM.MarketResolved.selector);
        amm.sell(0, tokens, 0);
        vm.stopPrank();
    }

    function test_RevertSlippageExceeded() public {
        vm.startPrank(bob);
        usdc.approve(address(amm), 1000e6);

        // Request more tokens than possible
        vm.expectRevert(OutcomeAMM.SlippageExceeded.selector);
        amm.buy(0, 1000e6, type(uint256).max);
        vm.stopPrank();
    }

    function test_RevertInvalidOutcome() public {
        vm.startPrank(bob);
        usdc.approve(address(amm), 1000e6);

        vm.expectRevert(OutcomeAMM.InvalidOutcome.selector);
        amm.buy(99, 1000e6, 0);
        vm.stopPrank();
    }

    function test_BuyAndSellRoundTrip() public {
        uint256 buyAmount = 1000e6; // 1000 USDC

        vm.startPrank(bob);
        usdc.approve(address(amm), buyAmount);
        uint256 tokensBought = amm.buy(0, buyAmount, 0);

        assertTrue(tokensBought > 0, "Should receive tokens");

        IERC20(market.getOutcomeToken(0)).approve(address(amm), tokensBought);
        uint256 collateralOut = amm.sell(0, tokensBought, 0);
        vm.stopPrank();

        // Should get most back (accounting for ~2% total fees)
        assertTrue(collateralOut > buyAmount * 95 / 100, "Should recover most of input");
    }
}
