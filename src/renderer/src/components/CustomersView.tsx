import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  DollarSign,
  FileText,
  CreditCard,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDownLeft,
  Calendar,
  Download
} from 'lucide-react';
import { Customer } from '../../../shared/types';

interface CustomersViewProps {
  token: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ token }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<any>(null);

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    companyName: '',
    addressBilling: '',
    creditLimit: '0',
    notes: '',
  });

  // Settlement Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      const res = await api.customers.searchCustomers(searchQuery.trim() || undefined);
      setCustomers(res || []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      alert('Customer Name is required.');
      return;
    }
    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      const creditLimitMinor = Math.round((parseFloat(newCustomer.creditLimit) || 0) * 100);
      await api.customers.createCustomer({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
        companyName: newCustomer.companyName.trim() || undefined,
        addressBilling: newCustomer.addressBilling.trim() || undefined,
        creditLimitMinor,
        notes: newCustomer.notes.trim() || undefined,
      }, token);

      setShowAddModal(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        companyName: '',
        addressBilling: '',
        creditLimit: '0',
        notes: '',
      });
      loadCustomers();
    } catch (err: any) {
      alert(`Failed to create customer: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      await api.customers.recordSettlementPayment({
        customerId: selectedCustomer.id,
        amountMinor: Math.round(amount * 100),
        paymentMethod,
        notes: paymentNotes.trim() || 'Settlement payment',
      }, token);

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadCustomers();
      alert('Settlement payment recorded successfully!');
    } catch (err: any) {
      alert(`Failed to record payment: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenStatement = async (cust: Customer) => {
    setSelectedCustomer(cust);
    try {
      const api = (window as any).apexApi;
      const data = await api.customers.getCustomerStatement(cust.id);
      setStatementData(data);
      setShowStatementModal(true);
    } catch (err: any) {
      alert(`Failed to load statement: ${err.message}`);
    }
  };

  const handleExportStatementPdf = async (customerId: string) => {
    try {
      const api = (window as any).apexApi;
      const res = await api.pdf.exportStatementPdf(customerId);
      if (res) {
        alert(`Statement PDF exported successfully to:\n${res.filePath}`);
      }
    } catch (err: any) {
      alert(`Failed to export statement: ${err.message}`);
    }
  };

  // Metrics
  const totalCustomers = customers.length;
  const totalCreditDueMinor = customers.reduce((acc, c) => acc + (c.currentBalanceMinor > 0 ? c.currentBalanceMinor : 0), 0);
  const customersWithDue = customers.filter(c => c.currentBalanceMinor > 0).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb] dark:bg-slate-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Users className="text-[#1a4cd2]" size={24} />
            Customer Directory & Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage client profiles, credit limits, payments, and account statements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone or code..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a4cd2]"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="px-8 pt-6 pb-2">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1a4cd2]">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Registered Customers</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalCustomers}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Outstanding Credit Due</p>
              <h3 className="text-2xl font-black text-rose-600 mt-0.5">
                LKR {(totalCreditDueMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Customers with Outstanding Balances</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{customersWithDue} Accounts</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Credit Limit</th>
                  <th className="py-3.5 px-4 text-right">Current Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {loading ? 'Loading customers...' : 'No customers found. Click "+ Add Customer" above to create one.'}
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const hasDue = c.currentBalanceMinor > 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {c.customerCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                          {c.companyName && (
                            <p className="text-[11px] text-slate-400">{c.companyName}</p>
                          )}
                          {c.addressBilling && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} /> {c.addressBilling}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {c.phone ? (
                            <span className="flex items-center gap-1 font-semibold">
                              <Phone size={12} className="text-slate-400" />
                              {c.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                          {c.email && (
                            <span className="block text-[11px] text-slate-400">{c.email}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-700 dark:text-slate-200 font-semibold">
                          LKR {(c.creditLimitMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-black ${
                              hasDue
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            LKR {(c.currentBalanceMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasDue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              <AlertCircle size={10} />
                              Credit Due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle2 size={10} />
                              Settled
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {hasDue && (
                              <button
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setPaymentAmount((c.currentBalanceMinor / 100).toFixed(2));
                                  setShowPaymentModal(true);
                                }}
                                title="Record Settlement Payment"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowDownLeft size={13} />
                                Pay Due
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenStatement(c)}
                              title="View Account Statement"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <FileText size={15} />
                            </button>

                            <button
                              onClick={() => handleExportStatementPdf(c.id)}
                              title="Download Statement PDF"
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#1a4cd2] dark:text-blue-300 transition-colors cursor-pointer"
                            >
                              <Download size={15} />
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#1a4cd2]" />
                Register New Customer
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="077 123 4567"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Optional business name"
                    value={newCustomer.companyName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="kasun@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Credit Limit (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={newCustomer.creditLimit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code"
                  value={newCustomer.addressBilling}
                  onChange={(e) => setNewCustomer({ ...newCustomer, addressBilling: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Settlement Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Record Credit Settlement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">
                Outstanding Balance Due
              </span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                LKR {(selectedCustomer.currentBalanceMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Settlement Amount Received (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-[#1a4cd2] text-white border-[#1a4cd2]'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder="Receipt #, Cheque #, or reference"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Statement View Modal */}
      {showStatementModal && selectedCustomer && statementData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#1a4cd2]" />
                  Account Ledger: {selectedCustomer.name} ({selectedCustomer.customerCode})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current Balance: LKR {(selectedCustomer.currentBalanceMinor / 100).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportStatementPdf(selectedCustomer.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a4cd2] text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  <Download size={14} />
                  <span>PDF Statement</span>
                </button>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Debit (Charge)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {statementData.transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No transactions found for this account.
                      </td>
                    </tr>
                  ) : (
                    statementData.transactions?.map((t: any) => (
                      <tr key={t.id}>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {new Date(t.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-white">
                          {t.transactionType}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {t.referenceInvoice || t.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-600">
                          {t.debitMinor > 0 ? `LKR ${(t.debitMinor / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                          {t.creditMinor > 0 ? `LKR ${(t.creditMinor / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-white">
                          LKR {(t.runningBalanceMinor / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
