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
  Image as ImageIcon,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building2,
  Save,
  AlertCircle
} from 'lucide-react';
import { BusinessProfileConfig, BusinessProfileType, LicensePackage } from '../../../shared/types';

interface SettingsViewProps {
  token: string;
  onProfileChange?: (newConfig: BusinessProfileConfig) => void;
  onBrandingChange?: (newBranding: any) => void;
}

const BUSINESS_PROFILES_DISPLAY: Record<string, { name: string; icon: string; desc: string }> = {
  GENERAL_RETAIL: { name: 'General Retail Store', icon: '🏪', desc: 'Standard fast barcode POS, credit ledgers, and inventory' },
  SUPERMARKET: { name: 'Supermarket & Grocery', icon: '🛒', desc: 'Produce weight scale (kg), batch expiry tracking, case-pack size & fast scanner' },
  MOBILE_PHONES: { name: 'Mobile Phone Shop', icon: '📱', desc: 'Dual IMEI registry, Apple/Android warranty, Repairs pipeline & Trade-In exchange' },
  MOBILE_ACCESSORIES: { name: 'Mobile Accessories Hub', icon: '🎧', desc: 'Fast barcode scanning, compatible phone models, cases, glass & chargers' },
  ELECTRONICS: { name: 'Electronics & Appliances', icon: '⚡', desc: 'Serial number registry, power/wattage specifications & manufacturer warranties' },
  SHOES: { name: 'Footwear & Shoes Store', icon: '👟', desc: 'EU 38-45 footwear size matrices, colorways, gender demographics & brand styles' },
  BAGS_FASHION: { name: 'Bags & Fashion Apparel', icon: '👗', desc: 'Seasonal collections, fabric care, clothing sizes (S-XXL) & tag barcode checkout' },
};

