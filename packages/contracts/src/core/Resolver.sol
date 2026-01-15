// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IResolver} from "../interfaces/IResolver.sol";
import {IMarket} from "../interfaces/IMarket.sol";

/// @title Resolver
/// @notice Centralized resolver for prediction markets
/// @dev Allows designated operators to resolve markets
contract Resolver is IResolver, Ownable {
    /// @notice Mapping of addresses that can resolve markets
    mapping(address => bool) public override operators;

    // Errors
    error NotOperator();
    error ArrayLengthMismatch();
    error ZeroAddress();

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    constructor(address _owner) Ownable(_owner) {
        operators[_owner] = true;
        emit OperatorSet(_owner, true);
    }

    /// @notice Set or remove an operator
    /// @param operator Address to update
    /// @param active Whether the address should be an operator
    function setOperator(address operator, bool active) external override onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        operators[operator] = active;
        emit OperatorSet(operator, active);
    }

    /// @notice Resolve a single market
    /// @param market Address of the market to resolve
    /// @param _winningOutcome Index of the winning outcome
    /// @param _invalid Whether to mark the market as invalid
    function resolve(
        address market,
        uint256 _winningOutcome,
        bool _invalid
    ) external override onlyOperator {
        IMarket(market).resolve(_winningOutcome, _invalid);
        emit MarketResolved(market, _winningOutcome, _invalid);
    }

    /// @notice Resolve multiple markets in a single transaction
    /// @param _markets Array of market addresses
    /// @param outcomes Array of winning outcome indices
    /// @param invalids Array of invalid flags
    function resolveBatch(
        address[] calldata _markets,
        uint256[] calldata outcomes,
        bool[] calldata invalids
    ) external override onlyOperator {
        if (_markets.length != outcomes.length || _markets.length != invalids.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < _markets.length; i++) {
            IMarket(_markets[i]).resolve(outcomes[i], invalids[i]);
            emit MarketResolved(_markets[i], outcomes[i], invalids[i]);
        }
    }
}
