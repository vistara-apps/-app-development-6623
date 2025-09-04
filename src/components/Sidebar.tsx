import React from 'react';
import { ArrowLeftRight, BarChart3, TrendingUp, Wallet, History, Shield } from 'lucide-react';

interface SidebarProps {
  activeView: 'swap' | 'insights';
  onViewChange: (view: 'swap' | 'insights') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const menuItems = [
    { id: 'swap', icon: ArrowLeftRight, label: 'Swap', view: 'swap' as const },
    { id: 'insights', icon: BarChart3, label: 'Liquidity Insights', view: 'insights' as const },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'security', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 glass-effect border-r border-white/10 p-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">StableSwap</h2>
          <p className="text-sm text-gray-400">Scout</p>
        </div>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view === activeView;
          const isClickable = item.view !== undefined;
          
          return (
            <button
              key={item.id}
              onClick={() => item.view && onViewChange(item.view)}
              disabled={!isClickable}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-600/30 text-white border border-purple-500/30'
                  : isClickable
                  ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                  : 'text-gray-500 cursor-not-allowed'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="absolute bottom-6 left-6 right-6">
        <div className="glass-effect p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-white mb-2">Pro Tip</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Enable gas optimization to save up to 15% on transaction costs when swapping stablecoins.
          </p>
        </div>
      </div>
    </div>
  );
};