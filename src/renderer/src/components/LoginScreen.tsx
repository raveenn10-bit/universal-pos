import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Store,
  Sun,
  Moon
} from 'lucide-react';
import { UserSession, BusinessProfileConfig } from '../../../shared/types';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
  isDark: boolean;
  onToggleDark: () => void;
  profileConfig?: BusinessProfileConfig | null;
  branding?: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  isDark,
  onToggleDark,
  profileConfig,
  branding,
}) => {
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');
  const [username, setUsername] = useState('harshapex');
  const [password, setPassword] = useState('chami2003');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const api = (window as any).apexApi;
      if (api?.auth?.login) {
        const session = await api.auth.login({ username: username.trim(), password });
        onLoginSuccess(session);
      } else {
        // Fallback session
        onLoginSuccess({
          userId: 'usr_harshapex_owner',
          username: 'harshapex',
          fullName: 'Harsh Apex Administrator',
          role: 'owner',
          token: 'active_production_token',
          permissions: ['*'],
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue.length < 4) return;
    setErrorMessage('');
    setLoading(true);

    try {
      const api = (window as any).apexApi;
      if (api?.auth?.loginWithPin) {
        const session = await api.auth.loginWithPin(pinValue);
        onLoginSuccess(session);
      } else if (pinValue === '2003') {
        onLoginSuccess({
          userId: 'usr_harshapex_owner',
          username: 'harshapex',
          fullName: 'Harsh Apex Administrator',
          role: 'owner',
          token: 'active_production_token',
          permissions: ['*'],
        });
      } else if (pinValue === '1234') {
        onLoginSuccess({
          userId: 'usr_harshapex_cashier',
          username: 'cashier',
          fullName: 'Front-desk Cashier',
          role: 'cashier',
          token: 'cashier_production_token',
          permissions: ['pos.billing', 'customers.manage', 'shifts.drawer'],
        });
      } else {
        setErrorMessage('Invalid 4-digit security PIN.');
        setPin('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid security PIN.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      handlePinSubmit(newPin);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleQuickFill = () => {
    setUsername('harshapex');
    setPassword('chami2003');
    setErrorMessage('');
  };

  return (
    <div className={`fixed inset-0 w-full h-screen flex flex-col justify-between select-none ${isDark ? 'dark bg-slate-950 text-white' : 'bg-[#f4f7fb] text-slate-800'}`}>
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-8 z-20 flex items-center gap-3">
        <button
          onClick={onToggleDark}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer transition-colors"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>
      </div>

      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Box */}
      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 backdrop-blur-md">
          {/* Logo & Store Title */}
          <div className="text-center mb-6">
            <div className="inline-block relative mb-3">
              {branding?.appLogo ? (
                <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 bg-white shadow-xl flex items-center justify-center mx-auto overflow-hidden">
                  <img src={branding.appLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#1a4cd2] text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25">
                  <Store className="w-8 h-8" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {branding?.appName || 'Harsh Apex Universal POS'}
            </h1>
            <p className="text-[11px] font-bold text-[#1a4cd2] dark:text-blue-400 uppercase tracking-widest mt-0.5">
              {branding?.businessName || profileConfig?.displayName || 'Commercial Windows Desktop POS'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Offline Multi-Industry POS Terminal
            </p>
          </div>

          {/* Mode Switcher: Password vs PIN */}
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-700/60 mb-5 text-xs font-bold">
            <button
              onClick={() => { setLoginMode('password'); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                loginMode === 'password'
                  ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Account Login
            </button>
            <button
              onClick={() => { setLoginMode('pin'); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                loginMode === 'pin'
                  ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Quick PIN Unlock
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PASSWORD LOGIN FORM */}
          {loginMode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username (e.g. harshapex)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (e.g. chami2003)"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#1a4cd2] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Register'}
              </button>

              {/* Quick Fill Button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] font-bold text-[#1a4cd2] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Quick Fill Production Owner: harshapex / chami2003
                </button>
              </div>
            </form>
          ) : (
            /* PIN KEYPAD LOGIN */
            <div className="space-y-4">
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all ${
                      pin.length > idx
                        ? 'bg-[#1a4cd2] scale-110 shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinDigit(digit)}
                    className="w-16 h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer mx-auto"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setPin('2003');
                    handlePinSubmit('2003');
                  }}
                  className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer mx-auto"
                >
                  2003
                </button>
                <button
                  onClick={() => handlePinDigit('0')}
                  className="w-16 h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer mx-auto"
                >
                  0
                </button>
                <button
                  onClick={handlePinBackspace}
                  className="w-16 h-16 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer mx-auto"
                >
                  ⌫
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-400">
                  Default Quick PIN: <strong className="text-slate-700 dark:text-slate-300">2003</strong> or <strong className="text-slate-700 dark:text-slate-300">1234</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400 z-10 flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Local SQLite Cryptographic Store</span>
        </div>
        <div>
          <span>Hardware Terminal ID: </span>
          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">HARSH-APEX-POS-WIN64</span>
        </div>
      </footer>
    </div>
  );
};
