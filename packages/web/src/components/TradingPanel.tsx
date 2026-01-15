import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits, type Address, maxUint256 } from "viem";
import { useContracts } from "@/hooks/useContracts";
import toast from "react-hot-toast";

interface Outcome {
  name: string;
  price: bigint;
  token?: Address;
}

interface TradingPanelProps {
  marketAddress: string;
  ammAddress: string;
  outcomes: Outcome[];
  resolved: boolean;
}

// Router ABI with deadline
const ROUTER_ABI = [
  {
    name: "buy",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "outcome", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "sell",
    type: "function",
    inputs: [
      { name: "market", type: "address" },
      { name: "outcome", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
      { name: "minCollateralOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const AMM_ABI = [
  {
    name: "quoteBuy",
    type: "function",
    inputs: [
      { name: "outcome", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "quoteSell",
    type: "function",
    inputs: [
      { name: "outcome", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const SLIPPAGE_BPS = 500; // 5% default slippage

export function TradingPanel({
  marketAddress,
  ammAddress,
  outcomes,
  resolved,
}: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const contracts = useContracts();
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);

  const parsedAmount = amount ? parseUnits(amount, isBuying ? 6 : 18) : BigInt(0);

  // Check USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.usdc as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address || "0x0", contracts.router as Address],
    query: { enabled: !!address && !!contracts.router },
  });

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address },
  });

  // Check outcome token balance (for selling)
  const { data: tokenBalance } = useReadContract({
    address: outcomes[selectedOutcome]?.token || "0x0",
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address || "0x0"],
    query: { enabled: !!address && !!outcomes[selectedOutcome]?.token && !isBuying },
  });

  // Get quote
  const { data: quote } = useReadContract({
    address: ammAddress as Address,
    abi: AMM_ABI,
    functionName: isBuying ? "quoteBuy" : "quoteSell",
    args: [BigInt(selectedOutcome), parsedAmount],
    query: { enabled: parsedAmount > BigInt(0) },
  });

  // Write contract for approval
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Write contract for buy
  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: isBuyPending,
    reset: resetBuy,
  } = useWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  // Write contract for sell
  const {
    writeContract: writeSell,
    data: sellHash,
    isPending: isSellPending,
    reset: resetSell,
  } = useWriteContract();

  const { isLoading: isSellConfirming, isSuccess: isSellSuccess } =
    useWaitForTransactionReceipt({ hash: sellHash });

  // Calculate needs approval
  const needsApproval = isBuying && usdcAllowance !== undefined && parsedAmount > usdcAllowance;

  // Show success toast and reset form on success
  useEffect(() => {
    if (isBuySuccess) {
      toast.success(`Successfully bought ${outcomes[selectedOutcome].name} tokens!`);
      setAmount("");
      refetchAllowance();
      resetBuy();
    }
  }, [isBuySuccess, selectedOutcome, outcomes, refetchAllowance, resetBuy]);

  useEffect(() => {
    if (isSellSuccess) {
      toast.success(`Successfully sold ${outcomes[selectedOutcome].name} tokens!`);
      setAmount("");
      refetchAllowance();
      resetSell();
    }
  }, [isSellSuccess, selectedOutcome, outcomes, refetchAllowance, resetSell]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("USDC approved! You can now trade.");
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  const handleApprove = () => {
    toast.loading("Approving USDC...", { id: "approve" });
    writeApprove({
      address: contracts.usdc as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contracts.router as Address, maxUint256],
    });
  };

  const handleTrade = () => {
    if (!amount || !isConnected || !quote) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
    const minOut = (quote * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000);

    toast.loading(isBuying ? "Buying..." : "Selling...", { id: "trade" });

    if (isBuying) {
      writeBuy({
        address: contracts.router as Address,
        abi: ROUTER_ABI,
        functionName: "buy",
        args: [marketAddress as Address, BigInt(selectedOutcome), parsedAmount, minOut, deadline],
      });
    } else {
      writeSell({
        address: contracts.router as Address,
        abi: ROUTER_ABI,
        functionName: "sell",
        args: [marketAddress as Address, BigInt(selectedOutcome), parsedAmount, minOut, deadline],
      });
    }
  };

  // Dismiss loading toasts on success/error
  useEffect(() => {
    if (isApproveConfirming) toast.loading("Confirming approval...", { id: "approve" });
    if (isApproveSuccess) toast.dismiss("approve");
  }, [isApproveConfirming, isApproveSuccess]);

  useEffect(() => {
    if (isBuyConfirming || isSellConfirming) toast.loading("Confirming...", { id: "trade" });
    if (isBuySuccess || isSellSuccess) toast.dismiss("trade");
  }, [isBuyConfirming, isSellConfirming, isBuySuccess, isSellSuccess]);

  const isLoading =
    isApprovePending ||
    isApproveConfirming ||
    isBuyPending ||
    isBuyConfirming ||
    isSellPending ||
    isSellConfirming;

  if (resolved) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--success-light))] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[rgb(var(--success))]">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[rgb(var(--text-primary))]">Market Resolved</h3>
            <p className="text-sm text-[rgb(var(--text-muted))]">Check your portfolio for winnings</p>
          </div>
        </div>
        <button
          disabled={!isConnected}
          className="w-full btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnected ? "Claim Winnings" : "Connect Wallet to Claim"}
        </button>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 space-y-5">
      {/* Buy/Sell Toggle */}
      <div className="flex gap-1.5 p-1.5 rounded-xl bg-[rgb(var(--bg-elevated))]">
        <button
          onClick={() => setIsBuying(true)}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
            isBuying
              ? "bg-[rgb(var(--success))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setIsBuying(false)}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
            !isBuying
              ? "bg-[rgb(var(--accent-primary))] text-white shadow-md"
              : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))]"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[rgb(var(--text-muted))]">
          Outcome
        </label>
        <div className="space-y-2">
          {outcomes.map((outcome, i) => {
            const isSelected = selectedOutcome === i;
            const pricePercent = Number(formatUnits(outcome.price, 16));

            return (
              <button
                key={i}
                onClick={() => setSelectedOutcome(i)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  isSelected
                    ? "border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-light))]"
                    : "border-[rgb(var(--border-subtle))] hover:border-[rgb(var(--border-prominent))] bg-[rgb(var(--bg-card))]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? "border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary))]"
                        : "border-[rgb(var(--border-prominent))]"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-medium text-[rgb(var(--text-primary))]">{outcome.name}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isSelected ? "text-[rgb(var(--accent-primary))]" : "text-[rgb(var(--text-primary))]"
                    }`}
                  >
                    {pricePercent.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-[rgb(var(--text-muted))]">
            {isBuying ? "You pay" : "You sell"}
          </label>
          {isConnected && (
            <span className="text-xs text-[rgb(var(--text-muted))]">
              Balance:{" "}
              {isBuying
                ? `${formatUnits(usdcBalance || BigInt(0), 6)} USDC`
                : `${formatUnits(tokenBalance || BigInt(0), 18)} tokens`}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input text-xl font-mono pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-[rgb(var(--text-muted))] text-sm font-medium">
              {isBuying ? "USDC" : "tokens"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2">
        {(isBuying ? [10, 25, 50, 100] : [25, 50, 75, 100]).map((val) => (
          <button
            key={val}
            onClick={() => {
              if (isBuying) {
                setAmount(val.toString());
              } else if (tokenBalance) {
                const percentage = BigInt(val);
                const tokenVal = (tokenBalance * percentage) / BigInt(100);
                setAmount(formatUnits(tokenVal, 18));
              }
            }}
            className="flex-1 py-2.5 rounded-lg bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--bg-muted))] text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors border border-transparent hover:border-[rgb(var(--border-subtle))]"
          >
            {isBuying ? `$${val}` : `${val}%`}
          </button>
        ))}
      </div>

      {/* Estimated Output */}
      {amount && Number(amount) > 0 && (
        <div className="p-4 rounded-xl bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border-subtle))] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">
              {isBuying ? "You receive (est.)" : "You get (est.)"}
            </span>
            <span className="font-mono font-semibold text-[rgb(var(--accent-primary))]">
              {quote
                ? formatUnits(quote, isBuying ? 18 : 6)
                : "..."}{" "}
              {isBuying ? outcomes[selectedOutcome].name : "USDC"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">Protocol fee</span>
            <span className="font-mono text-[rgb(var(--text-secondary))]">1%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgb(var(--text-muted))]">Max slippage</span>
            <span className="font-mono text-[rgb(var(--warning))]">{SLIPPAGE_BPS / 100}%</span>
          </div>
        </div>
      )}

      {/* Trade Button */}
      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading}
          className="w-full py-4 rounded-xl font-semibold transition-all bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isApprovePending || isApproveConfirming
            ? "Approving..."
            : "Approve USDC"}
        </button>
      ) : (
        <button
          onClick={handleTrade}
          disabled={!isConnected || !amount || isLoading || !quote}
          className={`w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${
            isBuying
              ? "bg-[rgb(var(--success))] hover:brightness-105 text-white"
              : "bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white"
          }`}
        >
          {!isConnected
            ? "Connect Wallet"
            : isLoading
            ? "Confirming..."
            : isBuying
            ? `Buy ${outcomes[selectedOutcome].name}`
            : `Sell ${outcomes[selectedOutcome].name}`}
        </button>
      )}

    </div>
  );
}
