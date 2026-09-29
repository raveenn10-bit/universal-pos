import React, { useState } from 'react';
import { Store, ShieldCheck, FileCheck, ArrowRight, Check } from 'lucide-react';
import { BusinessProfileType } from '../../../shared/types';

interface SetupWizardProps {
  onSetupComplete: (userSession: any) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('harshapex');
  const [fullName, setFullName] = useState('Harsh Apex Administrator');
  const [password, setPassword] = useState('chami2003');
  const [confirmPassword, setConfirmPassword] = useState('chami2003');
  const [pin, setPin] = useState('2003');
  const [businessName, setBusinessName] = useState('Harsh Apex Universal Store');
  const [profileType, setProfileType] = useState<BusinessProfileType>('GENERAL_RETAIL');
  const [licenseFileText, setLicenseFileText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profiles: { id: BusinessProfileType; title: string; desc: string }[] = [
    { id: 'GENERAL_RETAIL', title: 'General Retail', desc: 'Standard retail, barcodes, SKUs, inventory' },
    { id: 'SUPERMARKET', title: 'Supermarket & Grocery', desc: 'Weighted items, batches, expiry dates' },
    { id: 'MOBILE_PHONES', title: 'Mobile Phone Shop', desc: 'IMEI tracking, warranties, device conditions' },
    { id: 'MOBILE_ACCESSORIES', title: 'Mobile Accessories', desc: 'Compatibility models, fast scanning' },
    { id: 'ELECTRONICS', title: 'Electronics & Gadgets', desc: 'Serial numbers, warranty certificates' },
    { id: 'SHOES', title: 'Shoes & Footwear', desc: 'Size & color variants, model matrices' },
    { id: 'BAGS_FASHION', title: 'Fashion & Apparel', desc: 'Apparel styles, seasonal fashion tags' },
  ];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      alert('Password must be at least 8 characters long for commercial security.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleFinishSetup = async () => {
    setIsSubmitting(true);
    try {
      const api = (window as any).apexApi;

      // 1. If signed package provided, import it
      if (licenseFileText.trim()) {
        try {
          const pkg = JSON.parse(licenseFileText);
          await api.license.importProvisioningPackage(pkg);
        } catch (e: any) {
          alert(`License import failed: ${e.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Setup initial owner account
      try {
        const session = await api.auth.setupInitialOwner({
          username,
          fullName,
          password,
          pin,
        });
        onSetupComplete(session);
      } catch (ownerErr: any) {
        if (ownerErr.message?.includes('already exists')) {
          // Attempt automatic login with the provided credentials
          try {
            const loginSession = await api.auth.login({ username, password });
            onSetupComplete(loginSession);
            return;
          } catch (loginErr: any) {
            alert('An owner account already exists. Please enter your existing owner password to log in.');
            return;
          }
        }
        throw ownerErr;
      }
    } catch (err: any) {
      alert(err.message || 'Setup initialization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPackageFile = async () => {
    try {
      const path = await (window as any).apexApi.system.selectFile();
      if (path) {
        // Read or set file text
        alert(`Selected package file: ${path}. You can also paste license JSON directly.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-[#1a4cd2] text-white flex items-center justify-center font-black shadow-lg">
            <Store size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">
              Harsh Apex Universal POS Setup
            </h1>
            <p className="text-xs text-slate-400">
              Commercial Offline Provisioning & Owner Account Initialization
            </p>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1a4cd2] dark:text-blue-400 uppercase tracking-wider mb-2">
              <ShieldCheck size={16} />
              <span>Step 1: Create Shop Owner Account</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Owner Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Cashier 4-Digit Quick PIN (Optional)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-32 px-3.5 py-2.5 text-xs font-bold tracking-widest text-center border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg transition-all"
              >
                <span>Continue to Business Profile</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div className="py-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1a4cd2] dark:text-blue-400 uppercase tracking-wider">
              <FileCheck size={16} />
              <span>Step 2: Choose Business Profile & Licensing</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                Select Initial Business Profile
              </label>
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setProfileType(p.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      profileType === p.id
                        ? 'border-[#1a4cd2] bg-blue-50/60 dark:bg-blue-950/40 text-[#1a4cd2] dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>{p.title}</span>
                      {profileType === p.id && <Check size={14} />}
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal block mt-1">
                      {p.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional signed package import */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Developer Provisioning Package (.apexlicense JSON - Optional)
                </label>
                <button
                  type="button"
                  onClick={handleSelectPackageFile}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Browse File...
                </button>
              </div>
              <textarea
                value={licenseFileText}
                onChange={(e) => setLicenseFileText(e.target.value)}
                placeholder="Paste signed .apexlicense JSON package here if provided by software developer..."
                rows={3}
                className="w-full p-2.5 text-[11px] font-mono border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinishSetup}
                disabled={isSubmitting}
                className="bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-8 py-3 rounded-2xl shadow-lg transition-all"
              >
                {isSubmitting ? 'Configuring System...' : 'Finish Setup & Launch POS'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
