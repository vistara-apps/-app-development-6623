import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount, useWalletClient } from 'wagmi';
import { Token, PriceQuote, Trade, APIError, SlippageExceededError } from '../types';
import { DexAggregatorService } from '../services/DexAggregatorService';
import { BaseRPCService } from '../services/BaseRPCService';
import { BitqueryService } from '../services/BitqueryService';
import { TradeExecutionService } from '../services/TradeExecutionService';
import { STABLECOIN_ADDRESSES } from '../config/api';

// Create service instances
const bitqueryService = new BitqueryService();
const baseRPCService = new BaseRPCService();
const aggregatorService = new DexAggregatorService(bitqueryService, baseRPCService);
const tradeExecutionService = new TradeExecutionService(baseRPCService, aggregatorService);

export interface UseTradeExecutionOptions {
  onSuccess?: (trade: Trade) => void;
  onError?: (error: Error) => void;
}

export interface TradeExecutionState {
  isExecuting: boolean;
  currentStep: 'idle' | 'validating' | 'approving' | 'swapping' | 'confirming' | 'completed' | 'failed';
  progress: number;
  txHash?: string;
  error?: Error;
  trade?: Trade;
}

export const useTradeExecution = (options: UseTradeExecutionOptions = {}) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [executionState, setExecutionState] = useState<TradeExecutionState>({
    isExecuting: false,
    currentStep: 'idle',
    progress: 0
  });

  // Set wallet client when available
  if (walletClient) {
    baseRPCService.setWalletClient(walletClient);
  }

  const executeTradeMutation = useMutation({
    mutationFn: async ({
      quote,
      slippageTolerance = 0.5
    }: {
      quote: PriceQuote;
      slippageTolerance?: number;
    }) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setExecutionState({
        isExecuting: true,
        currentStep: 'validating',
        progress: 10
      });

      try {
        // Step 1: Validate trade
        const validation = await tradeExecutionService.validateTrade(
          quote.route.path[0],
          quote.route.path[1],
          quote.inputAmount,
          address
        );

        if (!validation.valid) {
          throw new Error(validation.error || 'Trade validation failed');
        }

        setExecutionState(prev => ({
          ...prev,
          currentStep: 'approving',
          progress: 30
        }));

        // Step 2: Execute trade
        const trade = await tradeExecutionService.executeTrade(
          quote,
          address,
          slippageTolerance
        );

        setExecutionState(prev => ({
          ...prev,
          currentStep: 'swapping',
          progress: 60,
          txHash: trade.txHash
        }));

        // Step 3: Wait for confirmation
        if (trade.txHash) {
          await baseRPCService.waitForTransaction(trade.txHash);
        }

        setExecutionState(prev => ({
          ...prev,
          currentStep: 'completed',
          progress: 100,
          trade
        }));

        options.onSuccess?.(trade);
        return trade;

      } catch (error) {
        setExecutionState(prev => ({
          ...prev,
          currentStep: 'failed',
          error: error as Error
        }));

        options.onError?.(error as Error);
        throw error;
      }
    },
    onSettled: () => {
      // Reset state after 5 seconds
      setTimeout(() => {
        setExecutionState({
          isExecuting: false,
          currentStep: 'idle',
          progress: 0
        });
      }, 5000);
    }
  });

  const executeTrade = useCallback((quote: PriceQuote, slippageTolerance?: number) => {
    return executeTradeMutation.mutate({ quote, slippageTolerance });
  }, [executeTradeMutation]);

  const resetExecution = useCallback(() => {
    setExecutionState({
      isExecuting: false,
      currentStep: 'idle',
      progress: 0
    });
  }, []);

  return {
    executeTrade,
    resetExecution,
    executionState,
    isExecuting: executionState.isExecuting,
    currentStep: executionState.currentStep,
    progress: executionState.progress,
    txHash: executionState.txHash,
    error: executionState.error,
    trade: executionState.trade
  };
};

export interface UsePriceQuoteOptions {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  enabled?: boolean;
}

