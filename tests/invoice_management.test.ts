import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase, getDb } from '../src/main/services/db';
import { setupInitialOwner, createUser } from '../src/main/services/authService';
import { createProduct } from '../src/main/services/catalogService';
import { processSale, reverseSale, editSale, getSaleById } from '../src/main/services/checkoutService';
import { getStockLevel } from '../src/main/services/inventoryService';
import { getDashboardMetrics, getProfitAndLoss } from '../src/main/services/reportService';
import { UserSession } from '../src/shared/types';

const TEST_DB_PATH = path.resolve(__dirname, 'test_invoice_mgmt.db');

describe('POS Invoice Edit & Reversal (Owner Controls)', () => {
  let ownerSession: UserSession;
  let cashierSession: UserSession;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);

    await initDatabase(TEST_DB_PATH);
    ownerSession = setupInitialOwner({
      username: 'owner',
      fullName: 'Shop Owner',
      password: 'StrongPassword123!',
    });

    const cashierUser = createUser({
      username: 'cashier1',
      fullName: 'Regular Cashier',
      password: 'CashierPassword123!',
      role: 'cashier',
    }, ownerSession);

    cashierSession = {
      userId: cashierUser.id,
      username: cashierUser.username,
      fullName: cashierUser.fullName,
      role: 'cashier',
      token: 'cashier_token_123',
      permissions: ['pos.billing', 'customers.manage'],
    };
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  });

  it('successfully reverses (voids) a sale and restores inventory stock to exact count', () => {
    const prod = createProduct({
      name: 'USB-C Cable',
      code: 'CAB-01',
      sku: 'CAB-USBC',
      barcode: '9551234567890',
      costPriceMinor: 50000,
      retailPriceMinor: 100000,
      currentStockScale4: 500000, // 50 units
    }, ownerSession);

    // Initial stock is 50
    expect(getStockLevel(prod.id)).toBe(500000);

    // Sell 10 units
    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: 100000,
          unitCostMinor: 50000,
          quantityScale4: 100000, // 10 units
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 1000000,
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 1000000 }],
      idempotencyKey: 'sale_to_void_01',
    }, ownerSession);

    // Stock after sale is 40
    expect(getStockLevel(prod.id)).toBe(400000);
    expect(sale.saleStatus).toBe('COMPLETED');

    // Owner reverses the invoice
    const reversed = reverseSale(sale.id, 'Customer cancelled order after purchase', ownerSession);

    expect(reversed.saleStatus).toBe('VOIDED');
    expect(reversed.notes).toContain('REVERSED');
    expect(reversed.notes).toContain('Customer cancelled order after purchase');

    // Stock is restored back to 50
    expect(getStockLevel(prod.id)).toBe(500000);

    // Double reversal is blocked
    expect(() => {
      reverseSale(sale.id, 'Try again', ownerSession);
    }).toThrow(/already been reversed/i);
  });

  it('strictly blocks unauthorized cashiers from reversing or editing invoices', () => {
    const prod = createProduct({
      name: 'Power Bank',
      code: 'PB-01',
      sku: 'PB-10K',
      barcode: '9551234567891',
      costPriceMinor: 150000,
      retailPriceMinor: 300000,
      currentStockScale4: 200000, // 20 units
    }, ownerSession);

    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: 300000,
          unitCostMinor: 150000,
          quantityScale4: 20000, // 2 units
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 600000,
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 600000 }],
      idempotencyKey: 'sale_cashier_block',
    }, ownerSession);

    // Cashier attempt to reverse should fail
    expect(() => {
      reverseSale(sale.id, 'Cashier trying to void', cashierSession);
    }).toThrow(/Forbidden/i);

    // Cashier attempt to edit should fail
    expect(() => {
      editSale({
        saleId: sale.id,
        reason: 'Cashier trying to edit',
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unitPriceMinor: 250000,
            unitCostMinor: 150000,
            quantityScale4: 10000, // 1 unit
          }
        ]
      }, cashierSession);
    }).toThrow(/Forbidden/i);
  });

  it('correctly edits invoice line items, recalculates totals, and reconciles inventory differences', () => {
    const prodA = createProduct({
      name: 'Screen Protector',
      code: 'SP-01',
      sku: 'SP-GLAS',
      barcode: '9551234567892',
      costPriceMinor: 20000,
      retailPriceMinor: 50000,
      currentStockScale4: 300000, // 30 units
    }, ownerSession);

    // Buy 5 units initially
    const sale = processSale({
      items: [
        {
          productId: prodA.id,
          productName: prodA.name,
          sku: prodA.sku,
          barcode: prodA.barcode,
          unitPriceMinor: 50000,
          unitCostMinor: 20000,
          quantityScale4: 50000, // 5 units = LKR 2,500
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 250000,
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 250000 }],
      idempotencyKey: 'sale_to_edit_01',
    }, ownerSession);

    // Stock after 5 units sold = 25
    expect(getStockLevel(prodA.id)).toBe(250000);

    // Owner edits invoice: change quantity to 2 units instead of 5, and adjust unit price to LKR 450
    const edited = editSale({
      saleId: sale.id,
      customerName: 'Loyal Customer John',
      reason: 'Reduced quantity from 5 to 2 and applied special discount',
      items: [
        {
          productId: prodA.id,
          productName: prodA.name,
          sku: prodA.sku,
          barcode: prodA.barcode,
          quantityScale4: 20000, // 2 units = 2 * 450 = 900
          unitPriceMinor: 45000, // LKR 450
          unitCostMinor: 20000,
          discountMinor: 0,
          taxRateBps: 0,
        }
      ]
    }, ownerSession);

    expect(edited.saleStatus).toBe('CORRECTED');
    expect(edited.customerName).toBe('Loyal Customer John');
    expect(edited.totalMinor).toBe(90000); // 2 * 450 = 900 LKR = 90000 minor
    expect(edited.changeMinor).toBe(250000 - 90000); // 1600 LKR change due to customer

    // Stock should now reflect 30 - 2 = 28 units (3 units restored!)
    expect(getStockLevel(prodA.id)).toBe(280000);
  });

  it('excludes voided sales from dashboard reporting metrics and P&L', () => {
    const prod = createProduct({
      name: 'Earphones',
      code: 'EP-01',
      sku: 'EP-35MM',
      barcode: '9551234567893',
      costPriceMinor: 40000,
      retailPriceMinor: 100000,
      currentStockScale4: 1000000, // 100 units
    }, ownerSession);

    // Sale 1: LKR 1000 (completed)
    processSale({
      items: [{
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        unitPriceMinor: 100000,
        unitCostMinor: 40000,
        quantityScale4: 10000,
        discountMinor: 0,
        taxRateBps: 0,
        taxMinor: 0,
        lineTotalMinor: 100000,
      }],
      payments: [{ method: 'CASH', amountMinor: 100000 }],
      idempotencyKey: 'sale_metric_01',
    }, ownerSession);

    // Sale 2: LKR 2000 (will be voided)
    const sale2 = processSale({
      items: [{
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        unitPriceMinor: 100000,
        unitCostMinor: 40000,
        quantityScale4: 20000,
        discountMinor: 0,
        taxRateBps: 0,
        taxMinor: 0,
        lineTotalMinor: 200000,
      }],
      payments: [{ method: 'CASH', amountMinor: 200000 }],
      idempotencyKey: 'sale_metric_02',
    }, ownerSession);

    // Check dashboard metrics before voiding
    let metrics = getDashboardMetrics();
    expect(metrics.totalOrders).toBe(2);
    expect(metrics.totalSalesMinor).toBe(300000);

    // Void Sale 2
    reverseSale(sale2.id, 'Test reversal for reporting', ownerSession);

    // Check dashboard metrics after voiding
    metrics = getDashboardMetrics();
    expect(metrics.totalOrders).toBe(1);
    expect(metrics.totalSalesMinor).toBe(100000);

    // Check P&L
    const pnl = getProfitAndLoss();
    expect(pnl.netSalesMinor).toBe(100000);
    expect(pnl.cogsMinor).toBe(40000);
    expect(pnl.grossProfitMinor).toBe(60000);
  });
});
