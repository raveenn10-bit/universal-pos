import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Zap, 
  BarChart3, 
  Settings, 
  Clock, 
  Moon, 
  Sun,
  Store,
  Layers,
  Truck,
  Wallet,
  Wrench,
  RefreshCw,
  ShieldCheck,
  Lock,
  Smartphone,
  Headphones,
  Cpu,
  Footprints,
  Shirt,
  ShoppingBag
} from 'lucide-react';
import { BusinessProfileConfig, BusinessProfileType } from '../../../shared/types';

export type NavTab = 
  | 'dashboard' 
  | 'checkout' 
  | 'customers' 
  | 'products' 
  | 'orders' 
  | 'shifts' 
  | 'purchases'
  | 'expenses'
  | 'repairs'
  | 'tradein'
  | 'staff'
  | 'reports' 
  | 'templates' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDark: boolean;
  onToggleDark: () => void;
  businessName: string;
  profileConfig?: BusinessProfileConfig | null;
  onLockScreen?: () => void;
}

const PROFILE_THEMES: Record<string, {
  bgGradient: string;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  accentBadge: string;
  appTitle: string;
  tagline: string;
  icon: any;
}> = {
  GENERAL_RETAIL: {
    bgGradient: 'bg-gradient-to-b from-[#1a4cd2] to-[#133aa8]',
    bgColor: '#1a4cd2',
    iconBg: 'bg-white',
    iconColor: 'text-[#1a4cd2]',
    accentBadge: 'bg-amber-400 text-blue-950',
    appTitle: 'Harsh Apex POS',
    tagline: 'General Retail',
    icon: Store,
  },
  SUPERMARKET: {
    bgGradient: 'bg-gradient-to-b from-[#059669] to-[#047857]',
    bgColor: '#059669',
    iconBg: 'bg-white',
    iconColor: 'text-[#059669]',
    accentBadge: 'bg-emerald-300 text-emerald-950',
    appTitle: 'Harsh Apex Grocery',
    tagline: 'Supermarket & Scale',
    icon: ShoppingBag,
  },
  MOBILE_PHONES: {
    bgGradient: 'bg-gradient-to-b from-[#4338ca] to-[#312e81]',
    bgColor: '#4338ca',
    iconBg: 'bg-white',
    iconColor: 'text-[#4338ca]',
    accentBadge: 'bg-cyan-400 text-slate-950',
    appTitle: 'Harsh Apex Mobile',
    tagline: 'Phones & IMEI Vision',
    icon: Smartphone,
  },
  MOBILE_ACCESSORIES: {
    bgGradient: 'bg-gradient-to-b from-[#7c3aed] to-[#5b21b6]',
    bgColor: '#7c3aed',
    iconBg: 'bg-white',
    iconColor: 'text-[#7c3aed]',
    accentBadge: 'bg-violet-300 text-violet-950',
    appTitle: 'Harsh Apex Accessories',
    tagline: 'Mobile Accessories Hub',
    icon: Headphones,
  },
  ELECTRONICS: {
    bgGradient: 'bg-gradient-to-b from-[#0284c7] to-[#075985]',
    bgColor: '#0284c7',
    iconBg: 'bg-white',
    iconColor: 'text-[#0284c7]',
    accentBadge: 'bg-sky-300 text-slate-950',
    appTitle: 'Harsh Apex Electronics',
    tagline: 'Appliances & Serials',
    icon: Cpu,
  },
  SHOES: {
    bgGradient: 'bg-gradient-to-b from-[#d97706] to-[#92400e]',
    bgColor: '#d97706',
    iconBg: 'bg-white',
    iconColor: 'text-[#d97706]',
    accentBadge: 'bg-amber-300 text-amber-950',
    appTitle: 'Harsh Apex Shoes',
    tagline: 'Footwear & Sizes',
    icon: Footprints,
  },
  BAGS_FASHION: {
    bgGradient: 'bg-gradient-to-b from-[#db2777] to-[#9d174d]',
    bgColor: '#db2777',
    iconBg: 'bg-white',
    iconColor: 'text-[#db2777]',
    accentBadge: 'bg-rose-300 text-rose-950',
    appTitle: 'Harsh Apex Fashion',
    tagline: 'Apparel & Bags',
    icon: Shirt,
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isDark,
  onToggleDark,
  businessName,
  profileConfig,
  onLockScreen,
}) => {
  const activeProfileType = profileConfig?.profileType || 'GENERAL_RETAIL';
  const theme = PROFILE_THEMES[activeProfileType] || PROFILE_THEMES.GENERAL_RETAIL;
  const ProfileIcon = theme.icon;

  const modules = profileConfig?.enabledModules || {
    tradeIns: false,
    warrantyTracking: false,
  };

  // Base navigation items
  const baseItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'checkout', label: 'Fast Checkout', icon: <Zap size={18} />, badge: 'F1' },
    { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
    { id: 'products', label: profileConfig?.terminology?.productLabel || 'Products', icon: <Package size={18} /> },
    { id: 'orders', label: 'Tax Invoices', icon: <ShoppingCart size={18} /> },
    { id: 'shifts', label: 'Cash Shifts', icon: <Clock size={18} /> },
    { id: 'purchases', label: 'Supplier Intake', icon: <Truck size={18} /> },
    { id: 'expenses', label: 'Operating Expenses', icon: <Wallet size={18} /> },
  ];

  // Profile-specific modules (Repairs & Trade-Ins)
  if (modules.warrantyTracking || activeProfileType === 'MOBILE_PHONES' || activeProfileType === 'ELECTRONICS') {
    baseItems.push({ id: 'repairs', label: 'Repairs & Service', icon: <Wrench size={18} />, badge: 'JOB' });
  }

  if (modules.tradeIns || activeProfileType === 'MOBILE_PHONES') {
    baseItems.push({ id: 'tradein', label: 'Trade-In / Buyback', icon: <RefreshCw size={18} /> });
  }

  // Management & Reporting
  baseItems.push(
    { id: 'staff', label: 'Staff & Roles', icon: <ShieldCheck size={18} /> },
    { id: 'reports', label: 'Financial Reports', icon: <BarChart3 size={18} /> },
    { id: 'templates', label: 'Document Editor', icon: <Layers size={18} /> }
  );

  return (
    <aside className={`w-64 ${theme.bgGradient} text-white flex flex-col justify-between shrink-0 h-screen select-none shadow-2xl z-20`}>
      {/* Top Header */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center font-black shadow-lg`}>
              <ProfileIcon size={22} />
            </div>
            <div>
              <span className="font-black text-base tracking-tight block leading-tight truncate max-w-[145px]">
                {businessName || theme.appTitle}
              </span>
              <span className="text-[10px] text-white/70 tracking-wide font-bold block uppercase truncate max-w-[145px]">
                {profileConfig?.displayName || theme.tagline}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links Scrollable */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
          {baseItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white/25 text-white shadow-sm backdrop-blur-md translate-x-1'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`${theme.accentBadge} text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-white/15 space-y-1 bg-black/10">
        {/* Quick Lock Button */}
        {onLockScreen && (
          <button
            onClick={onLockScreen}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Lock size={16} className="text-amber-300" />
              <span>Lock Terminal</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-mono">Ctrl+L</kbd>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-white/80 font-medium">
          <div className="flex items-center gap-2.5">
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
            <span>Dark Theme</span>
          </div>
          <button
            onClick={onToggleDark}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
              isDark ? 'bg-amber-400' : 'bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                isDark ? 'translate-x-5 !bg-blue-950' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Settings Tab */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-white/25 text-white'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Settings size={16} />
          <span>System Settings</span>
        </button>
      </div>
    </aside>
  );
};
