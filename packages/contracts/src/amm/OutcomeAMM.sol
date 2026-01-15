// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IOutcomeAMM} from "../interfaces/IOutcomeAMM.sol";
import {IMarket} from "../interfaces/IMarket.sol";
import {IOutcomeToken} from "../interfaces/IOutcomeToken.sol";
import {IMarketFactory} from "../interfaces/IMarketFactory.sol";

/// @title OutcomeAMM
/// @notice Automated Market Maker for prediction market outcome tokens
/// @dev Uses a CPMM-style mechanism adapted for n outcomes with overflow-safe math
contract OutcomeAMM is ERC20, IOutcomeAMM, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    uint256 public constant SCALE = 1e18;
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_LIQUIDITY = 1000; // Minimum 1000 units to prevent inflation attack

    // State
    address public override market;
    address public factory;
    IERC20 public collateralToken;
    uint256 public protocolFeeBps;
    address public feeRecipient;

    // Reserves of each outcome token
    uint256[] public reserves;

    // Errors
    error AlreadyInitialized();
    error ZeroAmount();
    error InsufficientLPTokens();
    error SlippageExceeded();
    error MarketResolved();
    error InvalidOutcome();
    error InsufficientLiquidity();
    error OnlyFactory();

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    constructor() ERC20("Prediction AMM LP", "PLP") {}

    /// @notice Initialize the AMM (called by factory)
    function initialize(
        address _market,
        address _collateralToken,
        uint256 _protocolFeeBps,
        address _feeRecipient
    ) external override {
        if (market != address(0)) revert AlreadyInitialized();

        market = _market;
        factory = msg.sender; // Factory is the caller
        collateralToken = IERC20(_collateralToken);
        protocolFeeBps = _protocolFeeBps;
        feeRecipient = _feeRecipient;

        // Initialize reserves array
        uint256 numOutcomes = IMarket(_market).numOutcomes();
        for (uint256 i = 0; i < numOutcomes; i++) {
            reserves.push(0);
        }
    }

    /// @notice Pause the AMM (emergency only)
    /// @dev Only callable by the factory
    function pause() external onlyFactory {
        _pause();
    }

    /// @notice Unpause the AMM
    /// @dev Only callable by the factory
    function unpause() external onlyFactory {
        _unpause();
    }

    /// @notice Add liquidity to the AMM by depositing collateral
    /// @param provider Address to receive LP tokens
    /// @param collateralAmount Amount of collateral to deposit
    /// @return lpTokens Amount of LP tokens minted
    function addLiquidity(
        address provider,
        uint256 collateralAmount
    ) external override nonReentrant whenNotPaused returns (uint256 lpTokens) {
        if (collateralAmount == 0) revert ZeroAmount();

        // Transfer collateral and mint complete sets
        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);
        collateralToken.approve(market, collateralAmount);
        IMarket(market).mintCompleteSets(address(this), collateralAmount);

        uint256 numOutcomes = IMarket(market).numOutcomes();

        if (totalSupply() == 0) {
            // First liquidity provider - require minimum liquidity to prevent inflation attack
            if (collateralAmount < MIN_LIQUIDITY) revert InsufficientLiquidity();
            
            // Add equal amounts to all reserves
            for (uint256 i = 0; i < numOutcomes; i++) {
                reserves[i] = collateralAmount;
            }
            
            // Burn MIN_LIQUIDITY LP tokens to dead address to prevent inflation attack
            lpTokens = collateralAmount - MIN_LIQUIDITY;
            _mint(address(0xdead), MIN_LIQUIDITY);
        } else {
            // Calculate LP tokens based on smallest reserve (limits manipulation)
            uint256 minReserve = reserves[0];
            for (uint256 i = 1; i < numOutcomes; i++) {
                if (reserves[i] < minReserve) {
                    minReserve = reserves[i];
                }
            }

            // Use mulDiv for safe calculation
            lpTokens = collateralAmount.mulDiv(totalSupply(), minReserve);

            // Add to all reserves
            for (uint256 i = 0; i < numOutcomes; i++) {
                reserves[i] += collateralAmount;
            }
        }

        _mint(provider, lpTokens);
        emit LiquidityAdded(provider, collateralAmount, lpTokens);
    }

    /// @notice Remove liquidity by burning LP tokens
    /// @param lpTokens Amount of LP tokens to burn
    /// @return collateralOut Amount of collateral returned
    function removeLiquidity(
        uint256 lpTokens
    ) external override nonReentrant returns (uint256 collateralOut) {
        if (lpTokens == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < lpTokens) revert InsufficientLPTokens();

        uint256 share = lpTokens.mulDiv(SCALE, totalSupply());
        uint256 numOutcomes = IMarket(market).numOutcomes();

        // Find minimum tokens that can be withdrawn as complete sets
        uint256 minTokens = type(uint256).max;
        for (uint256 i = 0; i < numOutcomes; i++) {
            uint256 tokensToRemove = reserves[i].mulDiv(share, SCALE);
            if (tokensToRemove < minTokens) {
                minTokens = tokensToRemove;
            }
        }

        // Remove from reserves
        for (uint256 i = 0; i < numOutcomes; i++) {
            reserves[i] -= minTokens;
        }

        _burn(msg.sender, lpTokens);

        // Redeem complete sets for collateral
        IMarket(market).redeemCompleteSets(minTokens);
        collateralToken.safeTransfer(msg.sender, minTokens);

        collateralOut = minTokens;
        emit LiquidityRemoved(msg.sender, lpTokens, collateralOut);
    }

    /// @notice Buy outcome tokens with collateral
    /// @param outcome Index of the outcome to buy
    /// @param collateralAmount Amount of collateral to spend
    /// @param minTokensOut Minimum tokens to receive (slippage protection)
    /// @return tokensOut Amount of outcome tokens received
    function buy(
        uint256 outcome,
        uint256 collateralAmount,
        uint256 minTokensOut
    ) external override nonReentrant whenNotPaused returns (uint256 tokensOut) {
        if (IMarket(market).resolved()) revert MarketResolved();
        if (outcome >= reserves.length) revert InvalidOutcome();
        if (collateralAmount == 0) revert ZeroAmount();

        // Apply protocol fee
        uint256 fee = collateralAmount.mulDiv(protocolFeeBps, BPS);
        uint256 netAmount = collateralAmount - fee;

        // Transfer collateral
        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);
        if (fee > 0) {
            collateralToken.safeTransfer(feeRecipient, fee);
        }

        // Mint complete sets
        collateralToken.approve(market, netAmount);
        IMarket(market).mintCompleteSets(address(this), netAmount);

        // Calculate output using overflow-safe CPMM formula
        tokensOut = _calculateBuyOutputSafe(outcome, netAmount);

        if (tokensOut < minTokensOut) revert SlippageExceeded();

        // Update reserves - add to non-target outcomes
        uint256 numOutcomes = reserves.length;
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (i != outcome) {
                reserves[i] += netAmount;
            }
        }
        // Target outcome reserve stays same (we're removing from complete sets)

        // Transfer outcome tokens to buyer
        IERC20(IMarket(market).getOutcomeToken(outcome)).safeTransfer(msg.sender, tokensOut);

        emit Buy(msg.sender, outcome, collateralAmount, tokensOut);
    }

    /// @notice Sell outcome tokens for collateral
    /// @param outcome Index of the outcome to sell
    /// @param tokenAmount Amount of outcome tokens to sell
    /// @param minCollateralOut Minimum collateral to receive (slippage protection)
    /// @return collateralOut Amount of collateral received
    function sell(
        uint256 outcome,
        uint256 tokenAmount,
        uint256 minCollateralOut
    ) external override nonReentrant whenNotPaused returns (uint256 collateralOut) {
        if (IMarket(market).resolved()) revert MarketResolved();
        if (outcome >= reserves.length) revert InvalidOutcome();
        if (tokenAmount == 0) revert ZeroAmount();

        // Transfer outcome tokens from seller
        IERC20(IMarket(market).getOutcomeToken(outcome)).safeTransferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );

        // Calculate how many complete sets we can redeem
        uint256 numOutcomes = reserves.length;

        // After adding tokens, what's the minimum reserve across all outcomes?
        uint256 newTargetReserve = reserves[outcome] + tokenAmount;

        // Find minimum non-target reserve
        uint256 minOtherReserve = type(uint256).max;
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (i != outcome && reserves[i] < minOtherReserve) {
                minOtherReserve = reserves[i];
            }
        }

        // Using CPMM-style pricing with safe math
        collateralOut = tokenAmount.mulDiv(minOtherReserve, newTargetReserve);

        // Apply protocol fee
        uint256 fee = collateralOut.mulDiv(protocolFeeBps, BPS);
        uint256 grossOut = collateralOut;
        collateralOut -= fee;

        if (collateralOut < minCollateralOut) revert SlippageExceeded();

        // Update reserves
        reserves[outcome] = newTargetReserve - grossOut;
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (i != outcome) {
                reserves[i] -= grossOut;
            }
        }

        // Redeem complete sets
        IMarket(market).redeemCompleteSets(grossOut);

        // Transfer collateral to seller
        if (fee > 0) {
            collateralToken.safeTransfer(feeRecipient, fee);
        }
        collateralToken.safeTransfer(msg.sender, collateralOut);

        emit Sell(msg.sender, outcome, tokenAmount, collateralOut);
    }

    /// @notice Get the current price of an outcome (0 to SCALE)
    /// @param outcome Index of the outcome
    /// @return price Price in 18 decimal fixed point (0 to 1e18)
    function getPrice(uint256 outcome) external view override returns (uint256 price) {
        uint256 numOutcomes = reserves.length;
        if (numOutcomes == 0) {
            return SCALE / 2; // Default for uninitialized
        }

        // Check if any reserve is zero
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (reserves[i] == 0) {
                return SCALE / numOutcomes; // Return equal prices if not initialized
            }
        }

        // For CPMM, price is inversely proportional to reserve:
        // Price_i = (1/reserve_i) / sum(1/reserve_j for all j)
        //
        // To compute this safely with fixed-point math:
        // 1. Calculate sum of (SCALE / reserve_j) for all j
        // 2. Price_i = (SCALE / reserve_i) * SCALE / sum
        
        uint256 invSum = 0;
        for (uint256 i = 0; i < numOutcomes; i++) {
            // invSum += SCALE / reserves[i]
            invSum += SCALE.mulDiv(SCALE, reserves[i]);
        }

        if (invSum == 0) {
            return SCALE / numOutcomes;
        }

        // price = (SCALE / reserves[outcome]) * SCALE / invSum
        uint256 invReserve = SCALE.mulDiv(SCALE, reserves[outcome]);
        price = invReserve.mulDiv(SCALE, invSum);
        
        // Clamp to valid range [0, SCALE]
        if (price > SCALE) price = SCALE;
    }

    /// @notice Get the reserve of an outcome
    function getReserve(uint256 outcome) external view override returns (uint256) {
        return reserves[outcome];
    }

    /// @notice Quote the output of a buy order
    function quoteBuy(
        uint256 outcome,
        uint256 collateralAmount
    ) external view override returns (uint256) {
        uint256 fee = collateralAmount.mulDiv(protocolFeeBps, BPS);
        uint256 netAmount = collateralAmount - fee;
        return _calculateBuyOutputSafe(outcome, netAmount);
    }

    /// @notice Quote the output of a sell order
    function quoteSell(
        uint256 outcome,
        uint256 tokenAmount
    ) external view override returns (uint256) {
        uint256 numOutcomes = reserves.length;
        uint256 newTargetReserve = reserves[outcome] + tokenAmount;

        uint256 minOtherReserve = type(uint256).max;
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (i != outcome && reserves[i] < minOtherReserve) {
                minOtherReserve = reserves[i];
            }
        }

        uint256 grossOut = tokenAmount.mulDiv(minOtherReserve, newTargetReserve);
        uint256 fee = grossOut.mulDiv(protocolFeeBps, BPS);
        return grossOut - fee;
    }

    /// @dev Calculate buy output using overflow-safe iterative ratio calculation
    /// @notice Uses the CPMM invariant: product(reserves) = constant
    /// Instead of computing product directly (overflow risk), we compute ratios iteratively
    function _calculateBuyOutputSafe(
        uint256 outcome,
        uint256 netAmount
    ) internal view returns (uint256 tokensOut) {
        uint256 numOutcomes = reserves.length;
        
        // Special case: if any reserve is 0, return netAmount (first trade after liquidity)
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (reserves[i] == 0) {
                return netAmount;
            }
        }

        // Calculate the ratio: newTargetReserve / oldTargetReserve = product(oldReserve_i / newReserve_i) for i != outcome
        // This is equivalent to: ratio = product(reserve_i / (reserve_i + netAmount)) for i != outcome
        // 
        // We compute this iteratively in fixed-point to avoid overflow:
        // ratio = SCALE
        // for each i != outcome:
        //     ratio = ratio * reserve_i / (reserve_i + netAmount)
        
        uint256 ratio = SCALE;
        for (uint256 i = 0; i < numOutcomes; i++) {
            if (i != outcome) {
                // ratio = ratio * reserves[i] / (reserves[i] + netAmount)
                // Use mulDiv for safe calculation
                ratio = ratio.mulDiv(reserves[i], reserves[i] + netAmount);
            }
        }

        // newTargetReserve = reserves[outcome] * ratio / SCALE
        uint256 newTargetReserve = reserves[outcome].mulDiv(ratio, SCALE);

        // tokensOut = reserves[outcome] + netAmount - newTargetReserve
        // We get netAmount tokens from minting complete sets, and keep newTargetReserve in the pool
        tokensOut = reserves[outcome] + netAmount - newTargetReserve;
    }
}
