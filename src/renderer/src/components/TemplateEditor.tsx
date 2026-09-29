import React, { useState } from 'react';
import { Layers, Save, Eye, Palette, Check } from 'lucide-react';
import { DocumentTemplate } from '../../../shared/types';
import { DEFAULT_RECEIPT_TEMPLATE, DEFAULT_INVOICE_TEMPLATE } from '../../../shared/constants';

export const TemplateEditor: React.FC = () => {
  const [activeType, setActiveType] = useState<'RECEIPT_80MM' | 'INVOICE_A4'>('RECEIPT_80MM');
  const [template, setTemplate] = useState<DocumentTemplate>(DEFAULT_RECEIPT_TEMPLATE);
  const [isSaved, setIsSaved] = useState(false);

  const handleTypeChange = (type: 'RECEIPT_80MM' | 'INVOICE_A4') => {
    setActiveType(type);
    setTemplate(type === 'RECEIPT_80MM' ? DEFAULT_RECEIPT_TEMPLATE : DEFAULT_INVOICE_TEMPLATE);
    setIsSaved(false);
  };

  const updateConfig = (key: string, value: any) => {
    setTemplate(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 select-none overflow-hidden p-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="text-[#1a4cd2]" size={22} />
            Document Template Customizer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customize header branding, typography, tax numbers, and footer warranty policies
          </p>
        </div>

        {/* Template Format Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-2xl flex items-center text-xs font-bold">
            <button
              onClick={() => handleTypeChange('RECEIPT_80MM')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeType === 'RECEIPT_80MM'
                  ? 'bg-white dark:bg-slate-800 text-[#1a4cd2] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              80mm Thermal Receipt
            </button>
            <button
              onClick={() => handleTypeChange('INVOICE_A4')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeType === 'INVOICE_A4'
                  ? 'bg-white dark:bg-slate-800 text-[#1a4cd2] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              A4 Commercial Invoice
            </button>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-md transition-all"
          >
            {isSaved ? <Check size={16} /> : <Save size={16} />}
            <span>{isSaved ? 'Published & Saved!' : 'Publish Template'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="flex-1 flex gap-8 pt-6 overflow-hidden">
        {/* Left: Configuration Form */}
        <div className="w-1/2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-y-auto space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
            Store Branding & Details
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Store / Business Name</label>
              <input
                type="text"
                value={template.config.businessName}
                onChange={(e) => updateConfig('businessName', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Tagline</label>
              <input
                type="text"
                value={template.config.tagline || ''}
                onChange={(e) => updateConfig('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Store Phone</label>
                <input
                  type="text"
                  value={template.config.phone || ''}
                  onChange={(e) => updateConfig('phone', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Tax / TIN Number</label>
                <input
                  type="text"
                  value={template.config.taxNumber || ''}
                  onChange={(e) => updateConfig('taxNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Store Address</label>
              <input
                type="text"
                value={template.config.address || ''}
                onChange={(e) => updateConfig('address', e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Receipt Footer Message</label>
              <input
                type="text"
                value={template.config.footerText || ''}
                onChange={(e) => updateConfig('footerText', e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Terms & Return Policy</label>
              <textarea
                rows={2}
                value={template.config.termsAndConditions || ''}
                onChange={(e) => updateConfig('termsAndConditions', e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Document Preview */}
        <div className="w-1/2 bg-slate-200 dark:bg-slate-950/60 rounded-3xl p-6 flex flex-col items-center justify-center overflow-hidden">
          <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
            <Eye size={14} />
            <span>Interactive Layout Preview ({activeType === 'RECEIPT_80MM' ? '80mm Thermal' : 'A4 Invoice'})</span>
          </div>

          <div
            className={`bg-white text-slate-900 shadow-2xl p-6 font-mono text-[11px] overflow-y-auto max-h-[500px] border border-slate-300 ${
              activeType === 'RECEIPT_80MM' ? 'w-72 rounded-lg' : 'w-[420px] rounded-lg'
            }`}
          >
            {/* Business Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h3 className="font-bold text-sm tracking-tight" style={{ color: template.config.accentColor }}>
                {template.config.businessName}
              </h3>
              {template.config.tagline && <p className="text-[9px] text-slate-500 italic">{template.config.tagline}</p>}
              {template.config.address && <p className="text-[9px] text-slate-600 mt-1">{template.config.address}</p>}
              {template.config.phone && <p className="text-[9px] text-slate-600">Tel: {template.config.phone}</p>}
              {template.config.taxNumber && <p className="text-[9px] text-slate-600">TIN: {template.config.taxNumber}</p>}
            </div>

            {/* Meta */}
            <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-slate-300">
              <div>Invoice: INV-2026-00042</div>
              <div>Date: 29/09/2026, 02:45 PM</div>
              <div>Cashier: Staff Member</div>
              <div>Customer: Walk-in Customer</div>
            </div>

            {/* Sample Table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] mb-1">
                <span>ITEM</span>
                <span>QTY</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Jeans Denim Regular</span>
                  <span>1</span>
                  <span>3,200.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Cotton Crew T-Shirt</span>
                  <span>2</span>
                  <span>3,200.00</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="py-2 text-[10px] space-y-0.5 text-right border-b border-dashed border-slate-300">
              <div>Subtotal: LKR 6,400.00</div>
              <div className="font-bold text-xs" style={{ color: template.config.accentColor }}>
                TOTAL: LKR 6,400.00
              </div>
              <div>CASH: LKR 7,000.00</div>
              <div>Change: LKR 600.00</div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] text-slate-500 space-y-1">
              <p>{template.config.footerText || 'Thank you for your visit!'}</p>
              <p className="italic text-[8px] text-slate-400">{template.config.termsAndConditions}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
