import React, { useState } from 'react';
import { Search, Filter, ShoppingBag } from 'lucide-react';

interface RecentOrdersTableProps {
  orders: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    totalMinor: number;
    saleDate: string;
    status: string;
  }[];
  onSelectOrder?: (id: string) => void;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders, onSelectOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const displayOrders = orders && orders.length > 0 ? orders : [
    { id: '1', invoiceNumber: '#123424', customerName: 'Zara Khan', totalMinor: 23000, saleDate: '2026-08-05T10:00:00Z', status: 'Pending' },
    { id: '2', invoiceNumber: '#123424', customerName: 'Hasan Ali', totalMinor: 23000, saleDate: '2026-08-05T10:00:00Z', status: 'Completed' },
    { id: '3', invoiceNumber: '#123424', customerName: 'Rakib khan', totalMinor: 23000, saleDate: '2026-08-05T10:00:00Z', status: 'Pending' },
    { id: '4', invoiceNumber: '#123424', customerName: 'Rakibul khan', totalMinor: 23000, saleDate: '2026-08-05T10:00:00Z', status: 'Completed' },
  ];

  const filtered = displayOrders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-[360px]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          All Orders
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative w-44">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full focus:outline-none focus:ring-1 focus:ring-[#1a4cd2]"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100">
            <Filter size={13} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
              <th className="pb-3 pl-2">Product</th>
              <th className="pb-3">Order ID</th>
              <th className="pb-3">Customers</th>
              <th className="pb-3">Price</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
            {filtered.map((item, idx) => (
              <tr 
                key={item.id + idx}
                onClick={() => onSelectOrder?.(item.id)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                <td className="py-2.5 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <ShoppingBag size={16} />
                  </div>
                </td>
                <td className="py-2.5 font-bold text-slate-700 dark:text-slate-200">
                  {item.invoiceNumber}
                </td>
                <td className="py-2.5 font-medium text-slate-600 dark:text-slate-300">
                  {item.customerName}
                </td>
                <td className="py-2.5 font-bold text-slate-800 dark:text-white">
                  ${(item.totalMinor / 100).toFixed(2)}
                </td>
                <td className="py-2.5 text-slate-400">
                  {new Date(item.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
                      item.status.toLowerCase() === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
