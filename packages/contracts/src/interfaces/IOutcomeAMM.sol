// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOutcomeAMM {
    // Events
    event LiquidityAdded(address indexed provider, uint256 collateralAmount, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 lpTokens, uint256 collateralAmount);
    event Buy(address indexed user, uint256 outcome, uint256 collateralIn, uint256 tokensOut);
    event Sell(address indexed user, uint256 outcome, uint256 tokensIn, uint256 collateralOut);

    // View functions
    function market() external view returns (address);
    function getPrice(uint256 outcome) external view returns (uint256);
    function getReserve(uint256 outcome) external view returns (uint256);
    function quoteBuy(uint256 outcome, uint256 collateralAmount) external view returns (uint256);
    function quoteSell(uint256 outcome, uint256 tokenAmount) external view returns (uint256);

    // State-changing functions
    function initialize(
        address _market,
        address _collateralToken,
        uint256 _protocolFeeBps,
        address _feeRecipient
    ) external;

    function addLiquidity(address provider, uint256 collateralAmount) external returns (uint256);
    function removeLiquidity(uint256 lpTokens) external returns (uint256);
    function buy(
        uint256 outcome,
        uint256 collateralAmount,
        uint256 minTokensOut
    ) external returns (uint256);
    function sell(
        uint256 outcome,
        uint256 tokenAmount,
        uint256 minCollateralOut
    ) external returns (uint256);

    // Emergency functions
    function pause() external;
    function unpause() external;
}
