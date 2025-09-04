import { MarketData, DexInfo, Token, PriceQuote, LiquidityPool, SwapRoute, Trade } from '../types';

// Abstract interfaces for data providers as specified in PRD

export interface IDataProvider {
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface IDexDataProvider extends IDataProvider {
  getMarketData(tokenA: string, tokenB: string): Promise<MarketData[]>;
  getLiquidityPools(tokenA: string, tokenB: string): Promise<LiquidityPool[]>;
  getDexInfo(): Promise<DexInfo[]>;
  getHistoricalData(tokenA: string, tokenB: string, timeframe: string): Promise<MarketData[]>;
}

export interface IBlockchainProvider extends IDataProvider {
  getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string>;
  getPoolReserves(poolAddress: string): Promise<{ reserve0: bigint; reserve1: bigint }>;
  estimateGas(transaction: any): Promise<bigint>;
  sendTransaction(transaction: any): Promise<string>;
  waitForTransaction(txHash: string): Promise<any>;
}

export interface IPriceAggregator {
  getBestPrice(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<PriceQuote>;
  
  getAllPrices(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<PriceQuote[]>;
  
  findOptimalRoute(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<SwapRoute>;
}

export interface ITradeExecutor {
  executeTrade(
    quote: PriceQuote,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<Trade>;
  
  estimateTradeGas(quote: PriceQuote): Promise<string>;
  
  validateTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    walletAddress: string
  ): Promise<{ valid: boolean; error?: string }>;
}

export interface ILiquidityAnalyzer {
  getTotalLiquidity(tokenA: string, tokenB: string): Promise<number>;
  getLiquidityDistribution(tokenA: string, tokenB: string): Promise<{
    dex: string;
    liquidity: number;
    percentage: number;
  }[]>;
  getVolumeAnalytics(timeframe: '24h' | '7d' | '30d'): Promise<{
    totalVolume: number;
    volumeByDex: { dex: string; volume: number }[];
    volumeByPair: { pair: string; volume: number }[];
  }>;
}

// Service registry for dependency injection
export interface IServiceRegistry {
  register<T>(key: string, service: T): void;
  get<T>(key: string): T;
  has(key: string): boolean;
}

export class ServiceRegistry implements IServiceRegistry {
  private services = new Map<string, any>();

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found in registry`);
    }
    return service;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}

// Service keys for registry
export const SERVICE_KEYS = {
  BITQUERY_PROVIDER: 'bitquery-provider',
  BASE_RPC_PROVIDER: 'base-rpc-provider',
  PRICE_AGGREGATOR: 'price-aggregator',
  TRADE_EXECUTOR: 'trade-executor',
  LIQUIDITY_ANALYZER: 'liquidity-analyzer',
} as const;
