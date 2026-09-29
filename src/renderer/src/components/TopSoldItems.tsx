import React from 'react';
import { Tag } from 'lucide-react';

interface TopSoldItemsProps {
  items: {
    name: string;
    quantity: number;
    percentage: number;
  }[];
}

export const TopSoldItems: React.FC<TopSoldItemsProps> = ({ items }) => {
  const defaultItems = [
    { name: 'Jeans', percentage: 100, color: '#1e40af' },
    { name: 'Jacket', percentage: 80, color: '#eab308' },
    { name: 'Sweater', percentage: 80, color: '#dc2626' },
    { name: 'Cap', percentage: 50, color: '#c026d3' },
    { name: 'T-Shirt', percentage: 70, color: '#10b981' },
  ];

  const colors = ['#1e40af', '#eab308', '#dc2626', '#c026d3', '#10b981'];

  const displayList = items && items.length > 0 ? items.map((it, idx) => ({
    name: it.name,
    percentage: it.percentage,
    color: colors[idx % colors.length],
  })) : defaultItems;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-[360px]">
      <h2 className="text-base font-bold text-slate-800 dark:text-white mb-3">
        Top Sold Items
      </h2>

      <div className="space-y-4 flex-1 flex flex-col justify-around">
        {displayList.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                  <Tag size={13} />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-slate-500 dark:text-slate-400">
                {item.percentage}%
              </span>
            </div>

            {/* Colored Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
