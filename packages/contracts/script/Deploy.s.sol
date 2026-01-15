// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Market} from "../src/core/Market.sol";
import {MarketFactory} from "../src/core/MarketFactory.sol";
import {Resolver} from "../src/core/Resolver.sol";
import {OutcomeAMM} from "../src/amm/OutcomeAMM.sol";
import {Router} from "../src/amm/Router.sol";

/// @title Deploy
/// @notice Deployment script for Predictions v2 on Base Sepolia
contract Deploy is Script {
    // Base Sepolia USDC address
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Protocol fee: 1% = 100 basis points
    uint256 constant PROTOCOL_FEE_BPS = 100;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Deploying to Base Sepolia");
        console.log("USDC address:", USDC);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation contracts
        console.log("\n--- Deploying Implementation Contracts ---");
        
        Market marketImpl = new Market();
        console.log("Market implementation:", address(marketImpl));
        
        OutcomeAMM ammImpl = new OutcomeAMM();
        console.log("OutcomeAMM implementation:", address(ammImpl));

        // 2. Deploy Resolver
        console.log("\n--- Deploying Resolver ---");
        
        Resolver resolver = new Resolver(deployer);
        console.log("Resolver:", address(resolver));

        // 3. Deploy MarketFactory
        console.log("\n--- Deploying MarketFactory ---");
        
        MarketFactory factory = new MarketFactory(
            address(marketImpl),
            address(ammImpl),
            address(resolver),
            USDC,
            PROTOCOL_FEE_BPS,
            deployer, // Fee recipient
            deployer  // Owner
        );
        console.log("MarketFactory:", address(factory));

        // 4. Deploy Router
        console.log("\n--- Deploying Router ---");
        
        Router router = new Router(address(factory));
        console.log("Router:", address(router));

        vm.stopBroadcast();

        // Output summary
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network: Base Sepolia (Chain ID: 84532)");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("Contracts:");
        console.log("  Market (impl):", address(marketImpl));
        console.log("  OutcomeAMM (impl):", address(ammImpl));
        console.log("  Resolver:", address(resolver));
        console.log("  MarketFactory:", address(factory));
        console.log("  Router:", address(router));
        console.log("");
        console.log("Configuration:");
        console.log("  Collateral (USDC):", USDC);
        console.log("  Protocol Fee:", PROTOCOL_FEE_BPS, "bps (1%)");
        console.log("  Fee Recipient:", deployer);
        console.log("========================================");
    }
}
