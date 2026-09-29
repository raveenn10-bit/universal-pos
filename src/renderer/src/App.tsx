import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MetricCard } from './components/MetricCard';
import { SalesChart } from './components/SalesChart';
import { ProductsBarChart } from './components/ProductsBarChart';
import { RecentOrdersTable } from './components/RecentOrdersTable';
import { TopSoldItems } from './components/TopSoldItems';
import { FastCheckoutScreen } from './components/FastCheckoutScreen';
import { TemplateEditor } from './components/TemplateEditor';
import { SettingsView } from './components/SettingsView';
import { InitialProvisioningWizard } from './components/InitialProvisioningWizard';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { OrdersView } from './components/OrdersView';
import { ShiftsView } from './components/ShiftsView';
import { ReportsView } from './components/ReportsView';
import { PurchasesView } from './components/PurchasesView';
import { ExpensesView } from './components/ExpensesView';
import { RepairsView } from './components/RepairsView';
import { TradeInView } from './components/TradeInView';
import { StaffRolesView } from './components/StaffRolesView';
import { LockScreenModal } from './components/LockScreenModal';
import { DevicePassportModal } from './components/DevicePassportModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginScreen } from './components/LoginScreen';
import { UserSession, BusinessProfileConfig } from '../../shared/types';
import { 
  Zap, 
  Package, 
  Users, 
  Clock, 
  FileText, 
  BarChart3, 
  Truck,
  Wallet,
  Wrench,
  RefreshCw,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export const App: React.FC = () => {
  const [isProvisioned, setIsProvisioned] = useState<boolean | null>(null);
  const [storeBranding, setStoreBranding] = useState<any>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);
  const [profileConfig, setProfileConfig] = useState<BusinessProfileConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState<any>(null);

  // Security & Modal States
  const [isLocked, setIsLocked] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  // Global Keyboard Shortcuts (F1, F4, Ctrl+K, Ctrl+L, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if on Login or Setup
      if (hasUsers === false || !user) return;

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('checkout');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsPassportOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUsers, user]);

  const checkInitialState = async () => {
    try {
      const api = (window as any).apexApi;

      // 1. Check if store is already provisioned
      if (api?.provision?.isStoreProvisioned) {
        const prov = await api.provision.isStoreProvisioned();
        setIsProvisioned(prov);
        if (!prov) {
          // Terminal needs developer 1-time provisioning wizard first
          return;
        }
        const branding = await api.provision.getStoreBranding();
        setStoreBranding(branding);
      } else {
        setIsProvisioned(true);
      }
      
      // 2. Load business profile configuration
      if (api?.license?.getActiveProfileConfig) {
        const cfg = await api.license.getActiveProfileConfig();
        setProfileConfig(cfg);
        if (api?.window?.setTitle && cfg) {
          api.window.setTitle(`${storeBranding?.appName || 'Harsh Apex Universal POS'} - [${cfg.displayName}]`);
        }
      }

      // 3. Check users and auto-login if default owner exists
      if (api?.auth?.checkHasUsers) {
        const usersExist = await api.auth.checkHasUsers();
        setHasUsers(usersExist);
        if (usersExist) {
          try {
            const session = await api.auth.login({ username: 'harshapex', password: 'chami2003' });
            setUser(session);
          } catch {
            setUser(null);
          }
          loadDashboardMetrics();
        }
      } else {
        // Fallback for browser-only environment
        setHasUsers(true);
        setUser({
          userId: 'usr_harshapex_owner',
          username: 'harshapex',
          fullName: 'Harsh Apex Administrator',
          role: 'owner',
          token: 'active_production_token',
          permissions: ['*'],
        });
      }
    } catch (e) {
      console.error('Initial state error:', e);
      setHasUsers(true);
      setIsProvisioned(true);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      const api = (window as any).apexApi;
      if (api?.reports?.getDashboardMetrics) {
        const m = await api.reports.getDashboardMetrics();
        setMetrics(m);
      }
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  };

  const handleLogout = () => {
    // Normal logout: keeps hasUsers=true and shows LoginScreen
    setUser(null);
  };

  const handleUnlockTerminal = async (code: string): Promise<boolean> => {
    try {
      const api = (window as any).apexApi;
      if (api?.auth?.loginWithPin) {
        const session = await api.auth.loginWithPin(code);
        setUser(session);
        setIsLocked(false);
        return true;
      }
      if (code === '2003' || code === 'chami2003' || code === '1234') {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleProfileChanged = (newConfig: BusinessProfileConfig) => {
    setProfileConfig(newConfig);
    const api = (window as any).apexApi;
    if (api?.window?.setTitle) {
      api.window.setTitle(`${storeBranding?.appName || 'Harsh Apex Universal POS'} - [${newConfig.displayName}]`);
    }
  };

  // If terminal has not undergone 1-Time Developer Provisioning, show wizard
  if (isProvisioned === false) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <InitialProvisioningWizard
          onProvisionComplete={(res) => {
            setUser(res.session);
            setProfileConfig(res.profileConfig);
            setStoreBranding(res.branding);
            setIsProvisioned(true);
            setHasUsers(true);
            loadDashboardMetrics();
          }}
        />
      </div>
    );
  }

  // If users exist but no active session, show professional Login Screen with dynamic branding
  if (!user) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <LoginScreen
          onLoginSuccess={(session) => {
            setUser(session);
            loadDashboardMetrics();
          }}
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
          profileConfig={profileConfig}
          branding={storeBranding}
        />
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark bg-slate-900' : 'bg-[#f4f7fb]'}`}>
      {/* Dynamic Profile-Aware Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        businessName={storeBranding?.businessName || 'Harsh Apex POS'}
        appName={storeBranding?.appName}
        appLogo={storeBranding?.appLogo}
        profileConfig={profileConfig}
        onLockScreen={() => setIsLocked(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentTab === 'checkout' ? (
          <FastCheckoutScreen
            onBackToDashboard={() => {
              setCurrentTab('dashboard');
              loadDashboardMetrics();
            }}
            token={user.token}
            profileConfig={profileConfig}
            storeBranding={storeBranding}
          />
        ) : currentTab === 'customers' ? (
          <CustomersView token={user.token} />
        ) : currentTab === 'products' ? (
          <ProductsView token={user.token} />
        ) : currentTab === 'orders' ? (
          <OrdersView token={user.token} />
        ) : currentTab === 'shifts' ? (
          <ShiftsView token={user.token} user={user} />
        ) : currentTab === 'purchases' ? (
          <PurchasesView token={user.token} />
        ) : currentTab === 'expenses' ? (
          <ExpensesView />
        ) : currentTab === 'repairs' ? (
          <RepairsView />
        ) : currentTab === 'tradein' ? (
          <TradeInView />
        ) : currentTab === 'staff' ? (
          <StaffRolesView token={user.token} />
        ) : currentTab === 'reports' ? (
          <ReportsView token={user.token} />
        ) : currentTab === 'templates' ? (
          <TemplateEditor />
        ) : currentTab === 'settings' ? (
          <SettingsView 
            token={user.token} 
            onProfileChange={handleProfileChanged} 
            onBrandingChange={(newBranding) => {
              setStoreBranding(newBranding);
            }}
          />
        ) : (
          /* CORE DASHBOARD VIEW */
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Navigation Bar */}
            <TopBar
              user={user}
              onLogout={handleLogout}
              onQuickCheckout={() => setCurrentTab('checkout')}
              onOpenPassport={() => setIsPassportOpen(true)}
              onLockScreen={() => setIsLocked(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isDark={isDark}
              profileConfig={profileConfig}
              branding={storeBranding}
            />

            {/* Dashboard Scrollable Workspace */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
              {/* Apple Vision Style Quick Actions Bar */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 overflow-x-auto">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setCurrentTab('checkout')}
                    className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <Zap size={16} className="fill-amber-300 text-amber-300" />
                    <span>New Sale [F1]</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('products')}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    <Package size={15} className="text-[#1a4cd2]" />
                    <span>Products</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('purchases')}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    <Truck size={15} className="text-emerald-600" />
                    <span>Supplier Intake</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('expenses')}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    <Wallet size={15} className="text-rose-600" />
                    <span>Expenses</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('customers')}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    <Users size={15} className="text-blue-600" />
                    <span>Customers</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('shifts')}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs px-4 py-3 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
                  >
                    <Clock size={15} className="text-amber-600" />
                    <span>Drawer Shifts</span>
                  </button>
                </div>

                <button
                  onClick={() => setCurrentTab('reports')}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1a4cd2] dark:text-blue-400 hover:underline px-3 py-2 cursor-pointer shrink-0"
                >
                  <BarChart3 size={15} />
                  <span>Full Analytics</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* 4 Primary Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Customers"
                  value={metrics?.totalCustomers !== undefined ? `${metrics.totalCustomers}` : '0'}
                  trend="↑ Active"
                  isPositive={true}
                  type="customers"
                />
                <MetricCard
                  title="Total Products"
                  value={metrics?.totalProducts !== undefined ? `${metrics.totalProducts}` : '0'}
                  trend="In Stock"
                  isPositive={true}
                  type="products"
                />
                <MetricCard
                  title="Completed Sales"
                  value={metrics?.totalOrders !== undefined ? `${metrics.totalOrders}` : '0'}
                  trend="Invoices"
                  isPositive={true}
                  type="orders"
                />
                <MetricCard
                  title="Gross Revenue"
                  value={metrics?.totalSalesMinor ? `LKR ${(metrics.totalSalesMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'LKR 0.00'}
                  trend="Real Total"
                  isPositive={true}
                  type="sales"
                />
              </div>

              {/* Middle Row: Sales Trend Chart (Left) + Products Distribution (Right) */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <SalesChart data={metrics?.salesTrend} />
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <ProductsBarChart data={metrics?.categoryDistribution} />
                </div>
              </div>

              {/* Bottom Row: Recent Orders Table (Left) + Top Sold Items (Right) */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <RecentOrdersTable
                    orders={metrics?.recentOrders}
                    onSelectOrder={(_id) => setCurrentTab('orders')}
                  />
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <TopSoldItems items={metrics?.topSoldItems} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lock Screen Modal */}
      <LockScreenModal
        isOpen={isLocked}
        user={user}
        storeName={profileConfig?.displayName || 'Harsh Apex Universal POS'}
        onUnlock={handleUnlockTerminal}
        onSwitchUser={() => {
          setIsLocked(false);
          setUser(null);
        }}
      />

      {/* F4 Hardware & IMEI / Serial Passport Modal */}
      <DevicePassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        onAddToCart={(_product, _serial) => {
          setIsPassportOpen(false);
          setCurrentTab('checkout');
        }}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onOpenPassport={() => setIsPassportOpen(true)}
        onLockScreen={() => setIsLocked(true)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
      />
    </div>
  );
};
