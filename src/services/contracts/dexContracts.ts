// Smart contract ABIs and addresses for Base DEXs

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
] as const;

export const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function kLast() view returns (uint256)',
] as const;

export const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)',
  'function quote(uint amountA, uint reserveA, uint reserveB) pure returns (uint amountB)',
  'function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) pure returns (uint amountOut)',
  'function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) pure returns (uint amountIn)',
] as const;

export const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
  'function allPairs(uint) view returns (address pair)',
  'function allPairsLength() view returns (uint)',
  'function createPair(address tokenA, address tokenB) returns (address pair)',
] as const;

export const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) view returns (uint256 amountOut)',
  'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) view returns (uint256 amountIn)',
] as const;

export const UNISWAP_V3_ROUTER_ABI = [
  'struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }',
  'function exactInputSingle(ExactInputSingleParams calldata params) payable returns (uint256 amountOut)',
  'struct ExactOutputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountOut; uint256 amountInMaximum; uint160 sqrtPriceLimitX96; }',
  'function exactOutputSingle(ExactOutputSingleParams calldata params) payable returns (uint256 amountIn)',
] as const;

// Contract addresses on Base
export const CONTRACT_ADDRESSES = {
  // Uniswap V3
  UNISWAP_V3_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
  UNISWAP_V3_FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  UNISWAP_V3_QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  
  // Aerodrome
  AERODROME_ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
  AERODROME_FACTORY: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
  
  // BaseSwap
  BASESWAP_ROUTER: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
  BASESWAP_FACTORY: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB',
  
  // SushiSwap
  SUSHISWAP_ROUTER: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
  SUSHISWAP_FACTORY: '0x71524B4f93c58fcbF659783284E38825f0622859',
  
  // Multicall
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11',
} as const;

// Fee tiers for Uniswap V3
export const UNISWAP_V3_FEES = {
  LOWEST: 100,    // 0.01%
  LOW: 500,       // 0.05%
  MEDIUM: 3000,   // 0.3%
  HIGH: 10000,    // 1%
} as const;

// Helper functions for contract interactions
export const getRouterABI = (dexName: string) => {
  switch (dexName.toLowerCase()) {
    case 'uniswap v3':
      return UNISWAP_V3_ROUTER_ABI;
    case 'aerodrome':
    case 'baseswap':
    case 'sushiswap':
    default:
      return UNISWAP_V2_ROUTER_ABI;
  }
};

export const getRouterAddress = (dexName: string): string => {
  switch (dexName.toLowerCase()) {
    case 'uniswap v3':
      return CONTRACT_ADDRESSES.UNISWAP_V3_ROUTER;
    case 'aerodrome':
      return CONTRACT_ADDRESSES.AERODROME_ROUTER;
    case 'baseswap':
      return CONTRACT_ADDRESSES.BASESWAP_ROUTER;
    case 'sushiswap':
      return CONTRACT_ADDRESSES.SUSHISWAP_ROUTER;
    default:
      throw new Error(`Unknown DEX: ${dexName}`);
  }
};

export const getFactoryAddress = (dexName: string): string => {
  switch (dexName.toLowerCase()) {
    case 'uniswap v3':
      return CONTRACT_ADDRESSES.UNISWAP_V3_FACTORY;
    case 'aerodrome':
      return CONTRACT_ADDRESSES.AERODROME_FACTORY;
    case 'baseswap':
      return CONTRACT_ADDRESSES.BASESWAP_FACTORY;
    case 'sushiswap':
      return CONTRACT_ADDRESSES.SUSHISWAP_FACTORY;
    default:
      throw new Error(`Unknown DEX: ${dexName}`);
  }
};

// Multicall contract for batch operations
export const MULTICALL3_ABI = [
  'struct Call { address target; bytes callData; }',
  'struct Call3 { address target; bool allowFailure; bytes callData; }',
  'struct Call3Value { address target; bool allowFailure; uint256 value; bytes callData; }',
  'struct Result { bool success; bytes returnData; }',
  'function aggregate(Call[] calldata calls) payable returns (uint256 blockNumber, bytes[] memory returnData)',
  'function aggregate3(Call3[] calldata calls) payable returns (Result[] memory returnData)',
  'function aggregate3Value(Call3Value[] calldata calls) payable returns (Result[] memory returnData)',
  'function blockAndAggregate(Call[] calldata calls) payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData)',
  'function getBasefee() view returns (uint256 basefee)',
  'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
  'function getBlockNumber() view returns (uint256 blockNumber)',
  'function getChainId() view returns (uint256 chainid)',
  'function getCurrentBlockCoinbase() view returns (address coinbase)',
  'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
  'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
  'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
  'function getEthBalance(address addr) view returns (uint256 balance)',
  'function getLastBlockHash() view returns (bytes32 blockHash)',
  'function tryAggregate(bool requireSuccess, Call[] calldata calls) payable returns (Result[] memory returnData)',
  'function tryBlockAndAggregate(bool requireSuccess, Call[] calldata calls) payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData)',
] as const;
