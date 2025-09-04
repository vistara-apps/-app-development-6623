import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { LiquidityPool, Token } from '../types';
import { DexAggregatorService } from '../services/DexAggregatorService';
import { BitqueryService } from '../services/BitqueryService';
import { BaseRPCService } from '../services/BaseRPCService';
import { config } from '../config/api';

// Create service instances
const bitqueryService = new BitqueryService();
const baseRPCService = new BaseRPCService();
const aggregatorService = new DexAggregatorService(bitqueryService, baseRPCService);

export interface UseLiquidityPoolsOptions {
  tokenA: string;
  tokenB: string;
  enabled?: boolean;
}

export const useLiquidityPools = ({
  tokenA,
  tokenB,
  enabled = true
}: UseLiquidityPoolsOptions) => {
  return useQuery({
    queryKey: ['liquidityPools', tokenA, tokenB],
    queryFn: async () => {
      console.log(`[useLiquidityPools] Fetching liquidity pools for ${tokenA}/${tokenB}`);
      return await bitqueryService.getLiquidityPools(tokenA, tokenB);
    },
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: 2,
  });
};

export interface UseTotalLiquidityOptions {
  tokenA: string;
  tokenB: string;
  enabled?: boolean;
}

export const useTotalLiquidity = ({
  tokenA,
  tokenB,
  enabled = true
}: UseTotalLiquidityOptions) => {
  return useQuery({
    queryKey: ['totalLiquidity', tokenA, tokenB],
    queryFn: async () => {
      console.log(`[useTotalLiquidity] Fetching total liquidity for ${tokenA}/${tokenB}`);
      return await aggregatorService.getTotalLiquidity(tokenA, tokenB);
    },
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 2,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export interface UseLiquidityDistributionOptions {
  tokenA: string;
  tokenB: string;
  enabled?: boolean;
}

export const useLiquidityDistribution = ({
  tokenA,
  tokenB,
  enabled = true
}: UseLiquidityDistributionOptions) => {
  return useQuery({
    queryKey: ['liquidityDistribution', tokenA, tokenB],
    queryFn: async () => {
      console.log(`[useLiquidityDistribution] Fetching liquidity distribution for ${tokenA}/${tokenB}`);
      return await aggregatorService.getLiquidityDistribution(tokenA, tokenB);
    },
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 2,
    refetchInterval: 45000, // Refresh every 45 seconds
  });
};

export interface UsePoolReservesOptions {
  poolAddress: string;
  enabled?: boolean;
}

export const usePoolReserves = ({
  poolAddress,
  enabled = true
}: UsePoolReservesOptions) => {
  return useQuery({
    queryKey: ['poolReserves', poolAddress],
    queryFn: async () => {
      console.log(`[usePoolReserves] Fetching reserves for pool ${poolAddress}`);
      return await baseRPCService.getPoolReserves(poolAddress);
    },
    enabled: enabled && !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000',
    staleTime: 10000, // 10 seconds for reserves
    gcTime: 60000, // 1 minute
    retry: 2,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

// Hook for monitoring liquidity changes across multiple pools
export const useLiquidityMonitor = (pools: LiquidityPool[]) => {
  const [liquidityChanges, setLiquidityChanges] = useState<{
    [poolAddress: string]: {
      previousReserve0: string;
      previousReserve1: string;
      currentReserve0: string;
      currentReserve1: string;
      changePercent: number;
      timestamp: Date;
    };
  }>({});

  const poolQueries = pools.map(pool => 
    usePoolReserves({
      poolAddress: pool.address,
      enabled: pool.address !== '0x0000000000000000000000000000000000000000'
    })
  );

  useEffect(() => {
    poolQueries.forEach((query, index) => {
      if (query.data && pools[index]) {
        const pool = pools[index];
        const currentReserves = query.data;
        const poolAddress = pool.address;

        const previousData = liquidityChanges[poolAddress];
        
        if (previousData) {
          // Calculate change percentage
          const prevTotal = parseFloat(previousData.currentReserve0) + parseFloat(previousData.currentReserve1);
          const currentTotal = parseFloat(currentReserves.reserve0.toString()) + parseFloat(currentReserves.reserve1.toString());
          const changePercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

          setLiquidityChanges(prev => ({
            ...prev,
            [poolAddress]: {
              previousReserve0: previousData.currentReserve0,
              previousReserve1: previousData.currentReserve1,
              currentReserve0: currentReserves.reserve0.toString(),
              currentReserve1: currentReserves.reserve1.toString(),
              changePercent,
              timestamp: new Date()
            }
          }));
        } else {
          // First time data
          setLiquidityChanges(prev => ({
            ...prev,
            [poolAddress]: {
              previousReserve0: '0',
              previousReserve1: '0',
              currentReserve0: currentReserves.reserve0.toString(),
              currentReserve1: currentReserves.reserve1.toString(),
              changePercent: 0,
              timestamp: new Date()
            }
          }));
        }
      }
    });
  }, [poolQueries.map(q => q.data).join(','), pools.length]);

  const isLoading = poolQueries.some(query => query.isLoading);
  const isError = poolQueries.some(query => query.isError);
  const errors = poolQueries.filter(query => query.error).map(query => query.error);

  return {
    liquidityChanges,
    isLoading,
    isError,
    errors,
    refetchAll: () => poolQueries.forEach(query => query.refetch())
  };
};

// Hook for liquidity insights and analytics
export const useLiquidityInsights = () => {
  const [insights, setInsights] = useState<{
    topPools: Array<{
      address: string;
      pair: string;
      liquidity: number;
      volume24h: number;
      apy: number;
    }>;
    liquidityTrends: Array<{
      timestamp: Date;
      totalLiquidity: number;
      dexBreakdown: { [dex: string]: number };
    }>;
    alerts: Array<{
      type: 'low_liquidity' | 'high_volatility' | 'new_pool';
      message: string;
      timestamp: Date;
      severity: 'low' | 'medium' | 'high';
    }>;
  }>({
    topPools: [],
    liquidityTrends: [],
    alerts: []
  });

  // Fetch volume analytics for insights
  const { data: volumeData } = useQuery({
    queryKey: ['volumeAnalytics', '24h'],
    queryFn: () => aggregatorService.getVolumeAnalytics('24h'),
    refetchInterval: 60000, // 1 minute
  });

  useEffect(() => {
    if (volumeData) {
      // Process volume data into insights
      const topPools = volumeData.volumeByPair.slice(0, 5).map((pair, index) => ({
        address: `0x${index.toString().padStart(40, '0')}`, // Placeholder
        pair: pair.pair,
        liquidity: pair.volume * 2, // Rough estimate
        volume24h: pair.volume,
        apy: 5 + Math.random() * 10 // Mock APY calculation
      }));

      setInsights(prev => ({
        ...prev,
        topPools
      }));

      // Generate alerts based on data
      const alerts = [];
      
      if (volumeData.totalVolume < 1000000) { // Less than $1M volume
        alerts.push({
          type: 'low_liquidity' as const,
          message: 'Overall market liquidity is below average',
          timestamp: new Date(),
          severity: 'medium' as const
        });
      }

      setInsights(prev => ({
        ...prev,
        alerts: [...prev.alerts, ...alerts].slice(-10) // Keep last 10 alerts
      }));
    }
  }, [volumeData]);

  return {
    insights,
    isLoading: false,
    refetch: () => {
      // Trigger refetch of underlying data
    }
  };
};

// Hook for real-time liquidity depth
export const useLiquidityDepth = (tokenA: Token, tokenB: Token) => {
  const [depth, setDepth] = useState<{
    bids: Array<{ price: number; amount: number; total: number }>;
    asks: Array<{ price: number; amount: number; total: number }>;
    spread: number;
    midPrice: number;
  } | null>(null);

  const { data: marketDepth } = useQuery({
    queryKey: ['marketDepth', tokenA.address, tokenB.address],
    queryFn: () => aggregatorService.getMarketDepth(tokenA, tokenB),
    refetchInterval: 5000, // 5 seconds for depth data
    enabled: !!tokenA && !!tokenB,
  });

  useEffect(() => {
    if (marketDepth) {
      // Process market depth data
      let bidTotal = 0;
      const processedBids = marketDepth.bids.map(bid => {
        bidTotal += bid.amount;
        return { ...bid, total: bidTotal };
      });

      let askTotal = 0;
      const processedAsks = marketDepth.asks.map(ask => {
        askTotal += ask.amount;
        return { ...ask, total: askTotal };
      });

      const bestBid = processedBids[0]?.price || 0;
      const bestAsk = processedAsks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;

      setDepth({
        bids: processedBids,
        asks: processedAsks,
        spread,
        midPrice
      });
    }
  }, [marketDepth]);

  return {
    depth,
    isLoading: !marketDepth,
    lastUpdate: marketDepth ? new Date() : null
  };
};
