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
  Clock,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Check,
  RefreshCw,
  Plus,
  Minus,
  Ban,
  Tag
} from 'lucide-react';
import { Sale, UserSession, CartItem } from '../../../shared/types';

interface OrdersViewProps {
  token: string;
  user?: UserSession | null;
}

interface EditableItem {
  productId: string;
  variantId?: string;
  productName: string;
  sku: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  unitCostMinor: number;
  lineDiscount: number;
  taxRateBps: number;
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ token, user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CORRECTED' | 'VOIDED'>('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Reversal Modal State
  const [saleToReverse, setSaleToReverse] = useState<Sale | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);

  // Edit Invoice Modal State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editGlobalDiscount, setEditGlobalDiscount] = useState<number>(0);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Owner or authorized manager check
  const isAuthorized =
    user?.role === 'owner' ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('pos.void') ||
    user?.permissions?.includes('pos.refund');

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

  // Reversal Execution
  const handleConfirmReverse = async () => {
    if (!saleToReverse) return;
    if (!reverseReason.trim()) {
      setReverseError('Please enter a reason for reversing / voiding this invoice.');
      return;
    }
    setReverseLoading(true);
    setReverseError(null);
    try {
      const api = (window as any).apexApi;
      const updated = await api.checkout.reverseSale(saleToReverse.id, reverseReason.trim(), token);
      setSales(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      if (selectedSale?.id === updated.id) {
        setSelectedSale(updated);
      }
      setSaleToReverse(null);
      setReverseReason('');
      alert(`Invoice #${updated.invoiceNumber} reversed successfully.\nItems returned to stock & credit ledgers updated.`);
    } catch (err: any) {
      setReverseError(err.message || 'Failed to reverse invoice.');
    } finally {
      setReverseLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customerName || '');
    setEditNotes(sale.notes || '');
    setEditReason('');
    setEditGlobalDiscount(sale.discountMinor ? sale.discountMinor / 100 : 0);
    setEditError(null);

    const mappedItems: EditableItem[] = (sale.items || []).map(it => ({
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      barcode: it.barcode,
      qty: it.quantityScale4 / 10000,
      unitPrice: it.unitPriceMinor / 100,
      unitCostMinor: it.unitCostMinor,
      lineDiscount: (it.discountMinor || 0) / 100,
      taxRateBps: it.taxRateBps || 0,
      serialNumber: it.serialNumber,
      imei1: it.imei1,
      imei2: it.imei2,
    }));
    setEditItems(mappedItems);
  };

  // Save Edit Execution
  const handleSaveEdit = async () => {
    if (!editingSale) return;
    if (!editReason.trim()) {
      setEditError('Please enter a reason for modifying this invoice.');
      return;
    }
    if (editItems.length === 0) {
      setEditError('An invoice must contain at least one line item.');
      return;
    }
    for (const it of editItems) {
      if (it.qty <= 0) {
        setEditError(`Quantity for "${it.productName}" must be greater than zero.`);
        return;
      }
      if (it.unitPrice < 0) {
        setEditError(`Unit price for "${it.productName}" cannot be negative.`);
        return;
      }
    }

    setEditLoading(true);
    setEditError(null);
    try {
      const api = (window as any).apexApi;
      const payloadItems = editItems.map(it => ({
        productId: it.productId,
        variantId: it.variantId,
        productName: it.productName,
        sku: it.sku,
        barcode: it.barcode,
        quantityScale4: Math.round(it.qty * 10000),
        unitPriceMinor: Math.round(it.unitPrice * 100),
        unitCostMinor: it.unitCostMinor,
        discountMinor: Math.round((it.lineDiscount || 0) * 100),
        taxRateBps: it.taxRateBps || 0,
        serialNumber: it.serialNumber,
        imei1: it.imei1,
        imei2: it.imei2,
      }));

      const updated = await api.checkout.editSale({
        saleId: editingSale.id,
        customerName: editCustomerName.trim() || undefined,
        notes: editNotes,
        discountMinor: Math.round(editGlobalDiscount * 100),
        discountType: 'FIXED',
        items: payloadItems,
        reason: editReason.trim(),
      }, token);

      setSales(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      if (selectedSale?.id === updated.id) {
        setSelectedSale(updated);
      }
      setEditingSale(null);
      alert(`Invoice #${updated.invoiceNumber} updated successfully!\nStock levels and ledger entries have been adjusted.`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update invoice.');
    } finally {
      setEditLoading(false);
    }
  };

  // Calculations for Edit Modal
  const editSubtotal = editItems.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
  const editLineDiscounts = editItems.reduce((sum, it) => sum + (it.lineDiscount || 0), 0);
  const editTax = editItems.reduce((sum, it) => {
    const lineNet = Math.max(0, (it.qty * it.unitPrice) - (it.lineDiscount || 0));
    return sum + (it.taxRateBps ? (lineNet * it.taxRateBps) / 10000 : 0);
  }, 0);
  const editGrandTotal = Math.max(0, editSubtotal - editLineDiscounts - editGlobalDiscount + editTax);
  const origPaid = editingSale ? editingSale.paidMinor / 100 : 0;
  const balanceDiff = editGrandTotal - origPaid;

  const filteredSales = sales.filter((s) => {
    if (statusFilter !== 'ALL' && s.saleStatus !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.cashierName && s.cashierName.toLowerCase().includes(q))
    );
  });

  // KPIs - excluding VOIDED from revenue calculation
  const activeSales = filteredSales.filter(s => s.saleStatus !== 'VOIDED');
  const totalOrders = filteredSales.length;
  const totalRevenueMinor = activeSales.reduce((acc, s) => acc + s.totalMinor, 0);
  const averageOrderMinor = activeSales.length > 0 ? Math.round(totalRevenueMinor / activeSales.length) : 0;
  const creditOrdersCount = activeSales.filter(s => s.payments?.some(p => p.method === 'CREDIT')).length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            COMPLETED
          </span>
        );
      case 'CORRECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            CORRECTED
          </span>
        );
      case 'VOIDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            VOIDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb] dark:bg-slate-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <ShoppingBag className="text-[#1a4cd2]" size={24} />
              Orders & Sales Invoices History
            </h1>
            {isAuthorized && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-[#1a4cd2] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Owner Controls Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View completed transactions, reprint receipts, edit invoices, and reverse / void sales with stock reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'COMPLETED', 'CORRECTED', 'VOIDED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-800 text-[#1a4cd2] dark:text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a4cd2]"
            />
          </div>

          <button
            onClick={loadSales}
            title="Refresh order records"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
              <p className="text-xs font-semibold text-slate-400">Total Invoices Listed</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalOrders}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Active Billed Revenue</p>
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
              <p className="text-xs font-semibold text-slate-400">Average Active Order</p>
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
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {loading ? 'Loading orders...' : 'No sales records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => {
                    const itemCount = s.items?.reduce((sum, it) => sum + (it.quantityScale4 / 10000), 0) || 0;
                    const isVoided = s.saleStatus === 'VOIDED';

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isVoided
                            ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={isVoided ? 'line-through text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}>
                            {s.invoiceNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(s.saleStatus)}
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
                        <td className="py-3.5 px-4 text-right font-black">
                          <span className={isVoided ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}>
                            LKR {(s.totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedSale(s)}
                              title="View Invoice Details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Print Receipt */}
                            <button
                              onClick={() => handleExportReceipt(s.id)}
                              title="Print 80mm Receipt"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Download A4 PDF */}
                            <button
                              onClick={() => handleExportA4Invoice(s.id)}
                              title="Download A4 Tax Invoice PDF"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Download size={13} />
                              A4
                            </button>

                            {/* Owner Controls: Edit & Reverse */}
                            {isAuthorized && !isVoided && (
                              <>
                                <button
                                  onClick={() => openEditModal(s)}
                                  title="Edit Invoice Details (Owner)"
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                                >
                                  <Edit3 size={15} />
                                </button>

                                <button
                                  onClick={() => {
                                    setSaleToReverse(s);
                                    setReverseReason('');
                                    setReverseError(null);
                                  }}
                                  title="Reverse / Void Invoice & Restock Inventory (Owner)"
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer border border-red-200 dark:border-red-800"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              </>
                            )}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1a4cd2]">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                      Invoice #{selectedSale.invoiceNumber}
                    </h3>
                    {renderStatusBadge(selectedSale.saleStatus)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(selectedSale.saleDate).toLocaleString('en-LK')} &bull; Cashier: {selectedSale.cashierName || 'Staff'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Customer info */}
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
                  <span className={selectedSale.saleStatus === 'VOIDED' ? 'line-through text-slate-400' : 'text-[#1a4cd2] dark:text-blue-400'}>
                    LKR {(selectedSale.totalMinor / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes / Audit Log */}
              {selectedSale.notes && (
                <div className="p-3 bg-slate-100/70 dark:bg-slate-900/50 rounded-xl text-xs">
                  <p className="font-bold text-slate-500 dark:text-slate-400 mb-1">Invoice Notes & Audit Trail:</p>
                  <pre className="font-sans whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    {selectedSale.notes}
                  </pre>
                </div>
              )}
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
                {isAuthorized && selectedSale.saleStatus !== 'VOIDED' && (
                  <>
                    <button
                      onClick={() => {
                        openEditModal(selectedSale);
                        setSelectedSale(null);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      <Edit3 size={14} />
                      <span>Edit Invoice</span>
                    </button>
                    <button
                      onClick={() => {
                        setSaleToReverse(selectedSale);
                        setReverseReason('');
                        setReverseError(null);
                        setSelectedSale(null);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      <RotateCcw size={14} />
                      <span>Reverse / Void</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleExportReceipt(selectedSale.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Receipt</span>
                </button>
                <button
                  onClick={() => handleExportA4Invoice(selectedSale.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  <Download size={15} />
                  <span>A4 Tax Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVERSE / VOID INVOICE CONFIRMATION MODAL */}
      {saleToReverse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Reverse Invoice #{saleToReverse.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Grand Total: <span className="font-bold text-slate-800 dark:text-white">LKR {(saleToReverse.totalMinor / 100).toFixed(2)}</span> &bull; Customer: {saleToReverse.customerName || 'Walk-in'}
                </p>
              </div>
              <button
                onClick={() => setSaleToReverse(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200/60 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Ban size={14} /> Attention: Irreversible Inventory & Ledger Action
              </p>
              <p className="leading-relaxed text-[11px]">
                Voiding this invoice will immediately restore all {saleToReverse.items?.length || 0} line item units back to inventory stock, release serialized units, deduct active shift totals, and refund customer credit ledgers.
              </p>
            </div>

            {reverseError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold">
                {reverseError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for Reversal / Cancellation *
              </label>
              <input
                type="text"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Customer cancelled order, duplicate entry, incorrect pricing..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />

              {/* Quick Reason Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Customer requested cancellation',
                  'Incorrect items billed',
                  'Payment method change required',
                  'Accidental cashier punch',
                  'Defective item returned immediately'
                ].map(sug => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setReverseReason(sug)}
                    className="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaleToReverse(null)}
                disabled={reverseLoading}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReverse}
                disabled={reverseLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {reverseLoading && <RefreshCw size={13} className="animate-spin" />}
                Confirm Void & Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Edit Invoice #{editingSale.invoiceNumber}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                      Owner Mode
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original Date: {new Date(editingSale.saleDate).toLocaleString('en-LK')} &bull; Original Total: LKR {(editingSale.totalMinor / 100).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {editError}
                </div>
              )}

              {/* Customer & Reason Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Billed Customer Name
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-[#1a4cd2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Reason for Correction *
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Price adjustment, quantity updated, line discount applied"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Invoice Items ({editItems.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Adjust quantity, unit price, and discounts. Stock is automatically reconciled.
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                        <th className="py-2.5 px-3 text-right w-32">Unit Price (LKR)</th>
                        <th className="py-2.5 px-3 text-right w-28">Line Disc (LKR)</th>
                        <th className="py-2.5 px-3 text-right w-32">Total (LKR)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {editItems.map((item, idx) => {
                        const lineTotal = Math.max(0, (item.qty * item.unitPrice) - (item.lineDiscount || 0));
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800 dark:text-white">{item.productName}</p>
                              {(item.serialNumber || item.imei1) && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.serialNumber ? `S/N: ${item.serialNumber}` : `IMEI: ${item.imei1}`}
                                </p>
                              )}
                            </td>

                            {/* Qty Input with +/- buttons */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it));
                                  }}
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: val } : it));
                                  }}
                                  className="w-12 text-center py-1 bg-slate-50 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 rounded font-bold text-slate-800 dark:text-white text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it));
                                  }}
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: val } : it));
                                }}
                                className="w-24 text-right py-1 px-2 bg-slate-50 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 rounded font-mono font-bold text-slate-800 dark:text-white text-xs outline-none"
                              />
                            </td>

                            {/* Line Discount */}
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.lineDiscount || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, lineDiscount: val } : it));
                                }}
                                className="w-20 text-right py-1 px-2 bg-slate-50 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 rounded font-mono text-rose-600 text-xs outline-none"
                              />
                            </td>

                            {/* Line Total */}
                            <td className="py-2.5 px-3 text-right font-black text-slate-800 dark:text-white font-mono">
                              {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Remove Item */}
                            <td className="py-2.5 px-2 text-center">
                              {editItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditItems(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  title="Remove item from invoice"
                                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cart Discount & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Global Invoice Discount (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editGlobalDiscount}
                    onChange={(e) => setEditGlobalDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-[#1a4cd2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Invoice Notes
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-[#1a4cd2] outline-none"
                  />
                </div>
              </div>

              {/* Recalculated Financial Summary */}
              <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl space-y-2 text-xs border border-slate-200/80 dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>New Subtotal:</span>
                  <span className="font-semibold font-mono">LKR {editSubtotal.toFixed(2)}</span>
                </div>
                {(editLineDiscounts > 0 || editGlobalDiscount > 0) && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Total Discounts:</span>
                    <span className="font-mono">- LKR {(editLineDiscounts + editGlobalDiscount).toFixed(2)}</span>
                  </div>
                )}
                {editTax > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>VAT / Tax:</span>
                    <span className="font-mono">LKR {editTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span>Recalculated Grand Total:</span>
                  <span className="text-[#1a4cd2] dark:text-blue-400 font-mono">
                    LKR {editGrandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700 font-semibold">
                  <span className="text-slate-500">Paid Originally:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">LKR {origPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className={balanceDiff > 0 ? 'text-amber-600' : balanceDiff < 0 ? 'text-emerald-600' : 'text-slate-500'}>
                    {balanceDiff > 0 ? 'Customer Balance Due:' : balanceDiff < 0 ? 'Refund Due to Customer:' : 'Payment Settled:'}
                  </span>
                  <span className={`font-mono ${balanceDiff > 0 ? 'text-amber-600' : balanceDiff < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    LKR {Math.abs(balanceDiff).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                disabled={editLoading}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-5 py-2 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {editLoading && <RefreshCw size={13} className="animate-spin" />}
                Save Corrections & Reconcile Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
