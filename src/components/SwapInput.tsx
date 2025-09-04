import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  balance: string;
}

interface SwapInputProps {
  token: Token;
  amount: string;
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: Token) => void;
  tokens: Token[];
  label: string;
}

export const SwapInput: React.FC<SwapInputProps> = ({
  token,
  amount,
  onAmountChange,
  onTokenChange,
  tokens,
  label,
}) => {
  return (
    <div className="glass-effect rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm text-gray-300">Balance: {token.balance}</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-2xl font-semibold text-white placeholder-gray-500 focus:outline-none"
          />
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
        <button
          onClick={() => onAmountChange(token.balance.replace(',', ''))}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Max
        </button>
      </div>
    </div>
  );
};