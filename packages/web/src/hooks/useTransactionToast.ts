/**
 * Hook for centralized transaction feedback via toasts
 *
 * Automatically shows toasts for pending, confirming, success, and error states.
 */

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getUserFriendlyMessage, isUserRejection } from "@/lib/errors";

interface UseTransactionToastOptions {
  /** Unique identifier for this toast (prevents duplicates) */
  id: string;
  /** Message shown when transaction is being submitted */
  pendingMessage: string;
  /** Message shown when transaction is being confirmed */
  confirmingMessage?: string;
  /** Message shown on success */
  successMessage: string;
  /** Transaction hash (when available) */
  hash?: `0x${string}`;
  /** Whether the write call is pending */
  isPending: boolean;
  /** Whether we're waiting for confirmation */
  isConfirming: boolean;
  /** Whether transaction succeeded */
  isSuccess: boolean;
  /** Error object (if any) */
  error?: Error | null;
  /** Callback when transaction succeeds */
  onSuccess?: () => void;
  /** Callback when transaction fails */
  onError?: (error: Error) => void;
}

/**
 * Hook that manages toast notifications for transaction lifecycle
 *
 * @example
 * ```tsx
 * const { writeContract, data: hash, isPending, error } = useWriteContract();
 * const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
 *
 * useTransactionToast({
 *   id: "buy-tokens",
 *   pendingMessage: "Submitting buy order...",
 *   successMessage: "Successfully bought tokens!",
 *   hash,
 *   isPending,
 *   isConfirming,
 *   isSuccess,
 *   error,
 *   onSuccess: () => refetchBalances(),
 * });
 * ```
 */
export function useTransactionToast({
  id,
  pendingMessage,
  confirmingMessage,
  successMessage,
  hash: _hash, // Reserved for future use (e.g., showing block explorer links)
  isPending,
  isConfirming,
  isSuccess,
  error,
  onSuccess,
  onError,
}: UseTransactionToastOptions): void {
  // Track previous states to detect transitions
  const prevState = useRef({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null as Error | null,
  });

  useEffect(() => {
    const prev = prevState.current;

    // Pending state: user initiated transaction, waiting for wallet
    if (isPending && !prev.isPending) {
      toast.loading(pendingMessage, { id });
    }

    // Confirming state: transaction submitted, waiting for block
    if (isConfirming && !prev.isConfirming) {
      const message = confirmingMessage || "Waiting for confirmation...";
      toast.loading(message, { id });
    }

    // Success state
    if (isSuccess && !prev.isSuccess) {
      toast.success(successMessage, { id });
      onSuccess?.();
    }

    // Error state
    if (error && error !== prev.error) {
      // Don't show toast for user rejections (they already know they cancelled)
      if (!isUserRejection(error)) {
        const message = getUserFriendlyMessage(error);
        toast.error(message, { id });
        onError?.(error);
      } else {
        // Just dismiss any loading toast for user rejections
        toast.dismiss(id);
      }
    }

    // Update previous state
    prevState.current = {
      isPending,
      isConfirming,
      isSuccess,
      error: error || null,
    };
  }, [
    id,
    pendingMessage,
    confirmingMessage,
    successMessage,
    isPending,
    isConfirming,
    isSuccess,
    error,
    onSuccess,
    onError,
  ]);

  // Cleanup on unmount - dismiss any lingering toasts
  useEffect(() => {
    return () => {
      // Only dismiss if still in a pending state
      if (prevState.current.isPending || prevState.current.isConfirming) {
        toast.dismiss(id);
      }
    };
  }, [id]);
}

/**
 * Simpler hook for one-off toast management
 * Useful when you just want to show a toast during an async operation
 */
export function useAsyncToast() {
  const showLoading = (message: string, id?: string) => {
    return toast.loading(message, { id });
  };

  const showSuccess = (message: string, id?: string) => {
    if (id) {
      toast.success(message, { id });
    } else {
      toast.success(message);
    }
  };

  const showError = (error: unknown, id?: string) => {
    const message = getUserFriendlyMessage(error);
    if (id) {
      toast.error(message, { id });
    } else {
      toast.error(message);
    }
  };

  const dismiss = (id: string) => {
    toast.dismiss(id);
  };

  return { showLoading, showSuccess, showError, dismiss };
}
