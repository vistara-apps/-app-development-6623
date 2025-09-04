import { 
  ITradeExecutor,
  Token,
  PriceQuote,
  Trade,
  APIError,
  SlippageExceededError,
  InsufficientLiquidityError
} from '../types';
import { BaseRPCService } from './BaseRPCService';
import { DexAggregatorService } from './DexAggregatorService';
import { getRouterAddress, getRouterABI, CONTRACT_ADDRESSES } from './contracts/dexContracts';
import { calculateMinimumOutput, formatTokenAmount, parseTokenAmount } from '../utils/priceCalculations';
import { config } from '../config/api';

export class TradeExecutionService implements ITradeExecutor {
  private baseRPCService: BaseRPCService;
  private aggregatorService: DexAggregatorService;
  private isInitialized = false;

  constructor(
    baseRPCService: BaseRPCService,
    aggregatorService: DexAggregatorService
  ) {
    this.baseRPCService = baseRPCService;
    this.aggregatorService = aggregatorService;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.baseRPCService.initialize(),
        this.aggregatorService.initialize()
      ]);
      this.isInitialized = true;
      console.log('[TradeExecution] Service initialized successfully');
    } catch (error) {
      console.error('[TradeExecution] Failed to initialize:', error);
      throw error;
    }
  }

  async executeTrade(
    quote: PriceQuote,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<Trade> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`[TradeExecution] Executing trade: ${quote.inputAmount} ${quote.route.path[0].symbol} -> ${quote.route.path[1].symbol}`);

      // Step 1: Validate the trade
      const validation = await this.validateTrade(
        quote.route.path[0],
        quote.route.path[1],
        quote.inputAmount,
        walletAddress
      );

      if (!validation.valid) {
        throw new Error(validation.error || 'Trade validation failed');
      }

      // Step 2: Check and approve token allowance if needed
      await this.ensureTokenApproval(
        quote.route.path[0],
        walletAddress,
        quote.inputAmount,
        quote.route.dex
      );

      // Step 3: Execute the swap
      const txHash = await this.executeSwap(quote, walletAddress, slippageTolerance);

      // Step 4: Create trade record
      const trade: Trade = {
        tradeId: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: walletAddress,
        stablecoinIn: quote.route.path[0].symbol,
        stablecoinOut: quote.route.path[1].symbol,
        amountIn: parseFloat(quote.inputAmount),
        amountOut: parseFloat(quote.outputAmount),
        executionPrice: quote.executionPrice,
        dexUsed: quote.route.dex,
        timestamp: Date.now(),
        status: 'pending',
        txHash
      };

      console.log(`[TradeExecution] Trade executed successfully: ${txHash}`);
      return trade;

    } catch (error) {
      console.error('[TradeExecution] Failed to execute trade:', error);
      throw error;
    }
  }

  async estimateTradeGas(quote: PriceQuote): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const transaction = await this.buildSwapTransaction(quote, '0x0000000000000000000000000000000000000000', 0.5);
      const gasEstimate = await this.baseRPCService.estimateGas(transaction);
      return gasEstimate.toString();
    } catch (error) {
      console.error('[TradeExecution] Failed to estimate gas:', error);
      throw new APIError(`Failed to estimate gas: ${error.message}`);
    }
  }

  async validateTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    walletAddress: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`[TradeExecution] Validating trade: ${amountIn} ${tokenIn.symbol} -> ${tokenOut.symbol}`);

      // Check if tokens are valid stablecoins
      if (!this.isValidStablecoin(tokenIn) || !this.isValidStablecoin(tokenOut)) {
        return { valid: false, error: 'Only stablecoin swaps are supported' };
      }

      // Check wallet balance
      const balance = await this.baseRPCService.getTokenBalance(tokenIn.address, walletAddress);
      const balanceNumber = parseFloat(balance);
      const amountNumber = parseFloat(amountIn);

      if (balanceNumber < amountNumber) {
        return { 
          valid: false, 
          error: `Insufficient balance. Available: ${balance} ${tokenIn.symbol}, Required: ${amountIn} ${tokenIn.symbol}` 
        };
      }

      // Check if pair exists and has liquidity
      const pairValid = await this.aggregatorService.validatePair(tokenIn, tokenOut);
      if (!pairValid) {
        return { valid: false, error: 'No liquidity available for this trading pair' };
      }

      // Check minimum trade amount (e.g., $1 minimum)
      if (amountNumber < 1) {
        return { valid: false, error: 'Minimum trade amount is $1' };
      }

      // Check maximum trade amount (e.g., $100k maximum for safety)
      if (amountNumber > 100000) {
        return { valid: false, error: 'Maximum trade amount is $100,000' };
      }

      return { valid: true };

    } catch (error) {
      console.error('[TradeExecution] Trade validation failed:', error);
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
  }

  // Private helper methods

  private async ensureTokenApproval(
    token: Token,
    walletAddress: string,
    amount: string,
    dexName: string
  ): Promise<void> {
    try {
      const routerAddress = getRouterAddress(dexName);
      const currentAllowance = await this.baseRPCService.getAllowance(
        token.address,
        walletAddress,
        routerAddress
      );

      const requiredAmount = parseFloat(amount);
      const currentAllowanceNumber = parseFloat(currentAllowance);

      if (currentAllowanceNumber < requiredAmount) {
        console.log(`[TradeExecution] Insufficient allowance. Approving ${amount} ${token.symbol}`);
        
        // For security, approve exact amount needed
        const approvalAmount = parseTokenAmount(amount, token.decimals);
        
        // Build approval transaction
        const approvalTx = {
          to: token.address,
          data: this.encodeApprovalData(routerAddress, approvalAmount),
          from: walletAddress,
        };

        // Send approval transaction
        const approvalHash = await this.baseRPCService.sendTransaction(approvalTx);
        console.log(`[TradeExecution] Approval transaction sent: ${approvalHash}`);

        // Wait for approval confirmation
        await this.baseRPCService.waitForTransaction(approvalHash);
        console.log(`[TradeExecution] Approval confirmed: ${approvalHash}`);
      }
    } catch (error) {
      console.error('[TradeExecution] Failed to ensure token approval:', error);
      throw new APIError(`Failed to approve token: ${error.message}`);
    }
  }

  private async executeSwap(
    quote: PriceQuote,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<string> {
    try {
      const transaction = await this.buildSwapTransaction(quote, walletAddress, slippageTolerance);
      
      // Estimate gas and add buffer
      const gasEstimate = await this.baseRPCService.estimateGas(transaction);
      transaction.gas = gasEstimate;

      // Get current gas price
      const gasPrice = await this.baseRPCService.getCurrentGasPrice();
      transaction.gasPrice = gasPrice;

      // Send transaction
      const txHash = await this.baseRPCService.sendTransaction(transaction);
      console.log(`[TradeExecution] Swap transaction sent: ${txHash}`);

      return txHash;
    } catch (error) {
      console.error('[TradeExecution] Failed to execute swap:', error);
      throw new APIError(`Failed to execute swap: ${error.message}`);
    }
  }

  private async buildSwapTransaction(
    quote: PriceQuote,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<any> {
    const { route } = quote;
    const tokenIn = route.path[0];
    const tokenOut = route.path[1];
    const dexName = route.dex;

    const routerAddress = getRouterAddress(dexName);
    const minimumOutput = calculateMinimumOutput(quote.outputAmount, slippageTolerance);
    
    // Deadline: 20 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 1200;

    if (dexName.toLowerCase() === 'uniswap v3') {
      return this.buildUniswapV3SwapTransaction(
        tokenIn,
        tokenOut,
        quote.inputAmount,
        minimumOutput,
        walletAddress,
        deadline
      );
    } else {
      return this.buildUniswapV2SwapTransaction(
        tokenIn,
        tokenOut,
        quote.inputAmount,
        minimumOutput,
        walletAddress,
        deadline,
        dexName
      );
    }
  }

  private buildUniswapV3SwapTransaction(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    minimumAmountOut: string,
    recipient: string,
    deadline: number
  ): any {
    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      fee: 3000, // 0.3% fee tier
      recipient,
      deadline,
      amountIn: parseTokenAmount(amountIn, tokenIn.decimals),
      amountOutMinimum: parseTokenAmount(minimumAmountOut, tokenOut.decimals),
      sqrtPriceLimitX96: 0 // No price limit
    };

    return {
      to: CONTRACT_ADDRESSES.UNISWAP_V3_ROUTER,
      data: this.encodeUniswapV3SwapData(params),
      from: recipient,
    };
  }

  private buildUniswapV2SwapTransaction(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    minimumAmountOut: string,
    recipient: string,
    deadline: number,
    dexName: string
  ): any {
    const routerAddress = getRouterAddress(dexName);
    const path = [tokenIn.address, tokenOut.address];
    
    const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals);
    const amountOutMinWei = parseTokenAmount(minimumAmountOut, tokenOut.decimals);

    return {
      to: routerAddress,
      data: this.encodeUniswapV2SwapData(
        amountInWei,
        amountOutMinWei,
        path,
        recipient,
        deadline
      ),
      from: recipient,
    };
  }

  private encodeApprovalData(spender: string, amount: bigint): string {
    // ERC20 approve function signature: approve(address,uint256)
    const functionSignature = '0x095ea7b3';
    const paddedSpender = spender.slice(2).padStart(64, '0');
    const paddedAmount = amount.toString(16).padStart(64, '0');
    
    return `${functionSignature}${paddedSpender}${paddedAmount}`;
  }

  private encodeUniswapV3SwapData(params: any): string {
    // Simplified encoding - in production, use proper ABI encoding
    const functionSignature = '0x414bf389'; // exactInputSingle signature
    // This is a simplified implementation - use proper ABI encoding in production
    return functionSignature;
  }

  private encodeUniswapV2SwapData(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number
  ): string {
    // Simplified encoding - in production, use proper ABI encoding
    const functionSignature = '0x38ed1739'; // swapExactTokensForTokens signature
    // This is a simplified implementation - use proper ABI encoding in production
    return functionSignature;
  }

  private isValidStablecoin(token: Token): boolean {
    const validStablecoins = ['USDC', 'USDT', 'DAI', 'FRAX'];
    return validStablecoins.includes(token.symbol.toUpperCase());
  }

  // Public utility methods

  async getTradeHistory(walletAddress: string, limit: number = 50): Promise<Trade[]> {
    // In a real implementation, this would fetch from a database or indexer
    // For now, return empty array
    return [];
  }

  async cancelTrade(tradeId: string): Promise<boolean> {
    // In a real implementation, this would attempt to cancel a pending trade
    // This is generally not possible for DEX trades once submitted
    return false;
  }

  async getTradeStatus(txHash: string): Promise<'pending' | 'completed' | 'failed'> {
    try {
      const receipt = await this.baseRPCService.waitForTransaction(txHash);
      return receipt.status === 'success' ? 'completed' : 'failed';
    } catch (error) {
      return 'pending';
    }
  }

  async calculatePriceImpact(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<number> {
    try {
      const quote = await this.aggregatorService.getBestPrice(tokenIn, tokenOut, amountIn);
      return quote.route.priceImpact;
    } catch (error) {
      console.error('[TradeExecution] Failed to calculate price impact:', error);
      return 0;
    }
  }

  async getOptimalSlippage(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<number> {
    try {
      // Calculate optimal slippage based on liquidity and volatility
      const totalLiquidity = await this.aggregatorService.getTotalLiquidity(
        tokenIn.address,
        tokenOut.address
      );

      const amountNumber = parseFloat(amountIn);
      
      // Base slippage of 0.1% for stablecoins
      let optimalSlippage = 0.1;

      // Increase slippage for larger trades relative to liquidity
      if (totalLiquidity > 0) {
        const tradeRatio = amountNumber / totalLiquidity;
        if (tradeRatio > 0.01) { // More than 1% of total liquidity
          optimalSlippage += tradeRatio * 10; // Add proportional slippage
        }
      }

      // Cap at 2% for stablecoins
      return Math.min(optimalSlippage, 2.0);
    } catch (error) {
      console.error('[TradeExecution] Failed to calculate optimal slippage:', error);
      return 0.5; // Default 0.5% slippage
    }
  }
}
