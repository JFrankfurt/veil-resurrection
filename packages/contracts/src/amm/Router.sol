// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOutcomeAMM} from "../interfaces/IOutcomeAMM.sol";
import {IMarket} from "../interfaces/IMarket.sol";
import {IMarketFactory} from "../interfaces/IMarketFactory.sol";

/// @title Router
/// @notice User-facing entry point for prediction market interactions
/// @dev Provides a clean interface with deadline and slippage protection
contract Router is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IMarketFactory public immutable factory;
    IERC20 public immutable collateralToken;

    // Errors
    error DeadlineExpired();
    error InvalidMarket();
    error SlippageExceeded();
    error ZeroAmount();

    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _;
    }

    constructor(address _factory) {
        factory = IMarketFactory(_factory);
        collateralToken = IERC20(factory.collateralToken());
    }

    /// @notice Buy outcome tokens from a market's AMM
    /// @param market Address of the market
    /// @param outcome Index of outcome to buy
    /// @param collateralAmount Amount of collateral to spend
    /// @param minTokensOut Minimum tokens to receive
    /// @param deadline Transaction deadline
    /// @return tokensOut Amount of tokens received
    function buy(
        address market,
        uint256 outcome,
        uint256 collateralAmount,
        uint256 minTokensOut,
        uint256 deadline
    ) external nonReentrant checkDeadline(deadline) returns (uint256 tokensOut) {
        if (!factory.isMarket(market)) revert InvalidMarket();
        if (collateralAmount == 0) revert ZeroAmount();

        address amm = IMarket(market).amm();

        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);
        collateralToken.approve(amm, collateralAmount);

        // Execute buy
        tokensOut = IOutcomeAMM(amm).buy(outcome, collateralAmount, minTokensOut);

        // Transfer outcome tokens to user
        IERC20(IMarket(market).getOutcomeToken(outcome)).safeTransfer(msg.sender, tokensOut);
    }

    /// @notice Sell outcome tokens to a market's AMM
    /// @param market Address of the market
    /// @param outcome Index of outcome to sell
    /// @param tokenAmount Amount of outcome tokens to sell
    /// @param minCollateralOut Minimum collateral to receive
    /// @param deadline Transaction deadline
    /// @return collateralOut Amount of collateral received
    function sell(
        address market,
        uint256 outcome,
        uint256 tokenAmount,
        uint256 minCollateralOut,
        uint256 deadline
    ) external nonReentrant checkDeadline(deadline) returns (uint256 collateralOut) {
        if (!factory.isMarket(market)) revert InvalidMarket();
        if (tokenAmount == 0) revert ZeroAmount();

        address amm = IMarket(market).amm();
        address outcomeToken = IMarket(market).getOutcomeToken(outcome);

        // Transfer outcome tokens from user
        IERC20(outcomeToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(outcomeToken).approve(amm, tokenAmount);

        // Execute sell
        collateralOut = IOutcomeAMM(amm).sell(outcome, tokenAmount, minCollateralOut);

        // Transfer collateral to user
        collateralToken.safeTransfer(msg.sender, collateralOut);
    }

    /// @notice Add liquidity to a market's AMM
    /// @param market Address of the market
    /// @param collateralAmount Amount of collateral to deposit
    /// @param minLpTokens Minimum LP tokens to receive
    /// @param deadline Transaction deadline
    /// @return lpTokens Amount of LP tokens received
    function addLiquidity(
        address market,
        uint256 collateralAmount,
        uint256 minLpTokens,
        uint256 deadline
    ) external nonReentrant checkDeadline(deadline) returns (uint256 lpTokens) {
        if (!factory.isMarket(market)) revert InvalidMarket();
        if (collateralAmount == 0) revert ZeroAmount();

        address amm = IMarket(market).amm();

        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);
        collateralToken.approve(amm, collateralAmount);

        // Add liquidity
        lpTokens = IOutcomeAMM(amm).addLiquidity(msg.sender, collateralAmount);

        if (lpTokens < minLpTokens) revert SlippageExceeded();
    }

    /// @notice Remove liquidity from a market's AMM
    /// @param market Address of the market
    /// @param lpTokens Amount of LP tokens to burn
    /// @param minCollateralOut Minimum collateral to receive
    /// @param deadline Transaction deadline
    /// @return collateralOut Amount of collateral received
    function removeLiquidity(
        address market,
        uint256 lpTokens,
        uint256 minCollateralOut,
        uint256 deadline
    ) external nonReentrant checkDeadline(deadline) returns (uint256 collateralOut) {
        if (!factory.isMarket(market)) revert InvalidMarket();
        if (lpTokens == 0) revert ZeroAmount();

        address amm = IMarket(market).amm();

        // Transfer LP tokens from user
        IERC20(amm).safeTransferFrom(msg.sender, address(this), lpTokens);

        // Remove liquidity
        collateralOut = IOutcomeAMM(amm).removeLiquidity(lpTokens);

        if (collateralOut < minCollateralOut) revert SlippageExceeded();

        // Transfer collateral to user
        collateralToken.safeTransfer(msg.sender, collateralOut);
    }

    /// @notice Claim winnings from a resolved market
    /// @param market Address of the market
    /// @return payout Amount of collateral received
    function claimWinnings(address market) external nonReentrant returns (uint256 payout) {
        if (!factory.isMarket(market)) revert InvalidMarket();

        // Claim winnings directly (user already holds outcome tokens)
        payout = IMarket(market).claimWinnings();

        // Collateral is transferred directly to user by the market
    }

    /// @notice Get quotes for buy and sell operations
    /// @param market Address of the market
    /// @param outcome Index of outcome
    /// @param amount Amount for quote
    /// @return buyQuote Amount of tokens received for buying
    /// @return sellQuote Amount of collateral received for selling
    function getQuotes(
        address market,
        uint256 outcome,
        uint256 amount
    ) external view returns (uint256 buyQuote, uint256 sellQuote) {
        address amm = IMarket(market).amm();
        buyQuote = IOutcomeAMM(amm).quoteBuy(outcome, amount);
        sellQuote = IOutcomeAMM(amm).quoteSell(outcome, amount);
    }

    /// @notice Get current prices for all outcomes in a market
    /// @param market Address of the market
    /// @return prices Array of prices (18 decimals, 0-1e18)
    function getPrices(address market) external view returns (uint256[] memory prices) {
        uint256 numOutcomes = IMarket(market).numOutcomes();
        address amm = IMarket(market).amm();

        prices = new uint256[](numOutcomes);
        for (uint256 i = 0; i < numOutcomes; i++) {
            prices[i] = IOutcomeAMM(amm).getPrice(i);
        }
    }
}
