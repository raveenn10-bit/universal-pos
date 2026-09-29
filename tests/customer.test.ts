import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase } from '../src/main/services/db';
import { setupInitialOwner } from '../src/main/services/authService';
import { createCustomer, getCustomerById, updateCustomer, recordSettlementPayment } from '../src/main/services/customerService';
import { createProduct } from '../src/main/services/catalogService';
import { processSale, getSaleById } from '../src/main/services/checkoutService';
import { UserSession } from '../src/shared/types';

const TEST_DB_PATH = path.resolve(__dirname, 'test_cust.db');

describe('Customer Management & Ledger Integrity Tests', () => {
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

  it('creates customer and calculates derived credit balance correctly', () => {
    const cust = createCustomer({
      name: 'Sunil Perera',
      phone: '0771234567',
      creditLimitMinor: 5000000, // LKR 50,000.00 limit
      openingBalanceMinor: 1000000, // LKR 10,000.00 opening balance
    }, ownerSession);

    expect(cust.id).toBeDefined();
    expect(cust.currentBalanceMinor).toBe(1000000);

    // Make settlement payment of LKR 4,000.00
    recordSettlementPayment(cust.id, 400000, 'CASH', 'Cash payment', ownerSession);

    const updated = getCustomerById(cust.id)!;
    expect(updated.currentBalanceMinor).toBe(600000); // 10,000 - 4,000 = 6,000
  });

  it('enforces credit limit when charging sales on customer account', () => {
    const cust = createCustomer({
      name: 'Nimal Silva',
      phone: '0719876543',
      creditLimitMinor: 200000, // LKR 2,000.00 credit limit
    }, ownerSession);

    const prod = createProduct({
      name: 'Premium Silk Shirt',
      code: 'SHR-01',
      sku: 'SHR-SILK',
      barcode: '9551234567800',
      costPriceMinor: 100000,
      retailPriceMinor: 350000, // LKR 3,500.00 (exceeds 2,000.00 limit)
      currentStockScale4: 10000,
    }, ownerSession);

    // Attempting to buy on store credit exceeding limit must throw
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
            lineTotalMinor: 350000,
          },
        ],
        payments: [{ method: 'CREDIT', amountMinor: 350000 }],
        customerId: cust.id,
        idempotencyKey: 'req_credit_limit_exceeded',
      }, ownerSession);
    }).toThrow(/credit limit exceeded/);
  });

  it('preserves historical customer snapshot on issued sales after customer details are edited', () => {
    const cust = createCustomer({
      name: 'Original Customer Name',
      phone: '0770001111',
      addressBilling: '123 Galle Road, Colombo',
    }, ownerSession);

    const prod = createProduct({
      name: 'Cotton Socks',
      code: 'SOX-01',
      sku: 'SOX-01',
      barcode: '9551234567801',
      costPriceMinor: 20000,
      retailPriceMinor: 50000,
      currentStockScale4: 100000,
    }, ownerSession);

    const sale = processSale({
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          unitPriceMinor: 50000,
          unitCostMinor: 20000,
          quantityScale4: 10000,
          discountMinor: 0,
          taxRateBps: 0,
          taxMinor: 0,
          lineTotalMinor: 50000,
        },
      ],
      payments: [{ method: 'CASH', amountMinor: 50000 }],
      customerId: cust.id,
      idempotencyKey: 'req_cust_snapshot_test',
    }, ownerSession);

    // Verify sale has snapshot with original details
    expect(sale.customerSnapshot?.name).toBe('Original Customer Name');
    expect(sale.customerSnapshot?.addressBilling).toBe('123 Galle Road, Colombo');

    // Update customer profile to new name & new address
    updateCustomer(cust.id, {
      name: 'Completely Changed Name',
      addressBilling: '999 Kandy Road, Kelaniya',
    }, ownerSession);

    // Re-fetch sale from database: Historical customer snapshot MUST REMAIN UNCHANGED
    const historicalSale = getSaleById(sale.id)!;
    expect(historicalSale.customerSnapshot?.name).toBe('Original Customer Name');
    expect(historicalSale.customerSnapshot?.addressBilling).toBe('123 Galle Road, Colombo');
  });
});
