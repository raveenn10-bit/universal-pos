// Harsh Apex Universal POS - Secure Preload Bridge
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  auth: {
    checkHasUsers: () => ipcRenderer.invoke('auth:checkHasUsers'),
    setupInitialOwner: (payload: any) => ipcRenderer.invoke('auth:setupInitialOwner', payload),
    login: (payload: { username: string; password: string }) => ipcRenderer.invoke('auth:login', payload),
    loginPin: (pin: string) => ipcRenderer.invoke('auth:loginPin', pin),
    logout: (token: string) => ipcRenderer.invoke('auth:logout', token),
    reauthenticate: (payload: { userId: string; password: string }) => ipcRenderer.invoke('auth:reauthenticate', payload),
    getUsers: () => ipcRenderer.invoke('auth:getUsers'),
    createUser: (payload: any, token: string) => ipcRenderer.invoke('auth:createUser', { payload, token }),
    updateUser: (userId: string, payload: any, token: string) => ipcRenderer.invoke('auth:updateUser', { userId, payload, token }),
    deleteUser: (userId: string, token: string) => ipcRenderer.invoke('auth:deleteUser', { userId, token }),
    getRoles: () => ipcRenderer.invoke('auth:getRoles'),
    createRole: (name: string, description: string, permissions: string[], token: string) => ipcRenderer.invoke('auth:createRole', { name, description, permissions, token }),
    updateRole: (id: string, name: string, description: string, permissions: string[], token: string) => ipcRenderer.invoke('auth:updateRole', { id, name, description, permissions, token }),
    deleteRole: (id: string, token: string) => ipcRenderer.invoke('auth:deleteRole', { id, token }),
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
    reverseSale: (saleId: string, reason: string, token: string) => ipcRenderer.invoke('checkout:reverseSale', { saleId, reason, token }),
    editSale: (payload: any, token: string) => ipcRenderer.invoke('checkout:editSale', { payload, token }),
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
  repairs: {
    list: (filter?: { search?: string; status?: string }) => ipcRenderer.invoke('repairs:list', filter),
    create: (payload: any, token: string) => ipcRenderer.invoke('repairs:create', { payload, token }),
    updateStatus: (ticketId: string, status: string, technicianNotes?: string, token?: string) => ipcRenderer.invoke('repairs:updateStatus', { ticketId, status, technicianNotes, token }),
    update: (ticketId: string, updates: any, token: string) => ipcRenderer.invoke('repairs:update', { ticketId, updates, token }),
  },
  tradein: {
    list: (filter?: { search?: string; status?: string }) => ipcRenderer.invoke('tradein:list', filter),
    create: (payload: any, token: string) => ipcRenderer.invoke('tradein:create', { payload, token }),
    updateStatus: (tradeInId: string, status: string, token: string) => ipcRenderer.invoke('tradein:updateStatus', { tradeInId, status, token }),
    convertToInventory: (tradeInId: string, token: string) => ipcRenderer.invoke('tradein:convertToInventory', { tradeInId, token }),
  },
  expenses: {
    list: (filter?: { search?: string; category?: string }) => ipcRenderer.invoke('expenses:list', filter),
    record: (payload: any, token: string) => ipcRenderer.invoke('expenses:record', { payload, token }),
    delete: (expenseId: string, token: string) => ipcRenderer.invoke('expenses:delete', { expenseId, token }),
  },
  suppliers: {
    list: () => ipcRenderer.invoke('suppliers:list'),
    create: (payload: any, token: string) => ipcRenderer.invoke('suppliers:create', { payload, token }),
  },
  purchases: {
    list: () => ipcRenderer.invoke('purchases:list'),
    receive: (supplierId: string, items: any[], notes: string, token: string) => ipcRenderer.invoke('purchases:receive', { supplierId, items, notes, token }),
  },
  pdf: {
    printReceipt: (saleId: string) => ipcRenderer.invoke('pdf:printReceipt', saleId),
    printInvoice: (saleId: string) => ipcRenderer.invoke('pdf:printInvoice', saleId),
    exportReceiptPdf: (saleId: string) => ipcRenderer.invoke('pdf:exportReceiptPdf', saleId),
    exportInvoicePdf: (saleId: string) => ipcRenderer.invoke('pdf:exportInvoicePdf', saleId),
    exportStatementPdf: (customerId: string) => ipcRenderer.invoke('pdf:exportStatementPdf', customerId),
  },
  license: {
    getActiveLicense: () => ipcRenderer.invoke('license:getActiveLicense'),
    getActiveProfileConfig: () => ipcRenderer.invoke('license:getActiveProfileConfig'),
    importProvisioningPackage: (pkg: any) => ipcRenderer.invoke('license:importProvisioningPackage', pkg),
    switchProfile: (profileType: string) => ipcRenderer.invoke('license:switchProfile', profileType),
  },
  provision: {
    isStoreProvisioned: () => ipcRenderer.invoke('provision:isStoreProvisioned'),
    getStoreBranding: () => ipcRenderer.invoke('provision:getStoreBranding'),
    completeDeveloperProvisioning: (payload: any) => ipcRenderer.invoke('provision:completeDeveloperProvisioning', payload),
    updateStoreBranding: (data: any, token: string) => ipcRenderer.invoke('provision:updateStoreBranding', { data, token }),
  },
  backup: {
    createBackup: (token: string) => ipcRenderer.invoke('backup:createBackup', token),
    restoreBackup: (backupPath: string, token: string) => ipcRenderer.invoke('backup:restoreBackup', { backupPath, token }),
    getBackupsSummary: () => ipcRenderer.invoke('backup:getBackupsSummary'),
    openFolder: () => ipcRenderer.invoke('backup:openFolder'),
  },
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:getSystemInfo'),
    selectFile: () => ipcRenderer.invoke('system:selectFile'),
  },
  window: {
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  },
};

export type ApexApi = typeof api;

contextBridge.exposeInMainWorld('apexApi', api);
