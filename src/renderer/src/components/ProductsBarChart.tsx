import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface ProductsBarChartProps {
  data?: any[];
}

export const ProductsBarChart: React.FC<ProductsBarChartProps> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { day: 'Sun', thisWeek: 12000, lastWeek: 19000 },
    { day: 'Mon', thisWeek: 17000, lastWeek: 21000 },
    { day: 'Tue', thisWeek: 21000, lastWeek: 26000 },
    { day: 'Wed', thisWeek: 16000, lastWeek: 20000 },
    { day: 'Thu', thisWeek: 11000, lastWeek: 27000 },
    { day: 'Fri', thisWeek: 8000, lastWeek: 17000 },
    { day: 'Sat', thisWeek: 11000, lastWeek: 26000 },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-[340px]">
      {/* Header & Legend */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Products Views
        </h2>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c026d3]" />
            <span className="text-slate-500 dark:text-slate-400">This Week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e40af]" />
            <span className="text-slate-500 dark:text-slate-400">Last Week</span>
          </div>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <div className="w-full h-64 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }} 
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderRadius: '12px', 
                border: 'none', 
                color: '#fff',
                fontSize: '12px' 
              }} 
            />
            <Bar dataKey="thisWeek" fill="#c026d3" radius={[4, 4, 0, 0]} maxBarSize={9} />
            <Bar dataKey="lastWeek" fill="#1e40af" radius={[4, 4, 0, 0]} maxBarSize={9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
