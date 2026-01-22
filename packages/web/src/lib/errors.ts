/**
 * Error parsing utilities for contract interactions
 *
 * Decodes Solidity custom errors and maps them to user-friendly messages.
 */

import { BaseError, ContractFunctionRevertedError } from "viem";

/**
 * Known contract error signatures and their user-friendly messages
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  // Router errors
  DeadlineExpired: "Transaction expired. Please try again.",
  InvalidMarket: "This market is invalid or doesn't exist.",
  SlippageExceeded:
    "Price moved too much. Try increasing slippage tolerance or reducing trade size.",
  ZeroAmount: "Amount must be greater than zero.",

  // OutcomeAMM errors
  AlreadyInitialized: "This pool has already been set up.",
  InsufficientLPTokens: "You don't have enough LP tokens.",
  MarketResolved: "This market has already been resolved. Trading is closed.",
  InvalidOutcome: "Invalid outcome selected.",
  InsufficientLiquidity:
    "Not enough liquidity in the pool for this trade. Try a smaller amount.",
  OnlyFactory: "This action can only be performed by the factory contract.",

  // ERC20 errors
  InsufficientBalance: "You don't have enough tokens for this transaction.",
  InsufficientAllowance:
    "Please approve the contract to spend your tokens first.",
  ERC20InsufficientBalance: "You don't have enough tokens for this transaction.",
  ERC20InsufficientAllowance:
    "Please approve the contract to spend your tokens first.",
};

/**
 * Common wallet/RPC error patterns
 */
const WALLET_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /user rejected|user denied|rejected the request/i,
    message: "Transaction cancelled.",
  },
  {
    pattern: /insufficient funds/i,
    message: "Insufficient funds to pay for gas.",
  },
  {
    pattern: /nonce too low/i,
    message: "Transaction nonce error. Please refresh and try again.",
  },
  {
    pattern: /replacement transaction underpriced/i,
    message: "Gas price too low. Please try again with higher gas.",
  },
  {
    pattern: /transaction underpriced/i,
    message: "Gas price too low. Please try again with higher gas.",
  },
  {
    pattern: /network|connection|timeout/i,
    message: "Network error. Please check your connection and try again.",
  },
  {
    pattern: /execution reverted/i,
    message: "Transaction failed. The contract rejected the operation.",
  },
];

/**
 * Parse a contract error and extract the error name
 */
export function parseContractError(error: unknown): string | null {
  if (!error) return null;

  // Handle viem's ContractFunctionRevertedError
  if (error instanceof BaseError) {
    const revertError = error.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName) {
        return errorName;
      }
    }
  }

  // Try to extract error name from message
  const errorMessage = getErrorMessage(error);

  // Look for custom error patterns like "Error: DeadlineExpired()" or "reverted with custom error 'SlippageExceeded()'"
  const customErrorMatch = errorMessage.match(
    /(?:Error:|custom error)[:\s]*['"]?(\w+)(?:\(\))?['"]?/i
  );
  if (customErrorMatch) {
    return customErrorMatch[1];
  }

  // Look for revert reason strings
  const revertMatch = errorMessage.match(
    /reverted with reason string ['"]([^'"]+)['"]/i
  );
  if (revertMatch) {
    return revertMatch[1];
  }

  return null;
}

/**
 * Get a user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (!error) return "An unknown error occurred.";

  // First try to parse as a known contract error
  const contractErrorName = parseContractError(error);
  if (contractErrorName && CONTRACT_ERROR_MESSAGES[contractErrorName]) {
    return CONTRACT_ERROR_MESSAGES[contractErrorName];
  }

  // Get the raw error message
  const errorMessage = getErrorMessage(error);

  // Check against wallet/RPC error patterns
  for (const { pattern, message } of WALLET_ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // If it's a known contract error name that we missed in the map
  if (contractErrorName) {
    // Convert PascalCase to sentence
    const readable = contractErrorName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
    return `Transaction failed: ${readable}.`;
  }

  // Fallback: clean up the error message
  if (errorMessage.length > 100) {
    // Truncate very long errors
    return "Transaction failed. Please try again.";
  }

  return errorMessage || "An unexpected error occurred. Please try again.";
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // For viem errors, try to get the short message first
    if ("shortMessage" in error && typeof error.shortMessage === "string") {
      return error.shortMessage;
    }
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error);
}

/**
 * Check if an error is a user rejection (wallet cancel)
 */
export function isUserRejection(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /user rejected|user denied|rejected the request/i.test(message);
}

/**
 * Check if an error is a slippage error
 */
export function isSlippageError(error: unknown): boolean {
  const errorName = parseContractError(error);
  return errorName === "SlippageExceeded";
}

/**
 * Check if an error is due to insufficient balance
 */
export function isInsufficientBalanceError(error: unknown): boolean {
  const errorName = parseContractError(error);
  const message = getErrorMessage(error);

  return (
    errorName === "InsufficientBalance" ||
    errorName === "ERC20InsufficientBalance" ||
    /insufficient balance/i.test(message)
  );
}
