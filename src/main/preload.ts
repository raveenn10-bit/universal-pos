// Harsh Apex Universal POS - Secure Preload Bridge
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  auth: {
    checkHasUsers: () => ipcRenderer.invoke('auth:checkHasUsers'),
    setupInitialOwner: (payload: any) => ipcRenderer.invoke('auth:setupInitialOwner', payload),
    login: (payload: { username: string; password: string }) => ipcRenderer.invoke('auth:login', payload),
    logout: (token: string) => ipcRenderer.invoke('auth:logout', token),
    reauthenticate: (payload: { userId: string; password: string }) => ipcRenderer.invoke('auth:reauthenticate', payload),
  },
  catalog: {
    searchProducts: (query?: string, categoryId?: string) => ipcRenderer.invoke('catalog:searchProducts', { query, categoryId }),
    getProductByBarcode: (barcode: string) => ipcRenderer.invoke('catalog:getProductByBarcode', barcode),
    createProduct: (payload: any, token: string) => ipcRenderer.invoke('catalog:createProduct', { payload, token }),
    createVariant: (payload: any, token: string) => ipcRenderer.invoke('catalog:createVariant', { payload, token }),
  },
  checkout: {
    processSale: (payload: any, token: string) => ipcRenderer.invoke('checkout:processSale', { payload, token }),
    getSaleById: (saleId: string) => ipcRenderer.invoke('checkout:getSaleById', saleId),
    getRecentSales: (limit?: number) => ipcRenderer.invoke('checkout:getRecentSales', limit),
  },
  inventory: {
    getStockLevel: (productId: string, variantId?: string) => ipcRenderer.invoke('inventory:getStockLevel', { productId, variantId }),
    adjustStock: (payload: any, token: string) => ipcRenderer.invoke('inventory:adjustStock', { payload, token }),
    registerSerializedItem: (payload: any, token: string) => ipcRenderer.invoke('inventory:registerSerializedItem', { payload, token }),
    getAvailableSerials: (productId: string) => ipcRenderer.invoke('inventory:getAvailableSerials', productId),
    registerBatch: (payload: any, token: string) => ipcRenderer.invoke('inventory:registerBatch', { payload, token }),
  },
  customers: {
    searchCustomers: (query?: string) => ipcRenderer.invoke('customers:searchCustomers', query),
    getCustomerById: (id: string) => ipcRenderer.invoke('customers:getCustomerById', id),
    createCustomer: (payload: any, token: string) => ipcRenderer.invoke('customers:createCustomer', { payload, token }),
    quickAddCustomer: (payload: any, token: string) => ipcRenderer.invoke('customers:quickAddCustomer', { payload, token }),
    updateCustomer: (payload: any, token: string) => ipcRenderer.invoke('customers:updateCustomer', { payload, token }),
    recordSettlementPayment: (payload: any, token: string) => ipcRenderer.invoke('customers:recordSettlementPayment', { payload, token }),
    getCustomerStatement: (customerId: string, fromDate?: string, toDate?: string) => ipcRenderer.invoke('customers:getCustomerStatement', { customerId, fromDate, toDate }),
  },
  returns: {
    processReturn: (payload: any, token: string) => ipcRenderer.invoke('returns:processReturn', { payload, token }),
  },
  shifts: {
    getActiveShift: (cashierId: string) => ipcRenderer.invoke('shifts:getActiveShift', cashierId),
    openShift: (payload: any, token: string) => ipcRenderer.invoke('shifts:openShift', { payload, token }),
    closeShift: (payload: any, token: string) => ipcRenderer.invoke('shifts:closeShift', { payload, token }),
    recordCashEvent: (payload: any, token: string) => ipcRenderer.invoke('shifts:recordCashEvent', { payload, token }),
    getShiftHistory: (limit?: number) => ipcRenderer.invoke('shifts:getShiftHistory', limit),
  },
  reports: {
    getDashboardMetrics: () => ipcRenderer.invoke('reports:getDashboardMetrics'),
    getProfitAndLoss: (fromDate?: string, toDate?: string) => ipcRenderer.invoke('reports:getProfitAndLoss', { fromDate, toDate }),
  },
  pdf: {
    exportReceiptPdf: (saleId: string) => ipcRenderer.invoke('pdf:exportReceiptPdf', saleId),
    exportInvoicePdf: (saleId: string) => ipcRenderer.invoke('pdf:exportInvoicePdf', saleId),
    exportStatementPdf: (customerId: string) => ipcRenderer.invoke('pdf:exportStatementPdf', customerId),
  },
  license: {
    getActiveLicense: () => ipcRenderer.invoke('license:getActiveLicense'),
    getActiveProfileConfig: () => ipcRenderer.invoke('license:getActiveProfileConfig'),
    importProvisioningPackage: (pkg: any) => ipcRenderer.invoke('license:importProvisioningPackage', pkg),
  },
  backup: {
    createBackup: (token: string) => ipcRenderer.invoke('backup:createBackup', token),
    restoreBackup: (backupPath: string, token: string) => ipcRenderer.invoke('backup:restoreBackup', { backupPath, token }),
  },
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:getSystemInfo'),
    selectFile: () => ipcRenderer.invoke('system:selectFile'),
  },
};

export type ApexApi = typeof api;

contextBridge.exposeInMainWorld('apexApi', api);
