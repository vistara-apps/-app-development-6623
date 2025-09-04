import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, Bell, Settings } from 'lucide-react';

export const AppHeader: React.FC = () => {
  return (
    <header className="glass-effect border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">StableSwap Scout</h1>
          <span className="text-sm text-gray-300 bg-purple-600/20 px-2 py-1 rounded-full">
            Base Network
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tokens..."
              className="glass-effect pl-10 pr-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
            />
          </div>
          
          <button className="glass-effect p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          <button className="glass-effect p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          <ConnectButton />
        </div>
      </div>
    </header>
  );
};