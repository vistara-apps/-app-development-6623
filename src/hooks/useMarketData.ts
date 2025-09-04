import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { MarketData, Token, APIError } from '../types';
import { BitqueryService } from '../services/BitqueryService';
import { config } from '../config/api';

// Create service instance
const bitqueryService = new BitqueryService();

export interface UseMarketDataOptions {
  tokenA: string;
  tokenB: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseMarketDataReturn {
  data: MarketData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

export const useMarketData = ({
  tokenA,
  tokenB,
  enabled = true,
  refetchInterval = config.refreshInterval
}: UseMarketDataOptions): UseMarketDataReturn => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: queryRefetch
  } = useQuery({
    queryKey: ['marketData', tokenA, tokenB],
    queryFn: async () => {
      try {
        console.log(`[useMarketData] Fetching market data for ${tokenA}/${tokenB}`);
        const marketData = await bitqueryService.getMarketData(tokenA, tokenB);
        setLastUpdated(new Date());
        return marketData;
      } catch (error) {
        console.error('[useMarketData] Failed to fetch market data:', error);
        throw error;
      }
    },
    enabled: enabled && !!tokenA && !!tokenB,
    refetchInterval,
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 30000, // Keep in cache for 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on API key errors
      if (error instanceof APIError && error.statusCode === 401) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refetch = () => {
    queryRefetch();
  };

  // Prefetch related data
  useEffect(() => {
    if (data && data.length > 0) {
      // Prefetch historical data for the same pair
      queryClient.prefetchQuery({
        queryKey: ['historicalData', tokenA, tokenB, '24h'],
        queryFn: () => bitqueryService.getHistoricalData(tokenA, tokenB, '24h'),
        staleTime: 60000, // 1 minute
      });
    }
  }, [data, tokenA, tokenB, queryClient]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    lastUpdated
  };
};

export interface UseHistoricalDataOptions {
  tokenA: string;
  tokenB: string;
  timeframe: '24h' | '7d' | '30d';
  enabled?: boolean;
}

export const useHistoricalData = ({
  tokenA,
  tokenB,
  timeframe,
  enabled = true
}: UseHistoricalDataOptions) => {
  return useQuery({
    queryKey: ['historicalData', tokenA, tokenB, timeframe],
    queryFn: async () => {
      console.log(`[useHistoricalData] Fetching historical data for ${tokenA}/${tokenB} (${timeframe})`);
      return await bitqueryService.getHistoricalData(tokenA, tokenB, timeframe);
    },
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 60000, // 1 minute for historical data
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 2,
  });
};

export interface UseDexInfoReturn {
  data: any[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useDexInfo = (): UseDexInfoReturn => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['dexInfo'],
    queryFn: async () => {
      console.log('[useDexInfo] Fetching DEX information');
      return await bitqueryService.getDexInfo();
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: 2,
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch
  };
};

export interface UseVolumeAnalyticsOptions {
  timeframe: '24h' | '7d' | '30d';
  enabled?: boolean;
}

export const useVolumeAnalytics = ({
  timeframe,
  enabled = true
}: UseVolumeAnalyticsOptions) => {
  return useQuery({
    queryKey: ['volumeAnalytics', timeframe],
    queryFn: async () => {
      console.log(`[useVolumeAnalytics] Fetching volume analytics for ${timeframe}`);
      return await bitqueryService.getVolumeAnalytics(timeframe);
    },
    enabled,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 2,
    refetchInterval: timeframe === '24h' ? 30000 : 60000, // More frequent for 24h data
  });
};

// Custom hook for real-time price updates
export const useRealTimePrice = (tokenA: string, tokenB: string) => {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);

  const { data: marketData } = useMarketData({
    tokenA,
    tokenB,
    refetchInterval: 5000 // 5 second updates for real-time
  });

  useEffect(() => {
    if (marketData && marketData.length > 0) {
      const latestData = marketData[0];
      const newPrice = latestData.buyPrice;
      
      if (price !== null) {
        const change = ((newPrice - price) / price) * 100;
        setPriceChange(change);
      }
      
      setPrice(newPrice);
      setIsConnected(true);
    }
  }, [marketData, price]);

  return {
    price,
    priceChange,
    isConnected,
    lastUpdate: marketData?.[0]?.timestamp ? new Date(marketData[0].timestamp) : null
  };
};

// Hook for managing multiple token pairs
export const useMultiPairData = (pairs: Array<{ tokenA: string; tokenB: string }>) => {
  const queries = pairs.map(pair => 
    useMarketData({
      tokenA: pair.tokenA,
      tokenB: pair.tokenB,
      refetchInterval: 10000 // 10 seconds for multiple pairs
    })
  );

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const errors = queries.filter(query => query.error).map(query => query.error);

  const data = queries.map((query, index) => ({
    pair: pairs[index],
    data: query.data,
    lastUpdated: query.lastUpdated
  }));

  return {
    data,
    isLoading,
    isError,
    errors,
    refetchAll: () => queries.forEach(query => query.refetch())
  };
};
