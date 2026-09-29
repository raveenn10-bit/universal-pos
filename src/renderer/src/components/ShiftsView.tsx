import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  X,
  History
} from 'lucide-react';
import { Shift, UserSession } from '../../../shared/types';

interface ShiftsViewProps {
  token: string;
  user: UserSession | null;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({ token, user }) => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Form states
  const [openingFloat, setOpeningFloat] = useState('5000.00');
  const [openNotes, setOpenNotes] = useState('');

  const [cashEventAmount, setCashEventAmount] = useState('');
  const [cashEventReason, setCashEventReason] = useState('');

  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadShiftData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      const current = await api.shifts.getActiveShift(user.userId);
      setActiveShift(current);

      const history = await api.shifts.getShiftHistory(25);
      setShiftHistory(history || []);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftData();
  }, [user]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingFloat);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid opening float amount.');
      return;
    }
    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      await api.shifts.openShift({
        openingCashMinor: Math.round(amount * 100),
        notes: openNotes.trim() || 'Shift started',
      }, token);

      setShowOpenModal(false);
      setOpeningFloat('5000.00');
      setOpenNotes('');
      loadShiftData();
      alert('Shift opened successfully! Cash drawer is now ready for billing.');
    } catch (err: any) {
      alert(`Failed to open shift: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashEvent = async (eventType: 'CASH_IN' | 'CASH_OUT') => {
    if (!activeShift) return;
    const amount = parseFloat(cashEventAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!cashEventReason.trim()) {
      alert('Please enter a reason for this cash transaction.');
      return;
    }

    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      await api.shifts.recordCashEvent({
        shiftId: activeShift.id,
        eventType,
        amountMinor: Math.round(amount * 100),
        reason: cashEventReason.trim(),
      }, token);

      setShowCashInModal(false);
      setShowCashOutModal(false);
      setCashEventAmount('');
      setCashEventReason('');
      loadShiftData();
      alert(`${eventType === 'CASH_IN' ? 'Cash In' : 'Cash Out'} recorded successfully.`);
    } catch (err: any) {
      alert(`Failed to record cash event: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || counted < 0) {
      alert('Please enter counted physical cash amount in the drawer.');
      return;
    }

    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      await api.shifts.closeShift({
        shiftId: activeShift.id,
        countedCashMinor: Math.round(counted * 100),
        notes: closeNotes.trim() || 'Shift closed',
      }, token);

      setShowCloseModal(false);
      setCountedCash('');
      setCloseNotes('');
      loadShiftData();
      alert('Shift closed and drawer reconciled successfully!');
    } catch (err: any) {
      alert(`Failed to close shift: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const expectedCashMinor = activeShift
    ? activeShift.openingCashMinor +
      activeShift.totalSalesCashMinor +
      activeShift.cashInMinor -
      activeShift.cashOutMinor
    : 0;

  const countedMinor = Math.round((parseFloat(countedCash) || 0) * 100);
  const diffMinor = countedMinor - expectedCashMinor;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb] dark:bg-slate-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Coins className="text-[#1a4cd2]" size={24} />
            Cash Register & Drawer Shifts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track opening floats, cash sales, paid ins/outs, and shift end drawer reconciliations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeShift ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCashInModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <ArrowDownLeft size={15} />
                <span>+ Cash In</span>
              </button>

              <button
                onClick={() => setShowCashOutModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <ArrowUpRight size={15} />
                <span>- Cash Out / Drop</span>
              </button>

              <button
                onClick={() => {
                  setCountedCash((expectedCashMinor / 100).toFixed(2));
                  setShowCloseModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <Lock size={15} />
                <span>Close Shift</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Unlock size={16} />
              <span>Open Cash Drawer Shift</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Active Shift Card or Empty State */}
        {activeShift ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black">
                  <Unlock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      ACTIVE SHIFT OPEN
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{activeShift.id.slice(-8)}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">
                    Cashier: {activeShift.cashierName}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block">Shift Started At</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 justify-end">
                  <Clock size={14} className="text-slate-400" />
                  {new Date(activeShift.openedAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })} ({new Date(activeShift.openedAt).toLocaleDateString()})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
                <span className="text-xs font-semibold text-slate-400 block">Opening Float</span>
                <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">
                  LKR {(activeShift.openingCashMinor / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30">
                <span className="text-xs font-semibold text-emerald-600 block">Cash Sales</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  LKR {(activeShift.totalSalesCashMinor / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30">
                <span className="text-xs font-semibold text-blue-600 block">Cash In / Payouts</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                  + LKR {(activeShift.cashInMinor / 100).toFixed(2)} / - LKR {(activeShift.cashOutMinor / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
                <span className="text-xs font-semibold text-slate-400 block">Card / Transfer Sales</span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1 block">
                  LKR {((activeShift.totalSalesCardMinor + activeShift.totalSalesTransferMinor) / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1a4cd2]/10 border border-[#1a4cd2]/20">
                <span className="text-xs font-bold text-[#1a4cd2] dark:text-blue-300 block">Expected Cash in Drawer</span>
                <span className="text-2xl font-black text-[#1a4cd2] dark:text-blue-400 mt-1 block">
                  LKR {(expectedCashMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cash Register is Currently Closed</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                You must open a shift and specify an opening cash float to begin processing cash sales and keeping drawer reconciliation.
              </p>
            </div>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Open Register Shift Now
            </button>
          </div>
        )}

        {/* Shift History Log */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <History size={16} className="text-[#1a4cd2]" />
              Shift Reconciliations & Audit Log
            </h3>
            <span className="text-xs text-slate-400">Past shifts archive</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Shift Period</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Opening Float</th>
                  <th className="py-3 px-4 text-right">Expected Drawer</th>
                  <th className="py-3 px-4 text-right">Counted Cash</th>
                  <th className="py-3 px-4 text-right">Discrepancy</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No shift records found.
                    </td>
                  </tr>
                ) : (
                  shiftHistory.map((s) => {
                    const hasDiscrepancy = s.discrepancyMinor !== 0 && s.discrepancyMinor !== null;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          <div>{new Date(s.openedAt).toLocaleDateString()}</div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                          {s.cashierName}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                          LKR {(s.openingCashMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                          {s.closingCashExpectedMinor !== null ? `LKR ${(s.closingCashExpectedMinor / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-white">
                          {s.closingCashCountedMinor !== null ? `LKR ${(s.closingCashCountedMinor / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {s.discrepancyMinor === null || s.discrepancyMinor === 0 ? (
                            <span className="text-emerald-600">Matched (0.00)</span>
                          ) : s.discrepancyMinor > 0 ? (
                            <span className="text-blue-600">+ LKR {(s.discrepancyMinor / 100).toFixed(2)} (Over)</span>
                          ) : (
                            <span className="text-rose-600">- LKR {Math.abs(s.discrepancyMinor / 100).toFixed(2)} (Short)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              s.status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {s.status}
                          </span>
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

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Unlock size={18} className="text-[#1a4cd2]" />
                Open Cash Drawer Shift
              </h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Opening Cash Float in Drawer (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Shift Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Shift"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Opening...' : 'Start Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash In / Out Modals */}
      {(showCashInModal || showCashOutModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {showCashInModal ? <ArrowDownLeft size={18} className="text-emerald-600" /> : <ArrowUpRight size={18} className="text-amber-600" />}
                {showCashInModal ? 'Cash In (Drawer Float Addition)' : 'Cash Out (Safe Drop / Petty Cash)'}
              </h3>
              <button
                onClick={() => {
                  setShowCashInModal(false);
                  setShowCashOutModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={cashEventAmount}
                  onChange={(e) => setCashEventAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason / Purpose *
                </label>
                <input
                  type="text"
                  placeholder={showCashInModal ? 'e.g. Added 500 LKR coins' : 'e.g. Bank Safe Drop or Tea Expenses'}
                  value={cashEventReason}
                  onChange={(e) => setCashEventReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCashInModal(false);
                    setShowCashOutModal(false);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleCashEvent(showCashInModal ? 'CASH_IN' : 'CASH_OUT')}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer ${
                    showCashInModal ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Lock size={18} className="text-rose-600" />
                Close Shift & Drawer Reconciliation
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="py-4 space-y-3.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Opening Float:</span>
                  <span>LKR {(activeShift.openingCashMinor / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cash Sales:</span>
                  <span>+ LKR {(activeShift.totalSalesCashMinor / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Net Cash In/Out:</span>
                  <span>LKR {((activeShift.cashInMinor - activeShift.cashOutMinor) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-600">
                  <span>Expected Drawer Cash:</span>
                  <span className="text-[#1a4cd2]">LKR {(expectedCashMinor / 100).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Counted Physical Cash in Drawer (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              {/* Over / Short Indicator */}
              <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold">
                <span>Reconciliation Discrepancy:</span>
                {diffMinor === 0 ? (
                  <span className="text-emerald-600">Perfect Match (0.00)</span>
                ) : diffMinor > 0 ? (
                  <span className="text-blue-600">+ LKR {(diffMinor / 100).toFixed(2)} (Cash Over)</span>
                ) : (
                  <span className="text-rose-600">- LKR {Math.abs(diffMinor / 100).toFixed(2)} (Cash Short)</span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Closing Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes or discrepancy explanation"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Closing...' : 'Close & Lock Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
