import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase, getDb } from '../src/main/services/db';
import { setupInitialOwner } from '../src/main/services/authService';
import { createProduct } from '../src/main/services/catalogService';
import { processSale } from '../src/main/services/checkoutService';
import { processReturn } from '../src/main/services/returnService';
import { getStockLevel } from '../src/main/services/inventoryService';
import { UserSession } from '../src/shared/types';

const TEST_DB_PATH = path.resolve(__dirname, 'test_ret.db');

describe('Sales Returns & Dispositions Integration Tests', () => {
  let ownerSession: UserSession;

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
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  });

  it('processes item restock return, adjusts stock upwards, and prevents excess returns', () => {
    const prod = createProduct({
      name: 'Wireless Mouse',
      code: 'MOU-01',
      sku: 'MOU-WRL',
      barcode: '9551234567822',
      costPriceMinor: 150000,
      retailPriceMinor: 250000,
      currentStockScale4: 100000, // 10 units
    }, ownerSession);

    // Buy 4 units
    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: 250000,
          unitCostMinor: 150000,
          quantityScale4: 40000, // 4 units
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 1000000,
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 1000000 }],
      idempotencyKey: 'req_return_source_sale',
    }, ownerSession);

    expect(getStockLevel(prod.id)).toBe(60000); // 10 - 4 = 6 units

    const db = getDb();
    const saleItem = db.prepare('SELECT id FROM sale_items WHERE sale_id = ?').get(sale.id) as any;

    // Return 2 units with RESTOCK disposition
    const ret1 = processReturn({
      originalSaleId: sale.id,
      items: [
        {
          originalSaleItemId: saleItem.id,
          quantityScale4: 20000, // 2 units
          disposition: 'RESTOCK',
        },
      ],
      refundMethod: 'CASH',
      reason: 'Customer changed color preference',
    }, ownerSession);

    expect(ret1.returnId).toBeDefined();
    expect(ret1.totalRefundMinor).toBe(500000); // 2 * 2500.00
    // Stock should now be 6 + 2 = 8 units (80000 scale 4)
    expect(getStockLevel(prod.id)).toBe(80000);

    // Attempting to return 3 more units (2 + 3 = 5 > 4 purchased) must throw
    expect(() => {
      processReturn({
        originalSaleId: sale.id,
        items: [
          {
            originalSaleItemId: saleItem.id,
            quantityScale4: 30000,
            disposition: 'RESTOCK',
          },
        ],
        refundMethod: 'CASH',
        reason: 'Attempting excess return',
      }, ownerSession);
    }).toThrow(/remaining returnable/);
  });
});
