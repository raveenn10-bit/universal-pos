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
  ArrowRight,
  Scale,
  Footprints,
  Smartphone,
  Shirt,
  Cpu,
  Layers,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Tag,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CartItem, Customer, Product, TenderPayment, Sale, BusinessProfileConfig } from '../../../shared/types';
import { PrintPreviewModal } from './PrintPreviewModal';

interface FastCheckoutScreenProps {
  onBackToDashboard: () => void;
  token: string;
  profileConfig?: BusinessProfileConfig | null;
  storeBranding?: any;
}

export const FastCheckoutScreen: React.FC<FastCheckoutScreenProps> = ({ 
  onBackToDashboard, 
  token,
  profileConfig,
  storeBranding 
}) => {
  const activeProfileType = profileConfig?.profileType || 'GENERAL_RETAIL';

  // Catalog & Filter state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart & Transaction state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [discountMinor, setDiscountMinor] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [tradeInDeductionMinor, setTradeInDeductionMinor] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocType, setPrintDocType] = useState<'RECEIPT' | 'INVOICE'>('RECEIPT');

  // Industry-Specific Modals
  const [scaleModalProduct, setScaleModalProduct] = useState<Product | null>(null);
  const [scaleWeightKg, setScaleWeightKg] = useState<number>(1.0);
  
  const [shoeModalProduct, setShoeModalProduct] = useState<Product | null>(null);
  const [selectedShoeSize, setSelectedShoeSize] = useState<string>('42');
  const [selectedShoeColor, setSelectedShoeColor] = useState<string>('Black');

  const [phoneModalProduct, setPhoneModalProduct] = useState<Product | null>(null);
  const [phoneImei1, setPhoneImei1] = useState<string>('');
  const [phoneImei2, setPhoneImei2] = useState<string>('');
  const [phoneWarrantyMonths, setPhoneWarrantyMonths] = useState<number>(12);

  const [apparelModalProduct, setApparelModalProduct] = useState<Product | null>(null);
  const [selectedApparelSize, setSelectedApparelSize] = useState<string>('L');

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
    loadCatalog();
    loadCustomers();
  }, []);

  const loadCatalog = async () => {
    try {
      const api = (window as any).apexApi;
      if (api?.catalog?.searchProducts) {
        const prods = await api.catalog.searchProducts('', '');
        setProducts(prods || []);
      }
      if (api?.catalog?.getCategories) {
        const cats = await api.catalog.getCategories();
        setCategories(cats || []);
      }
    } catch (e) {
      console.error('Error loading catalog:', e);
    }
  };

  const loadCustomers = async () => {
    try {
      const api = (window as any).apexApi;
      if (api?.customers?.searchCustomers) {
        const custs = await api.customers.searchCustomers('');
        setCustomersList(custs || []);
      }
    } catch (e) {
      console.error('Error loading customers:', e);
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

      handleProductClick(product);
      setBarcodeInput('');
    } catch (err: any) {
      alert(err.message || 'Error scanning barcode');
    }
  };

  // Product Click Handler (Triggers Industry Modal or Direct Add)
  const handleProductClick = (product: Product) => {
    // 1. Supermarket Weight Scale
    if (activeProfileType === 'SUPERMARKET' && (product.unitOfMeasure === 'KG' || product.unitOfMeasure === 'G' || product.name.toLowerCase().includes('weight') || product.name.toLowerCase().includes('apple'))) {
      setScaleModalProduct(product);
      setScaleWeightKg(1.0);
      return;
    }

    // 2. Shoes Footwear Size Matrix
    if (activeProfileType === 'SHOES' || product.name.toLowerCase().includes('shoe') || product.name.toLowerCase().includes('pegasus') || product.name.toLowerCase().includes('sneaker')) {
      setShoeModalProduct(product);
      setSelectedShoeSize('42');
      setSelectedShoeColor('Black');
      return;
    }

    // 3. Mobile Phones IMEI & Warranty
    if (activeProfileType === 'MOBILE_PHONES' && (product.name.toLowerCase().includes('iphone') || product.name.toLowerCase().includes('galaxy') || product.name.toLowerCase().includes('phone') || product.costPriceMinor > 5000000)) {
      setPhoneModalProduct(product);
      setPhoneImei1(`35${Math.floor(1000000000000 + Math.random() * 9000000000000)}`);
      setPhoneImei2(`35${Math.floor(1000000000000 + Math.random() * 9000000000000)}`);
      setPhoneWarrantyMonths(12);
      return;
    }

    // 4. Bags & Fashion Size Selection
    if (activeProfileType === 'BAGS_FASHION' && (product.name.toLowerCase().includes('shirt') || product.name.toLowerCase().includes('dress') || product.name.toLowerCase().includes('jacket'))) {
      setApparelModalProduct(product);
      setSelectedApparelSize('L');
      return;
    }

    // Default: Regular Add to Cart
    addItemToCart(product, 10000);
  };

  const addItemToCart = (
    product: Product, 
    qtyScale4: number = 10000, 
    metadata?: { note?: string; imei1?: string; imei2?: string; warranty?: number }
  ) => {
    setCart((prev) => {
      const lineCost = product.costPriceMinor;
      const unitRetail = product.retailPriceMinor;
      const rawQty = qtyScale4 / 10000;
      const lineTotal = Math.round(unitRetail * rawQty);

      const newItem: CartItem = {
        productId: product.id,
        productName: metadata?.note ? `${product.name} [${metadata.note}]` : product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitPriceMinor: unitRetail,
        unitCostMinor: lineCost,
        quantityScale4: qtyScale4,
        discountMinor: 0,
        taxRateBps: product.taxRateBps || 0,
        taxMinor: 0,
        lineTotalMinor: lineTotal,
      };

      return [...prev, newItem];
    });
  };

  const confirmScaleAdd = () => {
    if (!scaleModalProduct || scaleWeightKg <= 0) return;
    const qtyScale4 = Math.round(scaleWeightKg * 10000);
    addItemToCart(scaleModalProduct, qtyScale4, { note: `${scaleWeightKg.toFixed(3)} kg` });
    setScaleModalProduct(null);
  };

  const confirmShoeAdd = () => {
    if (!shoeModalProduct) return;
    addItemToCart(shoeModalProduct, 10000, { note: `EU ${selectedShoeSize} · ${selectedShoeColor}` });
    setShoeModalProduct(null);
  };

  const confirmPhoneAdd = () => {
    if (!phoneModalProduct) return;
    addItemToCart(phoneModalProduct, 10000, { 
      note: `IMEI: ${phoneImei1 || 'N/A'} · ${phoneWarrantyMonths}M Warranty`,
      imei1: phoneImei1,
      imei2: phoneImei2,
      warranty: phoneWarrantyMonths,
    });
    setPhoneModalProduct(null);
  };

  const confirmApparelAdd = () => {
    if (!apparelModalProduct) return;
    addItemToCart(apparelModalProduct, 10000, { note: `Size: ${selectedApparelSize}` });
    setApparelModalProduct(null);
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

  const clearCart = () => {
    setCart([]);
    setDiscountMinor(0);
    setTradeInDeductionMinor(0);
  };

  // Financial Calculations
  const subtotalMinor = cart.reduce((acc, it) => acc + Math.round(it.unitPriceMinor * (it.quantityScale4 / 10000)), 0);
  const taxMinor = cart.reduce((acc, it) => acc + (it.taxMinor || 0), 0);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor - tradeInDeductionMinor + taxMinor);

  const openPayment = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add products to proceed.');
      return;
    }
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
        notes: notes ? `${notes} (Trade-In: LKR ${(tradeInDeductionMinor/100).toFixed(2)})` : '',
        idempotencyKey: `idm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };

      const sale = await (window as any).apexApi.checkout.processSale(payload, token);
      setCompletedSale(sale);
      setShowPaymentModal(false);
      clearCart();
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

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch = !catalogSearch || 
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.barcode.includes(catalogSearch);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] dark:bg-slate-900 select-none overflow-hidden">
      {/* TOP ACTION BAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 transition-all cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-black text-slate-900 dark:text-white">
              {storeBranding?.appName || 'Fast Checkout Terminal'}
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {profileConfig?.displayName || 'Active Profile'}
            </span>
          </div>
        </div>

        {/* Barcode Quick Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="relative w-80">
          <Barcode size={18} className="absolute left-3.5 top-2.5 text-[#1a4cd2] dark:text-blue-400" />
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan barcode or enter SKU..."
            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a4cd2]"
          />
        </form>

        {/* Customer Selector & Quick Add */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const c = customersList.find(x => x.id === e.target.value) || null;
              setSelectedCustomer(c);
            }}
            className="text-xs font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
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
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/40 text-[#1a4cd2] dark:text-blue-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ Customer</span>
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* LEFT COLUMN: INTERACTIVE PRODUCT CATALOG */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Category Pills & Search */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog by name, model or SKU..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              {/* Special Industry Action Badges */}
              {activeProfileType === 'MOBILE_PHONES' && (
                <button
                  onClick={() => {
                    const tradeVal = prompt('Enter Trade-In Device Appraisal Credit (LKR):', '15000');
                    if (tradeVal) {
                      setTradeInDeductionMinor(Math.round(parseFloat(tradeVal) * 100));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>+ Trade-In Deduct</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#1a4cd2] text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                All Items ({products.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#1a4cd2] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <ShoppingBag size={40} className="stroke-1" />
                <p className="text-xs font-bold">No products found matching filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredProducts.map((p) => {
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 truncate max-w-[100px]">
                            {p.sku}
                          </span>
                          {p.unitOfMeasure === 'KG' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              SCALE (KG)
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {p.unitOfMeasure || 'PCS'}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#1a4cd2] transition-colors">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-sm font-black text-[#1a4cd2] dark:text-blue-400">
                          LKR {(p.retailPriceMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#1a4cd2] flex items-center justify-center group-hover:bg-[#1a4cd2] group-hover:text-white transition-all shadow-sm">
                          <Plus size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CART & CHECKOUT PANEL */}
        <div className="w-96 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1a4cd2] flex items-center justify-center font-black text-xs">
                {cart.length}
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">Active Order Cart</h3>
                <span className="text-[10px] text-slate-400">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Barcode size={32} className="stroke-1" />
                <p className="text-xs font-bold">Cart is empty</p>
                <p className="text-[10px] text-slate-400 text-center">Click products on left or scan barcode to add items.</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const rawQty = item.quantityScale4 / 10000;
                return (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {item.productName}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.sku} · LKR {(item.unitPriceMinor / 100).toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Qty +/- */}
                      <div className="flex items-center bg-white dark:bg-slate-600 rounded-xl border border-slate-200 dark:border-slate-500 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-500 cursor-pointer text-slate-600 dark:text-slate-200"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2.5 text-xs font-black text-slate-800 dark:text-white">
                          {rawQty >= 1 && Number.isInteger(rawQty) ? rawQty : rawQty.toFixed(3)}
                        </span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-500 cursor-pointer text-slate-600 dark:text-slate-200"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <span className="text-xs font-black text-[#1a4cd2] dark:text-blue-400">
                        LKR {(item.lineTotalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Pay Button */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                LKR {(subtotalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {tradeInDeductionMinor > 0 && (
              <div className="flex justify-between text-xs text-purple-600 font-bold">
                <span>Trade-In Credit</span>
                <span>- LKR {(tradeInDeductionMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-500">
              <span>Discount</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                LKR {(discountMinor / 100).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Total Due
              </span>
              <span className="text-lg font-black text-[#1a4cd2] dark:text-blue-400">
                LKR {(totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white font-black text-sm py-3 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Complete Sale [F9]</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. SUPERMARKET WEIGHT SCALE MODAL */}
      {scaleModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <Scale size={20} />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Produce Weight Scale</h3>
              </div>
              <button onClick={() => setScaleModalProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {scaleModalProduct.name}
            </p>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-center space-y-1">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase">Unit Price Rate</span>
              <span className="text-base font-black text-emerald-700">
                LKR {(scaleModalProduct.retailPriceMinor / 100).toFixed(2)} / kg
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter Measured Weight (Kilograms):
              </label>
              <input
                type="number"
                step="0.05"
                min="0.01"
                value={scaleWeightKg}
                onChange={(e) => setScaleWeightKg(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-lg font-black text-center focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>Calculated Amount:</span>
              <span className="text-sm font-black text-emerald-600">
                LKR {((scaleModalProduct.retailPriceMinor * scaleWeightKg) / 100).toFixed(2)}
              </span>
            </div>

            <button
              onClick={confirmScaleAdd}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              Add Scaled Item to Cart
            </button>
          </div>
        </div>
      )}

      {/* 2. SHOES EU SIZE MATRIX MODAL */}
      {shoeModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Footprints size={20} />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Footwear EU Size Matrix</h3>
              </div>
              <button onClick={() => setShoeModalProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {shoeModalProduct.name}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select EU Size:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['38', '39', '40', '41', '42', '43', '44', '45'].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedShoeSize(sz)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      selectedShoeSize === sz
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    EU {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Colorway:
              </label>
              <select
                value={selectedShoeColor}
                onChange={(e) => setSelectedShoeColor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold"
              >
                <option value="Black">Triple Black</option>
                <option value="White">Pure White</option>
                <option value="Grey">Wolf Grey</option>
                <option value="Navy">Navy Blue</option>
              </select>
            </div>

            <button
              onClick={confirmShoeAdd}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              Add Selected Size to Cart
            </button>
          </div>
        </div>
      )}

      {/* 3. MOBILE PHONES DUAL IMEI & WARRANTY MODAL */}
      {phoneModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Smartphone size={20} />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Dual IMEI & Warranty Setup</h3>
              </div>
              <button onClick={() => setPhoneModalProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {phoneModalProduct.name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary IMEI 1 (15 digits):
                </label>
                <input
                  type="text"
                  value={phoneImei1}
                  onChange={(e) => setPhoneImei1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-mono text-xs font-bold"
                  placeholder="359123456789012"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Secondary IMEI 2 (eSIM / Dual):
                </label>
                <input
                  type="text"
                  value={phoneImei2}
                  onChange={(e) => setPhoneImei2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-mono text-xs font-bold"
                  placeholder="359123456789013"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Warranty Coverage:
                </label>
                <select
                  value={phoneWarrantyMonths}
                  onChange={(e) => setPhoneWarrantyMonths(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold"
                >
                  <option value={12}>1 Year Full Warranty (12 Months)</option>
                  <option value={6}>6 Months Store Warranty</option>
                  <option value={3}>3 Months Checking Warranty</option>
                  <option value={0}>Out of Warranty / As-Is</option>
                </select>
              </div>
            </div>

            <button
              onClick={confirmPhoneAdd}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20"
            >
              Add Registered Phone to Cart
            </button>
          </div>
        </div>
      )}

      {/* 4. FASHION APPAREL SIZE MODAL */}
      {apparelModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <Shirt size={20} />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Select Apparel Size</h3>
              </div>
              <button onClick={() => setApparelModalProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {apparelModalProduct.name}
            </p>

            <div className="grid grid-cols-5 gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedApparelSize(sz)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    selectedApparelSize === sz
                      ? 'bg-rose-500 text-white border-rose-600 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <button
              onClick={confirmApparelAdd}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/20"
            >
              Add Apparel to Cart
            </button>
          </div>
        </div>
      )}

      {/* MULTI-TENDER PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Tender Payment & Settlement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">Total Amount Due</span>
              <span className="text-2xl font-black text-[#1a4cd2] dark:text-blue-400">
                LKR {(totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Received (LKR)
                </label>
                <input
                  type="number"
                  step="100"
                  value={tenderCashMinor / 100}
                  onChange={(e) => setTenderCashMinor(Math.round((parseFloat(e.target.value) || 0) * 100))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Card / POS Terminal (LKR)
                </label>
                <input
                  type="number"
                  step="100"
                  value={tenderCardMinor / 100}
                  onChange={(e) => setTenderCardMinor(Math.round((parseFloat(e.target.value) || 0) * 100))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none focus:border-[#1a4cd2]"
                />
              </div>

              {selectedCustomer && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Credit / Ledger (LKR)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={tenderCreditMinor / 100}
                    onChange={(e) => setTenderCreditMinor(Math.round((parseFloat(e.target.value) || 0) * 100))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none focus:border-[#1a4cd2]"
                  />
                </div>
              )}
            </div>

            {/* Change balance */}
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between text-xs font-bold">
              <span>Change Due:</span>
              <span className="text-emerald-600 font-black">
                LKR {Math.max(0, ((tenderCashMinor + tenderCardMinor + tenderCreditMinor) - totalMinor) / 100).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={isProcessing}
              className="w-full bg-[#1a4cd2] hover:bg-blue-700 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Processing Transaction...' : 'Confirm & Complete Sale'}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED SALE SUCCESS MODAL */}
      {completedSale && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Sale Completed Successfully!
            </h3>

            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700/80 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                Invoice #{completedSale.invoiceNumber || completedSale.id.substring(0, 10)}
              </span>
            </div>

            <div className="text-2xl font-black text-[#1a4cd2] dark:text-blue-400">
              LKR {(completedSale.totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPrintDocType('RECEIPT');
                  setShowPrintModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-black py-3 rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Printer size={15} />
                <span>80mm Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintDocType('INVOICE');
                  setShowPrintModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-[#1a4cd2] hover:bg-blue-700 text-white text-xs font-black py-3 rounded-xl shadow-md shadow-blue-500/20 cursor-pointer transition-all"
              >
                <FileText size={15} />
                <span>A4 Tax Invoice</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedSale(null);
                setShowPrintModal(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer transition-all mt-2"
            >
              Start Next Sale [F1]
            </button>
          </div>
        </div>
      )}

      {/* DEDICATED PRINT PREVIEW & DIRECT PRINT MODAL */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sale={completedSale}
        branding={storeBranding}
        defaultType={printDocType}
      />

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAddCust && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleQuickAddCustomer} className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Quick Add Customer</h3>
              <button type="button" onClick={() => setShowQuickAddCust(false)} className="text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a4cd2] text-white font-black text-xs py-2.5 rounded-xl cursor-pointer"
            >
              Save & Attach Customer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
