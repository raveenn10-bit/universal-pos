import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  CreditCard, 
  ShoppingCart, 
  Zap, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Clock, 
  Moon, 
  Sun,
  Store,
  Layers
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'checkout' 
  | 'customers' 
  | 'products' 
  | 'orders' 
  | 'shifts' 
  | 'reports' 
  | 'templates' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDark: boolean;
  onToggleDark: () => void;
  businessName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isDark,
  onToggleDark,
  businessName,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { id: 'checkout', label: 'Fast Checkout', icon: <Zap size={19} />, badge: 'POS' },
    { id: 'customers', label: 'Customer', icon: <Users size={19} /> },
    { id: 'products', label: 'Products', icon: <Package size={19} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={19} /> },
    { id: 'shifts', label: 'Shifts & Cash', icon: <Clock size={19} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={19} /> },
    { id: 'templates', label: 'Document Editor', icon: <Layers size={19} /> },
  ];

  return (
    <aside className="w-64 bg-[#1a4cd2] text-white flex flex-col justify-between shrink-0 h-screen select-none shadow-xl z-20">
      {/* Top Header */}
      <div>
        <div className="h-20 flex items-center justify-between px-6 border-b border-blue-600/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#1a4cd2] flex items-center justify-center font-black shadow-md">
              <Store size={20} />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight">Harsh Apex</span>
              <span className="text-[11px] text-blue-200/80 tracking-wide font-medium block truncate max-w-[130px]">
                {businessName || 'Universal POS'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm font-semibold backdrop-blur-sm'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-amber-400 text-blue-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-blue-600/30 space-y-1">
        <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider px-4 mb-2">
          Others
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between px-4 py-2 text-sm text-blue-100/90 font-medium">
          <div className="flex items-center gap-3">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
            <span>Dark Mode</span>
          </div>
          <button
            onClick={onToggleDark}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
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
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
            currentTab === 'settings'
              ? 'bg-white/20 text-white font-semibold'
              : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
