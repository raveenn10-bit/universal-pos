import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Store, 
  Smartphone, 
  ShoppingBag, 
  Footprints, 
  Shirt, 
  Cpu, 
  Headphones, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Lock, 
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Key,
  User,
  Sparkles
} from 'lucide-react';
import { BusinessProfileType, UserSession, BusinessProfileConfig } from '../../../shared/types';
import { APPLEVISION_LOGO_BASE64 } from '../assets/logoBase64';

interface InitialProvisioningWizardProps {
  onProvisionComplete: (result: {
    session: UserSession;
    profileConfig: BusinessProfileConfig;
    branding: any;
  }) => void;
}

interface ProfileOption {
  type: BusinessProfileType;
  title: string;
  subtitle: string;
  icon: any;
  badges: string[];
  color: string;
  borderActive: string;
  bgLight: string;
  defaultAppName: string;
  defaultBusinessName: string;
}

const BUSINESS_PROFILES: ProfileOption[] = [
  {
    type: 'MOBILE_PHONES',
    title: 'Mobile Phone Shop',
    subtitle: 'Dual IMEI registry, Apple/Android warranty, Repairs pipeline & Trade-In exchange',
    icon: Smartphone,
    badges: ['Dual IMEI', 'Repairs Kanban', 'Trade-In Buyback', 'F4 Passport', 'Warranty Tracking'],
    color: 'text-indigo-600 dark:text-indigo-400',
    borderActive: 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40',
    bgLight: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30',
    defaultAppName: 'Apple Vision Mobile POS',
    defaultBusinessName: 'Apple Vision Store',
  },
  {
    type: 'SUPERMARKET',
    title: 'Supermarket & Grocery',
    subtitle: 'Produce weight scale (kg), batch expiry tracking, case-pack size & fast scanner',
    icon: ShoppingBag,
    badges: ['Weight Scale (kg)', 'Batch & Expiry Dates', 'Produce Barcodes', 'Case-Packs'],
    color: 'text-emerald-600 dark:text-emerald-400',
    borderActive: 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40',
    bgLight: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30',
    defaultAppName: 'Harsh Apex Supermarket POS',
    defaultBusinessName: 'Harsh Apex Supermarket',
  },
  {
    type: 'SHOES',
    title: 'Footwear & Shoes Store',
    subtitle: 'EU 38-45 footwear size matrices, colorways, gender demographics & brand styles',
    icon: Footprints,
    badges: ['Size Matrix (EU 38-45)', 'Colorways', 'Men / Women / Kids', 'Style Codes'],
    color: 'text-amber-600 dark:text-amber-400',
    borderActive: 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40',
    bgLight: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30',
    defaultAppName: 'Harsh Apex Footwear POS',
    defaultBusinessName: 'Apex Shoes & Footwear',
  },
  {
    type: 'BAGS_FASHION',
    title: 'Bags & Fashion Apparel',
    subtitle: 'Seasonal collections, fabric care, clothing sizes (S-XXL) & tag barcode checkout',
    icon: Shirt,
    badges: ['Sizes S-XXL', 'Seasonal Collections', 'Fabric Care', 'Tag Barcodes'],
    color: 'text-rose-600 dark:text-rose-400',
    borderActive: 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/40',
    bgLight: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30',
    defaultAppName: 'Harsh Apex Fashion POS',
    defaultBusinessName: 'Apex Fashion & Bags',
  },
  {
    type: 'ELECTRONICS',
    title: 'Electronics & Appliances',
    subtitle: 'Serial number registry, power/wattage specifications & manufacturer warranties',
    icon: Cpu,
    badges: ['Serial Numbers', 'Power / Wattage', 'Company Warranties', 'Job Sheets'],
    color: 'text-sky-600 dark:text-sky-400',
    borderActive: 'border-sky-600 bg-sky-50/60 dark:bg-sky-950/40',
    bgLight: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30',
    defaultAppName: 'Harsh Apex Electronics POS',
    defaultBusinessName: 'Apex Electronics & Appliances',
  },
  {
    type: 'MOBILE_ACCESSORIES',
    title: 'Mobile Accessories Hub',
    subtitle: 'Fast barcode scanning, compatible phone models, cases, glass & chargers',
    icon: Headphones,
    badges: ['Compatible Phone Models', 'Fast Barcode POS', 'Accessories Inventory'],
    color: 'text-violet-600 dark:text-violet-400',
    borderActive: 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/40',
    bgLight: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30',
    defaultAppName: 'Harsh Apex Accessories POS',
    defaultBusinessName: 'Apex Mobile Accessories',
  },
  {
    type: 'GENERAL_RETAIL',
    title: 'General Retail Store',
    subtitle: 'Universal barcode checkout, customer credit balances, shifts & financial reports',
    icon: Store,
    badges: ['Fast Barcode Scanner', 'Customer Credit Ledger', 'Cash Shifts', 'Full Reports'],
    color: 'text-blue-600 dark:text-blue-400',
    borderActive: 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40',
    bgLight: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30',
    defaultAppName: 'Harsh Apex Retail POS',
    defaultBusinessName: 'Harsh Apex Retail Store',
  },
];

