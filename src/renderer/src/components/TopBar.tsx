import React from 'react';
import { Search, Bell, LogOut, User as UserIcon, Zap } from 'lucide-react';
import { UserSession } from '../../../shared/types';

interface TopBarProps {
  user: UserSession | null;
  onLogout: () => void;
  onQuickCheckout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onLogout,
  onQuickCheckout,
  searchQuery,
  onSearchChange,
  isDark,
}) => {
  return (
    <header className="h-20 flex items-center justify-between px-8 bg-transparent shrink-0">
      {/* Welcome Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          Welcome back!
        </h1>
        <span className="text-2xl" role="img" aria-label="wave">👋</span>
      </div>

      {/* Center Search Input */}
      <div className="relative w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your products..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white border border-slate-200/80 dark:border-slate-700 rounded-full text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a4cd2] focus:border-transparent shadow-sm transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Checkout POS Action */}
        <button
          onClick={onQuickCheckout}
          className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <Zap size={16} className="fill-amber-300 text-amber-300" />
          <span>New Sale (F1)</span>
        </button>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 transition-colors">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Chip */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={18} />}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-sm font-bold text-slate-800 dark:text-white leading-tight">
              {user?.fullName || 'Rakibul Hasan'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {user?.role || 'Owner'}
            </span>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 ml-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
