import React, { useState } from 'react';
import { SwapInput } from './SwapInput';
import { SwapOutput } from './SwapOutput';
import { Button } from './Button';
import { DexCard } from './DexCard';
import { ArrowDownUp, Zap, Shield, TrendingDown } from 'lucide-react';
import { usePaymentContext } from '../hooks/usePaymentContext';

const STABLECOINS = [
  { symbol: 'USDC', name: 'USD Coin', balance: '1,234.56' },
  { symbol: 'USDT', name: 'Tether USD', balance: '856.78' },
  { symbol: 'DAI', name: 'Dai Stablecoin', balance: '2,100.00' },
  { symbol: 'FRAX', name: 'Frax', balance: '450.25' },
];

const DEX_DATA = [
  { name: 'Uniswap V3', price: '0.9998', liquidity: '$2.4M', fee: '0.05%', logo: '🦄' },
  { name: 'Aerodrome', price: '0.9997', liquidity: '$1.8M', fee: '0.04%', logo: '✈️' },
  { name: 'BaseSwap', price: '0.9996', liquidity: '$950K', fee: '0.25%', logo: '🔷' },
  { name: 'SushiSwap', price: '0.9995', liquidity: '$650K', fee: '0.30%', logo: '🍣' },
];

export const SwapInterface: React.FC = () => {
  const [fromToken, setFromToken] = useState(STABLECOINS[0]);
  const [toToken, setToToken] = useState(STABLECOINS[1]);
  const [fromAmount, setFromAmount] = useState('1000');
  const [paid, setPaid] = useState(false);
  const { createSession } = usePaymentContext();

  const bestPrice = DEX_DATA[0];
  const estimatedOutput = (parseFloat(fromAmount) * parseFloat(bestPrice.price)).toFixed(2);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleExecuteTrade = async () => {
    try {
      await createSession();
      setPaid(true);
      // Simulate trade execution
      setTimeout(() => {
        alert(`Successfully swapped ${fromAmount} ${fromToken.symbol} for ${estimatedOutput} ${toToken.symbol}`);
        setPaid(false);
      }, 2000);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment required to execute trade');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Swap Interface */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Swap Stablecoins</h2>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Best Rate</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <SwapInput
              token={fromToken}
              amount={fromAmount}
              onAmountChange={setFromAmount}
              onTokenChange={setFromToken}
              tokens={STABLECOINS}
              label="From"
            />
            
            <div className="flex justify-center">
              <button
                onClick={handleSwapTokens}
                className="glass-effect p-3 rounded-lg hover:bg-white/20 transition-colors"
              >
                <ArrowDownUp className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            
            <SwapOutput
              token={toToken}
              amount={estimatedOutput}
              onTokenChange={setToToken}
              tokens={STABLECOINS}
              bestPrice={bestPrice}
            />
          </div>
          
          <div className="mt-6 p-4 glass-effect rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Rate</span>
              <span className="text-white">1 {fromToken.symbol} = {bestPrice.price} {toToken.symbol}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-300">Network Fee</span>
              <span className="text-white">~$2.45</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-300">Platform Fee</span>
              <span className="text-white">$0.001</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-300">Slippage</span>
              <span className="text-green-400">0.02%</span>
            </div>
          </div>
          
          <Button
            variant="primary"
            onClick={handleExecuteTrade}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full mt-6"
          >
            {paid ? 'Executing Trade...' : 'Execute Trade ($0.001)'}
          </Button>
        </div>
        
        {/* Route Optimization */}
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Route Optimization</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg border border-green-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white font-medium">Direct Route</span>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-semibold">Best Price</div>
                <div className="text-sm text-gray-300">{bestPrice.name}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 glass-effect rounded-lg opacity-60">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-300">Split Route (2 hops)</span>
              </div>
              <div className="text-right">
                <div className="text-gray-400">0.9994</div>
                <div className="text-sm text-gray-500">Multi-DEX</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* DEX Comparison */}
      <div className="space-y-6">
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">DEX Comparison</h3>
          </div>
          
          <div className="space-y-3">
            {DEX_DATA.map((dex, index) => (
              <DexCard key={dex.name} dex={dex} isSelected={index === 0} />
            ))}
          </div>
        </div>
        
        {/* Market Stats */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Market Stats</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">24h Volume</span>
              <span className="text-white font-semibold">$12.4M</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Liquidity</span>
              <span className="text-white font-semibold">$5.8M</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Active DEXs</span>
              <span className="text-white font-semibold">4</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Avg. Slippage</span>
              <span className="text-green-400 font-semibold">0.02%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};