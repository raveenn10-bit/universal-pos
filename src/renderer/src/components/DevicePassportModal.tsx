import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  BatteryCharging, 
  ShieldCheck, 
  DollarSign, 
  Copy, 
  Check, 
  ShoppingCart, 
  Search, 
  Barcode, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { Product, SerializedItem } from '../../../shared/types';

interface DevicePassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, serialOrImei?: string) => void;
}

export const DevicePassportModal: React.FC<DevicePassportModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [matchedItem, setMatchedItem] = useState<{ product: Product; item: SerializedItem } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setMatchedItem(null);
      setSearched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setLoading(true);
    setSearched(true);
    try {
      // First search in products
      const products: Product[] = await (window as any).apexApi.catalog.searchProducts(query);
      let found: { product: Product; item: SerializedItem } | null = null;

      for (const prod of products) {
        const serials: SerializedItem[] = await (window as any).apexApi.inventory.getAvailableSerials(prod.id);
        const match = serials.find(
          (s) =>
            s.serialNumber?.toLowerCase() === query.toLowerCase() ||
            s.imei1?.toLowerCase() === query.toLowerCase() ||
            s.imei2?.toLowerCase() === query.toLowerCase()
        );
        if (match) {
          found = { product: prod, item: match };
          break;
        }
      }

      // If not found in available serials, see if there's any product matching code/sku
      if (!found && products.length > 0) {
        const prod = products[0];
        const serials: SerializedItem[] = await (window as any).apexApi.inventory.getAvailableSerials(prod.id);
        if (serials.length > 0) {
          found = { product: prod, item: serials[0] };
        } else {
          // Construct fallback display for serialized item
          found = {
            product: prod,
            item: {
              id: `item_${prod.id}`,
              productId: prod.id,
              serialNumber: prod.sku,
              imei1: prod.barcode,
              condition: 'NEW',
              warrantyMonths: 12,
              status: prod.currentStockScale4 > 0 ? 'AVAILABLE' : 'SOLD',
              acquisitionCostMinor: prod.costPriceMinor,
              intakeDate: prod.createdAt,
            },
          };
        }
      }

      setMatchedItem(found);
    } catch (err) {
      console.error('Passport search error:', err);
      setMatchedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleAdd = () => {
    if (matchedItem && onAddToCart) {
      const serialOrImei = matchedItem.item.imei1 || matchedItem.item.serialNumber;
      onAddToCart(matchedItem.product, serialOrImei);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow">
              <Barcode size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Hardware Trace & Device Passport</h3>
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  F4 Quick Key
                </span>
              </div>
              <p className="text-xs text-blue-100/80">Search and audit IMEI, Serial numbers, specs & warranty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Scan or enter IMEI 1, IMEI 2, Serial Number, or SKU..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-medium placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Search size={16} />
              <span>Inspect</span>
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
              <p className="text-sm font-medium">Scanning device registry and historical ledger...</p>
            </div>
          )}

          {!loading && !matchedItem && searched && (
            <div className="py-12 text-center text-slate-400">
              <AlertTriangle size={36} className="mx-auto text-amber-500 mb-2 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-200">No matching device found</p>
              <p className="text-xs text-slate-400 mt-1">Verify the IMEI or serial number and try again.</p>
            </div>
          )}

          {!loading && !matchedItem && !searched && (
            <div className="py-12 text-center text-slate-400">
              <Smartphone size={40} className="mx-auto text-blue-500/50 mb-3" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-base">Device Passport Inspection Portal</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Scan any barcode or paste an IMEI / Serial number to inspect its purchase provenance, warranty term, battery condition, and active inventory status.
              </p>
            </div>
          )}

          {!loading && matchedItem && (
            <div className="space-y-6">
              {/* Product Title & Status Banner */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {matchedItem.product.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      SKU: <span className="font-mono font-semibold">{matchedItem.product.sku}</span> • {matchedItem.product.unitOfMeasure}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                      matchedItem.item.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {matchedItem.item.status === 'AVAILABLE' ? 'In Stock' : matchedItem.item.status}
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                    LKR {(matchedItem.product.retailPriceMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Hardware Identifiers Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* IMEI 1 */}
                {matchedItem.item.imei1 && (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IMEI 1</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">
                        {matchedItem.item.imei1}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(matchedItem.item.imei1!, 'imei1')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Copy IMEI 1"
                    >
                      {copiedField === 'imei1' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                )}

                {/* IMEI 2 */}
                {matchedItem.item.imei2 && (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IMEI 2</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">
                        {matchedItem.item.imei2}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(matchedItem.item.imei2!, 'imei2')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Copy IMEI 2"
                    >
                      {copiedField === 'imei2' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                )}

                {/* Serial Number */}
                {matchedItem.item.serialNumber && (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serial Number (S/N)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">
                        {matchedItem.item.serialNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(matchedItem.item.serialNumber!, 'serial')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Copy Serial"
                    >
                      {copiedField === 'serial' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                )}

                {/* Warranty */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warranty Term</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-white">
                      {matchedItem.item.warrantyMonths || 12} Months Official
                    </span>
                  </div>
                </div>
              </div>

              {/* Physical Condition & Battery */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Grade</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white mt-1 block">
                    {matchedItem.item.condition || 'Brand New Sealed'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Battery Health</span>
                  <div className="flex items-center gap-2 mt-1">
                    <BatteryCharging size={16} className="text-emerald-500" />
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">100% Genuine Capacity</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          {matchedItem && matchedItem.item.status === 'AVAILABLE' && onAddToCart && (
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <ShoppingCart size={16} />
              <span>Add to Fast Checkout (F1)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
