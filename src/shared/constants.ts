// Harsh Apex Universal POS - Shared Constants & Profile Definitions
import { BusinessProfileConfig, BusinessProfileType, DocumentTemplate } from './types';

export const DEFAULT_BUSINESS_PROFILES: Record<BusinessProfileType, BusinessProfileConfig> = {
  GENERAL_RETAIL: {
    profileType: 'GENERAL_RETAIL',
    displayName: 'General Retail Store',
    version: '1.0.0',
    enabledModules: {
      variants: false,
      serialNumbers: false,
      imeiTracking: false,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: false,
    },
    terminology: {
      productLabel: 'Product',
      serialLabel: 'Barcode / SKU',
      categoryLabel: 'Category',
    },
    customFields: [],
  },

  SUPERMARKET: {
    profileType: 'SUPERMARKET',
    displayName: 'Supermarket & Grocery',
    version: '1.0.0',
    enabledModules: {
      variants: false,
      serialNumbers: false,
      imeiTracking: false,
      batchExpiry: true,
      weightedQuantities: true,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: false,
    },
    terminology: {
      productLabel: 'Item / Grocery',
      serialLabel: 'Barcode / Batch',
      categoryLabel: 'Aisle / Department',
    },
    customFields: [
      { key: 'shelfLocation', label: 'Shelf / Rack No', type: 'text', required: false },
      { key: 'reorderPointPacks', label: 'Case Pack Size', type: 'number', required: false },
    ],
  },

  MOBILE_PHONES: {
    profileType: 'MOBILE_PHONES',
    displayName: 'Mobile Phone Shop',
    version: '1.0.0',
    enabledModules: {
      variants: true,
      serialNumbers: true,
      imeiTracking: true,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: true,
      warrantyTracking: true,
    },
    terminology: {
      productLabel: 'Device / Handset',
      serialLabel: 'IMEI 1 / IMEI 2',
      categoryLabel: 'Brand / Series',
    },
    customFields: [
      { key: 'networkLock', label: 'Network Lock / Carrier', type: 'select', options: ['Factory Unlocked', 'Carrier Locked'], required: false },
      { key: 'batteryHealthPct', label: 'Battery Health %', type: 'number', required: false },
      { key: 'storageGb', label: 'Internal Storage (GB)', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'], required: false },
    ],
  },

  MOBILE_ACCESSORIES: {
    profileType: 'MOBILE_ACCESSORIES',
    displayName: 'Mobile Accessories Store',
    version: '1.0.0',
    enabledModules: {
      variants: true,
      serialNumbers: false,
      imeiTracking: false,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: true,
    },
    terminology: {
      productLabel: 'Accessory Item',
      serialLabel: 'Barcode / Part No',
      categoryLabel: 'Category',
    },
    customFields: [
      { key: 'compatibleModels', label: 'Compatible Models', type: 'text', required: false },
      { key: 'material', label: 'Material (e.g. Silicone/Leather)', type: 'text', required: false },
    ],
  },

  ELECTRONICS: {
    profileType: 'ELECTRONICS',
    displayName: 'Electronics & Appliances',
    version: '1.0.0',
    enabledModules: {
      variants: true,
      serialNumbers: true,
      imeiTracking: false,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: true,
    },
    terminology: {
      productLabel: 'Appliance / Gadget',
      serialLabel: 'Serial Number',
      categoryLabel: 'Department',
    },
    customFields: [
      { key: 'wattagePower', label: 'Power / Wattage', type: 'text', required: false },
      { key: 'manufacturerWarranty', label: 'Company Warranty (Months)', type: 'number', required: true },
    ],
  },

  SHOES: {
    profileType: 'SHOES',
    displayName: 'Footwear & Shoes Store',
    version: '1.0.0',
    enabledModules: {
      variants: true,
      serialNumbers: false,
      imeiTracking: false,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: false,
    },
    terminology: {
      productLabel: 'Footwear / Model',
      serialLabel: 'Barcode',
      categoryLabel: 'Style / Category',
    },
    customFields: [
      { key: 'gender', label: 'Target Demographic', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'], required: true },
      { key: 'soleMaterial', label: 'Sole Material', type: 'text', required: false },
    ],
  },

  BAGS_FASHION: {
    profileType: 'BAGS_FASHION',
    displayName: 'Bags & Fashion Apparel',
    version: '1.0.0',
    enabledModules: {
      variants: true,
      serialNumbers: false,
      imeiTracking: false,
      batchExpiry: false,
      weightedQuantities: false,
      customerCredit: true,
      purchaseOrders: true,
      shifts: true,
      expenses: true,
      tradeIns: false,
      warrantyTracking: false,
    },
    terminology: {
      productLabel: 'Apparel / Bag Item',
      serialLabel: 'Tag Barcode',
      categoryLabel: 'Collection / Season',
    },
    customFields: [
      { key: 'season', label: 'Collection Season', type: 'text', required: false },
      { key: 'fabricCare', label: 'Care Instructions', type: 'text', required: false },
    ],
  },
};

export const DEFAULT_RECEIPT_TEMPLATE: DocumentTemplate = {
  id: 'tpl_default_receipt_80mm',
  templateType: 'RECEIPT_80MM',
  version: 1,
  title: 'Standard 80mm Thermal Receipt',
  isActive: true,
  config: {
    businessName: 'Harsh Apex Retail Store',
    tagline: 'Your Quality Shopping Destination',
    address: 'No. 128 Main Street, Colombo 03, Sri Lanka',
    phone: '+94 11 234 5678',
    email: 'info@harshapex.lk',
    taxNumber: 'VAT-987654321',
    footerText: 'Thank you for your valued business! Please visit us again.',
    termsAndConditions: 'Goods once sold can be exchanged within 7 days with original receipt.',
    accentColor: '#1a4cd2',
    fontFamily: 'Helvetica',
    fontSizeBase: 10,
    showBarcode: true,
    showCashierName: true,
    showCustomerDetails: true,
    columns: {
      showItemCode: false,
      showDiscount: true,
      showTax: false,
      showUnitCost: false,
    },
  },
};

export const DEFAULT_INVOICE_TEMPLATE: DocumentTemplate = {
  id: 'tpl_default_invoice_a4',
  templateType: 'INVOICE_A4',
  version: 1,
  title: 'Official A4 Commercial Invoice',
  isActive: true,
  config: {
    businessName: 'Harsh Apex Universal Store (Pvt) Ltd',
    tagline: 'Premium Quality Retailers & Distributors',
    address: 'Level 4, Apex Tower, Galle Road, Colombo 03, Sri Lanka',
    phone: '+94 11 234 5678 / +94 77 123 4567',
    email: 'sales@harshapex.lk',
    taxNumber: 'TIN: 102938475-7000',
    footerText: 'Authorized System Generated Commercial Tax Invoice.',
    termsAndConditions: 'Payment is due within agreed terms. Warranty claims require serial and invoice presentation.',
    accentColor: '#1a4cd2',
    fontFamily: 'Helvetica',
    fontSizeBase: 10,
    showBarcode: true,
    showCashierName: true,
    showCustomerDetails: true,
    columns: {
      showItemCode: true,
      showDiscount: true,
      showTax: true,
      showUnitCost: false,
    },
  },
};

export const DEFAULT_CURRENCY = 'LKR';
export const DEFAULT_LOCALE = 'en-LK';
export const DEFAULT_TIMEZONE = 'Asia/Colombo';
