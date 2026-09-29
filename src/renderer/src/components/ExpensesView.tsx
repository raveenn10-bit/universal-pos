import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Calendar, 
  DollarSign, 
  X, 
  TrendingDown,
  Tag
} from 'lucide-react';
import { Expense } from '../../../shared/types';

interface ExpensesViewProps {
  onNotify?: (type: string, msg: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onNotify }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // New Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Tea & Refreshments');
  const [amount, setAmount] = useState<number>(1500);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [description, setDescription] = useState('');
  const [receiptRef, setReceiptRef] = useState('');

  const categories = [
    'Tea & Refreshments',
    'Utilities & Internet',
    'Courier & Transport',
    'Shop Maintenance',
    'Staff Salaries',
    'Rent',
    'Tools & Supplies',
    'Marketing & Ads',
    'Other',
  ];

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await (window as any).apexApi.expenses.list({
        search: search.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [search, categoryFilter]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || Number(amount) <= 0) return;

    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.expenses.record({
        category,
        amountMinor: Math.round(Number(amount) * 100),
        paymentMethod,
        description: description.trim(),
        receiptRef: receiptRef.trim() || undefined,
      }, token);

      setIsModalOpen(false);
      setDescription('');
      setReceiptRef('');
      setAmount(1500);
      loadExpenses();
      if (onNotify) onNotify('success', 'Operational expense recorded!');
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense record?')) return;
    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.expenses.delete(id, token);
      loadExpenses();
      if (onNotify) onNotify('success', 'Expense removed');
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const printVoucher = (exp: Expense) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Petty Cash Voucher - ${exp.receiptRef || 'VOUCH'}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">PETTY CASH VOUCHER</div>
          <div class="center">HARSH APEX UNIVERSAL POS</div>
          <div class="divider"></div>
          <div class="row"><span>Voucher Ref:</span><span class="bold">${exp.receiptRef || 'N/A'}</span></div>
          <div class="row"><span>Date:</span><span>${exp.date}</span></div>
          <div class="row"><span>Category:</span><span class="bold">${exp.category}</span></div>
          <div class="row"><span>Payment:</span><span>${exp.paymentMethod}</span></div>
          <div class="row"><span>Recorded By:</span><span>${exp.recordedBy}</span></div>
          <div class="divider"></div>
          <div style="margin: 6px 0;"><span>Particulars:</span><br/><span class="bold">${exp.description}</span></div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 14px;">
            <span>TOTAL:</span>
            <span>LKR ${(exp.amountMinor / 100).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div style="margin-top: 25px; display: flex; justify-content: space-between;">
            <div>____________<br/>Prepared By</div>
            <div>____________<br/>Approved By</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const totalExpenseMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/30">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              Operating Expenses & Petty Cash
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track operational cash outflows, utilities, supplies & print petty cash vouchers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Plus size={16} />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Recorded Expenses</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            LKR {(totalExpenseMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Expense Entries</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {expenses.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Category</span>
          <div className="text-lg font-bold text-slate-800 dark:text-white mt-1 truncate">
            {expenses[0]?.category || 'N/A'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses, voucher, staff..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Voucher #</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Description</th>
              <th className="p-3.5">Payment Method</th>
              <th className="p-3.5">Recorded By</th>
              <th className="p-3.5 text-right">Amount</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <td className="p-3.5 text-slate-500 font-medium">{exp.date}</td>
                <td className="p-3.5 font-mono font-bold text-rose-600 dark:text-rose-400">{exp.receiptRef || 'N/A'}</td>
                <td className="p-3.5 font-bold text-slate-800 dark:text-white">{exp.category}</td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">{exp.description}</td>
                <td className="p-3.5 font-medium">{exp.paymentMethod}</td>
                <td className="p-3.5 font-medium">{exp.recordedBy}</td>
                <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">
                  LKR {(exp.amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => printVoucher(exp)}
                      title="Print Petty Cash Voucher"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      title="Delete Record"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                <h3 className="font-bold text-base">Record Operating Expense</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecord} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Amount (LKR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                >
                  <option value="Cash">Cash (Petty Cash)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Description / Particulars *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. SLT Fiber internet bill for September"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Receipt / Voucher Reference #</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="Auto-generated if blank (e.g. VOUCH-001)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-md"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
