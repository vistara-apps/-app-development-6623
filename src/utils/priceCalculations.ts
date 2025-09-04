import { Token, SwapRoute, PriceQuote } from '../types';

// Price calculation utilities for DEX aggregation

export const calculatePriceImpact = (
  inputAmount: number,
  outputAmount: number,
  marketPrice: number
): number => {
  const expectedOutput = inputAmount * marketPrice;
  const priceImpact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
  return Math.max(0, priceImpact);
};

export const calculateSlippage = (
  expectedAmount: number,
  actualAmount: number
): number => {
  return ((expectedAmount - actualAmount) / expectedAmount) * 100;
};

export const calculateMinimumOutput = (
  outputAmount: string,
  slippageTolerance: number
): string => {
  const amount = parseFloat(outputAmount);
  const minimumAmount = amount * (1 - slippageTolerance / 100);
  return minimumAmount.toString();
};

export const calculateExecutionPrice = (
  inputAmount: string,
  outputAmount: string
): number => {
  const input = parseFloat(inputAmount);
  const output = parseFloat(outputAmount);
  return input > 0 ? output / input : 0;
};

export const compareRoutes = (routeA: SwapRoute, routeB: SwapRoute): number => {
  const outputA = parseFloat(routeA.expectedOutput);
  const outputB = parseFloat(routeB.expectedOutput);
  
  // Higher output is better
  if (outputA !== outputB) {
    return outputB - outputA;
  }
  
  // Lower price impact is better
  if (routeA.priceImpact !== routeB.priceImpact) {
    return routeA.priceImpact - routeB.priceImpact;
  }
  
  // Lower gas estimate is better
  const gasA = parseFloat(routeA.gasEstimate);
  const gasB = parseFloat(routeB.gasEstimate);
  return gasA - gasB;
};

export const findBestRoute = (routes: SwapRoute[]): SwapRoute | null => {
  if (routes.length === 0) return null;
  
  return routes.sort(compareRoutes)[0];
};

export const calculateAveragePrice = (quotes: PriceQuote[]): number => {
  if (quotes.length === 0) return 0;
  
  const totalPrice = quotes.reduce((sum, quote) => sum + quote.executionPrice, 0);
  return totalPrice / quotes.length;
};

export const calculateLiquidityWeightedPrice = (
  quotes: PriceQuote[],
  liquidityWeights: number[]
): number => {
  if (quotes.length === 0 || quotes.length !== liquidityWeights.length) return 0;
  
  const totalWeight = liquidityWeights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = quotes.reduce((sum, quote, index) => {
    return sum + (quote.executionPrice * liquidityWeights[index]);
  }, 0);
  
  return weightedSum / totalWeight;
};

export const estimateGasCost = (
  gasEstimate: string,
  gasPrice: string,
  ethPrice: number = 2000 // Default ETH price in USD
): number => {
  const gas = parseFloat(gasEstimate);
  const price = parseFloat(gasPrice);
  const gasCostInEth = (gas * price) / 1e18; // Convert from wei to ETH
  return gasCostInEth * ethPrice;
};

export const calculateNetOutput = (
  outputAmount: string,
  gasCost: number,
  outputTokenPrice: number = 1 // Price of output token in USD
): number => {
  const output = parseFloat(outputAmount);
  const outputValueInUSD = output * outputTokenPrice;
  return Math.max(0, outputValueInUSD - gasCost);
};

export const formatPrice = (price: number, decimals: number = 6): string => {
  return price.toFixed(decimals);
};

export const formatPercentage = (percentage: number, decimals: number = 2): string => {
  return `${percentage.toFixed(decimals)}%`;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
};

export const parseTokenAmount = (amount: string, decimals: number): bigint => {
  const [integer, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
};

export const formatTokenAmount = (amount: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return quotient.toString();
  }
  
  const fractionStr = remainder.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  return trimmedFraction ? `${quotient}.${trimmedFraction}` : quotient.toString();
};

// Uniswap V2 AMM calculations
export const getAmountOut = (
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  fee: number = 0.003 // 0.3% default fee
): bigint => {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('Invalid input amounts or reserves');
  }
  
  const feeMultiplier = BigInt(Math.floor((1 - fee) * 1000));
  const amountInWithFee = amountIn * feeMultiplier;
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 1000n) + amountInWithFee;
  
  return numerator / denominator;
};

export const getAmountIn = (
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  fee: number = 0.003 // 0.3% default fee
): bigint => {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error('Invalid output amount or reserves');
  }
  
  if (amountOut >= reserveOut) {
    throw new Error('Insufficient liquidity');
  }
  
  const feeMultiplier = BigInt(Math.floor((1 - fee) * 1000));
  const numerator = reserveIn * amountOut * 1000n;
  const denominator = (reserveOut - amountOut) * feeMultiplier;
  
  return (numerator / denominator) + 1n; // Add 1 to round up
};

export const calculateOptimalSplit = (
  totalAmount: string,
  routes: SwapRoute[]
): { route: SwapRoute; amount: string }[] => {
  // Simple implementation - in production, this would use more sophisticated optimization
  if (routes.length === 0) return [];
  if (routes.length === 1) return [{ route: routes[0], amount: totalAmount }];
  
  // For now, split equally between top 2 routes
  const bestRoutes = routes.sort(compareRoutes).slice(0, 2);
  const splitAmount = (parseFloat(totalAmount) / bestRoutes.length).toString();
  
  return bestRoutes.map(route => ({
    route,
    amount: splitAmount
  }));
};
