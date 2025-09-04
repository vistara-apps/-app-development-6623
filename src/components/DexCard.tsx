import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Dex {
  name: string;
  price: string;
  liquidity: string;
  fee: string;
  logo: string;
}

interface DexCardProps {
  dex: Dex;
  isSelected?: boolean;
}

export const DexCard: React.FC<DexCardProps> = ({ dex, isSelected = false }) => {
  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isSelected
          ? 'bg-green-600/20 border-green-500/50'
          : 'glass-effect border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-xl">{dex.logo}</span>
          <div>
            <h4 className="font-semibold text-white text-sm">{dex.name}</h4>
            <p className="text-xs text-gray-400">Fee: {dex.fee}</p>
          </div>
        </div>
        {isSelected && <CheckCircle className="w-5 h-5 text-green-400" />}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Price:</span>
          <span className="text-white font-medium">{dex.price}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Liquidity:</span>
          <span className="text-white font-medium">{dex.liquidity}</span>
        </div>
      </div>
    </div>
  );
};