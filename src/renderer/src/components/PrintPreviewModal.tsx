import React, { useState } from 'react';
import { Printer, Download, ExternalLink, X, FileText, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../../shared/types';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  branding?: any;
  defaultType?: 'RECEIPT' | 'INVOICE';
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  sale,
  branding,
  defaultType = 'RECEIPT'
}) => {
  const [docType, setDocType] = useState<'RECEIPT' | 'INVOICE'>(defaultType);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !sale) return null;

  const businessName = branding?.businessName || 'Harsh Apex Universal POS';
  const address = branding?.address || 'Colombo, Sri Lanka';
  const phone = branding?.phone || '+94 11 234 5678';
  const taxId = branding?.taxId || '';

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleSystemPdfPrint = async () => {
    setIsPrinting(true);
    try {
      const api = (window as any).apexApi;
      if (docType === 'RECEIPT') {
        if (api?.pdf?.printReceipt) {
          await api.pdf.printReceipt(sale.id);
        } else {
          await api?.pdf?.exportReceiptPdf(sale.id);
        }
      } else {
        if (api?.pdf?.printInvoice) {
          await api.pdf.printInvoice(sale.id);
        } else {
          await api?.pdf?.exportInvoicePdf(sale.id);
        }
      }
    } catch (err: any) {
      alert('Print error: ' + (err.message || 'Failed to open PDF'));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveAsPdf = async () => {
    try {
      const api = (window as any).apexApi;
      if (docType === 'RECEIPT') {
        await api?.pdf?.exportReceiptPdf(sale.id);
      } else {
        await api?.pdf?.exportInvoicePdf(sale.id);
      }
    } catch (err: any) {
      alert('Export error: ' + (err.message || 'Failed to save PDF'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Control Bar (Non-Printable) */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Format:
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDocType('RECEIPT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'RECEIPT'
                    ? 'bg-white dark:bg-slate-800 text-[#1a4cd2] dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                80mm Thermal Receipt
              </button>
              <button
                type="button"
                onClick={() => setDocType('INVOICE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'INVOICE'
                    ? 'bg-white dark:bg-slate-800 text-[#1a4cd2] dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                A4 Commercial Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              title="Send directly to printer or open print dialog"
            >
              <Printer size={15} />
              <span>Print to Printer [Ctrl+P]</span>
            </button>

            {/* System PDF Button */}
            <button
              type="button"
              onClick={handleSystemPdfPrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Open generated PDF in Windows default viewer"
            >
              <ExternalLink size={15} />
              <span>Open PDF</span>
            </button>

            {/* Save PDF Button */}
            <button
              type="button"
              onClick={handleSaveAsPdf}
              className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              title="Choose folder and save PDF file"
            >
              <Download size={15} />
              <span>Save As...</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Paper Simulation Workspace */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/80 dark:bg-slate-950 flex justify-center custom-scrollbar">
          {docType === 'RECEIPT' ? (
            /* 80mm Thermal Receipt Layout */
            <div
              id="printable-receipt-area"
              className="w-[320px] bg-white text-slate-900 p-6 rounded-2xl shadow-xl font-mono text-[11px] leading-relaxed shrink-0 select-text"
              style={{ minHeight: '480px' }}
            >
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                <h2 className="text-base font-black tracking-tight uppercase text-black">{businessName}</h2>
                {address && <p className="text-[10px] text-slate-600 leading-tight">{address}</p>}
                {phone && <p className="text-[10px] text-slate-600">Tel: {phone}</p>}
                {taxId && <p className="text-[10px] text-slate-600">Tax Reg: {taxId}</p>}
              </div>

              {/* Invoice Meta */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold text-black">
                  <span>INVOICE:</span>
                  <span>{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>DATE:</span>
                  <span>{new Date(sale.saleDate).toLocaleString('en-LK')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CASHIER:</span>
                  <span>{sale.cashierName || 'Staff'}</span>
                </div>
                {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                  <div className="flex justify-between text-slate-600">
                    <span>CUSTOMER:</span>
                    <span>{sale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-3 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-black pb-1 border-b border-slate-300 mb-1.5 text-[10px]">
                  <span className="w-1/2">ITEM</span>
                  <span className="w-1/4 text-center">QTY</span>
                  <span className="w-1/4 text-right">TOTAL</span>
                </div>

                <div className="space-y-1.5">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="text-[10px]">
                      <div className="flex justify-between items-baseline font-bold text-black">
                        <span className="w-1/2 truncate">{item.productName}</span>
                        <span className="w-1/4 text-center">{item.quantityScale4 / 10000}</span>
                        <span className="w-1/4 text-right">{(item.lineTotalMinor / 100).toFixed(2)}</span>
                      </div>
                      {(item.serialNumber || item.imei1) && (
                        <div className="text-[9px] text-slate-500 font-normal pl-1">
                          {item.serialNumber ? `S/N: ${item.serialNumber}` : `IMEI: ${item.imei1}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal:</span>
                  <span>LKR {(sale.subtotalMinor / 100).toFixed(2)}</span>
                </div>
                {sale.discountMinor > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Discount:</span>
                    <span>- LKR {(sale.discountMinor / 100).toFixed(2)}</span>
                  </div>
                )}
                {sale.taxMinor > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Tax:</span>
                    <span>LKR {(sale.taxMinor / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-black pt-1 border-t border-slate-300">
                  <span>NET TOTAL:</span>
                  <span>LKR {(sale.totalMinor / 100).toFixed(2)}</span>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                {sale.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span className="capitalize">{p.method}:</span>
                    <span>LKR {(p.amountMinor / 100).toFixed(2)}</span>
                  </div>
                ))}
                {sale.changeMinor > 0 && (
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Change:</span>
                    <span>LKR {(sale.changeMinor / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer & Barcode Representation */}
              <div className="pt-4 text-center space-y-2">
                <p className="text-[10px] font-bold text-slate-700 uppercase">
                  Thank You For Your Business!
                </p>
                <p className="text-[9px] text-slate-500">
                  Goods sold in good condition &bull; Keep receipt for warranty
                </p>
                <div className="pt-2 text-center">
                  <span className="inline-block px-3 py-1 font-mono tracking-widest text-[9px] bg-slate-100 border border-slate-300 rounded font-bold">
                    *{sale.invoiceNumber}*
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* A4 Commercial Invoice Layout */
            <div
              id="printable-invoice-area"
              className="w-[740px] bg-white text-slate-900 p-10 rounded-2xl shadow-xl select-text shrink-0"
              style={{ minHeight: '960px' }}
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-8 border-b-2 border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EE4D38] text-white flex items-center justify-center font-black text-2xl shadow-md">
                    {businessName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {businessName}
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Commercial Sales & Retail Operations
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {address} &bull; Tel: {phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 tracking-tight block">
                    INVOICE
                  </span>
                  <span className="text-sm font-mono font-bold text-[#EE4D38] block mt-0.5">
                    #{sale.invoiceNumber}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Date: {new Date(sale.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Invoice To & Meta Cards */}
              <div className="grid grid-cols-2 gap-6 my-8">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Invoice To:
                  </span>
                  <h3 className="text-sm font-black text-slate-800">
                    {sale.customerName || 'Walk-in Customer'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cash Customer &bull; Direct POS Checkout
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-l-[#EE4D38] border border-slate-200 flex justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Payment Status
                    </span>
                    <span className="text-sm font-black text-emerald-600 block mt-0.5">
                      PAID IN FULL
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cashier
                    </span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5">
                      {sale.cashierName || 'Staff'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EE4D38] text-white font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sale.items.map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{it.productName}</p>
                          {(it.serialNumber || it.imei1) && (
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {it.serialNumber ? `S/N: ${it.serialNumber}` : `IMEI: ${it.imei1}`}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {(it.unitPriceMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {it.quantityScale4 / 10000}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {(it.lineTotalMinor / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Calculations */}
              <div className="flex justify-end mb-12">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">LKR {(sale.subtotalMinor / 100).toFixed(2)}</span>
                  </div>
                  {sale.discountMinor > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Discount:</span>
                      <span className="font-mono">- LKR {(sale.discountMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {sale.taxMinor > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax / VAT:</span>
                      <span className="font-mono font-bold">LKR {(sale.taxMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-300">
                    <span>Grand Total:</span>
                    <span className="text-[#EE4D38] font-mono">
                      LKR {(sale.totalMinor / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Terms */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-xs text-slate-500">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1">Terms & Conditions</h4>
                  <p className="text-[11px] leading-relaxed">
                    1. Payment confirmed in full via POS terminal.<br />
                    2. Warranty valid only upon presentation of this commercial invoice.<br />
                    3. Physical damage or unauthorized repair voids warranty.
                  </p>
                </div>
                <div className="flex flex-col justify-end items-end text-center">
                  <div className="w-48 border-b border-slate-400 pb-1 mb-1"></div>
                  <span className="text-[11px] font-bold text-slate-700">Authorized Signature</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
