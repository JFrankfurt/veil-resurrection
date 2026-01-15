// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IOutcomeToken} from "../interfaces/IOutcomeToken.sol";

/// @title OutcomeToken
/// @notice ERC-20 token representing a specific outcome in a prediction market
/// @dev Only the parent Market contract can mint/burn tokens
contract OutcomeToken is ERC20, IOutcomeToken {
    address public immutable override market;
    uint256 public immutable override outcomeIndex;

    error OnlyMarket();

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _market,
        uint256 _outcomeIndex
    ) ERC20(_name, _symbol) {
        market = _market;
        outcomeIndex = _outcomeIndex;
    }

    /// @notice Mint tokens to an address
    /// @dev Only callable by the Market contract
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external override onlyMarket {
        _mint(to, amount);
    }

    /// @notice Burn tokens from an address
    /// @dev Only callable by the Market contract
    /// @param from Address to burn tokens from
    /// @param amount Amount of tokens to burn
    function burn(address from, uint256 amount) external override onlyMarket {
        _burn(from, amount);
    }
}
