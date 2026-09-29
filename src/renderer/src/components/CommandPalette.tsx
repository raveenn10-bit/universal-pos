import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Barcode, 
  Package, 
  Users, 
  Wrench, 
  Truck, 
  Wallet, 
  BarChart3, 
  Settings, 
  Moon, 
  Sun, 
  Zap, 
  Lock,
  X,
  Layers,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';

import { UserSession } from '../../../shared/types';
import { hasPermission, TAB_PERMISSIONS } from '../../../shared/permissions';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: any) => void;
  onOpenPassport: () => void;
  onLockScreen: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  user?: UserSession | null;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenPassport,
  onLockScreen,
  isDark,
  onToggleDark,
  user,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
      // Fetch products for quick search if user has catalog permission
      const canAccessCatalog = hasPermission(user || null, ['catalog.manage', 'inventory.manage', 'pos.billing', '*']);
      const api = (window as any).apexApi;
      if (canAccessCatalog && api?.catalog?.searchProducts) {
        api.catalog.searchProducts().then((res: any[]) => setProducts(res || []));
      } else {
        setProducts([]);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const defaultCommands: { id: string; title: string; icon: any; category: string; perm?: string | string[]; action: () => void }[] = [
    { id: 'checkout', title: 'Open Fast Checkout (F1)', icon: Zap, category: 'Sales & POS', perm: TAB_PERMISSIONS.checkout, action: () => { onSelectTab('checkout'); onClose(); } },
    { id: 'passport', title: 'Hardware Trace & IMEI / Serial Passport (F4)', icon: Barcode, category: 'Hardware Intelligence', perm: ['pos.billing', 'catalog.manage', 'repairs.manage', '*'], action: () => { onClose(); onOpenPassport(); } },
    { id: 'lock', title: 'Lock Register / Lock Screen (Ctrl+L)', icon: Lock, category: 'Security', action: () => { onClose(); onLockScreen(); } },
    { id: 'dashboard', title: 'Dashboard & Core Business KPIs', icon: ShoppingCart, category: 'Navigation', perm: TAB_PERMISSIONS.dashboard, action: () => { onSelectTab('dashboard'); onClose(); } },
    { id: 'products', title: 'Products & Inventory Catalog', icon: Package, category: 'Navigation', perm: TAB_PERMISSIONS.products, action: () => { onSelectTab('products'); onClose(); } },
    { id: 'customers', title: 'Customer Ledger & Balances', icon: Users, category: 'Navigation', perm: TAB_PERMISSIONS.customers, action: () => { onSelectTab('customers'); onClose(); } },
    { id: 'orders', title: 'Orders & Tax Invoices History', icon: FileText, category: 'Navigation', perm: TAB_PERMISSIONS.orders, action: () => { onSelectTab('orders'); onClose(); } },
    { id: 'purchases', title: 'Supplier Purchases & Inward Intake', icon: Truck, category: 'Navigation', perm: TAB_PERMISSIONS.purchases, action: () => { onSelectTab('purchases'); onClose(); } },
    { id: 'expenses', title: 'Operating Expenses & Petty Cash', icon: Wallet, category: 'Navigation', perm: TAB_PERMISSIONS.expenses, action: () => { onSelectTab('expenses'); onClose(); } },
    { id: 'repairs', title: 'Repairs & Technical Workflows', icon: Wrench, category: 'Navigation', perm: TAB_PERMISSIONS.repairs, action: () => { onSelectTab('repairs'); onClose(); } },
    { id: 'tradein', title: 'Trade-In / Device Exchange System', icon: RefreshCw, category: 'Navigation', perm: TAB_PERMISSIONS.tradein, action: () => { onSelectTab('tradein'); onClose(); } },
    { id: 'staff', title: 'Staff Accounts & Granular Roles', icon: ShieldCheck, category: 'Navigation', perm: TAB_PERMISSIONS.staff, action: () => { onSelectTab('staff'); onClose(); } },
    { id: 'reports', title: 'Reports & P&L Statement', icon: BarChart3, category: 'Navigation', perm: TAB_PERMISSIONS.reports, action: () => { onSelectTab('reports'); onClose(); } },
    { id: 'templates', title: 'Document & Receipt Template Editor', icon: Layers, category: 'Navigation', perm: TAB_PERMISSIONS.templates, action: () => { onSelectTab('templates'); onClose(); } },
    { id: 'settings', title: 'System & Business Profile Settings', icon: Settings, category: 'Navigation', perm: TAB_PERMISSIONS.settings, action: () => { onSelectTab('settings'); onClose(); } },
    { id: 'theme', title: `Toggle Theme (${isDark ? 'Switch to Light' : 'Switch to Dark'})`, icon: isDark ? Sun : Moon, category: 'Appearance', action: () => { onToggleDark(); onClose(); } },
  ];

  const permittedCommands = defaultCommands.filter(c => {
    if (!c.perm) return true;
    return hasPermission(user || null, c.perm);
  });

  const matchedCommands = permittedCommands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const matchedProducts = query.trim().length > 1
    ? products.filter(p =>
        (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const allItems = [
    ...matchedCommands.map(c => ({ type: 'command' as const, data: c })),
    ...matchedProducts.map(p => ({ type: 'product' as const, data: p })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        if (current.type === 'command') {
          current.data.action();
        } else {
          onSelectTab('products');
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 select-none animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar */}
        <div className="relative border-b border-slate-100 dark:border-slate-700 px-5 py-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, jump to view, or search products... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2.5 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No matching commands or products found for "{query}"
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.type === 'command') {
                const Icon = item.data.icon;
                return (
                  <button
                    key={`cmd-${item.data.id}`}
                    onClick={item.data.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a4cd2] text-white shadow-md'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">{item.data.title}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    }`}>
                      {item.data.category}
                    </span>
                  </button>
                );
              } else {
                const prod = item.data;
                return (
                  <button
                    key={`prod-${prod.id}`}
                    onClick={() => {
                      onSelectTab('products');
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a4cd2] text-white shadow-md'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1a4cd2] dark:bg-blue-900/30'}`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{prod.name}</div>
                        <div className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          SKU: {prod.sku} | Barcode: {prod.barcode || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-black">
                        LKR {((prod.sellingPriceMinor || 0) / 100).toLocaleString()}
                      </div>
                      <div className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-emerald-500'}`}>
                        In Catalog
                      </div>
                    </div>
                  </button>
                );
              }
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">Enter</kbd> to select</span>
          </div>
          <span>Harsh Apex Universal Command Engine</span>
        </div>
      </div>
    </div>
  );
};
