import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, getContract, Address } from 'viem';
import { base } from 'viem/chains';
import { IBlockchainProvider, PoolReserves, APIError } from '../types';
import { config } from '../config/api';
import {
  ERC20_ABI,
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_QUOTER_ABI,
  CONTRACT_ADDRESSES,
  MULTICALL3_ABI,
  getRouterAddress,
  getFactoryAddress,
  UNISWAP_V3_FEES
} from './contracts/dexContracts';

export class BaseRPCService implements IBlockchainProvider {
  private publicClient: any;
  private walletClient: any;
  private isInitialized = false;

  constructor() {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.api.baseRPC.endpoint),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection with a simple call
      const blockNumber = await this.publicClient.getBlockNumber();
      console.log(`[BaseRPC] Connected to Base network, block: ${blockNumber}`);
      this.isInitialized = true;
    } catch (error) {
      console.error('[BaseRPC] Failed to initialize:', error);
      throw new APIError(`Failed to connect to Base RPC: ${error.message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      console.error('[BaseRPC] Health check failed:', error);
      return false;
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        client: this.publicClient,
      });

      const [balance, decimals] = await Promise.all([
        contract.read.balanceOf([walletAddress as Address]),
        contract.read.decimals(),
      ]);

      return formatUnits(balance as bigint, decimals as number);
    } catch (error) {
      console.error('[BaseRPC] Failed to get token balance:', error);
      throw new APIError(`Failed to get token balance: ${error.message}`);
    }
  }

  async getPoolReserves(poolAddress: string): Promise<{ reserve0: bigint; reserve1: bigint }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: poolAddress as Address,
        abi: UNISWAP_V2_PAIR_ABI,
        client: this.publicClient,
      });

      const reserves = await contract.read.getReserves();
      
      return {
        reserve0: reserves[0] as bigint,
        reserve1: reserves[1] as bigint,
      };
    } catch (error) {
      console.error('[BaseRPC] Failed to get pool reserves:', error);
      throw new APIError(`Failed to get pool reserves: ${error.message}`);
    }
  }

  async estimateGas(transaction: any): Promise<bigint> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const gasEstimate = await this.publicClient.estimateGas(transaction);
      // Add 20% buffer for gas estimation
      return (gasEstimate * BigInt(120)) / BigInt(100);
    } catch (error) {
      console.error('[BaseRPC] Failed to estimate gas:', error);
      throw new APIError(`Failed to estimate gas: ${error.message}`);
    }
  }

  async sendTransaction(transaction: any): Promise<string> {
    if (!this.walletClient) {
      throw new APIError('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.sendTransaction(transaction);
      return hash;
    } catch (error) {
      console.error('[BaseRPC] Failed to send transaction:', error);
      throw new APIError(`Failed to send transaction: ${error.message}`);
    }
  }

  async waitForTransaction(txHash: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash as Address,
        timeout: 60000, // 60 second timeout
      });
      return receipt;
    } catch (error) {
      console.error('[BaseRPC] Failed to wait for transaction:', error);
      throw new APIError(`Failed to wait for transaction: ${error.message}`);
    }
  }

  // DEX-specific methods

  async getAmountsOut(
    amountIn: string,
    path: string[],
    dexName: string
  ): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const routerAddress = getRouterAddress(dexName);
      const contract = getContract({
        address: routerAddress as Address,
        abi: UNISWAP_V2_ROUTER_ABI,
        client: this.publicClient,
      });

      const amounts = await contract.read.getAmountsOut([
        parseUnits(amountIn, 18),
        path as Address[],
      ]);

      return (amounts as bigint[]).map(amount => formatUnits(amount, 18));
    } catch (error) {
      console.error('[BaseRPC] Failed to get amounts out:', error);
      throw new APIError(`Failed to get amounts out: ${error.message}`);
    }
  }

  async getUniswapV3Quote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    fee: number = UNISWAP_V3_FEES.MEDIUM
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: CONTRACT_ADDRESSES.UNISWAP_V3_QUOTER as Address,
        abi: UNISWAP_V3_QUOTER_ABI,
        client: this.publicClient,
      });

      const amountOut = await contract.read.quoteExactInputSingle([
        tokenIn as Address,
        tokenOut as Address,
        fee,
        parseUnits(amountIn, 18),
        0, // sqrtPriceLimitX96 (0 = no limit)
      ]);

      return formatUnits(amountOut as bigint, 18);
    } catch (error) {
      console.error('[BaseRPC] Failed to get Uniswap V3 quote:', error);
      throw new APIError(`Failed to get Uniswap V3 quote: ${error.message}`);
    }
  }

  async getPairAddress(tokenA: string, tokenB: string, dexName: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const factoryAddress = getFactoryAddress(dexName);
      const contract = getContract({
        address: factoryAddress as Address,
        abi: UNISWAP_V2_FACTORY_ABI,
        client: this.publicClient,
      });

      const pairAddress = await contract.read.getPair([
        tokenA as Address,
        tokenB as Address,
      ]);

      return pairAddress as string;
    } catch (error) {
      console.error('[BaseRPC] Failed to get pair address:', error);
      throw new APIError(`Failed to get pair address: ${error.message}`);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        client: this.publicClient,
      });

      const [name, symbol, decimals] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.decimals(),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      };
    } catch (error) {
      console.error('[BaseRPC] Failed to get token info:', error);
      throw new APIError(`Failed to get token info: ${error.message}`);
    }
  }

  async getAllowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        client: this.publicClient,
      });

      const allowance = await contract.read.allowance([
        owner as Address,
        spender as Address,
      ]);

      const decimals = await contract.read.decimals();
      return formatUnits(allowance as bigint, decimals as number);
    } catch (error) {
      console.error('[BaseRPC] Failed to get allowance:', error);
      throw new APIError(`Failed to get allowance: ${error.message}`);
    }
  }

  async batchCall(calls: Array<{
    target: string;
    callData: string;
    allowFailure?: boolean;
  }>): Promise<Array<{ success: boolean; returnData: string }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const contract = getContract({
        address: CONTRACT_ADDRESSES.MULTICALL3 as Address,
        abi: MULTICALL3_ABI,
        client: this.publicClient,
      });

      const multicallCalls = calls.map(call => ({
        target: call.target as Address,
        allowFailure: call.allowFailure ?? true,
        callData: call.callData as `0x${string}`,
      }));

      const results = await contract.read.aggregate3([multicallCalls]);
      
      return (results as Array<{ success: boolean; returnData: string }>);
    } catch (error) {
      console.error('[BaseRPC] Failed to execute batch call:', error);
      throw new APIError(`Failed to execute batch call: ${error.message}`);
    }
  }

  // Wallet client methods
  setWalletClient(walletClient: any) {
    this.walletClient = walletClient;
  }

  async getCurrentGasPrice(): Promise<bigint> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const gasPrice = await this.publicClient.getGasPrice();
      return gasPrice;
    } catch (error) {
      console.error('[BaseRPC] Failed to get gas price:', error);
      throw new APIError(`Failed to get gas price: ${error.message}`);
    }
  }

  async getLatestBlock(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const block = await this.publicClient.getBlock({ blockTag: 'latest' });
      return block;
    } catch (error) {
      console.error('[BaseRPC] Failed to get latest block:', error);
      throw new APIError(`Failed to get latest block: ${error.message}`);
    }
  }
}
