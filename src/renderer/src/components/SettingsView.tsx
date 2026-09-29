import React, { useState, useEffect } from 'react';
import { Settings, Database, Key, ShieldCheck, Download, Upload, CheckCircle2 } from 'lucide-react';
import { BusinessProfileConfig, LicensePackage } from '../../../shared/types';

interface SettingsViewProps {
  token: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ token }) => {
  const [profileConfig, setProfileConfig] = useState<BusinessProfileConfig | null>(null);
  const [license, setLicense] = useState<LicensePackage | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [licenseText, setLicenseText] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');

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
      loadInfo();
    } catch (err: any) {
      alert(`License import failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 select-none overflow-y-auto p-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Settings className="text-[#1a4cd2]" size={22} />
          Terminal Settings & System Maintenance
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage database backups, business profiles, and developer cryptographic license provisioning
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Profile & Edition */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <ShieldCheck size={18} className="text-[#1a4cd2]" />
            <span>Active Business Profile</span>
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

          <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Terminal Fingerprint:</span>
              <span className="font-mono font-bold">{systemInfo?.fingerprint || 'LOCAL-DEV-01'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Edition:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {license?.edition || 'COMMERCIAL PROFESSIONAL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Licensed Term:</span>
              <span className="font-bold">{license?.expiresAt || 'PERPETUAL'}</span>
            </div>
          </div>
        </div>

        {/* Database Backup & Disaster Recovery */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Database size={18} className="text-emerald-500" />
            <span>SQLite Backup & Recovery</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Create verified, atomic WAL-checkpointed SQLite database backups. Backups can be copied to external USB storage or restored in the event of hardware failure.
          </p>

          <button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <Key size={18} className="text-amber-500" />
          <span>Developer Cryptographic Provisioning Package (.apexlicense)</span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          To convert this terminal to a different profile (e.g. Supermarket with Batch Tracking, or Mobile Store with IMEI), paste the signed developer package below. The package is cryptographically verified against the developer's offline Ed25519 signature key.
        </p>

        <textarea
          rows={3}
          value={licenseText}
          onChange={(e) => setLicenseText(e.target.value)}
          placeholder="Paste signed .apexlicense JSON here..."
          className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-2xl dark:bg-slate-700 dark:text-white"
        />

        <div className="flex justify-between items-center">
          {licenseMsg ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {licenseMsg}
            </span>
          ) : <span />}

          <button
            onClick={handleImportLicense}
            className="px-6 py-2.5 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            Verify & Apply Package
          </button>
        </div>
      </div>
    </div>
  );
};
