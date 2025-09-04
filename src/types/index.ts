// Data Models as specified in PRD

export interface User {
  userId: string;
  walletAddress: string;
  preferredStablecoins: string[];
  tradeHistory: Trade[];
}

export interface MarketData {
  timestamp: number;
  dexName: string;
  stablecoinPair: string;
  buyPrice: number;
  sellPrice: number;
  liquidityDepth: number;
}

export interface Trade {
  tradeId: string;
  userId: string;
  stablecoinIn: string;
  stablecoinOut: string;
  amountIn: number;
  amountOut: number;
  executionPrice: number;
  dexUsed: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

// Extended types for application functionality

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: string;
  logoURI?: string;
}

export interface DexInfo {
  name: string;
  price: string;
  liquidity: string;
  fee: string;
  logo: string;
  address: string;
  router: string;
}

export interface LiquidityPool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number;
  dex: string;
}

export interface SwapRoute {
  path: Token[];
  pools: LiquidityPool[];
  expectedOutput: string;
  priceImpact: number;
  gasEstimate: string;
  dex: string;
}

export interface PriceQuote {
  inputAmount: string;
  outputAmount: string;
  route: SwapRoute;
  slippage: number;
  minimumOutput: string;
  gasPrice: string;
  executionPrice: number;
}

// API Response types

export interface BitqueryResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations: Array<{ line: number; column: number }>;
    path: string[];
  }>;
}

export interface DexTrade {
  block: {
    timestamp: {
      time: string;
    };
  };
  transaction: {
    hash: string;
  };
  smartContract: {
    address: {
      address: string;
    };
  };
  sellCurrency: {
    symbol: string;
    address: string;
  };
  buyCurrency: {
    symbol: string;
    address: string;
  };
  sellAmount: number;
  buyAmount: number;
  price: number;
}

export interface PoolReserves {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
}

// Error types

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class InsufficientLiquidityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientLiquidityError';
  }
}

export class SlippageExceededError extends Error {
  constructor(message: string, public actualSlippage: number) {
    super(message);
    this.name = 'SlippageExceededError';
  }
}

// Configuration types

export interface APIConfig {
  bitquery: {
    endpoint: string;
    apiKey: string;
    network: string;
  };
  baseRPC: {
    endpoint: string;
    chainId: number;
  };
  dexes: {
    [key: string]: {
      name: string;
      router: string;
      factory: string;
      fee: number;
    };
  };
}

export interface AppConfig {
  api: APIConfig;
  defaultSlippage: number;
  refreshInterval: number;
  maxRetries: number;
  gasMultiplier: number;
}