export const InitialProvisioningWizard: React.FC<InitialProvisioningWizardProps> = ({
  onProvisionComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProfileType, setSelectedProfileType] = useState<BusinessProfileType>('MOBILE_PHONES');
  const [developerPin, setDeveloperPin] = useState('2003');

  // Step 2 Branding & Admin State
  const [businessName, setBusinessName] = useState('Apple Vision Store');
  const [appName, setAppName] = useState('Apple Vision Mobile POS');
  const [appLogo, setAppLogo] = useState<string>(APPLEVISION_LOGO_BASE64);
  const [businessLogo, setBusinessLogo] = useState<string>(APPLEVISION_LOGO_BASE64);
  const [phone, setPhone] = useState('+94 77 123 4567');
  const [email, setEmail] = useState('orders@applevision.lk');
  const [address, setAddress] = useState('No. 45 Main Street, Galle, Sri Lanka');
  const [taxId, setTaxId] = useState('VAT-987654321');

  // Owner credentials
  const [ownerFullName, setOwnerFullName] = useState('Harsh Apex Administrator');
  const [ownerUsername, setOwnerUsername] = useState('harshapex');
  const [ownerPassword, setOwnerPassword] = useState('chami2003');
  const [ownerPin, setOwnerPin] = useState('2003');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectProfile = (type: BusinessProfileType) => {
    setSelectedProfileType(type);
    const p = BUSINESS_PROFILES.find(bp => bp.type === type);
    if (p) {
      setAppName(p.defaultAppName);
      setBusinessName(p.defaultBusinessName);
      if (type !== 'MOBILE_PHONES') {
        // Clear Apple Vision preset logo for other store types
        setAppLogo('');
        setBusinessLogo('');
      } else {
        setAppLogo(APPLEVISION_LOGO_BASE64);
        setBusinessLogo(APPLEVISION_LOGO_BASE64);
      }
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

  const handleCompleteProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !appName.trim()) {
      setErrorMsg('Business Name and App Name are required.');
      return;
    }
    if (!ownerUsername.trim() || !ownerPassword.trim()) {
      setErrorMsg('Owner Username and Password are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const api = (window as any).apexApi;
      if (api?.provision?.completeDeveloperProvisioning) {
        const result = await api.provision.completeDeveloperProvisioning({
          businessType: selectedProfileType,
          businessName: businessName.trim(),
          appName: appName.trim(),
          appLogo,
          businessLogo,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          taxId: taxId.trim(),
          ownerUsername: ownerUsername.trim(),
          ownerFullName: ownerFullName.trim(),
          ownerPassword,
          ownerPin: ownerPin.trim() || '2003',
        });

        if (api?.window?.setTitle) {
          api.window.setTitle(`${appName.trim()} - [${businessName.trim()}]`);
        }

        onProvisionComplete(result);
      } else {
        throw new Error('Provisioning API bridge unavailable in this environment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Provisioning failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedProf = BUSINESS_PROFILES.find(p => p.type === selectedProfileType) || BUSINESS_PROFILES[0];

  return (
    <div className="fixed inset-0 w-full h-screen bg-[#f4f7fb] dark:bg-slate-950 flex flex-col justify-between overflow-y-auto select-none p-6 md:p-10">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1a4cd2] text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Harsh Apex Universal POS</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  DEVELOPER PROVISIONING
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-Time Immutable Business Profile Binding & Client Admin Onboarding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`px-3 py-1.5 rounded-xl transition-all ${
              step === 1 ? 'bg-[#1a4cd2] text-white shadow' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              1. Business Type Selection
            </span>
            <span className="text-slate-300">→</span>
            <span className={`px-3 py-1.5 rounded-xl transition-all ${
              step === 2 ? 'bg-[#1a4cd2] text-white shadow' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              2. Store Branding & Admin
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: DEVELOPER AUTHORITY - CHOOSE BUSINESS PROFILE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 flex items-start gap-3.5">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-black text-amber-900 dark:text-amber-200">
                  Developer 1-Time Binding Gate (Strict Client Isolation)
                </h2>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Select the exact business profile for this customer. Once provisioned, this terminal will be permanently locked to this industry module set. The shop owner cannot convert the business type without an authorized developer package.
                </p>
              </div>
            </div>

            {/* Profile Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUSINESS_PROFILES.map((p) => {
                const isSelected = selectedProfileType === p.type;
                const Icon = p.icon;

                return (
                  <div
                    key={p.type}
                    onClick={() => handleSelectProfile(p.type)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? `${p.borderActive} shadow-lg scale-[1.02]`
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-2xl ${p.bgLight} flex items-center justify-center font-bold shadow-sm`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected ? (
                          <span className="w-6 h-6 rounded-full bg-[#1a4cd2] text-white flex items-center justify-center text-xs shadow">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700" />
                        )}
                      </div>

                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {p.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {p.badges.map(b => (
                        <span key={b} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Developer Auth & Continue */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Developer Authorization PIN
                  </span>
                  <input
                    type="password"
                    value={developerPin}
                    onChange={(e) => setDeveloperPin(e.target.value)}
                    placeholder="Enter Developer PIN (2003)"
                    className="mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (developerPin !== '2003' && developerPin !== 'chami2003') {
                    setErrorMsg('Invalid Developer Authorization PIN.');
                    return;
                  }
                  setErrorMsg('');
                  setStep(2);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#1a4cd2] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Continue to Store Branding & Admin Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: STORE BRANDING, LOGOS, & SHOP OWNER DETAILS */}
        {step === 2 && (
          <form onSubmit={handleCompleteProvisioning} className="space-y-6 animate-fadeIn">
            {/* Selected Profile Banner */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${selectedProf.bgLight} flex items-center justify-center font-bold`}>
                  <selectedProf.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Locked Profile Target
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedProf.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[#1a4cd2] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SECTION A: STORE BRANDING & LOGOS */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Building2 className="w-5 h-5 text-[#1a4cd2]" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Store Branding & Visual Assets
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apple Vision Store / Harsh Supermarket"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    App Display Name (Windows Title & Sidebar) *
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. Apple Vision POS / Harsh Supermarket POS"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>

                {/* Upload App Logo */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    App Icon / Logo (Sidebar & Login Screen)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                      {appLogo ? (
                        <img src={appLogo} alt="App Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-[#1a4cd2]" />
                        <span>Upload Custom Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'app')}
                        />
                      </label>
                      {selectedProfileType === 'MOBILE_PHONES' && (
                        <button
                          type="button"
                          onClick={() => setAppLogo(APPLEVISION_LOGO_BASE64)}
                          className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Use Preset Apple Vision Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Business / Invoice Logo */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Receipt & A4 Invoice Print Logo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                      {businessLogo ? (
                        <img src={businessLogo} alt="Invoice Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Upload Invoice Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'business')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Tax / VAT ID</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="VAT-987654"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Store Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="No. 45 Main Street, Galle"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SECTION B: SHOP OWNER (ADMIN) CREDENTIALS */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <User className="w-5 h-5 text-[#1a4cd2]" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Shop Owner (Admin) Credentials
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      placeholder="e.g. Kasun Rajapaksa"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#1a4cd2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value)}
                      placeholder="e.g. harshapex or admin"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Quick 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={ownerPin}
                        onChange={(e) => setOwnerPin(e.target.value)}
                        placeholder="2003"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Production Default Note</span>
                    </div>
                    <div>
                      Username <strong>harshapex</strong>, Password <strong>chami2003</strong>, and PIN <strong>2003</strong> are pre-filled for instant verification. You can modify them as needed for this client.
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{loading ? 'Locking Profile & Launching...' : 'Lock Business Profile & Launch POS'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
