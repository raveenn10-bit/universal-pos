import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  FileText,
  Printer,
  Download,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  CheckCircle2,
  X,
  Eye,
  Percent,
  Clock
} from 'lucide-react';
import { Sale } from '../../../shared/types';

interface OrdersViewProps {
  token: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ token }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      const res = await api.checkout.getRecentSales(100);
      setSales(res || []);
    } catch (err: any) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleExportReceipt = async (saleId: string) => {
    try {
      const api = (window as any).apexApi;
      if (api?.pdf?.printReceipt) {
        await api.pdf.printReceipt(saleId);
      } else {
        const res = await api.pdf.exportReceiptPdf(saleId);
        if (res) alert(`Receipt PDF exported successfully:\n${res.filePath}`);
      }
    } catch (err: any) {
      alert(`Print receipt failed: ${err.message}`);
    }
  };

  const handleExportA4Invoice = async (saleId: string) => {
    try {
      const api = (window as any).apexApi;
      if (api?.pdf?.printInvoice) {
        await api.pdf.printInvoice(saleId);
      } else {
        const res = await api.pdf.exportInvoicePdf(saleId);
        if (res) alert(`A4 Tax Invoice PDF exported successfully:\n${res.filePath}`);
      }
    } catch (err: any) {
      alert(`Print invoice failed: ${err.message}`);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.cashierName && s.cashierName.toLowerCase().includes(q))
    );
  });

  // KPIs
  const totalOrders = filteredSales.length;
  const totalRevenueMinor = filteredSales.reduce((acc, s) => acc + s.totalMinor, 0);
  const averageOrderMinor = totalOrders > 0 ? Math.round(totalRevenueMinor / totalOrders) : 0;
  const creditOrdersCount = filteredSales.filter(s => s.payments?.some(p => p.method === 'CREDIT')).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb] dark:bg-slate-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="text-[#1a4cd2]" size={24} />
            Orders & Sales Invoices History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View completed transactions, reprint receipts, and download commercial A4 tax invoices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice # or customer..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a4cd2]"
            />
          </div>

          <button
            onClick={loadSales}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-8 pt-6 pb-2">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1a4cd2]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Invoices</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalOrders}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Billed Revenue</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                LKR {(totalRevenueMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
              <Percent size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Average Order Value</p>
              <h3 className="text-2xl font-black text-purple-600 mt-0.5">
                LKR {(averageOrderMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Credit Invoices</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">{creditOrdersCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {loading ? 'Loading orders...' : 'No sales records found. Start selling from the Fast Checkout screen!'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => {
                    const itemCount = s.items?.reduce((sum, it) => sum + (it.quantityScale4 / 10000), 0) || 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {s.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {new Date(s.saleDate).toLocaleString('en-LK', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 dark:text-white">
                            {s.customerName || 'Walk-in Customer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {s.cashierName || 'Staff'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {s.payments?.map((p, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.method === 'CASH'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : p.method === 'CARD'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {p.method}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                          {itemCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800 dark:text-white">
                          LKR {(s.totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSale(s)}
                              title="View Invoice Details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => handleExportReceipt(s.id)}
                              title="Print 80mm Receipt"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            >
                              <Printer size={15} />
                            </button>

                            <button
                              onClick={() => handleExportA4Invoice(s.id)}
                              title="Download A4 Tax Invoice PDF"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Download size={13} />
                              A4 PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#1a4cd2]" />
                  Invoice #{selectedSale.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(selectedSale.saleDate).toLocaleString('en-LK')} &bull; Cashier: {selectedSale.cashierName || 'Staff'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Customer info if present */}
              {selectedSale.customerName && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-xs flex justify-between">
                  <div>
                    <span className="text-slate-400 block font-semibold">Billed Customer:</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{selectedSale.customerName}</span>
                  </div>
                  {selectedSale.customerSnapshot?.phone && (
                    <div>
                      <span className="text-slate-400 block font-semibold">Phone:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSale.customerSnapshot.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Line Items Purchased
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedSale.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800 dark:text-white">{item.productName}</p>
                            {(item.serialNumber || item.imei1) && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                {item.serialNumber ? `S/N: ${item.serialNumber}` : `IMEI: ${item.imei1}`}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {item.quantityScale4 / 10000}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            LKR {(item.unitPriceMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-white">
                            LKR {(item.lineTotalMinor / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Calculation */}
              <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-semibold">LKR {(selectedSale.subtotalMinor / 100).toFixed(2)}</span>
                </div>
                {selectedSale.discountMinor > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Discount:</span>
                    <span>- LKR {(selectedSale.discountMinor / 100).toFixed(2)}</span>
                  </div>
                )}
                {selectedSale.taxMinor > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>VAT / Tax:</span>
                    <span>LKR {(selectedSale.taxMinor / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span>Grand Total:</span>
                  <span className="text-[#1a4cd2] dark:text-blue-400">
                    LKR {(selectedSale.totalMinor / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportReceipt(selectedSale.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => handleExportA4Invoice(selectedSale.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download A4 Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
