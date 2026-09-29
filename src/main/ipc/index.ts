// Harsh Apex Universal POS - Main Process IPC Handlers
import { ipcMain, dialog, BrowserWindow } from 'electron';
import os from 'node:os';
import path from 'node:path';
import * as authService from '../services/authService';
import * as catalogService from '../services/catalogService';
import * as checkoutService from '../services/checkoutService';
import * as inventoryService from '../services/inventoryService';
import * as customerService from '../services/customerService';
import * as returnService from '../services/returnService';
import * as shiftService from '../services/shiftService';
import * as reportService from '../services/reportService';
import * as pdfService from '../services/pdfService';
import * as licenseService from '../services/licenseService';
import * as backupService from '../services/backupService';
import * as repairService from '../services/repairService';
import * as tradeInService from '../services/tradeInService';
import * as expenseService from '../services/expenseService';
import * as procurementService from '../services/procurementService';
import { getHardwareFingerprint } from '../crypto/signer';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Helper to validate session
  const requireSession = (token?: string) => {
    if (!token) throw new Error('Authentication token required.');
    const session = authService.getSession(token);
    if (!session) throw new Error('Session expired or invalid.');
    return session;
  };

  // Auth handlers
  ipcMain.handle('auth:checkHasUsers', async () => {
    return authService.checkHasUsers();
  });

  ipcMain.handle('auth:setupInitialOwner', async (_e, payload) => {
    return authService.setupInitialOwner(payload);
  });

  ipcMain.handle('auth:login', async (_e, { username, password }) => {
    return authService.loginUser(username, password);
  });

  ipcMain.handle('auth:logout', async (_e, token) => {
    authService.logoutUser(token);
    return true;
  });

  ipcMain.handle('auth:reauthenticate', async (_e, { userId, password }) => {
    return authService.reauthenticate(userId, password);
  });

  ipcMain.handle('auth:loginPin', async (_e, pin) => {
    return authService.loginWithPin(pin);
  });

  ipcMain.handle('auth:getUsers', async () => {
    return authService.getUsers();
  });

  ipcMain.handle('auth:createUser', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return authService.createUser(payload, session);
  });

  ipcMain.handle('auth:updateUser', async (_e, { userId, payload, token }) => {
    const session = requireSession(token);
    return authService.updateUser(userId, payload, session);
  });

  ipcMain.handle('auth:deleteUser', async (_e, { userId, token }) => {
    const session = requireSession(token);
    return authService.deleteUser(userId, session);
  });

  ipcMain.handle('auth:getRoles', async () => {
    return authService.getRoles();
  });

  ipcMain.handle('auth:createRole', async (_e, { name, description, permissions, token }) => {
    const session = requireSession(token);
    return authService.createRole(name, description, permissions, session);
  });

  ipcMain.handle('auth:updateRole', async (_e, { id, name, description, permissions, token }) => {
    const session = requireSession(token);
    return authService.updateRole(id, name, description, permissions, session);
  });

  ipcMain.handle('auth:deleteRole', async (_e, { id, token }) => {
    const session = requireSession(token);
    return authService.deleteRole(id, session);
  });

  // Catalog handlers
  ipcMain.handle('catalog:searchProducts', async (_e, { query, categoryId }) => {
    return catalogService.searchProducts(query, categoryId);
  });

  ipcMain.handle('catalog:getProductByBarcode', async (_e, barcode) => {
    return catalogService.getProductByBarcode(barcode);
  });

  ipcMain.handle('catalog:createProduct', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return catalogService.createProduct(payload, session);
  });

  ipcMain.handle('catalog:createVariant', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return catalogService.createProductVariant(payload.parentProductId, payload, session);
  });

  // Checkout handlers
  ipcMain.handle('checkout:processSale', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return checkoutService.processSale(payload, session);
  });

  ipcMain.handle('checkout:getSaleById', async (_e, saleId) => {
    return checkoutService.getSaleById(saleId);
  });

  ipcMain.handle('checkout:getRecentSales', async (_e, limit) => {
    return checkoutService.getRecentSales(limit);
  });

  // Inventory handlers
  ipcMain.handle('inventory:getStockLevel', async (_e, { productId, variantId }) => {
    return inventoryService.getStockLevel(productId, variantId);
  });

  ipcMain.handle('inventory:adjustStock', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return inventoryService.adjustStock(
      payload.productId,
      payload.variantId || '',
      payload.deltaScale4,
      payload.unitCostMinor,
      payload.reason,
      session
    );
  });

  ipcMain.handle('inventory:registerSerializedItem', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return inventoryService.registerSerializedItem(payload, session);
  });

  ipcMain.handle('inventory:getAvailableSerials', async (_e, productId) => {
    return inventoryService.getAvailableSerials(productId);
  });

  ipcMain.handle('inventory:registerBatch', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return inventoryService.registerBatch(payload, session);
  });

  // Customer handlers
  ipcMain.handle('customers:searchCustomers', async (_e, query) => {
    return customerService.searchCustomers(query);
  });

  ipcMain.handle('customers:getCustomerById', async (_e, id) => {
    return customerService.getCustomerById(id);
  });

  ipcMain.handle('customers:createCustomer', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return customerService.createCustomer(payload, session);
  });

  ipcMain.handle('customers:quickAddCustomer', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return customerService.quickAddCustomer(payload, session);
  });

  ipcMain.handle('customers:updateCustomer', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return customerService.updateCustomer(payload.id, payload.data, session);
  });

  ipcMain.handle('customers:recordSettlementPayment', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return customerService.recordSettlementPayment(
      payload.customerId,
      payload.amountMinor,
      payload.paymentMethod,
      payload.notes,
      session
    );
  });

  ipcMain.handle('customers:getCustomerStatement', async (_e, { customerId, fromDate, toDate }) => {
    return customerService.getCustomerStatement(customerId, fromDate, toDate);
  });

  // Returns handlers
  ipcMain.handle('returns:processReturn', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return returnService.processReturn(payload, session);
  });

  // Shifts handlers
  ipcMain.handle('shifts:getActiveShift', async (_e, cashierId) => {
    return shiftService.getActiveShift(cashierId);
  });

  ipcMain.handle('shifts:openShift', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return shiftService.openShift(payload.openingCashMinor, payload.notes, session);
  });

  ipcMain.handle('shifts:closeShift', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return shiftService.closeShift(payload.shiftId, payload.countedCashMinor, payload.notes, session);
  });

  ipcMain.handle('shifts:recordCashEvent', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return shiftService.recordCashEvent(payload.shiftId, payload.eventType, payload.amountMinor, payload.reason, session);
  });

  ipcMain.handle('shifts:getShiftHistory', async (_e, limit) => {
    return shiftService.getShiftHistory(limit);
  });

  // Reports handlers
  ipcMain.handle('reports:getDashboardMetrics', async () => {
    return reportService.getDashboardMetrics();
  });

  ipcMain.handle('reports:getProfitAndLoss', async (_e, { fromDate, toDate }) => {
    return reportService.getProfitAndLoss(fromDate, toDate);
  });

  // PDF Export handlers
  ipcMain.handle('pdf:exportReceiptPdf', async (_e, saleId) => {
    const sale = checkoutService.getSaleById(saleId);
    if (!sale) throw new Error('Sale record not found.');

    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Thermal Receipt PDF',
      defaultPath: `Receipt-${sale.invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    });

    if (res.canceled || !res.filePath) return null;
    return pdfService.generateReceiptPdf(sale, res.filePath);
  });

  ipcMain.handle('pdf:exportInvoicePdf', async (_e, saleId) => {
    const sale = checkoutService.getSaleById(saleId);
    if (!sale) throw new Error('Sale record not found.');

    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Commercial Tax Invoice PDF (A4)',
      defaultPath: `Invoice-${sale.invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    });

    if (res.canceled || !res.filePath) return null;
    return pdfService.generateA4InvoicePdf(sale, res.filePath);
  });

  ipcMain.handle('pdf:exportStatementPdf', async (_e, customerId) => {
    const statement = customerService.getCustomerStatement(customerId);

    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Customer Account Statement PDF',
      defaultPath: `Statement-${statement.customer.customerCode}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    });

    if (res.canceled || !res.filePath) return null;
    return pdfService.generateCustomerStatementPdf(statement.customer, statement.transactions, res.filePath);
  });

  // License handlers
  ipcMain.handle('license:getActiveLicense', async () => {
    return licenseService.getActiveLicense();
  });

  ipcMain.handle('license:getActiveProfileConfig', async () => {
    return licenseService.getActiveProfileConfig();
  });

  ipcMain.handle('license:importProvisioningPackage', async (_e, pkg) => {
    return licenseService.importProvisioningPackage(pkg);
  });

  ipcMain.handle('license:switchProfile', async (_e, profileType) => {
    return licenseService.switchProfile(profileType);
  });

  // Backup handlers
  ipcMain.handle('backup:createBackup', async (_e, token) => {
    const session = requireSession(token);
    return backupService.createBackup(undefined, session);
  });

  ipcMain.handle('backup:restoreBackup', async (_e, { backupPath, token }) => {
    const session = requireSession(token);
    return backupService.restoreBackup(backupPath, session);
  });

  // System info
  ipcMain.handle('system:getSystemInfo', async () => {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      fingerprint: getHardwareFingerprint(),
      version: '1.0.0',
    };
  });

  ipcMain.handle('system:selectFile', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Packages & Backups', extensions: ['apexlicense', 'apexpkg', 'json', 'db'] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  // Repairs handlers
  ipcMain.handle('repairs:list', async (_e, { search, status } = {}) => {
    return repairService.listRepairTickets(search, status);
  });

  ipcMain.handle('repairs:create', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return repairService.createRepairTicket(payload, session);
  });

  ipcMain.handle('repairs:updateStatus', async (_e, { ticketId, status, technicianNotes, token }) => {
    const session = requireSession(token);
    return repairService.updateRepairStatus(ticketId, status, technicianNotes, session);
  });

  ipcMain.handle('repairs:update', async (_e, { ticketId, updates, token }) => {
    const session = requireSession(token);
    return repairService.updateRepairTicket(ticketId, updates, session);
  });

  // Trade-In handlers
  ipcMain.handle('tradein:list', async (_e, { search, status } = {}) => {
    return tradeInService.listTradeIns(search, status);
  });

  ipcMain.handle('tradein:create', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return tradeInService.createTradeIn(payload, session);
  });

  ipcMain.handle('tradein:updateStatus', async (_e, { tradeInId, status, token }) => {
    const session = requireSession(token);
    return tradeInService.updateTradeInStatus(tradeInId, status, session);
  });

  ipcMain.handle('tradein:convertToInventory', async (_e, { tradeInId, token }) => {
    const session = requireSession(token);
    return tradeInService.convertTradeInToInventory(tradeInId, session);
  });

  // Expenses handlers
  ipcMain.handle('expenses:list', async (_e, { search, category } = {}) => {
    return expenseService.listExpenses(search, category);
  });

  ipcMain.handle('expenses:record', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return expenseService.recordExpense(payload, session);
  });

  ipcMain.handle('expenses:delete', async (_e, { expenseId, token }) => {
    const session = requireSession(token);
    return expenseService.deleteExpense(expenseId, session);
  });

  // Suppliers & Procurement handlers
  ipcMain.handle('suppliers:list', async () => {
    return procurementService.listSuppliers();
  });

  ipcMain.handle('suppliers:create', async (_e, { payload, token }) => {
    const session = requireSession(token);
    return procurementService.createSupplier(payload, session);
  });

  ipcMain.handle('purchases:list', async () => {
    return procurementService.listPurchaseOrders();
  });

  ipcMain.handle('purchases:receive', async (_e, { supplierId, items, notes, token }) => {
    const session = requireSession(token);
    return procurementService.receiveGoods(supplierId, items, notes, session);
  });

  // Window title updater
  ipcMain.handle('window:setTitle', async (_e, title: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(title);
    }
    return true;
  });
}
