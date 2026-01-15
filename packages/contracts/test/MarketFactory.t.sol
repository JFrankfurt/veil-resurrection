// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "./TestHelper.sol";
import {Market} from "../src/core/Market.sol";
import {MarketFactory} from "../src/core/MarketFactory.sol";
import {OutcomeAMM} from "../src/amm/OutcomeAMM.sol";

contract MarketFactoryTest is TestHelper {
    function test_FactoryInitialization() public view {
        assertEq(factory.marketImpl(), address(marketImpl));
        assertEq(factory.ammImpl(), address(ammImpl));
        assertEq(factory.resolver(), address(resolver));
        assertEq(factory.collateralToken(), address(usdc));
        assertEq(factory.protocolFeeBps(), PROTOCOL_FEE_BPS);
        assertEq(factory.feeRecipient(), feeRecipient);
    }

    function test_CreateYesNoMarket() public {
        uint256 endTime = block.timestamp + 1 days;

        (address market, address amm) = createYesNoMarket(
            "Test question?",
            endTime,
            10_000e6
        );

        assertTrue(market != address(0));
        assertTrue(amm != address(0));
        assertTrue(factory.isMarket(market));
        assertEq(factory.marketCount(), 1);

        Market m = Market(market);
        assertEq(m.question(), "Test question?");
        assertEq(m.endTime(), endTime);
        assertEq(m.numOutcomes(), 2);
        assertEq(m.amm(), amm);
    }

    function test_CreateMultiOutcomeMarket() public {
        string[] memory outcomes = new string[](4);
        outcomes[0] = "Red";
        outcomes[1] = "Blue";
        outcomes[2] = "Green";
        outcomes[3] = "Yellow";

        uint256 endTime = block.timestamp + 1 days;

        (address market,) = createMarket("Which color?", outcomes, endTime, 10_000e6);

        Market m = Market(market);
        assertEq(m.numOutcomes(), 4);
        assertEq(m.getOutcomeName(0), "Red");
        assertEq(m.getOutcomeName(1), "Blue");
        assertEq(m.getOutcomeName(2), "Green");
        assertEq(m.getOutcomeName(3), "Yellow");
    }

    function test_CreateMarketWithInitialLiquidity() public {
        uint256 initialLiquidity = 50_000e6;
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        (address market, address amm) = createYesNoMarket(
            "Test?",
            block.timestamp + 1 days,
            initialLiquidity
        );

        // Alice's balance should decrease
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore - initialLiquidity);

        // Alice should have LP tokens (minus MIN_LIQUIDITY burned for inflation protection)
        OutcomeAMM ammContract = OutcomeAMM(amm);
        assertEq(ammContract.balanceOf(alice), initialLiquidity - ammContract.MIN_LIQUIDITY());

        // Market should hold collateral
        assertEq(usdc.balanceOf(market), initialLiquidity);
    }

    function test_CreateMarketWithoutInitialLiquidity() public {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";

        vm.prank(alice);
        (address market, address amm) = factory.createMarket(
            "No liquidity test?",
            outcomes,
            block.timestamp + 1 days,
            0
        );

        assertTrue(market != address(0));
        assertEq(OutcomeAMM(amm).balanceOf(alice), 0);
    }

    function test_RevertInvalidOutcomeCount() public {
        string[] memory tooFew = new string[](1);
        tooFew[0] = "Only";

        string[] memory tooMany = new string[](9);
        for (uint256 i = 0; i < 9; i++) {
            tooMany[i] = "Outcome";
        }

        vm.startPrank(alice);

        vm.expectRevert(MarketFactory.InvalidOutcomeCount.selector);
        factory.createMarket("Test?", tooFew, block.timestamp + 1 days, 0);

        vm.expectRevert(MarketFactory.InvalidOutcomeCount.selector);
        factory.createMarket("Test?", tooMany, block.timestamp + 1 days, 0);

        vm.stopPrank();
    }

    function test_RevertEndTimeInPast() public {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";

        vm.prank(alice);
        vm.expectRevert(MarketFactory.EndTimeInPast.selector);
        factory.createMarket("Test?", outcomes, block.timestamp - 1, 0);
    }

    function test_GetMarkets() public {
        // Create 5 markets
        for (uint256 i = 0; i < 5; i++) {
            createYesNoMarket(
                string.concat("Question ", vm.toString(i)),
                block.timestamp + 1 days,
                1000e6
            );
        }

        assertEq(factory.marketCount(), 5);

        // Get all markets
        address[] memory allMarkets = factory.getMarkets(0, 10);
        assertEq(allMarkets.length, 5);

        // Get subset
        address[] memory subset = factory.getMarkets(1, 2);
        assertEq(subset.length, 2);
    }

    function test_SetProtocolFee() public {
        vm.prank(owner);
        factory.setProtocolFee(200); // 2%

        assertEq(factory.protocolFeeBps(), 200);
    }

    function test_SetFeeRecipient() public {
        address newRecipient = makeAddr("newRecipient");

        vm.prank(owner);
        factory.setFeeRecipient(newRecipient);

        assertEq(factory.feeRecipient(), newRecipient);
    }

    function test_RevertSetFeeRecipientZero() public {
        vm.prank(owner);
        vm.expectRevert(MarketFactory.ZeroAddress.selector);
        factory.setFeeRecipient(address(0));
    }

    function test_OnlyOwnerCanSetFees() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.setProtocolFee(500);

        vm.prank(alice);
        vm.expectRevert();
        factory.setFeeRecipient(alice);
    }

    function test_RevertFeeTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(MarketFactory.FeeTooHigh.selector);
        factory.setProtocolFee(1001); // MAX_FEE_BPS is 1000 (10%)
    }

    function test_SetMaxFee() public {
        vm.prank(owner);
        factory.setProtocolFee(1000); // Exactly at max
        assertEq(factory.protocolFeeBps(), 1000);
    }
}
