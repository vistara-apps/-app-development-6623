import React from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  balance: string;
}

interface BestPrice {
  name: string;
  price: string;
  liquidity: string;
  fee: string;
}

interface SwapOutputProps {
  token: Token;
  amount: string;
  onTokenChange: (token: Token) => void;
  tokens: Token[];
  bestPrice: BestPrice;
}

export const SwapOutput: React.FC<SwapOutputProps> = ({
  token,
  amount,
  onTokenChange,
  tokens,
  bestPrice,
}) => {
  return (
    <div className="glass-effect rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-300">To (estimated)</span>
        <div className="flex items-center space-x-1 text-sm text-green-400">
          <TrendingUp className="w-3 h-3" />
          <span>Best on {bestPrice.name}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="text-2xl font-semibold text-white">
            {amount || '0.00'}
          </div>
        </div>
        
        <div className="relative">
          <select
            value={token.symbol}
            onChange={(e) => {
              const selected = tokens.find(t => t.symbol === e.target.value);
              if (selected) onTokenChange(selected);
            }}
            className="appearance-none bg-white/10 text-white font-semibold pl-4 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {tokens.map((t) => (
              <option key={t.symbol} value={t.symbol} className="bg-gray-800">
                {t.symbol}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-400">~${(parseFloat(amount) || 0).toFixed(2)}</span>
        <div className="text-sm text-gray-300">
          Fee: {bestPrice.fee}
        </div>
      </div>
    </div>
  );
};