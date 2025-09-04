import { AppConfig } from '../types';

// Base network configuration
export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';

// Stablecoin addresses on Base
export const STABLECOIN_ADDRESSES = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  FRAX: '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1',
} as const;

// DEX configurations on Base
export const DEX_CONFIGS = {
  UNISWAP_V3: {
    name: 'Uniswap V3',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    fee: 0.05,
    logo: '🦄',
  },
  AERODROME: {
    name: 'Aerodrome',
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
    fee: 0.04,
    logo: '✈️',
  },
  BASESWAP: {
    name: 'BaseSwap',
    router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
    factory: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB',
    fee: 0.25,
    logo: '🔷',
  },
  SUSHISWAP: {
    name: 'SushiSwap',
    router: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
    factory: '0x71524B4f93c58fcbF659783284E38825f0622859',
    fee: 0.30,
    logo: '🍣',
  },
} as const;

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  api: {
    bitquery: {
      endpoint: 'https://graphql.bitquery.io',
      apiKey: process.env.VITE_BITQUERY_API_KEY || '',
      network: 'base',
    },
    baseRPC: {
      endpoint: process.env.VITE_BASE_RPC_URL || BASE_RPC_URL,
      chainId: BASE_CHAIN_ID,
    },
    dexes: DEX_CONFIGS,
  },
  defaultSlippage: 0.5, // 0.5%
  refreshInterval: 10000, // 10 seconds
  maxRetries: 3,
  gasMultiplier: 1.2, // 20% gas buffer
};

// Environment-specific configurations
export const getConfig = (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...DEFAULT_CONFIG,
        refreshInterval: 5000, // More frequent updates in production
        api: {
          ...DEFAULT_CONFIG.api,
          baseRPC: {
            endpoint: process.env.VITE_BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/your-api-key',
            chainId: BASE_CHAIN_ID,
          },
        },
      };
    
    case 'development':
      return {
        ...DEFAULT_CONFIG,
        refreshInterval: 15000, // Less frequent in development
      };
    
    default:
      return DEFAULT_CONFIG;
  }
};

// Validation function
export const validateConfig = (config: AppConfig): void => {
  if (!config.api.bitquery.apiKey) {
    console.warn('Bitquery API key not provided. Some features may not work.');
  }
  
  if (!config.api.baseRPC.endpoint) {
    throw new Error('Base RPC endpoint is required');
  }
  
  if (config.defaultSlippage < 0 || config.defaultSlippage > 50) {
    throw new Error('Default slippage must be between 0 and 50%');
  }
  
  if (config.refreshInterval < 1000) {
    throw new Error('Refresh interval must be at least 1 second');
  }
};

// Export the validated configuration
export const config = (() => {
  const cfg = getConfig();
  validateConfig(cfg);
  return cfg;
})();
