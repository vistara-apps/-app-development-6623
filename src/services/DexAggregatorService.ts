import { 
  IPriceAggregator, 
  ILiquidityAnalyzer,
  Token, 
  PriceQuote, 
  SwapRoute, 
  LiquidityPool,
  APIError,
  InsufficientLiquidityError
} from '../types';
import { BitqueryService } from './BitqueryService';
import { BaseRPCService } from './BaseRPCService';
import { config, STABLECOIN_ADDRESSES } from '../config/api';
import {
  calculatePriceImpact,
  calculateExecutionPrice,
  calculateMinimumOutput,
  findBestRoute,
  compareRoutes,
  getAmountOut,
  formatTokenAmount,
  parseTokenAmount
} from '../utils/priceCalculations';

export class DexAggregatorService implements IPriceAggregator, ILiquidityAnalyzer {
  private bitqueryService: BitqueryService;
  private baseRPCService: BaseRPCService;
  private isInitialized = false;

  constructor(
    bitqueryService: BitqueryService,
    baseRPCService: BaseRPCService
  ) {
    this.bitqueryService = bitqueryService;
    this.baseRPCService = baseRPCService;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.bitqueryService.initialize(),
        this.baseRPCService.initialize()
      ]);
      this.isInitialized = true;
      console.log('[DexAggregator] Service initialized successfully');
    } catch (error) {
      console.error('[DexAggregator] Failed to initialize:', error);
      throw error;
    }
  }

  async getBestPrice(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<PriceQuote> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const quotes = await this.getAllPrices(tokenIn, tokenOut, amountIn);
      
      if (quotes.length === 0) {
        throw new InsufficientLiquidityError('No liquidity available for this pair');
      }

      // Sort by best output amount
      const bestQuote = quotes.sort((a, b) => 
        parseFloat(b.outputAmount) - parseFloat(a.outputAmount)
      )[0];

      return bestQuote;
    } catch (error) {
      console.error('[DexAggregator] Failed to get best price:', error);
      throw error;
    }
  }

  async getAllPrices(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<PriceQuote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const dexes = Object.values(config.api.dexes);
      const quotes: PriceQuote[] = [];

      // Get quotes from all DEXs in parallel
      const quotePromises = dexes.map(async (dex) => {
        try {
          const route = await this.getRouteForDex(tokenIn, tokenOut, amountIn, dex.name);
          if (route) {
            const quote = await this.createPriceQuote(tokenIn, tokenOut, amountIn, route);
            return quote;
          }
        } catch (error) {
          console.warn(`[DexAggregator] Failed to get quote from ${dex.name}:`, error);
        }
        return null;
      });

      const results = await Promise.allSettled(quotePromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          quotes.push(result.value);
        }
      });

      return quotes;
    } catch (error) {
      console.error('[DexAggregator] Failed to get all prices:', error);
      throw error;
    }
  }

  async findOptimalRoute(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<SwapRoute> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const routes = await this.getAllRoutes(tokenIn, tokenOut, amountIn);
      
      if (routes.length === 0) {
        throw new InsufficientLiquidityError('No routes available for this pair');
      }

      const bestRoute = findBestRoute(routes);
      if (!bestRoute) {
        throw new InsufficientLiquidityError('No optimal route found');
      }

      return bestRoute;
    } catch (error) {
      console.error('[DexAggregator] Failed to find optimal route:', error);
      throw error;
    }
  }

  async getTotalLiquidity(tokenA: string, tokenB: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const pools = await this.bitqueryService.getLiquidityPools(tokenA, tokenB);
      
      let totalLiquidity = 0;
      
      for (const pool of pools) {
        try {
          const reserves = await this.baseRPCService.getPoolReserves(pool.address);
          const reserve0Value = parseFloat(formatTokenAmount(reserves.reserve0, pool.token0.decimals));
          const reserve1Value = parseFloat(formatTokenAmount(reserves.reserve1, pool.token1.decimals));
          
          // Assuming stablecoins are roughly $1 each
          totalLiquidity += reserve0Value + reserve1Value;
        } catch (error) {
          console.warn(`[DexAggregator] Failed to get reserves for pool ${pool.address}:`, error);
        }
      }

      return totalLiquidity;
    } catch (error) {
      console.error('[DexAggregator] Failed to get total liquidity:', error);
      throw error;
    }
  }

  async getLiquidityDistribution(tokenA: string, tokenB: string): Promise<{
    dex: string;
    liquidity: number;
    percentage: number;
  }[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const pools = await this.bitqueryService.getLiquidityPools(tokenA, tokenB);
      const dexLiquidity: { [key: string]: number } = {};
      let totalLiquidity = 0;

      for (const pool of pools) {
        try {
          const reserves = await this.baseRPCService.getPoolReserves(pool.address);
          const reserve0Value = parseFloat(formatTokenAmount(reserves.reserve0, pool.token0.decimals));
          const reserve1Value = parseFloat(formatTokenAmount(reserves.reserve1, pool.token1.decimals));
          
          const poolLiquidity = reserve0Value + reserve1Value;
          dexLiquidity[pool.dex] = (dexLiquidity[pool.dex] || 0) + poolLiquidity;
          totalLiquidity += poolLiquidity;
        } catch (error) {
          console.warn(`[DexAggregator] Failed to get reserves for pool ${pool.address}:`, error);
        }
      }

      return Object.entries(dexLiquidity).map(([dex, liquidity]) => ({
        dex,
        liquidity,
        percentage: totalLiquidity > 0 ? (liquidity / totalLiquidity) * 100 : 0
      }));
    } catch (error) {
      console.error('[DexAggregator] Failed to get liquidity distribution:', error);
      throw error;
    }
  }

  async getVolumeAnalytics(timeframe: '24h' | '7d' | '30d'): Promise<{
    totalVolume: number;
    volumeByDex: { dex: string; volume: number }[];
    volumeByPair: { pair: string; volume: number }[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.bitqueryService.getVolumeAnalytics(timeframe);
    } catch (error) {
      console.error('[DexAggregator] Failed to get volume analytics:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getAllRoutes(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<SwapRoute[]> {
    const dexes = Object.values(config.api.dexes);
    const routes: SwapRoute[] = [];

    for (const dex of dexes) {
      try {
        const route = await this.getRouteForDex(tokenIn, tokenOut, amountIn, dex.name);
        if (route) {
          routes.push(route);
        }
      } catch (error) {
        console.warn(`[DexAggregator] Failed to get route from ${dex.name}:`, error);
      }
    }

    return routes;
  }

  private async getRouteForDex(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    dexName: string
  ): Promise<SwapRoute | null> {
    try {
      let outputAmount: string;
      let gasEstimate = '150000'; // Default gas estimate

      if (dexName.toLowerCase() === 'uniswap v3') {
        outputAmount = await this.baseRPCService.getUniswapV3Quote(
          tokenIn.address,
          tokenOut.address,
          amountIn
        );
      } else {
        // For V2-style DEXs
        const path = [tokenIn.address, tokenOut.address];
        const amounts = await this.baseRPCService.getAmountsOut(amountIn, path, dexName);
        outputAmount = amounts[amounts.length - 1];
      }

      if (!outputAmount || parseFloat(outputAmount) <= 0) {
        return null;
      }

      // Calculate price impact (simplified)
      const executionPrice = calculateExecutionPrice(amountIn, outputAmount);
      const marketPrice = 1; // Assuming stablecoins are roughly 1:1
      const priceImpact = calculatePriceImpact(
        parseFloat(amountIn),
        parseFloat(outputAmount),
        marketPrice
      );

      // Create a simple liquidity pool for the route
      const pool: LiquidityPool = {
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        token0: tokenIn,
        token1: tokenOut,
        reserve0: '1000000', // Placeholder reserves
        reserve1: '1000000',
        totalSupply: '1000000',
        fee: config.api.dexes[dexName.toUpperCase().replace(' ', '_')]?.fee || 0.3,
        dex: dexName
      };

      return {
        path: [tokenIn, tokenOut],
        pools: [pool],
        expectedOutput: outputAmount,
        priceImpact,
        gasEstimate,
        dex: dexName
      };
    } catch (error) {
      console.error(`[DexAggregator] Failed to get route for ${dexName}:`, error);
      return null;
    }
  }

  private async createPriceQuote(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    route: SwapRoute
  ): Promise<PriceQuote> {
    const slippage = 0.5; // 0.5% default slippage
    const minimumOutput = calculateMinimumOutput(route.expectedOutput, slippage);
    const executionPrice = calculateExecutionPrice(amountIn, route.expectedOutput);
    
    // Get current gas price
    const gasPrice = await this.baseRPCService.getCurrentGasPrice();
    const gasPriceFormatted = formatTokenAmount(gasPrice, 18);

    return {
      inputAmount: amountIn,
      outputAmount: route.expectedOutput,
      route,
      slippage,
      minimumOutput,
      gasPrice: gasPriceFormatted,
      executionPrice
    };
  }

  // Public utility methods

  async getTokenPrice(tokenAddress: string): Promise<number> {
    // For stablecoins, return 1.0
    const stablecoinAddresses = Object.values(STABLECOIN_ADDRESSES);
    if (stablecoinAddresses.includes(tokenAddress as any)) {
      return 1.0;
    }

    // For other tokens, you would fetch from a price oracle
    return 1.0;
  }

  async validatePair(tokenA: Token, tokenB: Token): Promise<boolean> {
    try {
      const dexes = Object.values(config.api.dexes);
      
      for (const dex of dexes) {
        try {
          const pairAddress = await this.baseRPCService.getPairAddress(
            tokenA.address,
            tokenB.address,
            dex.name
          );
          
          if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
            return true;
          }
        } catch (error) {
          // Continue checking other DEXs
        }
      }
      
      return false;
    } catch (error) {
      console.error('[DexAggregator] Failed to validate pair:', error);
      return false;
    }
  }

  async getMarketDepth(tokenA: Token, tokenB: Token): Promise<{
    bids: { price: number; amount: number }[];
    asks: { price: number; amount: number }[];
  }> {
    // Simplified market depth - in production, this would aggregate order book data
    return {
      bids: [
        { price: 0.9998, amount: 10000 },
        { price: 0.9995, amount: 25000 },
        { price: 0.9990, amount: 50000 }
      ],
      asks: [
        { price: 1.0002, amount: 10000 },
        { price: 1.0005, amount: 25000 },
        { price: 1.0010, amount: 50000 }
      ]
    };
  }
}
