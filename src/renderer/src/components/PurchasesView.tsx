import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  Barcode, 
  FileText, 
  X,
  CheckCircle2,
  Package,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface PurchasesViewProps {
  token: string;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // New purchase order modal state
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poInvoiceNumber, setPoInvoiceNumber] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    unitCostLkr: number;
    batchNumber?: string;
    serialsInput?: string;
  }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState(1);
  const [lineCost, setLineCost] = useState(0);
  const [lineBatch, setLineBatch] = useState('');
  const [lineSerials, setLineSerials] = useState('');

  // New supplier modal state
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTaxId, setSupTaxId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      if (api?.suppliers?.list) {
        const sups = await api.suppliers.list();
        setSuppliers(sups || []);
        if (sups?.length > 0 && !poSupplierId) {
          setPoSupplierId(sups[0].id);
        }
      }
      if (api?.purchases?.list) {
        const pos = await api.purchases.list();
        setPurchases(pos || []);
      }
      if (api?.catalog?.searchProducts) {
        const prods = await api.catalog.searchProducts();
        setProducts(prods || []);
        if (prods?.length > 0) {
          setSelectedProductId(prods[0].id);
          setLineCost(Math.round((prods[0].costPriceMinor || 0) / 100));
        }
      }
    } catch (e) {
      console.error('Failed to load purchases data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;
    if (lineQty <= 0) return;

    setPoLines(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: lineQty,
        unitCostLkr: lineCost,
        batchNumber: lineBatch.trim() || undefined,
        serialsInput: lineSerials.trim() || undefined,
      }
    ]);

    setLineQty(1);
    setLineBatch('');
    setLineSerials('');
  };

  const handleRemoveLine = (index: number) => {
    setPoLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      alert('Please select or add a supplier.');
      return;
    }
    if (poLines.length === 0) {
      alert('Please add at least one product line.');
      return;
    }

    try {
      const api = (window as any).apexApi;
      const formattedItems = poLines.map(line => {
        const serials = line.serialsInput
          ? line.serialsInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
          : undefined;

        return {
          productId: line.productId,
          quantityScale4: Math.round(line.quantity * 10000),
          unitCostMinor: Math.round(line.unitCostLkr * 100),
          batchNumber: lineBatch || undefined,
          serialNumbers: serials,
        };
      });

      const fullNotes = [
        poInvoiceNumber ? `Invoice/Airway: ${poInvoiceNumber}` : '',
        poNotes
      ].filter(Boolean).join(' | ');

      const res = await api.purchases.receive(poSupplierId, formattedItems, fullNotes, token);
      showToast(`Inward Purchase ${res.poNumber} completed! Total: LKR ${(res.totalCostMinor / 100).toLocaleString()}`);
      
      setIsNewPoOpen(false);
      setPoInvoiceNumber('');
      setPoNotes('');
      setPoLines([]);
      loadData();
    } catch (err: any) {
      alert(`Failed to record inward intake: ${err.message || err}`);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      alert('Supplier name and contact phone are required.');
      return;
    }

    try {
      const api = (window as any).apexApi;
      const newSup = await api.suppliers.create({
        name: supName.trim(),
        contactPerson: supContact.trim() || undefined,
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        address: supAddress.trim() || undefined,
        taxId: supTaxId.trim() || undefined,
      }, token);

      showToast(`Supplier ${newSup.name} added successfully!`);
      setIsNewSupplierOpen(false);
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupTaxId('');
      loadData();
    } catch (err: any) {
      alert(`Failed to add supplier: ${err.message || err}`);
    }
  };

  const filteredPurchases = purchases.filter(p =>
    (p.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.notes || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] dark:bg-slate-900 select-none overflow-y-auto p-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] dark:text-blue-400">
              <Truck className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Supplier Purchases & Inward Stock Intake
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage authorized suppliers, purchase consignments, weighted stock intake, and serialized inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewSupplierOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#1a4cd2]" />
            <span>+ Add Supplier</span>
          </button>
          <button
            onClick={() => setIsNewPoOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Inward Intake</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Inward Intake Orders ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-600 text-[#1a4cd2] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Authorized Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="relative max-w-sm w-full">
          <input
            type="text"
            placeholder="Search consignments or suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* TAB 1: PURCHASES LIST */}
      {activeTab === 'purchases' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="pb-3.5">PO / Intake #</th>
                  <th className="pb-3.5">Supplier Name</th>
                  <th className="pb-3.5">Date & Time</th>
                  <th className="pb-3.5 text-center">Lines Received</th>
                  <th className="pb-3.5 text-right">Consignment Total</th>
                  <th className="pb-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No inward purchase records found. Click "+ Record Inward Intake" to receive inventory.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="py-3.5 font-mono font-bold text-[#1a4cd2] dark:text-blue-400">
                        {po.poNumber}
                        {po.notes && (
                          <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-xs">
                            {po.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                        {po.supplierName}
                      </td>
                      <td className="py-3.5 font-mono text-slate-500 dark:text-slate-400">
                        {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {po.itemsCount} items
                      </td>
                      <td className="py-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                        LKR {((po.totalCostMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {po.status || 'RECEIVED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS LIST */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
              No suppliers added yet. Click "+ Add Supplier" to register distributors.
            </div>
          ) : (
            filteredSuppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] dark:text-blue-400 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold">
                    {sup.taxId || 'LOCAL VENDOR'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{sup.name}</h3>
                  <div className="text-xs text-slate-400">{sup.contactPerson || 'Authorized Representative'}</div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Record Inward Purchase Intake */}
      {isNewPoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Record Inward Stock Intake
                </h3>
                <p className="text-xs text-slate-400">
                  Increases on-hand stock and recalculates Weighted Average Cost (WAC).
                </p>
              </div>
              <button 
                onClick={() => setIsNewPoOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Vendor *
                  </label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white font-medium"
                    required
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Invoice / Bill No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9812 / BL-8821"
                    value={poInvoiceNumber}
                    onChange={(e) => setPoInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Add Product Line Form */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 space-y-3">
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Add Stock Line
                </span>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Product Catalog
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) setLineCost(Math.round((prod.costPriceMinor || 0) / 100));
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-medium"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={lineQty}
                      onChange={(e) => setLineQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cost (LKR)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={lineCost}
                      onChange={(e) => setLineCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full py-1.5 rounded-lg bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Optional Serial / IMEI input */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                      Batch / Lot No (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-X"
                      value={lineBatch}
                      onChange={(e) => setLineBatch(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                      Serials / IMEIs (Comma / newline separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 359123456789012, 359123456789013"
                      value={lineSerials}
                      onChange={(e) => setLineSerials(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Added Lines Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {poLines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No items added yet. Use the form above to add items to this intake.
                        </td>
                      </tr>
                    ) : (
                      poLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                            {line.productName}
                            {line.serialsInput && (
                              <span className="block text-[10px] font-mono text-blue-500">
                                Serials: {line.serialsInput}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            {line.quantity}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            LKR {line.unitCostLkr.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#1a4cd2] dark:text-blue-400">
                            LKR {(line.quantity * line.unitCostLkr).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {poLines.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-700/30 font-bold">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right text-slate-500">Total Inward Cost:</td>
                        <td className="p-2.5 text-right font-mono text-emerald-600 font-black">
                          LKR {poLines.reduce((sum, l) => sum + (l.quantity * l.unitCostLkr), 0).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Intake Notes / Consignment Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dubai shipment direct from cargo terminal, container #4."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-[#1a4cd2] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewPoOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poLines.length === 0}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  ✓ Complete Inward Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {isNewSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Add Authorized Supplier
              </h3>
              <button 
                onClick={() => setIsNewSupplierOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Futtaim Electronics LLC"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Tariq Mansoor"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    placeholder="+971 4 223 4567"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1a4cd2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tax / VAT ID
                  </label>
                  <input
                    type="text"
                    placeholder="TRN-10023481"
                    value={supTaxId}
                    onChange={(e) => setSupTaxId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="orders@supplier.com"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  placeholder="Deira Wholesale Market, Dubai, UAE"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#1a4cd2] hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
