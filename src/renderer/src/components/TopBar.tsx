import React from 'react';
import { 
  Search, 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Zap, 
  Lock, 
  Barcode, 
  Command,
  ShieldAlert
} from 'lucide-react';
import { UserSession, BusinessProfileConfig } from '../../../shared/types';
import { hasPermission } from '../../../shared/permissions';

interface TopBarProps {
  user: UserSession | null;
  onLogout: () => void;
  onQuickCheckout: () => void;
  onOpenPassport: () => void;
  onLockScreen: () => void;
  onOpenCommandPalette: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
  profileConfig?: BusinessProfileConfig | null;
  branding?: any;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onLogout,
  onQuickCheckout,
  onOpenPassport,
  onLockScreen,
  onOpenCommandPalette,
  searchQuery,
  onSearchChange,
  isDark,
  profileConfig,
  branding,
}) => {
  return (
    <header className="h-20 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md shrink-0 select-none shadow-sm">
      {/* Welcome Title & Profile Badge */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {branding?.businessName || profileConfig?.displayName || 'Universal POS'}
            </h1>
            <span className="text-xl" role="img" aria-label="wave">👋</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Terminal Operator: <strong className="text-slate-800 dark:text-slate-100">{user?.fullName || 'Administrator'}</strong>
            {branding?.appName && <span className="ml-2 text-slate-400">({branding.appName})</span>}
          </p>
        </div>
      </div>

      {/* Center Search / Command Palette Input */}
      <div 
        onClick={onOpenCommandPalette}
        className="relative w-96 cursor-pointer group"
      >
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-hover:text-[#1a4cd2] transition-colors">
          <Search size={16} />
        </div>
        <input
          type="text"
          readOnly
          value={searchQuery}
          placeholder="Search products or press Ctrl+K..."
          className="w-full pl-10 pr-16 py-2.5 bg-slate-100 dark:bg-slate-700/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-2xl text-xs placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none cursor-pointer shadow-sm group-hover:border-[#1a4cd2] transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 font-mono text-[10px] text-slate-700 dark:text-slate-200 font-bold">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* F4 IMEI / Hardware Passport */}
        <button
          onClick={onOpenPassport}
          title="Hardware Passport & IMEI Registry (F4)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Barcode size={15} className="text-[#1a4cd2] dark:text-blue-400" />
          <span>F4 Passport</span>
        </button>

        {/* Quick Checkout POS Action - only if user has pos.billing, pos.checkout, or * */}
        {hasPermission(user, ['pos.billing', 'pos.checkout', '*']) && (
          <button
            onClick={onQuickCheckout}
            className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Zap size={15} className="fill-amber-300 text-amber-300" />
            <span>New Sale (F1)</span>
          </button>
        )}

        {/* Lock Screen Button */}
        <button
          onClick={onLockScreen}
          title="Lock Terminal (Ctrl+L)"
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors shadow-sm cursor-pointer"
        >
          <Lock size={16} />
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={16} />}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-slate-800 dark:text-white leading-tight">
              {user?.fullName || 'Harsh Apex Owner'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {user?.role || 'owner'}
            </span>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out / Switch User"
            className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 cursor-pointer ml-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
