// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketFactory {
    event MarketCreated(
        address indexed market,
        address indexed amm,
        string question,
        uint256 endTime,
        uint8 numOutcomes
    );

    event ProtocolFeeUpdated(uint256 newFeeBps);

    function marketImpl() external view returns (address);
    function ammImpl() external view returns (address);
    function resolver() external view returns (address);
    function collateralToken() external view returns (address);
    function protocolFeeBps() external view returns (uint256);
    function feeRecipient() external view returns (address);

    function createMarket(
        string calldata question,
        string[] calldata outcomeNames,
        uint256 endTime,
        uint256 initialLiquidity
    ) external returns (address market, address amm);

    function isMarket(address market) external view returns (bool);
    function marketCount() external view returns (uint256);
    function getMarkets(uint256 start, uint256 count) external view returns (address[] memory);
}
