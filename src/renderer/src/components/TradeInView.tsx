import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Plus, 
  Search, 
  Smartphone, 
  Wrench, 
  CheckCircle2, 
  X, 
  Tag, 
  Layers, 
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { TradeInRecord } from '../../../shared/types';

interface TradeInViewProps {
  onNotify?: (type: string, msg: string) => void;
}

export const TradeInView: React.FC<TradeInViewProps> = ({ onNotify }) => {
  const [tradeIns, setTradeIns] = useState<TradeInRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Trade-In Inspection Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 ');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('iPhone 13');
  const [storage, setStorage] = useState('128GB');
  const [color, setColor] = useState('Midnight');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [batteryHealth, setBatteryHealth] = useState(85);
  const [physicalGrade, setPhysicalGrade] = useState<'Grade A' | 'Grade B' | 'Grade C' | 'Grade D'>('Grade A');
  const [screenCondition, setScreenCondition] = useState('Flawless');
  const [backGlassCondition, setBackGlassCondition] = useState('Perfect');
  const [baseGuidePrice, setBaseGuidePrice] = useState(120000);
  const [finalApprovedValue, setFinalApprovedValue] = useState(110000);
  const [refurbCost, setRefurbCost] = useState(5000);
  const [staffNotes, setStaffNotes] = useState('');

  const loadTradeIns = async () => {
    setLoading(true);
    try {
      const data = await (window as any).apexApi.tradein.list({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTradeIns(data || []);
    } catch (err) {
      console.error('Failed to load trade-in records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTradeIns();
  }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !imei1.trim() || !model.trim()) return;

    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.tradein.create({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        brand: brand.trim(),
        model: model.trim(),
        storage,
        color,
        imei1: imei1.trim(),
        imei2: imei2.trim() || undefined,
        batteryHealth: Number(batteryHealth),
        physicalGrade,
        screenCondition,
        backGlassCondition,
        baseGuidePriceMinor: Math.round(Number(baseGuidePrice) * 100),
        suggestedValueMinor: Math.round(Number(finalApprovedValue) * 100),
        finalApprovedValueMinor: Math.round(Number(finalApprovedValue) * 100),
        refurbishmentCostMinor: Math.round(Number(refurbCost) * 100),
        staffNotes: staffNotes.trim() || undefined,
      }, token);

      setIsModalOpen(false);
      resetForm();
      loadTradeIns();
      if (onNotify) onNotify('success', 'Trade-in valuation recorded!');
    } catch (err: any) {
      alert(err.message || 'Failed to record trade-in');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('+94 ');
    setImei1('');
    setImei2('');
    setStaffNotes('');
  };

  const handleConvertToStock = async (tradeInId: string) => {
    const confirmConvert = confirm('Convert this inspected trade-in unit into sellable stock in inventory?');
    if (!confirmConvert) return;

    try {
      const token = localStorage.getItem('apex_token') || '';
      await (window as any).apexApi.tradein.convertToInventory(tradeInId, token);
      loadTradeIns();
      if (onNotify) onNotify('success', 'Trade-in device converted to available inventory stock!');
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
            <Repeat size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              Trade-In, Exchange & Device Buyback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Diagnostic inspection, condition grading, true acquisition cost & stock conversion
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Plus size={16} />
          <span>New Trade-In Inspection</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trade-ins, IMEI, customer..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Total: {tradeIns.length} records</span>
        </div>
      </div>

      {/* Trade-Ins Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">Trade-In #</th>
              <th className="p-3.5">Device Model</th>
              <th className="p-3.5">IMEI</th>
              <th className="p-3.5">Condition & Battery</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Valuation</th>
              <th className="p-3.5">True Cost</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {tradeIns.map((ti) => (
              <tr key={ti.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">{ti.tradeInNumber}</td>
                <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                  {ti.brand} {ti.model} ({ti.storage || '128GB'})
                </td>
                <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{ti.imei1}</td>
                <td className="p-3.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{ti.physicalGrade}</span> • {ti.batteryHealth}% Battery
                </td>
                <td className="p-3.5 font-medium">{ti.customerName} ({ti.customerPhone})</td>
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                  LKR {(ti.finalApprovedValueMinor / 100).toLocaleString()}
                </td>
                <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                  LKR {(ti.trueCostMinor / 100).toLocaleString()}
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ti.status === 'READY_FOR_SALE'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {ti.status}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  {ti.status !== 'READY_FOR_SALE' && ti.status !== 'SOLD' && (
                    <button
                      onClick={() => handleConvertToStock(ti.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 ml-auto"
                    >
                      <Package size={13} />
                      <span>Convert to Stock</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Trade-In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={18} />
                <h3 className="font-bold text-base">Trade-In Diagnostic Inspection</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="077 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Device Brand *</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Google">Google</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 13 Pro"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">IMEI 1 *</label>
                  <input
                    type="text"
                    required
                    value={imei1}
                    onChange={(e) => setImei1(e.target.value)}
                    placeholder="354892..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Battery Health %</label>
                  <input
                    type="number"
                    value={batteryHealth}
                    onChange={(e) => setBatteryHealth(Number(e.target.value))}
                    min={40}
                    max={100}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Physical Grade</label>
                  <select
                    value={physicalGrade}
                    onChange={(e) => setPhysicalGrade(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  >
                    <option value="Grade A">Grade A (Mint / Like New)</option>
                    <option value="Grade B">Grade B (Minor scratches)</option>
                    <option value="Grade C">Grade C (Heavy wear)</option>
                    <option value="Grade D">Grade D (Cracked / Damaged)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Final Agreed Value (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={finalApprovedValue}
                    onChange={(e) => setFinalApprovedValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Expected Refurbishment Cost (LKR)</label>
                <input
                  type="number"
                  value={refurbCost}
                  onChange={(e) => setRefurbCost(Number(e.target.value))}
                  placeholder="Battery/screen replacement estimate"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between">
                <span className="font-bold text-slate-500">Estimated True Acquisition Cost:</span>
                <span className="font-bold text-emerald-600">
                  LKR {(finalApprovedValue + refurbCost).toLocaleString()}
                </span>
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
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md"
                >
                  Record Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