export const SettingsView: React.FC<SettingsViewProps> = ({ token, onProfileChange, onBrandingChange }) => {
  const [profileConfig, setProfileConfig] = useState<BusinessProfileConfig | null>(null);
  const [license, setLicense] = useState<LicensePackage | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [licenseText, setLicenseText] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Branding Fields
  const [businessName, setBusinessName] = useState('');
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

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
      if (api?.provision?.getStoreBranding) {
        const b = await api.provision.getStoreBranding();
        if (b) {
          setBusinessName(b.businessName || '');
          setAppName(b.appName || '');
          setAppLogo(b.appLogo || '');
          setBusinessLogo(b.businessLogo || '');
          setPhone(b.phone || '');
          setEmail(b.email || '');
          setAddress(b.address || '');
          setTaxId(b.taxId || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'app' | 'business') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (target === 'app') {
        setAppLogo(base64);
      } else {
        setBusinessLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !appName.trim()) {
      alert('Business Name and App Name are required.');
      return;
    }

    setSavingBranding(true);
    try {
      const api = (window as any).apexApi;
      if (api?.provision?.updateStoreBranding) {
        const updated = await api.provision.updateStoreBranding({
          businessName: businessName.trim(),
          appName: appName.trim(),
          appLogo,
          businessLogo,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          taxId: taxId.trim(),
        }, token);

        showNotification('Store Branding and Logos updated successfully!');
        if (onBrandingChange) {
          onBrandingChange(updated);
        }
        if (api?.window?.setTitle) {
          api.window.setTitle(`${appName.trim()} - [${businessName.trim()}]`);
        }
      }
    } catch (err: any) {
      alert(`Failed to save branding: ${err.message || err}`);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupMsg('');
    try {
      const res = await (window as any).apexApi.backup.createBackup(token);
      setBackupMsg(`Backup created successfully: ${res.backupPath} (SHA-256: ${res.sha256.substring(0, 12)}...)`);
      showNotification('Verified backup created successfully!');
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
      showNotification('Cryptographic license upgrade applied!');
      loadInfo();
    } catch (err: any) {
      alert(`License import failed: ${err.message}`);
    }
  };

  const currentProfInfo = BUSINESS_PROFILES_DISPLAY[profileConfig?.profileType || 'GENERAL_RETAIL'] || {
    name: profileConfig?.displayName || 'General Retail',
    icon: '🏪',
    desc: 'Multi-industry commercial POS profile',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] dark:bg-slate-900 select-none overflow-y-auto p-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="text-[#1a4cd2] dark:text-blue-400" size={22} />
          Terminal Settings & Store Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage shop branding, app logos, receipt templates, local database backups, and developer licensing.
        </p>
      </div>

      {/* DEVELOPER PROTECTION: LOCKED BUSINESS PROFILE CARD */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Lock size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Licensed Business Profile</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  DEVELOPER PROTECTED (LOCKED)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanently bound to this terminal hardware. Re-licensing requires authorized developer upgrade.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-slate-400">
            {profileConfig?.profileType || 'GENERAL_RETAIL'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600">
              {currentProfInfo.icon}
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {currentProfInfo.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentProfInfo.desc}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  Terminal ID: {systemInfo?.fingerprint || 'HARSH-APEX-POS-WIN64'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  Active Modules: {Object.keys(profileConfig?.enabledModules || {}).filter(k => (profileConfig?.enabledModules as any)[k]).length}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[11px] font-bold text-slate-400 block">Software Edition</span>
            <span className="text-xs font-black text-[#1a4cd2] dark:text-blue-400 block">
              {license?.edition || 'COMMERCIAL CLIENT EDITION'}
            </span>
          </div>
        </div>

        {/* Interactive Business Profile Switcher for Testing */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <span>Switch Industry Profile (Test different business workflows):</span>
            </label>
            <span className="text-[10px] font-bold text-slate-400">
              Click any profile to test specific UI fields, tabs, and modules
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.keys(BUSINESS_PROFILES_DISPLAY).map((profKey) => {
              const info = BUSINESS_PROFILES_DISPLAY[profKey];
              const isSelected = profileConfig?.profileType === profKey;
              return (
                <button
                  key={profKey}
                  type="button"
                  onClick={async () => {
                    try {
                      const api = (window as any).apexApi;
                      if (api?.license?.switchProfile) {
                        const updated = await api.license.switchProfile(profKey);
                        setProfileConfig(updated);
                        if (onProfileChange) {
                          onProfileChange(updated);
                        }
                        showNotification(`Switched to: ${info.name}`);
                      }
                    } catch (err: any) {
                      alert(`Failed to switch profile: ${err.message}`);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#1a4cd2] bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-2 ring-[#1a4cd2]'
                      : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{info.icon}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                        {info.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {info.desc}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                    {isSelected ? (
                      <span className="text-[10px] font-black text-[#1a4cd2] dark:text-blue-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        Click to Activate &rarr;
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STORE BRANDING & DETAILS (SHOP OWNER EDITABLE) */}
      <form onSubmit={handleSaveBranding} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <Store className="text-[#1a4cd2] dark:text-blue-400" size={18} />
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Store Branding & Storefront Details
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Customize app titles, receipt headers, and store logos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Business / Store Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apple Vision Store, Apex Mart"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Application Title (Sidebar / Header / Login)
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Apple Vision Mobile POS"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@applevision.lk"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Physical Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="No. 45 Main Street, Galle, Sri Lanka"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tax ID / VAT Registration
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="VAT-987654321"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* LOGOS UPLOAD SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* App Logo */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Application Icon / Logo (Sidebar & Login)
            </span>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {appLogo ? (
                  <img src={appLogo} alt="App Logo" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <ImageIcon className="text-slate-400 w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 shadow-sm">
                  <Upload size={14} />
                  <span>Choose App Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'app')}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  PNG/JPG icon shown on login screen, sidebar, and headers.
                </p>
              </div>
            </div>
          </div>

          {/* Business / Receipt Logo */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Receipt & Invoice Logo (Printed Documents)
            </span>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {businessLogo ? (
                  <img src={businessLogo} alt="Receipt Logo" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <ImageIcon className="text-slate-400 w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 shadow-sm">
                  <Upload size={14} />
                  <span>Choose Receipt Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'business')}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  Printed on 80mm thermal receipts and A4 tax invoices.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingBranding}
            className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{savingBranding ? 'Saving Branding...' : 'Save Store Branding'}</span>
          </button>
        </div>
      </form>

      {/* BACKUP & RESTORE & LICENSE IMPORT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Backup & Disaster Recovery */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Database size={18} className="text-[#1a4cd2]" />
            <span>Verified Local Database Backup</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create an encrypted, timestamped SQLite snapshot of all sales, inventory, customers, and ledger records.
          </p>

          <button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-2xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={16} />
            <span>{isBackingUp ? 'Creating Verified Backup...' : 'Create Backup Snapshot Now'}</span>
          </button>

          {backupMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px] font-mono break-all">
              {backupMsg}
            </div>
          )}
        </div>

        {/* Developer Cryptographic License Upgrade */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Key size={18} className="text-[#1a4cd2]" />
            <span>Cryptographic Profile Upgrade Package</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paste an RSA-4096 signed JSON license package issued by Harsh Apex to unlock modules or change profiles.
          </p>

          <textarea
            value={licenseText}
            onChange={(e) => setLicenseText(e.target.value)}
            placeholder='Paste {"signature": "...", "payload": {...}} here...'
            rows={2}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-[10px] focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={handleImportLicense}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-2.5 rounded-2xl transition-all cursor-pointer"
          >
            <Upload size={15} />
            <span>Verify & Apply License Package</span>
          </button>

          {licenseMsg && (
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold">
              {licenseMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
