// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IMarket} from "../interfaces/IMarket.sol";
import {OutcomeToken} from "./OutcomeToken.sol";

/// @title Market
/// @notice Prediction market contract that holds collateral and manages outcome tokens
/// @dev Each market has 2-8 outcomes, each represented by an ERC-20 token
contract Market is IMarket, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 private constant MIN_OUTCOMES = 2;
    uint256 private constant MAX_OUTCOMES = 8;

    // Immutable references (set in initialize)
    address public factory;
    address public resolver;
    IERC20 public override collateralToken;
    address public override amm;

    // Market parameters
    string public override question;
    uint256 public override endTime;
    OutcomeToken[] internal outcomeTokens;
    string[] internal outcomeNames;

    // Resolution state
    bool public override resolved;
    uint256 public override winningOutcome;
    bool public override invalid;

    // Errors
    error AlreadyInitialized();
    error InvalidOutcomeCount();
    error EndTimeInPast();
    error OnlyResolver();
    error OnlyFactory();
    error MarketNotEnded();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error InvalidOutcome();
    error NothingToClaim();

    modifier onlyResolver() {
        if (msg.sender != resolver) revert OnlyResolver();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    /// @notice Initialize the market (called by factory)
    function initialize(
        address _factory,
        address _resolver,
        address _collateralToken,
        string calldata _question,
        string[] calldata _outcomeNames,
        uint256 _endTime,
        address _amm
    ) external override {
        if (factory != address(0)) revert AlreadyInitialized();
        if (_outcomeNames.length < MIN_OUTCOMES || _outcomeNames.length > MAX_OUTCOMES) {
            revert InvalidOutcomeCount();
        }
        if (_endTime <= block.timestamp) revert EndTimeInPast();

        factory = _factory;
        resolver = _resolver;
        collateralToken = IERC20(_collateralToken);
        question = _question;
        endTime = _endTime;
        amm = _amm;

        // Deploy outcome tokens
        for (uint256 i = 0; i < _outcomeNames.length; i++) {
            outcomeNames.push(_outcomeNames[i]);
            outcomeTokens.push(
                new OutcomeToken(
                    string.concat("Outcome: ", _outcomeNames[i]),
                    string.concat("OUT-", _toString(i)),
                    address(this),
                    i
                )
            );
        }
    }

    /// @notice Pause the market (emergency only)
    /// @dev Only callable by the factory
    function pause() external onlyFactory {
        _pause();
    }

    /// @notice Unpause the market
    /// @dev Only callable by the factory
    function unpause() external onlyFactory {
        _unpause();
    }

    /// @notice Mint one of each outcome token by depositing collateral
    /// @param to Address to mint tokens to
    /// @param amount Amount of complete sets to mint
    function mintCompleteSets(address to, uint256 amount) external override nonReentrant whenNotPaused {
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 len = outcomeTokens.length;
        for (uint256 i = 0; i < len; i++) {
            outcomeTokens[i].mint(to, amount);
        }

        emit CompleteSetsIssued(to, amount);
    }

    /// @notice Burn one of each outcome token to redeem collateral
    /// @param amount Amount of complete sets to redeem
    function redeemCompleteSets(uint256 amount) external override nonReentrant whenNotPaused {
        uint256 len = outcomeTokens.length;
        for (uint256 i = 0; i < len; i++) {
            outcomeTokens[i].burn(msg.sender, amount);
        }

        collateralToken.safeTransfer(msg.sender, amount);

        emit CompleteSetsRedeemed(msg.sender, amount);
    }

    /// @notice Resolve the market with a winning outcome
    /// @dev Only callable by the resolver after market end time
    /// @param _winningOutcome Index of the winning outcome
    /// @param _invalid Whether the market should be marked invalid
    function resolve(uint256 _winningOutcome, bool _invalid) external override onlyResolver {
        if (block.timestamp < endTime) revert MarketNotEnded();
        if (resolved) revert MarketAlreadyResolved();
        if (!_invalid && _winningOutcome >= outcomeTokens.length) revert InvalidOutcome();

        resolved = true;
        invalid = _invalid;
        winningOutcome = _winningOutcome;

        emit MarketResolved(_winningOutcome, _invalid);
    }

    /// @notice Claim winnings after market resolution
    /// @dev Claiming is allowed even when paused (users should always be able to exit)
    /// @return payout Amount of collateral claimed
    function claimWinnings() external override nonReentrant returns (uint256 payout) {
        if (!resolved) revert MarketNotResolved();

        uint256 len = outcomeTokens.length;

        if (invalid) {
            // Invalid market: refund proportionally based on all tokens held
            uint256 total;
            for (uint256 i = 0; i < len; i++) {
                uint256 balance = outcomeTokens[i].balanceOf(msg.sender);
                if (balance > 0) {
                    total += balance;
                    outcomeTokens[i].burn(msg.sender, balance);
                }
            }
            payout = total / len;
        } else {
            // Normal resolution: pay out winning tokens 1:1
            OutcomeToken winner = outcomeTokens[winningOutcome];
            payout = winner.balanceOf(msg.sender);
            if (payout > 0) {
                winner.burn(msg.sender, payout);
            }
        }

        if (payout == 0) revert NothingToClaim();

        collateralToken.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, winningOutcome, payout);
    }

    /// @notice Get the number of outcomes in this market
    function numOutcomes() external view override returns (uint256) {
        return outcomeTokens.length;
    }

    /// @notice Get the address of an outcome token
    /// @param index Index of the outcome
    function getOutcomeToken(uint256 index) external view override returns (address) {
        return address(outcomeTokens[index]);
    }

    /// @notice Get the name of an outcome
    /// @param index Index of the outcome
    function getOutcomeName(uint256 index) external view override returns (string memory) {
        return outcomeNames[index];
    }

    /// @dev Convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
