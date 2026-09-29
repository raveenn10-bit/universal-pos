// Harsh Apex Universal POS - Shared Type Definitions

export type BusinessProfileType = 
  | 'GENERAL_RETAIL'
  | 'SUPERMARKET'
  | 'MOBILE_PHONES'
  | 'MOBILE_ACCESSORIES'
  | 'ELECTRONICS'
  | 'SHOES'
  | 'BAGS_FASHION';

export type UserRole = 'developer' | 'owner' | 'manager' | 'cashier';

export type ProductType = 'STANDARD' | 'VARIANT_PARENT' | 'SERIALIZED' | 'BATCHED' | 'WEIGHTED';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'CORRECTED' | 'RETURNED';

export type ItemDisposition = 'RESTOCK' | 'DAMAGED_QUARANTINE';

export interface BusinessProfileConfig {
  profileType: BusinessProfileType;
  displayName: string;
  version: string;
  enabledModules: {
    variants: boolean;
    serialNumbers: boolean;
    imeiTracking: boolean;
    batchExpiry: boolean;
    weightedQuantities: boolean;
    customerCredit: boolean;
    purchaseOrders: boolean;
    shifts: boolean;
    expenses: boolean;
    tradeIns: boolean;
    warrantyTracking: boolean;
  };
  terminology: {
    productLabel: string;
    serialLabel: string;
    categoryLabel: string;
  };
  customFields: CustomFieldDefinition[];
}

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  token: string;
  shiftId?: string;
  permissions: string[];
}

export interface Product {
  id: string;
  code: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  productType: ProductType;
  unitOfMeasure: string;
  costPriceMinor: number; // Integer minor units (e.g. cents)
  retailPriceMinor: number;
  wholesalePriceMinor?: number;
  minPriceMinor?: number;
  taxRateBps: number; // Basis points: 100 = 1%
  isTaxInclusive: boolean;
  trackInventory: boolean;
  reorderLevel: number;
  currentStockScale4: number; // Scale = 10000 (1 item = 10000)
  imagePath?: string;
  customFields?: Record<string, any>;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  parentProductId: string;
  sku: string;
  barcode: string;
  variantName: string;
  attributeValues: Record<string, string>; // e.g. { size: "42", color: "Blue" }
  costPriceMinor: number;
  retailPriceMinor: number;
  currentStockScale4: number;
  isActive: boolean;
}

export interface SerializedItem {
  id: string;
  productId: string;
  variantId?: string;
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  warrantyMonths: number;
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'DAMAGED' | 'RETURNED_QUARANTINE';
  acquisitionCostMinor: number;
  intakeDate: string;
  soldAtSaleId?: string;
}

export interface BatchItem {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantityScale4: number;
  costPriceMinor: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  name: string;
  phone: string;
  phoneSecondary?: string;
  email?: string;
  addressBilling?: string;
  companyName?: string;
  taxId?: string;
  creditLimitMinor: number;
  paymentTermsDays: number;
  currentBalanceMinor: number; // Derived from customer_transactions
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTransaction {
  id: string;
  timestamp: string;
  customerId: string;
  transactionType: 'INVOICE_CHARGE' | 'SETTLEMENT_PAYMENT' | 'RETURN_CREDIT' | 'OPENING_BALANCE';
  referenceId?: string;
  referenceNumber?: string;
  debitMinor: number;
  creditMinor: number;
  runningBalanceMinor: number;
  notes?: string;
  userId: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  sku: string;
  barcode: string;
  unitPriceMinor: number;
  unitCostMinor: number;
  quantityScale4: number; // 1 unit = 10000
  discountMinor: number; // Line discount
  taxRateBps: number;
  taxMinor: number;
  lineTotalMinor: number;
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
  batchId?: string;
}

export interface TenderPayment {
  method: PaymentMethod;
  amountMinor: number;
  referenceInfo?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  shiftId?: string;
  cashierId: string;
  cashierName?: string;
  customerId?: string;
  customerName?: string;
  customerSnapshot?: Partial<Customer>;
  subtotalMinor: number;
  discountMinor: number;
  discountType: 'PERCENT' | 'FIXED';
  taxMinor: number;
  totalMinor: number;
  paidMinor: number;
  changeMinor: number;
  balanceDueMinor: number;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  templateVersionId?: string;
  notes?: string;
  idempotencyKey: string;
  items: CartItem[];
  payments: TenderPayment[];
  createdAt: string;
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCashMinor: number;
  closingCashCountedMinor?: number;
  closingCashExpectedMinor?: number;
  discrepancyMinor?: number;
  totalSalesCashMinor: number;
  totalSalesCardMinor: number;
  totalSalesTransferMinor: number;
  totalSalesCreditMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface DocumentTemplate {
  id: string;
  templateType: 'RECEIPT_58MM' | 'RECEIPT_80MM' | 'INVOICE_A4';
  version: number;
  title: string;
  isActive: boolean;
  config: {
    businessName: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    logoPath?: string;
    footerText?: string;
    termsAndConditions?: string;
    accentColor: string;
    fontFamily: string;
    fontSizeBase: number;
    showBarcode: boolean;
    showCashierName: boolean;
    showCustomerDetails: boolean;
    columns: {
      showItemCode: boolean;
      showDiscount: boolean;
      showTax: boolean;
      showUnitCost: boolean;
    };
  };
}

export interface LicensePackage {
  licenseId: string;
  businessName: string;
  profileType: BusinessProfileType;
  edition: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  hardwareFingerprint: string;
  issuedAt: string;
  expiresAt: string; // ISO date or "PERPETUAL"
  enabledModules: string[];
  signature: string; // Ed25519 signature of payload
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceModel: string;
  imeiOrSerial?: string;
  passcode?: string;
  faultDescription: string;
  physicalCondition?: string;
  status: 'Received' | 'Diagnostics' | 'Waiting for Parts' | 'Repairing' | 'Ready for Pickup' | 'Delivered';
  estimatedCostMinor: number;
  advancePaidMinor: number;
  technicianNotes?: string;
  partsUsed?: string[];
  assignedTechnician?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TradeInRecord {
  id: string;
  tradeInNumber: string;
  customerName: string;
  customerPhone: string;
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  imei1: string;
  imei2?: string;
  batteryHealth: number;
  physicalGrade: 'Grade A' | 'Grade B' | 'Grade C' | 'Grade D';
  screenCondition?: string;
  backGlassCondition?: string;
  baseGuidePriceMinor: number;
  suggestedValueMinor: number;
  deductions: { key: string; label: string; amountMinor: number; reason: string }[];
  finalApprovedValueMinor: number;
  status: 'RECEIVED' | 'INSPECTION' | 'REPAIR_PREPARATION' | 'READY_FOR_SALE' | 'SOLD' | 'CANCELLED';
  acquisitionCostMinor: number;
  refurbishmentCostMinor: number;
  trueCostMinor: number;
  staffNotes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amountMinor: number;
  paymentMethod: string;
  description: string;
  receiptRef?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  totalCostMinor: number;
  itemsCount?: number;
  notes?: string;
  createdAt: string;
}
