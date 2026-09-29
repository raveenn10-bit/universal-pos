import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Key, 
  ShieldCheck, 
  Download, 
  Upload, 
  CheckCircle2, 
  Store,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { BusinessProfileConfig, BusinessProfileType, LicensePackage } from '../../../shared/types';

interface SettingsViewProps {
  token: string;
  onProfileChange?: (newConfig: BusinessProfileConfig) => void;
}

const BUSINESS_PROFILES_LIST: { type: BusinessProfileType; name: string; icon: string; desc: string; color: string }[] = [
  { type: 'GENERAL_RETAIL', name: 'General Retail Store', icon: '🏪', desc: 'Standard fast barcode POS, credit ledgers, and inventory', color: 'border-blue-500 text-blue-600' },
  { type: 'SUPERMARKET', name: 'Supermarket & Grocery', icon: '🛒', desc: 'Weight scales, batch expiry dates, and case-packs', color: 'border-emerald-500 text-emerald-600' },
  { type: 'MOBILE_PHONES', name: 'Mobile Phone Shop', icon: '📱', desc: 'Dual IMEI registry, Repairs pipeline, Trade-In & F4 Passport', color: 'border-indigo-500 text-indigo-600' },
  { type: 'MOBILE_ACCESSORIES', name: 'Mobile Accessories Hub', icon: '🎧', desc: 'Compatible models, fast barcodes, and warranty tracking', color: 'border-violet-500 text-violet-600' },
  { type: 'ELECTRONICS', name: 'Electronics & Appliances', icon: '⚡', desc: 'Serial numbers, company warranties, and repair tickets', color: 'border-sky-500 text-sky-600' },
  { type: 'SHOES', name: 'Footwear & Shoes Store', icon: '👟', desc: 'Size matrices (EU 38-45), colors, and demographic styles', color: 'border-amber-500 text-amber-600' },
  { type: 'BAGS_FASHION', name: 'Bags & Fashion Apparel', icon: '👗', desc: 'Collections, seasonal items, fabric care, and tag barcodes', color: 'border-rose-500 text-rose-600' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ token, onProfileChange }) => {
  const [profileConfig, setProfileConfig] = useState<BusinessProfileConfig | null>(null);
  const [license, setLicense] = useState<LicensePackage | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [licenseText, setLicenseText] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const api = (window as any).apexApi;
      if (api?.license?.getActiveProfileConfig) {
        const p = await api.license.getActiveProfileConfig();
        setProfileConfig(p);
      }
      if (api?.license?.getActiveLicense) {
        const l = await api.license.getActiveLicense();
        setLicense(l);
      }
      if (api?.system?.getSystemInfo) {
        const sys = await api.system.getSystemInfo();
        setSystemInfo(sys);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchProfile = async (targetType: BusinessProfileType) => {
    setSwitching(true);
    try {
      const api = (window as any).apexApi;
      if (api?.license?.switchProfile) {
        const newCfg = await api.license.switchProfile(targetType);
        setProfileConfig(newCfg);
        if (api?.window?.setTitle) {
          api.window.setTitle(`Harsh Apex Universal POS - [${newCfg.displayName}]`);
        }
        if (onProfileChange) {
          onProfileChange(newCfg);
        }
        setLicenseMsg(`Switched to profile: ${newCfg.displayName}`);
      }
    } catch (err: any) {
      alert(`Failed to switch profile: ${err.message || err}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupMsg('');
    try {
      const res = await (window as any).apexApi.backup.createBackup(token);
      setBackupMsg(`Backup created successfully: ${res.backupPath} (SHA-256: ${res.sha256.substring(0, 12)}...)`);
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportLicense = async () => {
    if (!licenseText.trim()) return;
    try {
      const pkg = JSON.parse(licenseText);
      const res = await (window as any).apexApi.license.importProvisioningPackage(pkg);
      setLicenseMsg(res.message);
      if (res.profileConfig && onProfileChange) {
        onProfileChange(res.profileConfig);
      }
      loadInfo();
    } catch (err: any) {
      alert(`License import failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] dark:bg-slate-900 select-none overflow-y-auto p-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="text-[#1a4cd2] dark:text-blue-400" size={22} />
          Terminal Settings & Multi-Industry Engine
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Switch active business profile, manage verified SQLite backups, and apply developer provisioning licenses.
        </p>
      </div>

      {/* DYNAMIC BUSINESS PROFILE SELECTOR */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="text-[#1a4cd2] dark:text-blue-400" size={18} />
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Dynamic Business Profiles ({BUSINESS_PROFILES_LIST.length} Supported)
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Click any profile to instantly convert this terminal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {BUSINESS_PROFILES_LIST.map((p) => {
            const isActive = profileConfig?.profileType === p.type;
            return (
              <div
                key={p.type}
                onClick={() => handleSwitchProfile(p.type)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isActive
                    ? 'border-[#1a4cd2] bg-blue-50/60 dark:bg-blue-950/40 shadow-md scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1a4cd2] text-white">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-normal line-clamp-2">
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Profile & Edition Details */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <ShieldCheck size={18} className="text-[#1a4cd2]" />
            <span>Active Business Profile Details</span>
          </div>

          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs font-semibold text-slate-500 block">Current Industry Profile:</span>
            <span className="text-base font-black text-[#1a4cd2] dark:text-blue-300 block">
              {profileConfig?.displayName || 'General Retail Store'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono mt-1 block">
              Profile Type: {profileConfig?.profileType || 'GENERAL_RETAIL'} (v{profileConfig?.version || '1.0.0'})
            </span>
          </div>

          <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Terminal Fingerprint:</span>
              <span className="font-mono font-bold">{systemInfo?.fingerprint || 'HARSH-APEX-POS-WIN64'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Software Edition:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {license?.edition || 'COMMERCIAL PROFESSIONAL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Licensed Term:</span>
              <span className="font-bold">{license?.expiresAt || 'PERPETUAL'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Module Capabilities:</span>
              <span className="font-mono font-bold text-[#1a4cd2] dark:text-blue-400">
                {Object.keys(profileConfig?.enabledModules || {}).filter(k => (profileConfig?.enabledModules as any)[k]).length} Modules Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Database Backup & Disaster Recovery */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Database size={18} className="text-emerald-500" />
            <span>SQLite Backup & Disaster Recovery</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Create verified, atomic WAL-checkpointed SQLite database backups. Backups can be copied to external USB storage or restored in the event of hardware failure.
          </p>

          <button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={16} />
            <span>{isBackingUp ? 'Creating Verified Backup...' : 'Create Immediate Database Backup'}</span>
          </button>

          {backupMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="break-all">{backupMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Developer Provisioning & Profile Conversion */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <Key size={18} className="text-amber-500" />
          <span>Developer Cryptographic Provisioning Package (.apexlicense)</span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          To bind this terminal to a specific client license or activate restricted enterprise modules, paste the signed developer package below. The package is cryptographically verified against the developer's offline Ed25519 signature key.
        </p>

        <textarea
          rows={3}
          value={licenseText}
          onChange={(e) => setLicenseText(e.target.value)}
          placeholder="Paste signed .apexlicense JSON package here..."
          className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-700 dark:text-white"
        />

        <div className="flex justify-between items-center">
          {licenseMsg ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {licenseMsg}
            </span>
          ) : <span />}

          <button
            onClick={handleImportLicense}
            className="px-6 py-2.5 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow transition-all cursor-pointer"
          >
            Verify & Apply Package
          </button>
        </div>
      </div>
    </div>
  );
};
