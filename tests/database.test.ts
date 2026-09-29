import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase, getDb } from '../src/main/services/db';
import { setupInitialOwner, loginUser } from '../src/main/services/authService';
import { createProduct, getProductByBarcode } from '../src/main/services/catalogService';
import { registerSerializedItem, getStockLevel, adjustStock } from '../src/main/services/inventoryService';
import { processSale } from '../src/main/services/checkoutService';
import { UserSession } from '../src/shared/types';

const TEST_DB_PATH = path.resolve(__dirname, 'test_pos.db');

describe('Database & Transaction Integration Tests', () => {
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

  it('initializes database with WAL mode and runs migrations cleanly', () => {
    const db = getDb();
    const pragmaRow = db.pragma('journal_mode') as any[];
    expect(pragmaRow[0].journal_mode).toBe('wal');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('sales');
    expect(tableNames).toContain('inventory_items');
    expect(tableNames).toContain('customers');
  });

  it('creates product and updates stock level atomically', () => {
    const prod = createProduct({
      name: 'Wireless Bluetooth Headset',
      code: 'WBH-01',
      sku: 'WBH-SKU',
      barcode: '9551234567890',
      costPriceMinor: 350000,
      retailPriceMinor: 550000,
      currentStockScale4: 100000, // 10 units
    }, ownerSession);

    expect(prod).toBeDefined();
    expect(prod.barcode).toBe('9551234567890');
    expect(getStockLevel(prod.id)).toBe(100000);
  });

  it('processes sales atomically, decrements stock, and prevents duplicate checkout via idempotency key', () => {
    const prod = createProduct({
      name: 'Denim Jeans Blue',
      code: 'JNS-BLU',
      sku: 'JNS-BLU-32',
      barcode: '9551234567891',
      costPriceMinor: 200000,
      retailPriceMinor: 400000,
      currentStockScale4: 50000, // 5 units
    }, ownerSession);

    const idempotencyKey = 'req_idm_unique_101';

    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: prod.retailPriceMinor,
          unitCostMinor: prod.costPriceMinor,
          quantityScale4: 20000, // 2 units
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 800000,
        },
      ],
      payments: [
        { method: 'CASH', amountMinor: 800000 },
      ],
      idempotencyKey,
    }, ownerSession);

    expect(sale.id).toBeDefined();
    expect(sale.totalMinor).toBe(800000);
    expect(sale.paymentStatus).toBe('PAID');

    // On-hand stock must have decreased from 5 to 3 units (30000 scale 4)
    expect(getStockLevel(prod.id)).toBe(30000);

    // Duplicate submission with same idempotency key must return the existing sale without decrementing stock again
    const dupSale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: prod.retailPriceMinor,
          unitCostMinor: prod.costPriceMinor,
          quantityScale4: 20000,
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 800000,
        },
      ],
      payments: [
        { method: 'CASH', amountMinor: 800000 },
      ],
      idempotencyKey,
    }, ownerSession);

    expect(dupSale.id).toBe(sale.id);
    expect(getStockLevel(prod.id)).toBe(30000); // Unchanged!
  });

  it('rejects sale and rolls back completely when on-hand stock is insufficient', () => {
    const prod = createProduct({
      name: 'Limited Edition Jacket',
      code: 'JKT-LTD',
      sku: 'JKT-LTD-M',
      barcode: '9551234567892',
      costPriceMinor: 500000,
      retailPriceMinor: 900000,
      currentStockScale4: 10000, // Only 1 unit in stock
    }, ownerSession);

    expect(() => {
      processSale({
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unitPriceMinor: prod.retailPriceMinor,
            unitCostMinor: prod.costPriceMinor,
            quantityScale4: 20000, // Requesting 2 units (more than available)
            discountMinor: 0,
            taxRateBps: 0,
            taxMinor: 0,
            lineTotalMinor: 1800000,
          },
        ],
        payments: [{ method: 'CASH', amountMinor: 1800000 }],
        idempotencyKey: 'req_insufficient_stock',
      }, ownerSession);
    }).toThrow(/Insufficient stock/);

    // Stock remains unchanged at 1 unit
    expect(getStockLevel(prod.id)).toBe(10000);
  });

  it('enforces serial number uniqueness and marks item as SOLD upon checkout', () => {
    const prod = createProduct({
      name: 'Smartphone Pro Max',
      code: 'SMP-PRO',
      sku: 'SMP-PRO-128',
      barcode: '9551234567893',
      productType: 'SERIALIZED',
      costPriceMinor: 12000000,
      retailPriceMinor: 16500000,
      currentStockScale4: 0,
    }, ownerSession);

    // Register serial item with leading zeroes preserved
    const srlItem = registerSerializedItem({
      productId: prod.id,
      serialNumber: '00192837465',
      imei1: '003582910293847',
      acquisitionCostMinor: 12000000,
    }, ownerSession);

    expect(srlItem.serialNumber).toBe('00192837465');
    expect(getStockLevel(prod.id)).toBe(10000); // 1 unit added

    // Attempting to register the same serial number again must throw an error
    expect(() => {
      registerSerializedItem({
        productId: prod.id,
        serialNumber: '00192837465',
        acquisitionCostMinor: 12000000,
      }, ownerSession);
    }).toThrow(/already exists/);

    // Sell the serialized item
    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: prod.retailPriceMinor,
          unitCostMinor: prod.costPriceMinor,
          quantityScale4: 10000,
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 16500000,
          serialNumber: '00192837465',
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 16500000 }],
      idempotencyKey: 'req_serial_sale_1',
    }, ownerSession);

    expect(sale.id).toBeDefined();

    // Verify item is now marked as SOLD in database
    const db = getDb();
    const itemInDb = db.prepare('SELECT status, sold_at_sale_id FROM inventory_items WHERE serial_number = ?').get('00192837465') as any;
    expect(itemInDb.status).toBe('SOLD');
    // Replenish product stock so that the serial availability constraint is tested
    adjustStock(prod.id, '', 10000, 12000000, 'Replenish stock', ownerSession);

    // Selling the same unit a second time must be rejected
    expect(() => {
      processSale({
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unitPriceMinor: prod.retailPriceMinor,
            unitCostMinor: prod.costPriceMinor,
            quantityScale4: 10000,
            discountMinor: 0,
            taxRateBps: 0,
            taxMinor: 0,
            lineTotalMinor: 16500000,
            serialNumber: '00192837465',
          },
        ],
        payments: [{ method: 'CASH', amountMinor: 16500000 }],
        idempotencyKey: 'req_serial_sale_2',
      }, ownerSession);
    }).toThrow(/not available for sale/);
  });
});