export const usePriceQuote = ({
  tokenIn,
  tokenOut,
  amountIn,
  enabled = true
}: UsePriceQuoteOptions) => {
  return useQuery({
    queryKey: ['priceQuote', tokenIn.address, tokenOut.address, amountIn],
    queryFn: async () => {
      console.log(`[usePriceQuote] Getting quote for ${amountIn} ${tokenIn.symbol} -> ${tokenOut.symbol}`);
      return await aggregatorService.getBestPrice(tokenIn, tokenOut, amountIn);
    },
    enabled: enabled && !!tokenIn && !!tokenOut && !!amountIn && parseFloat(amountIn) > 0,
    staleTime: 5000, // 5 seconds
    gcTime: 30000, // 30 seconds
    retry: 2,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

export interface UseAllPriceQuotesOptions {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  enabled?: boolean;
}

export const useAllPriceQuotes = ({
  tokenIn,
  tokenOut,
  amountIn,
  enabled = true
}: UseAllPriceQuotesOptions) => {
  return useQuery({
    queryKey: ['allPriceQuotes', tokenIn.address, tokenOut.address, amountIn],
    queryFn: async () => {
      console.log(`[useAllPriceQuotes] Getting all quotes for ${amountIn} ${tokenIn.symbol} -> ${tokenOut.symbol}`);
      return await aggregatorService.getAllPrices(tokenIn, tokenOut, amountIn);
    },
    enabled: enabled && !!tokenIn && !!tokenOut && !!amountIn && parseFloat(amountIn) > 0,
    staleTime: 5000, // 5 seconds
    gcTime: 30000, // 30 seconds
    retry: 2,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

export interface UseTokenBalanceOptions {
  tokenAddress: string;
  walletAddress?: string;
  enabled?: boolean;
}

export const useTokenBalance = ({
  tokenAddress,
  walletAddress,
  enabled = true
}: UseTokenBalanceOptions) => {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  return useQuery({
    queryKey: ['tokenBalance', tokenAddress, effectiveAddress],
    queryFn: async () => {
      if (!effectiveAddress) {
        throw new Error('No wallet address provided');
      }
      console.log(`[useTokenBalance] Getting balance for ${tokenAddress}`);
      return await baseRPCService.getTokenBalance(tokenAddress, effectiveAddress);
    },
    enabled: enabled && !!tokenAddress && !!effectiveAddress,
    staleTime: 10000, // 10 seconds
    gcTime: 60000, // 1 minute
    retry: 2,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export interface UseTokenAllowanceOptions {
  tokenAddress: string;
  spenderAddress: string;
  ownerAddress?: string;
  enabled?: boolean;
}

export const useTokenAllowance = ({
  tokenAddress,
  spenderAddress,
  ownerAddress,
  enabled = true
}: UseTokenAllowanceOptions) => {
  const { address } = useAccount();
  const effectiveOwner = ownerAddress || address;

  return useQuery({
    queryKey: ['tokenAllowance', tokenAddress, effectiveOwner, spenderAddress],
    queryFn: async () => {
      if (!effectiveOwner) {
        throw new Error('No owner address provided');
      }
      console.log(`[useTokenAllowance] Getting allowance for ${tokenAddress}`);
      return await baseRPCService.getAllowance(tokenAddress, effectiveOwner, spenderAddress);
    },
    enabled: enabled && !!tokenAddress && !!spenderAddress && !!effectiveOwner,
    staleTime: 15000, // 15 seconds
    gcTime: 60000, // 1 minute
    retry: 2,
  });
};

// Hook for gas estimation
export const useGasEstimation = () => {
  const estimateGasMutation = useMutation({
    mutationFn: async (transaction: any) => {
      console.log('[useGasEstimation] Estimating gas for transaction');
      return await baseRPCService.estimateGas(transaction);
    }
  });

  return {
    estimateGas: estimateGasMutation.mutate,
    gasEstimate: estimateGasMutation.data,
    isEstimating: estimateGasMutation.isPending,
    error: estimateGasMutation.error
  };
};

// Hook for trade validation
export const useTradeValidation = () => {
  const [validationResults, setValidationResults] = useState<{
    [key: string]: {
      valid: boolean;
      error?: string;
      timestamp: Date;
    };
  }>({});

  const validateTradeMutation = useMutation({
    mutationFn: async ({
      tokenIn,
      tokenOut,
      amountIn,
      walletAddress
    }: {
      tokenIn: Token;
      tokenOut: Token;
      amountIn: string;
      walletAddress: string;
    }) => {
      console.log(`[useTradeValidation] Validating trade: ${amountIn} ${tokenIn.symbol} -> ${tokenOut.symbol}`);
      const result = await tradeExecutionService.validateTrade(tokenIn, tokenOut, amountIn, walletAddress);
      
      const key = `${tokenIn.address}-${tokenOut.address}-${amountIn}-${walletAddress}`;
      setValidationResults(prev => ({
        ...prev,
        [key]: {
          ...result,
          timestamp: new Date()
        }
      }));

      return result;
    }
  });

  return {
    validateTrade: validateTradeMutation.mutate,
    validationResults,
    isValidating: validateTradeMutation.isPending,
    error: validateTradeMutation.error
  };
};

// Hook for monitoring trade status
export const useTradeMonitor = (txHash?: string) => {
  const [tradeStatus, setTradeStatus] = useState<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    gasUsed?: string;
    effectiveGasPrice?: string;
  } | null>(null);

  const { data: receipt } = useQuery({
    queryKey: ['transactionReceipt', txHash],
    queryFn: async () => {
      if (!txHash) return null;
      console.log(`[useTradeMonitor] Monitoring transaction ${txHash}`);
      return await baseRPCService.waitForTransaction(txHash);
    },
    enabled: !!txHash,
    retry: 3,
    retryDelay: 2000,
  });

  useState(() => {
    if (receipt) {
      setTradeStatus({
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        confirmations: receipt.blockNumber ? 1 : 0, // Simplified
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      });
    }
  }, [receipt]);

  return {
    tradeStatus,
    receipt,
    isMonitoring: !!txHash && !receipt
  };
};

// Utility hook for stablecoin tokens
export const useStablecoinTokens = () => {
  const tokens: Token[] = [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: STABLECOIN_ADDRESSES.USDC,
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png'
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: STABLECOIN_ADDRESSES.USDT,
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png'
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: STABLECOIN_ADDRESSES.DAI,
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png'
    },
    {
      symbol: 'FRAX',
      name: 'Frax',
      address: STABLECOIN_ADDRESSES.FRAX,
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/13422/thumb/frax_logo.png'
    }
  ];

  return { tokens };
};
