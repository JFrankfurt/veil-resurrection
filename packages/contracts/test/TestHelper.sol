// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Market} from "../src/core/Market.sol";
import {OutcomeToken} from "../src/core/OutcomeToken.sol";
import {MarketFactory} from "../src/core/MarketFactory.sol";
import {Resolver} from "../src/core/Resolver.sol";
import {OutcomeAMM} from "../src/amm/OutcomeAMM.sol";
import {Router} from "../src/amm/Router.sol";

/// @title TestHelper
/// @notice Base test contract with common setup
abstract contract TestHelper is Test {
    // Contracts
    MockERC20 public usdc;
    Market public marketImpl;
    OutcomeAMM public ammImpl;
    Resolver public resolver;
    MarketFactory public factory;
    Router public router;

    // Test accounts
    address public owner = makeAddr("owner");
    address public operator = makeAddr("operator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public feeRecipient = makeAddr("feeRecipient");

    // Constants
    uint256 public constant INITIAL_BALANCE = 1_000_000e6; // 1M USDC
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1%

    function setUp() public virtual {
        vm.startPrank(owner);

        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy implementation contracts
        marketImpl = new Market();
        ammImpl = new OutcomeAMM();

        // Deploy resolver
        resolver = new Resolver(owner);
        resolver.setOperator(operator, true);

        // Deploy factory
        factory = new MarketFactory(
            address(marketImpl),
            address(ammImpl),
            address(resolver),
            address(usdc),
            PROTOCOL_FEE_BPS,
            feeRecipient,
            owner
        );

        // Deploy router
        router = new Router(address(factory));

        vm.stopPrank();

        // Mint tokens to test accounts
        usdc.mint(alice, INITIAL_BALANCE);
        usdc.mint(bob, INITIAL_BALANCE);
        usdc.mint(carol, INITIAL_BALANCE);
        usdc.mint(owner, INITIAL_BALANCE);
    }

    /// @notice Helper to create a simple yes/no market
    function createYesNoMarket(
        string memory question,
        uint256 endTime,
        uint256 initialLiquidity
    ) internal returns (address market, address amm) {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";

        return createMarket(question, outcomes, endTime, initialLiquidity);
    }

    /// @notice Helper to create a market with custom outcomes
    function createMarket(
        string memory question,
        string[] memory outcomes,
        uint256 endTime,
        uint256 initialLiquidity
    ) internal returns (address market, address amm) {
        vm.startPrank(alice);
        usdc.approve(address(factory), initialLiquidity);
        (market, amm) = factory.createMarket(question, outcomes, endTime, initialLiquidity);
        vm.stopPrank();
    }

    /// @notice Helper to get all prices for a market
    function getPrices(address amm, uint256 numOutcomes) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](numOutcomes);
        for (uint256 i = 0; i < numOutcomes; i++) {
            prices[i] = OutcomeAMM(amm).getPrice(i);
        }
        return prices;
    }
}
