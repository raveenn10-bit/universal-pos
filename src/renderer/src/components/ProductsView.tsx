import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Barcode,
  ArrowUpDown,
  Tag,
  DollarSign,
  X,
  Layers,
  Archive
} from 'lucide-react';
import { Product } from '../../../shared/types';

interface ProductsViewProps {
  token: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ token }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // New Product Form State
  const [newProd, setNewProd] = useState({
    name: '',
    barcode: '',
    sku: '',
    categoryName: 'General',
    retailPrice: '',
    costPrice: '',
    initialStock: '10',
    tracksSerial: false,
    tracksImei: false,
    warrantyMonths: '0',
    unit: 'PCS',
  });

  // Stock Adjustment Form State
  const [adjustReason, setAdjustReason] = useState('PHYSICAL_COUNT_AUDIT');
  const [adjustDelta, setAdjustDelta] = useState('1');
  const [adjustCost, setAdjustCost] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const api = (window as any).apexApi;
      const res = await api.catalog.searchProducts(searchQuery.trim() || undefined, categoryFilter || undefined);
      setProducts(res || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim() || !newProd.retailPrice) {
      alert('Product Name and Selling Price are required.');
      return;
    }
    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      const retailPriceMinor = Math.round(parseFloat(newProd.retailPrice) * 100);
      const costPriceMinor = Math.round((parseFloat(newProd.costPrice) || 0) * 100);
      const initialStockQty = parseFloat(newProd.initialStock) || 0;

      await api.catalog.createProduct({
        name: newProd.name.trim(),
        barcode: newProd.barcode.trim() || `880${Date.now().toString().slice(-9)}`,
        sku: newProd.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        categoryName: newProd.categoryName,
        retailPriceMinor,
        costPriceMinor,
        initialStockScale4: Math.round(initialStockQty * 10000),
        tracksSerial: newProd.tracksSerial,
        tracksImei: newProd.tracksImei,
        warrantyMonths: parseInt(newProd.warrantyMonths, 10) || 0,
        unit: newProd.unit,
      }, token);

      setShowAddModal(false);
      setNewProd({
        name: '',
        barcode: '',
        sku: '',
        categoryName: 'General',
        retailPrice: '',
        costPrice: '',
        initialStock: '10',
        tracksSerial: false,
        tracksImei: false,
        warrantyMonths: '0',
        unit: 'PCS',
      });
      loadProducts();
    } catch (err: any) {
      alert(`Failed to create product: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      alert('Adjustment quantity cannot be 0.');
      return;
    }
    setIsProcessing(true);
    try {
      const api = (window as any).apexApi;
      const costMinor = adjustCost ? Math.round(parseFloat(adjustCost) * 100) : selectedProduct.costPriceMinor;
      await api.inventory.adjustStock({
        productId: selectedProduct.id,
        variantId: '',
        deltaScale4: Math.round(delta * 10000),
        unitCostMinor: costMinor,
        reason: adjustReason,
      }, token);

      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustDelta('1');
      loadProducts();
      alert('Stock adjustment recorded successfully.');
    } catch (err: any) {
      alert(`Failed to adjust stock: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // KPIs
  const totalProducts = products.length;
  const inStockCount = products.filter(p => (p.currentStockScale4 / 10000) > 5).length;
  const lowStockCount = products.filter(p => (p.currentStockScale4 / 10000) > 0 && (p.currentStockScale4 / 10000) <= 5).length;
  const outOfStockCount = products.filter(p => (p.currentStockScale4 / 10000) <= 0).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb] dark:bg-slate-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Package className="text-[#1a4cd2]" size={24} />
            Products & Inventory Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track catalog items, stock balances, barcode labels, and pricing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, barcode..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a4cd2]"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-8 pt-6 pb-2">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1a4cd2]">
              <Package size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Catalog Items</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalProducts}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Items In Stock</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{inStockCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Low Stock Alert (&le; 5)</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">{lowStockCount} Items</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
              <XCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Out of Stock</p>
              <h3 className="text-2xl font-black text-rose-600 mt-0.5">{outOfStockCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Item & Barcode</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Cost Price</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Stock Level</th>
                  <th className="py-3.5 px-4 text-center">Tracking</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {loading ? 'Loading catalog items...' : 'No products found. Click "+ Add Product" to create one.'}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const stock = p.currentStockScale4 / 10000;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                              <Barcode size={12} />
                              {p.barcode}
                            </span>
                            {p.sku && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {p.sku}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            <Tag size={10} />
                            {p.categoryName || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 font-semibold">
                          LKR {(p.costPriceMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800 dark:text-white">
                          LKR {(p.retailPriceMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {stock > 5 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle2 size={10} />
                              {stock} in stock
                            </span>
                          ) : stock > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                              <AlertTriangle size={10} />
                              Low Stock ({stock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              <XCircle size={10} />
                              Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                          {p.tracksImei ? (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">IMEI</span>
                          ) : p.tracksSerial ? (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Serial</span>
                          ) : (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setAdjustCost((p.costPriceMinor / 100).toFixed(2));
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#1a4cd2] hover:text-white text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-[#1a4cd2] font-bold text-[11px] transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <ArrowUpDown size={12} />
                            Adjust Stock
                          </button>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-[#1a4cd2]" />
                Add Product to Catalog
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Cotton Shirt or Samsung Galaxy A54"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Barcode (Scannable)
                  </label>
                  <input
                    type="text"
                    placeholder="Scan or leave blank for auto"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={newProd.categoryName}
                    onChange={(e) => setNewProd({ ...newProd, categoryName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  >
                    <option value="General">General Retail</option>
                    <option value="Smartphones">Mobile Phones</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Footwear">Shoes & Footwear</option>
                    <option value="Apparel">Fashion & Clothing</option>
                    <option value="Grocery">Supermarket / Grocery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Selling Retail Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newProd.retailPrice}
                    onChange={(e) => setNewProd({ ...newProd, retailPrice: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cost Price (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProd.costPrice}
                    onChange={(e) => setNewProd({ ...newProd, costPrice: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Stock Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newProd.initialStock}
                    onChange={(e) => setNewProd({ ...newProd, initialStock: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProd.warrantyMonths}
                    onChange={(e) => setNewProd({ ...newProd, warrantyMonths: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newProd.tracksImei}
                    onChange={(e) => setNewProd({ ...newProd, tracksImei: e.target.checked })}
                    className="rounded text-[#1a4cd2]"
                  />
                  <span>Track Dual IMEI Numbers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newProd.tracksSerial}
                    onChange={(e) => setNewProd({ ...newProd, tracksSerial: e.target.checked })}
                    className="rounded text-[#1a4cd2]"
                  />
                  <span>Track Serial Numbers</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Adjust Inventory Stock
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Current Stock</span>
              <span className="text-base font-black text-[#1a4cd2] dark:text-blue-300">
                {selectedProduct.currentStockScale4 / 10000} Units
              </span>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Adjustment Reason
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                >
                  <option value="PHYSICAL_COUNT_AUDIT">Physical Count Reconciliation</option>
                  <option value="STOCK_IN">Inward Stock / Shipment Received</option>
                  <option value="DAMAGED">Damaged / Expired Removal</option>
                  <option value="RETURN">Customer Return Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Quantity Change (+ to add, - to reduce) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="+5 or -2"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-[#1a4cd2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Unit Cost Price (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustCost}
                  onChange={(e) => setAdjustCost(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#1a4cd2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Updating...' : 'Save Stock Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
