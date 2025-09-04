import axios, { AxiosInstance } from 'axios';
import { 
  IDexDataProvider, 
  MarketData, 
  DexInfo, 
  LiquidityPool, 
  Token,
  BitqueryResponse,
  DexTrade,
  APIError 
} from '../types';
import { config } from '../config/api';
import {
  GET_DEX_TRADES_QUERY,
  GET_LIQUIDITY_POOLS_QUERY,
  GET_VOLUME_ANALYTICS_QUERY,
  GET_HISTORICAL_PRICES_QUERY,
  GET_TOP_PAIRS_QUERY,
  GET_DEX_LIQUIDITY_QUERY
} from './queries/dexQueries';

export class BitqueryService implements IDexDataProvider {
  private client: AxiosInstance;
  private isInitialized = false;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.bitquery.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.api.bitquery.apiKey,
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Bitquery] Making request to: ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[Bitquery] Request failed:', error.message);
        throw new APIError(
          `Bitquery API error: ${error.message}`,
          error.response?.status,
          error.response?.data
        );
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.isHealthy();
      this.isInitialized = true;
      console.log('[Bitquery] Service initialized successfully');
    } catch (error) {
      console.error('[Bitquery] Failed to initialize:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check query
      const response = await this.client.post('', {
        query: `
          query HealthCheck {
            ethereum(network: base) {
              blocks(options: { limit: 1, desc: "height" }) {
                height
                timestamp {
                  time
                }
              }
            }
          }
        `
      });

      return !response.data.errors && response.data.data?.ethereum?.blocks?.length > 0;
    } catch (error) {
      console.error('[Bitquery] Health check failed:', error);
      return false;
    }
  }

  async getMarketData(tokenA: string, tokenB: string): Promise<MarketData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.client.post<BitqueryResponse<{ ethereum: { dexTrades: DexTrade[] } }>>('', {
        query: GET_DEX_TRADES_QUERY,
        variables: {
          tokenA,
          tokenB,
          limit: 100,
          offset: 0
        }
      });

      if (response.data.errors) {
        throw new APIError(`Bitquery GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      const trades = response.data.data.ethereum.dexTrades;
      
      return trades.map(trade => ({
        timestamp: new Date(trade.block.timestamp.time).getTime(),
        dexName: this.getDexNameFromAddress(trade.smartContract.address.address),
        stablecoinPair: `${trade.sellCurrency.symbol}/${trade.buyCurrency.symbol}`,
        buyPrice: trade.price,
        sellPrice: 1 / trade.price,
        liquidityDepth: trade.sellAmount * trade.price // Approximate liquidity
      }));
    } catch (error) {
      console.error('[Bitquery] Failed to get market data:', error);
      throw error;
    }
  }

  async getLiquidityPools(tokenA: string, tokenB: string): Promise<LiquidityPool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.client.post('', {
        query: GET_LIQUIDITY_POOLS_QUERY,
        variables: { tokenA, tokenB }
      });

      if (response.data.errors) {
        throw new APIError(`Bitquery GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      // Transform the response to LiquidityPool format
      // Note: This is a simplified implementation - in production, you'd need more sophisticated parsing
      const calls = response.data.data.ethereum.smartContractCalls;
      
      return calls.map((call: any) => ({
        address: call.smartContract.address.address,
        token0: this.getTokenFromAddress(tokenA),
        token1: this.getTokenFromAddress(tokenB),
        reserve0: '0', // Would need additional queries to get actual reserves
        reserve1: '0',
        totalSupply: '0',
        fee: this.getFeeFromDexAddress(call.smartContract.address.address),
        dex: this.getDexNameFromAddress(call.smartContract.address.address)
      }));
    } catch (error) {
      console.error('[Bitquery] Failed to get liquidity pools:', error);
      throw error;
    }
  }

  async getDexInfo(): Promise<DexInfo[]> {
    const dexes = Object.values(config.api.dexes);
    
    return dexes.map(dex => ({
      name: dex.name,
      price: '0.9998', // Would be calculated from recent trades
      liquidity: '$0', // Would be calculated from pool data
      fee: `${dex.fee}%`,
      logo: dex.logo,
      address: dex.factory,
      router: dex.router
    }));
  }

  async getHistoricalData(tokenA: string, tokenB: string, timeframe: string): Promise<MarketData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const since = this.getTimeframeSince(timeframe);
      const interval = this.getIntervalFromTimeframe(timeframe);

      const response = await this.client.post('', {
        query: GET_HISTORICAL_PRICES_QUERY,
        variables: {
          tokenA,
          tokenB,
          since,
          interval
        }
      });

      if (response.data.errors) {
        throw new APIError(`Bitquery GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      const trades = response.data.data.ethereum.dexTrades;
      
      return trades.map((trade: any) => ({
        timestamp: new Date(trade.timeInterval.minute).getTime(),
        dexName: 'Aggregated',
        stablecoinPair: `${tokenA}/${tokenB}`,
        buyPrice: trade.average_price,
        sellPrice: 1 / trade.average_price,
        liquidityDepth: trade.volume
      }));
    } catch (error) {
      console.error('[Bitquery] Failed to get historical data:', error);
      throw error;
    }
  }

  async getVolumeAnalytics(timeframe: '24h' | '7d' | '30d') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { since, till } = this.getTimeframeRange(timeframe);

      const response = await this.client.post('', {
        query: GET_VOLUME_ANALYTICS_QUERY,
        variables: { since, till }
      });

      if (response.data.errors) {
        throw new APIError(`Bitquery GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      const trades = response.data.data.ethereum.dexTrades;
      
      return {
        totalVolume: trades.reduce((sum: number, trade: any) => sum + trade.tradeAmount, 0),
        volumeByDex: this.groupVolumeByDex(trades),
        volumeByPair: this.groupVolumeByPair(trades)
      };
    } catch (error) {
      console.error('[Bitquery] Failed to get volume analytics:', error);
      throw error;
    }
  }

  // Helper methods

  private getDexNameFromAddress(address: string): string {
    const dexes = config.api.dexes;
    for (const [key, dex] of Object.entries(dexes)) {
      if (dex.router.toLowerCase() === address.toLowerCase() || 
          dex.factory.toLowerCase() === address.toLowerCase()) {
        return dex.name;
      }
    }
    return 'Unknown DEX';
  }

  private getFeeFromDexAddress(address: string): number {
    const dexes = config.api.dexes;
    for (const [key, dex] of Object.entries(dexes)) {
      if (dex.router.toLowerCase() === address.toLowerCase() || 
          dex.factory.toLowerCase() === address.toLowerCase()) {
        return dex.fee;
      }
    }
    return 0.3; // Default fee
  }

  private getTokenFromAddress(address: string): Token {
    // This would typically come from a token registry
    const tokenMap: { [key: string]: Token } = {
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6
      },
      '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2': {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        decimals: 6
      },
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        decimals: 18
      },
      '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1': {
        symbol: 'FRAX',
        name: 'Frax',
        address: '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1',
        decimals: 18
      }
    };

    return tokenMap[address] || {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      address,
      decimals: 18
    };
  }

  private getTimeframeSince(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private getIntervalFromTimeframe(timeframe: string): string {
    switch (timeframe) {
      case '24h':
        return '15'; // 15-minute intervals
      case '7d':
        return '60'; // 1-hour intervals
      case '30d':
        return '240'; // 4-hour intervals
      default:
        return '15';
    }
  }

  private getTimeframeRange(timeframe: '24h' | '7d' | '30d') {
    const now = new Date();
    const till = now.toISOString();
    
    switch (timeframe) {
      case '24h':
        return {
          since: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          till
        };
      case '7d':
        return {
          since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          till
        };
      case '30d':
        return {
          since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          till
        };
    }
  }

  private groupVolumeByDex(trades: any[]) {
    const dexVolumes: { [key: string]: number } = {};
    
    trades.forEach(trade => {
      const dexName = this.getDexNameFromAddress(trade.smartContract.address.address);
      dexVolumes[dexName] = (dexVolumes[dexName] || 0) + trade.tradeAmount;
    });

    return Object.entries(dexVolumes).map(([dex, volume]) => ({ dex, volume }));
  }

  private groupVolumeByPair(trades: any[]) {
    const pairVolumes: { [key: string]: number } = {};
    
    trades.forEach(trade => {
      const pair = `${trade.sellCurrency.symbol}/${trade.buyCurrency.symbol}`;
      pairVolumes[pair] = (pairVolumes[pair] || 0) + trade.tradeAmount;
    });

    return Object.entries(pairVolumes).map(([pair, volume]) => ({ pair, volume }));
  }
}
