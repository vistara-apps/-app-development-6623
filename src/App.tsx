import React, { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { SwapInterface } from './components/SwapInterface';
import { LiquidityInsights } from './components/LiquidityInsights';
import { Sidebar } from './components/Sidebar';

function App() {
  const [activeView, setActiveView] = useState<'swap' | 'insights'>('swap');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      <div className="flex">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        <div className="flex-1 ml-64">
          <AppHeader />
          
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              {activeView === 'swap' ? <SwapInterface /> : <LiquidityInsights />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;