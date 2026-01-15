// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IResolver {
    event OperatorSet(address indexed operator, bool active);
    event MarketResolved(address indexed market, uint256 outcome, bool invalid);

    function operators(address operator) external view returns (bool);
    function setOperator(address operator, bool active) external;
    function resolve(address market, uint256 winningOutcome, bool invalid) external;
    function resolveBatch(
        address[] calldata markets,
        uint256[] calldata outcomes,
        bool[] calldata invalids
    ) external;
}
