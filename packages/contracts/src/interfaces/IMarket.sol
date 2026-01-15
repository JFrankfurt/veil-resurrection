// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMarket {
    // Events
    event CompleteSetsIssued(address indexed to, uint256 amount);
    event CompleteSetsRedeemed(address indexed from, uint256 amount);
    event WinningsClaimed(address indexed user, uint256 outcome, uint256 amount);
    event MarketResolved(uint256 winningOutcome, bool invalid);

    // View functions
    function question() external view returns (string memory);
    function endTime() external view returns (uint256);
    function resolved() external view returns (bool);
    function invalid() external view returns (bool);
    function winningOutcome() external view returns (uint256);
    function collateralToken() external view returns (IERC20);
    function amm() external view returns (address);
    function numOutcomes() external view returns (uint256);
    function getOutcomeToken(uint256 index) external view returns (address);
    function getOutcomeName(uint256 index) external view returns (string memory);

    // State-changing functions
    function initialize(
        address factory,
        address resolver,
        address _collateralToken,
        string calldata _question,
        string[] calldata outcomeNames,
        uint256 _endTime,
        address _amm
    ) external;

    function mintCompleteSets(address to, uint256 amount) external;
    function redeemCompleteSets(uint256 amount) external;
    function resolve(uint256 _winningOutcome, bool _invalid) external;
    function claimWinnings() external returns (uint256 payout);
}
