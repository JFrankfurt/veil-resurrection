// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "./TestHelper.sol";
import {Market} from "../src/core/Market.sol";
import {OutcomeToken} from "../src/core/OutcomeToken.sol";
import {IMarket} from "../src/interfaces/IMarket.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketTest is TestHelper {
    Market public market;
    address public amm;
    uint256 public endTime;

    function setUp() public override {
        super.setUp();
        endTime = block.timestamp + 1 days;
        (address marketAddr, address ammAddr) = createYesNoMarket(
            "Will ETH hit $10k in 2025?",
            endTime,
            10_000e6 // 10k USDC initial liquidity
        );
        market = Market(marketAddr);
        amm = ammAddr;
    }

    function test_MarketInitialization() public view {
        assertEq(market.question(), "Will ETH hit $10k in 2025?");
        assertEq(market.endTime(), endTime);
        assertEq(market.numOutcomes(), 2);
        assertFalse(market.resolved());
        assertFalse(market.invalid());
        assertEq(address(market.collateralToken()), address(usdc));
        assertEq(market.amm(), amm);
    }

    function test_OutcomeTokensCreated() public view {
        address yesToken = market.getOutcomeToken(0);
        address noToken = market.getOutcomeToken(1);

        assertTrue(yesToken != address(0));
        assertTrue(noToken != address(0));
        assertTrue(yesToken != noToken);

        assertEq(market.getOutcomeName(0), "Yes");
        assertEq(market.getOutcomeName(1), "No");
    }

    function test_MintCompleteSets() public {
        uint256 amount = 1000e6;

        vm.startPrank(bob);
        usdc.approve(address(market), amount);
        market.mintCompleteSets(bob, amount);
        vm.stopPrank();

        // Bob should have equal amount of each outcome token
        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), amount);
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(bob), amount);

        // Market should hold the collateral
        assertEq(usdc.balanceOf(address(market)), 10_000e6 + amount);
    }

    function test_RedeemCompleteSets() public {
        uint256 amount = 1000e6;

        // First mint
        vm.startPrank(bob);
        usdc.approve(address(market), amount);
        market.mintCompleteSets(bob, amount);

        uint256 bobBalanceBefore = usdc.balanceOf(bob);

        // Then redeem
        market.redeemCompleteSets(amount);
        vm.stopPrank();

        // Bob should have no outcome tokens
        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), 0);
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(bob), 0);

        // Bob should have his collateral back
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + amount);
    }

    function test_Resolve() public {
        // Fast forward past end time
        vm.warp(endTime + 1);

        vm.prank(operator);
        resolver.resolve(address(market), 0, false); // Yes wins

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 0);
        assertFalse(market.invalid());
    }

    function test_ResolveInvalid() public {
        vm.warp(endTime + 1);

        vm.prank(operator);
        resolver.resolve(address(market), 0, true); // Market invalid

        assertTrue(market.resolved());
        assertTrue(market.invalid());
    }

    function test_RevertResolveBeforeEndTime() public {
        vm.prank(operator);
        vm.expectRevert(Market.MarketNotEnded.selector);
        resolver.resolve(address(market), 0, false);
    }

    function test_RevertResolveNotOperator() public {
        vm.warp(endTime + 1);

        vm.prank(bob);
        vm.expectRevert();
        resolver.resolve(address(market), 0, false);
    }

    function test_RevertDoubleResolve() public {
        vm.warp(endTime + 1);

        vm.startPrank(operator);
        resolver.resolve(address(market), 0, false);

        vm.expectRevert(Market.MarketAlreadyResolved.selector);
        resolver.resolve(address(market), 1, false);
        vm.stopPrank();
    }

    function test_ClaimWinnings() public {
        uint256 amount = 1000e6;

        // Bob mints complete sets
        vm.startPrank(bob);
        usdc.approve(address(market), amount);
        market.mintCompleteSets(bob, amount);
        vm.stopPrank();

        // Resolve market - Yes wins
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        // Bob claims winnings
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        uint256 payout = market.claimWinnings();

        assertEq(payout, amount);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + amount);

        // Bob's Yes tokens should be burned
        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), 0);
        // Bob still has No tokens (worthless)
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(bob), amount);
    }

    function test_ClaimWinningsInvalidMarket() public {
        uint256 amount = 1000e6;

        // Bob mints complete sets
        vm.startPrank(bob);
        usdc.approve(address(market), amount);
        market.mintCompleteSets(bob, amount);
        vm.stopPrank();

        // Resolve market as invalid
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, true);

        // Bob claims - should get proportional refund
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        uint256 payout = market.claimWinnings();

        // With 2 outcomes and equal holdings, payout = 2 * amount / 2 = amount
        assertEq(payout, amount);
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + amount);
    }

    function test_RevertClaimNotResolved() public {
        vm.prank(bob);
        vm.expectRevert(Market.MarketNotResolved.selector);
        market.claimWinnings();
    }

    function test_RevertClaimNothingToClaim() public {
        vm.warp(endTime + 1);
        vm.prank(operator);
        resolver.resolve(address(market), 0, false);

        // Carol has no tokens
        vm.prank(carol);
        vm.expectRevert(Market.NothingToClaim.selector);
        market.claimWinnings();
    }

    function testFuzz_MintAndRedeem(uint256 amount) public {
        amount = bound(amount, 1e6, 100_000e6);

        vm.startPrank(bob);
        usdc.approve(address(market), amount);
        market.mintCompleteSets(bob, amount);

        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), amount);
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(bob), amount);

        uint256 balanceBefore = usdc.balanceOf(bob);
        market.redeemCompleteSets(amount);
        vm.stopPrank();

        assertEq(IERC20(market.getOutcomeToken(0)).balanceOf(bob), 0);
        assertEq(IERC20(market.getOutcomeToken(1)).balanceOf(bob), 0);
        assertEq(usdc.balanceOf(bob), balanceBefore + amount);
    }
}
