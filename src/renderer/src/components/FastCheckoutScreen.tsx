import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CreditCard, 
  Banknote, 
  FileText, 
  Printer, 
  CheckCircle2, 
  X,
  ArrowRight
} from 'lucide-react';
import { CartItem, Customer, Product, TenderPayment, Sale } from '../../../shared/types';

interface FastCheckoutScreenProps {
  onBackToDashboard: () => void;
  token: string;
}

export const FastCheckoutScreen: React.FC<FastCheckoutScreenProps> = ({ onBackToDashboard, token }) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [discountMinor, setDiscountMinor] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tenderCashMinor, setTenderCashMinor] = useState<number>(0);
  const [tenderCardMinor, setTenderCardMinor] = useState<number>(0);
  const [tenderCreditMinor, setTenderCreditMinor] = useState<number>(0);

  // Customer Quick-Add Modal
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      if ((window as any).apexApi?.customers?.searchCustomers) {
        const custs = await (window as any).apexApi.customers.searchCustomers('');
        setCustomersList(custs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const api = (window as any).apexApi;
      let product: Product | null = null;
      if (api?.catalog?.getProductByBarcode) {
        product = await api.catalog.getProductByBarcode(barcodeInput.trim());
      }

      if (!product) {
        alert(`Product with barcode/SKU '${barcodeInput}' not found.`);
        return;
      }

      // Add to cart
      addToCart(product);
      setBarcodeInput('');
    } catch (err: any) {
      alert(err.message || 'Error scanning barcode');
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex(item => item.productId === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        const existing = copy[idx];
        const newQtyScale4 = existing.quantityScale4 + 10000;
        const lineTotal = Math.round((existing.unitPriceMinor * (newQtyScale4 / 10000)) - (existing.discountMinor || 0));
        copy[idx] = {
          ...existing,
          quantityScale4: newQtyScale4,
          lineTotalMinor: lineTotal,
        };
        return copy;
      }

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitPriceMinor: product.retailPriceMinor,
        unitCostMinor: product.costPriceMinor,
        quantityScale4: 10000,
        discountMinor: 0,
        taxRateBps: product.taxRateBps || 0,
        taxMinor: 0,
        lineTotalMinor: product.retailPriceMinor,
      };
      return [...prev, newItem];
    });
  };

  const updateQuantity = (idx: number, deltaUnits: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      const newQtyScale4 = item.quantityScale4 + (deltaUnits * 10000);
      if (newQtyScale4 <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const rawQty = newQtyScale4 / 10000;
      const lineTotal = Math.round((item.unitPriceMinor * rawQty) - item.discountMinor);
      copy[idx] = {
        ...item,
        quantityScale4: newQtyScale4,
        lineTotalMinor: lineTotal,
      };
      return copy;
    });
  };

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotalMinor = cart.reduce((acc, it) => acc + Math.round(it.unitPriceMinor * (it.quantityScale4 / 10000)), 0);
  const taxMinor = cart.reduce((acc, it) => acc + (it.taxMinor || 0), 0);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor);

  const openPayment = () => {
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }
    // Default tender: exact total in cash
    setTenderCashMinor(totalMinor);
    setTenderCardMinor(0);
    setTenderCreditMinor(0);
    setShowPaymentModal(true);
  };

  const handleCompleteSale = async () => {
    const totalTendered = tenderCashMinor + tenderCardMinor + tenderCreditMinor;
    if (totalTendered < totalMinor) {
      alert(`Insufficient tender. Total due: LKR ${(totalMinor / 100).toFixed(2)}, Tendered: LKR ${(totalTendered / 100).toFixed(2)}`);
      return;
    }

    if (tenderCreditMinor > 0 && !selectedCustomer) {
      alert('Please select a registered customer to process store credit payments.');
      return;
    }

    setIsProcessing(true);
    try {
      const payments: TenderPayment[] = [];
      if (tenderCashMinor > 0) payments.push({ method: 'CASH', amountMinor: tenderCashMinor });
      if (tenderCardMinor > 0) payments.push({ method: 'CARD', amountMinor: tenderCardMinor });
      if (tenderCreditMinor > 0) payments.push({ method: 'CREDIT', amountMinor: tenderCreditMinor });

      const payload = {
        items: cart,
        payments,
        customerId: selectedCustomer?.id,
        discountMinor,
        discountType,
        notes,
        idempotencyKey: `idm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };

      const sale = await (window as any).apexApi.checkout.processSale(payload, token);
      setCompletedSale(sale);
      setShowPaymentModal(false);
      setCart([]);
    } catch (err: any) {
      alert(err.message || 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const cust = await (window as any).apexApi.customers.quickAddCustomer(
        { name: newCustName, phone: newCustPhone },
        token
      );
      setSelectedCustomer(cust);
      setCustomersList(prev => [...prev, cust]);
      setShowQuickAddCust(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handlePrintReceipt = async (saleId: string) => {
    try {
      await (window as any).apexApi.pdf.exportReceiptPdf(saleId);
    } catch (e: any) {
      alert(e.message || 'Failed to generate receipt PDF');
    }
  };

  const handlePrintInvoice = async (saleId: string) => {
    try {
      await (window as any).apexApi.pdf.exportInvoicePdf(saleId);
    } catch (e: any) {
      alert(e.message || 'Failed to generate invoice PDF');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Fast Checkout Terminal
          </h1>
        </div>

        {/* Customer Selector / Quick-Add */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const c = customersList.find(x => x.id === e.target.value) || null;
              setSelectedCustomer(c);
            }}
            className="text-xs font-medium bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Walk-in Customer</option>
            {customersList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowQuickAddCust(true)}
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] dark:text-blue-400 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <UserPlus size={14} />
            <span>Quick-Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 2-Columns (Cart Left, Summary Right) */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Barcode Scanner + Cart Table */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Barcode Search Bar */}
          <form onSubmit={handleBarcodeSubmit} className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Barcode size={20} className="absolute left-4 top-3.5 text-[#1a4cd2]" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter barcode / SKU and press Enter..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a4cd2]"
              />
            </div>
          </form>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Barcode size={48} className="stroke-1 text-slate-300 dark:text-slate-600 mb-3" />
                <span className="text-sm font-medium">Cart is empty. Scan an item barcode to begin.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700 font-semibold">
                    <th className="pb-3 pl-2">Item Description</th>
                    <th className="pb-3">Unit Price</th>
                    <th className="pb-3 text-center">Quantity</th>
                    <th className="pb-3 text-right">Line Total</th>
                    <th className="pb-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="py-3 pl-2">
                        <span className="font-bold text-slate-800 dark:text-white block text-sm">
                          {item.productName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          SKU: {item.sku} | Barcode: {item.barcode}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                        LKR {(item.unitPriceMinor / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-slate-800 dark:text-white">
                            {item.quantityScale4 / 10000}
                          </span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-right font-black text-slate-800 dark:text-white text-sm">
                        LKR {(item.lineTotalMinor / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Order Summary & Payment Button */}
        <div className="w-96 flex flex-col justify-between bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 shrink-0">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  LKR {(subtotalMinor / 100).toFixed(2)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span>Cart Discount:</span>
                <input
                  type="number"
                  value={discountMinor / 100}
                  onChange={(e) => setDiscountMinor(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-24 text-right px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-bold"
                  placeholder="0.00"
                />
              </div>

              {taxMinor > 0 && (
                <div className="flex justify-between">
                  <span>Applicable Tax:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    LKR {(taxMinor / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Total Highlight */}
            <div className="bg-[#f0f4ff] dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 mt-4">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1 uppercase tracking-wider">
                Total Payable
              </span>
              <span className="text-3xl font-black text-[#1a4cd2] dark:text-blue-300 block">
                LKR {(totalMinor / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="w-full py-4 bg-[#1a4cd2] hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Payment</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Tender Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Payment Tender Breakdown
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="text-center bg-slate-50 dark:bg-slate-700/50 py-3 rounded-2xl">
                <span className="text-xs text-slate-400 block">Total Due</span>
                <span className="text-2xl font-black text-[#1a4cd2] dark:text-blue-400">
                  LKR {(totalMinor / 100).toFixed(2)}
                </span>
              </div>

              {/* Cash Tender */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <Banknote size={15} className="text-emerald-500" />
                  <span>Cash Payment (LKR)</span>
                </label>
                <input
                  type="number"
                  value={tenderCashMinor / 100}
                  onChange={(e) => setTenderCashMinor(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              {/* Card Tender */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <CreditCard size={15} className="text-blue-500" />
                  <span>Card Tender (LKR)</span>
                </label>
                <input
                  type="number"
                  value={tenderCardMinor / 100}
                  onChange={(e) => setTenderCardMinor(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              {/* Change calculation */}
              {(tenderCashMinor + tenderCardMinor + tenderCreditMinor) > totalMinor && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span>Change to Return:</span>
                  <span className="text-base">
                    LKR {(((tenderCashMinor + tenderCardMinor + tenderCreditMinor) - totalMinor) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={isProcessing}
                className="flex-1 py-3 bg-[#1a4cd2] text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md"
              >
                {isProcessing ? 'Processing...' : 'Confirm Sale (F12)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Success Dialog with PDF Export */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Sale Completed Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Invoice #{completedSale.invoiceNumber} | Total: LKR {(completedSale.totalMinor / 100).toFixed(2)}
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handlePrintReceipt(completedSale.id)}
                className="w-full py-3 bg-[#1a4cd2] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow"
              >
                <Printer size={16} />
                <span>Save 80mm Receipt PDF</span>
              </button>

              <button
                onClick={() => handlePrintInvoice(completedSale.id)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
              >
                <FileText size={16} />
                <span>Save A4 Tax Invoice PDF</span>
              </button>

              <button
                onClick={() => setCompletedSale(null)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Close & Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickAddCust && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleQuickAddCustomer} className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
              Quick Register Customer
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ruwan Perera"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowQuickAddCust(false)}
                className="flex-1 py-2 text-xs font-bold border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold bg-[#1a4cd2] text-white rounded-xl"
              >
                Save & Select
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
