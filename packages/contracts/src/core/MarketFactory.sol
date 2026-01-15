// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMarketFactory} from "../interfaces/IMarketFactory.sol";
import {IMarket} from "../interfaces/IMarket.sol";
import {IOutcomeAMM} from "../interfaces/IOutcomeAMM.sol";
import {Market} from "./Market.sol";

/// @title MarketFactory
/// @notice Factory contract for creating prediction markets and their associated AMMs
/// @dev Uses minimal proxy pattern (EIP-1167) for gas-efficient deployments
contract MarketFactory is IMarketFactory, Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_FEE_BPS = 1000; // 10% maximum fee

    // Implementation contracts for cloning
    address public immutable override marketImpl;
    address public immutable override ammImpl;

    // Protocol configuration
    address public immutable override resolver;
    address public immutable override collateralToken;
    uint256 public override protocolFeeBps;
    address public override feeRecipient;

    // Registry of all created markets
    address[] public markets;
    mapping(address => bool) public isMarket;

    // Errors
    error InvalidOutcomeCount();
    error EndTimeInPast();
    error ZeroAddress();
    error FeeTooHigh();

    constructor(
        address _marketImpl,
        address _ammImpl,
        address _resolver,
        address _collateralToken,
        uint256 _protocolFeeBps,
        address _feeRecipient,
        address _owner
    ) Ownable(_owner) {
        if (_marketImpl == address(0)) revert ZeroAddress();
        if (_ammImpl == address(0)) revert ZeroAddress();
        if (_resolver == address(0)) revert ZeroAddress();
        if (_collateralToken == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_protocolFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        marketImpl = _marketImpl;
        ammImpl = _ammImpl;
        resolver = _resolver;
        collateralToken = _collateralToken;
        protocolFeeBps = _protocolFeeBps;
        feeRecipient = _feeRecipient;
    }

    /// @notice Create a new prediction market with an AMM
    /// @param question The question/description for the market
    /// @param outcomeNames Array of outcome names (2-8 outcomes)
    /// @param endTime Unix timestamp when trading ends
    /// @param initialLiquidity Amount of collateral to seed the AMM with
    /// @return market Address of the new market
    /// @return amm Address of the new AMM
    function createMarket(
        string calldata question,
        string[] calldata outcomeNames,
        uint256 endTime,
        uint256 initialLiquidity
    ) external override returns (address market, address amm) {
        if (outcomeNames.length < 2 || outcomeNames.length > 8) {
            revert InvalidOutcomeCount();
        }
        if (endTime <= block.timestamp) revert EndTimeInPast();

        // Deploy market and AMM via minimal proxy
        market = Clones.clone(marketImpl);
        amm = Clones.clone(ammImpl);

        // Initialize market
        IMarket(market).initialize({
            factory: address(this),
            resolver: resolver,
            _collateralToken: collateralToken,
            _question: question,
            outcomeNames: outcomeNames,
            _endTime: endTime,
            _amm: amm
        });

        // Initialize AMM
        IOutcomeAMM(amm).initialize({
            _market: market,
            _collateralToken: collateralToken,
            _protocolFeeBps: protocolFeeBps,
            _feeRecipient: feeRecipient
        });

        // Register market
        markets.push(market);
        isMarket[market] = true;

        // Seed initial liquidity if provided
        if (initialLiquidity > 0) {
            IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), initialLiquidity);
            IERC20(collateralToken).approve(amm, initialLiquidity);
            IOutcomeAMM(amm).addLiquidity(msg.sender, initialLiquidity);
        }

        emit MarketCreated(market, amm, question, endTime, uint8(outcomeNames.length));
    }

    /// @notice Update the protocol fee
    /// @param _protocolFeeBps New fee in basis points (max 1000 = 10%)
    function setProtocolFee(uint256 _protocolFeeBps) external onlyOwner {
        if (_protocolFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = _protocolFeeBps;
        emit ProtocolFeeUpdated(_protocolFeeBps);
    }

    /// @notice Update the fee recipient
    /// @param _feeRecipient New fee recipient address
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = _feeRecipient;
    }

    /// @notice Get total number of markets created
    function marketCount() external view returns (uint256) {
        return markets.length;
    }

    /// @notice Get a range of markets
    /// @param start Start index
    /// @param count Number of markets to return
    function getMarkets(uint256 start, uint256 count) external view returns (address[] memory) {
        uint256 end = start + count;
        if (end > markets.length) {
            end = markets.length;
        }

        address[] memory result = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = markets[i];
        }
        return result;
    }

    /// @notice Pause a specific market and its AMM (emergency only)
    /// @param market Address of the market to pause
    function pauseMarket(address market) external onlyOwner {
        if (!isMarket[market]) revert ZeroAddress();
        
        // Pause market
        Market(market).pause();
        
        // Pause AMM
        address amm = IMarket(market).amm();
        IOutcomeAMM(amm).pause();
    }

    /// @notice Unpause a specific market and its AMM
    /// @param market Address of the market to unpause
    function unpauseMarket(address market) external onlyOwner {
        if (!isMarket[market]) revert ZeroAddress();
        
        // Unpause market
        Market(market).unpause();
        
        // Unpause AMM
        address amm = IMarket(market).amm();
        IOutcomeAMM(amm).unpause();
    }
}
