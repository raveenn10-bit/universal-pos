import React from 'react';
import { Users, Package, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  type: 'customers' | 'products' | 'orders' | 'sales';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  isPositive,
  type,
}) => {
  const configs = {
    customers: {
      icon: <Users size={18} className="text-blue-500" />,
      bgIcon: 'bg-blue-50 dark:bg-blue-900/30',
      sparklineColor: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.1)',
    },
    products: {
      icon: <Package size={18} className="text-amber-500" />,
      bgIcon: 'bg-amber-50 dark:bg-amber-900/30',
      sparklineColor: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.1)',
    },
    orders: {
      icon: <DollarSign size={18} className="text-rose-500" />,
      bgIcon: 'bg-rose-50 dark:bg-rose-900/30',
      sparklineColor: '#f43f5e',
      fillColor: 'rgba(244, 63, 94, 0.1)',
    },
    sales: {
      icon: <ShoppingCart size={18} className="text-emerald-500" />,
      bgIcon: 'bg-emerald-50 dark:bg-emerald-900/30',
      sparklineColor: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.1)',
    },
  };

  const cfg = configs[type];

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-36">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${cfg.bgIcon}`}>
          {cfg.icon}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            isPositive
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          <span>{trend}</span>
        </div>
      </div>

      <div className="flex items-end justify-between mt-2">
        <div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 block mb-0.5">
            {title}
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {value}
          </span>
        </div>

        {/* Decorative Wave SVG Sparkline */}
        <div className="w-24 h-10">
          <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.sparklineColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={cfg.sparklineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0 28 Q 20 10, 40 25 T 80 18 T 100 20 L 100 40 L 0 40 Z"
              fill={`url(#grad-${type})`}
            />
            <path
              d="M0 28 Q 20 10, 40 25 T 80 18 T 100 20"
              fill="none"
              stroke={cfg.sparklineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
