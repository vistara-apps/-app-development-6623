import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Activity, Zap } from 'lucide-react';

const volumeData = [
  { name: 'Mon', volume: 2400, trades: 240 },
  { name: 'Tue', volume: 1398, trades: 139 },
  { name: 'Wed', volume: 9800, trades: 980 },
  { name: 'Thu', volume: 3908, trades: 390 },
  { name: 'Fri', volume: 4800, trades: 480 },
  { name: 'Sat', volume: 3800, trades: 380 },
  { name: 'Sun', volume: 4300, trades: 430 },
];

const liquidityData = [
  { time: '00:00', uniswap: 2400, aerodrome: 1800, baseswap: 950, sushi: 650 },
  { time: '06:00', uniswap: 2450, aerodrome: 1750, baseswap: 980, sushi: 680 },
  { time: '12:00', uniswap: 2380, aerodrome: 1820, baseswap: 920, sushi: 640 },
  { time: '18:00', uniswap: 2420, aerodrome: 1780, baseswap: 960, sushi: 670 },
  { time: '24:00', uniswap: 2400, aerodrome: 1800, baseswap: 950, sushi: 650 },
];

const dexDistribution = [
  { name: 'Uniswap V3', value: 45, color: '#FF6B9D' },
  { name: 'Aerodrome', value: 28, color: '#4ECDC4' },
  { name: 'BaseSwap', value: 18, color: '#45B7D1' },
  { name: 'SushiSwap', value: 9, color: '#96CEB4' },
];

const pairData = [
  { pair: 'USDC/USDT', volume: '$4.2M', liquidity: '$1.8M', change: '+2.4%', apy: '5.2%' },
  { pair: 'USDC/DAI', volume: '$3.1M', liquidity: '$1.2M', change: '+1.8%', apy: '4.7%' },
  { pair: 'USDT/DAI', volume: '$2.8M', liquidity: '$950K', change: '-0.5%', apy: '4.1%' },
  { pair: 'USDC/FRAX', volume: '$1.5M', liquidity: '$680K', change: '+3.2%', apy: '6.8%' },
];

export const LiquidityInsights: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Liquidity</p>
              <p className="text-2xl font-bold text-white">$5.8M</p>
              <p className="text-sm text-green-400">+12.5% this week</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">24h Volume</p>
              <p className="text-2xl font-bold text-white">$12.4M</p>
              <p className="text-sm text-green-400">+8.3% from yesterday</p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Pairs</p>
              <p className="text-2xl font-bold text-white">24</p>
              <p className="text-sm text-gray-400">across 4 DEXs</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg. Slippage</p>
              <p className="text-2xl font-bold text-white">0.02%</p>
              <p className="text-sm text-green-400">Excellent execution</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="lg:col-span-2 glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">7-Day Volume & Trades</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(31, 41, 55, 0.9)', 
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="volume" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* DEX Distribution */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Liquidity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dexDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dexDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(31, 41, 55, 0.9)', 
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {dexDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-300">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Liquidity Trends */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">24h Liquidity Trends by DEX</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={liquidityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(31, 41, 55, 0.9)', 
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Line type="monotone" dataKey="uniswap" stroke="#FF6B9D" strokeWidth={2} />
            <Line type="monotone" dataKey="aerodrome" stroke="#4ECDC4" strokeWidth={2} />
            <Line type="monotone" dataKey="baseswap" stroke="#45B7D1" strokeWidth={2} />
            <Line type="monotone" dataKey="sushi" stroke="#96CEB4" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Top Pairs Table */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Stablecoin Pairs</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Pair</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">24h Volume</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Liquidity</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Change</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">APY</th>
              </tr>
            </thead>
            <tbody>
              {pairData.map((pair, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">{pair.pair}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">{pair.volume}</td>
                  <td className="py-4 px-4 text-gray-300">{pair.liquidity}</td>
                  <td className="py-4 px-4">
                    <span className={pair.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                      {pair.change}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-purple-400 font-medium">{pair.apy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};