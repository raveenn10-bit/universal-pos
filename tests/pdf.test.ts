import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateReceiptPdf, generateA4InvoicePdf, generateCustomerStatementPdf } from '../src/main/services/pdfService';
import { Sale, Customer, CustomerTransaction } from '../src/shared/types';

const OUTPUT_DIR = path.resolve(__dirname, 'test_output_pdfs');

describe('Offline PDF Generation & Typography Tests', () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  afterAll(() => {
    // Keep directory or cleanup
  });

  const dummySale: Sale = {
    id: 'sal_test_pdf_01',
    invoiceNumber: 'INV-2026-00042',
    saleDate: '2026-09-29T14:30:00Z',
    cashierId: 'usr_001',
    cashierName: 'Nadeeshani Silva',
    customerName: 'Kavindu Bandara (කවිඳු බණ්ඩාර)',
    subtotalMinor: 1540000, // LKR 15,400.00
    discountMinor: 40000,
    discountType: 'FIXED',
    taxMinor: 120000,
    totalMinor: 1620000, // LKR 16,200.00
    paidMinor: 1700000,
    changeMinor: 80000,
    balanceDueMinor: 0,
    paymentStatus: 'PAID',
    saleStatus: 'COMPLETED',
    idempotencyKey: 'idm_pdf_01',
    items: [
      {
        productId: 'prd_01',
        productName: 'Denim Jeans Regular Fit (ඩෙනිම්)',
        sku: 'JNS-01',
        barcode: '8901234567890',
        unitPriceMinor: 320000,
        unitCostMinor: 180000,
        quantityScale4: 20000, // 2 pcs
        discountMinor: 0,
        taxRateBps: 800,
        taxMinor: 51200,
        lineTotalMinor: 691200,
      },
      {
        productId: 'prd_02',
        productName: 'Casual Bomber Jacket',
        sku: 'JKT-01',
        barcode: '8901234567891',
        unitPriceMinor: 580000,
        unitCostMinor: 350000,
        quantityScale4: 10000, // 1 pc
        discountMinor: 40000,
        taxRateBps: 800,
        taxMinor: 43200,
        lineTotalMinor: 583200,
        serialNumber: 'SN-JKT-998822',
      },
      {
        productId: 'prd_03',
        productName: 'Cotton Crew Neck T-Shirt',
        sku: 'TSH-01',
        barcode: '8901234567894',
        unitPriceMinor: 160000,
        unitCostMinor: 85000,
        quantityScale4: 20000, // 2 pcs
        discountMinor: 0,
        taxRateBps: 800,
        taxMinor: 25600,
        lineTotalMinor: 345600,
      },
    ],
    payments: [
      { method: 'CASH', amountMinor: 1700000 },
    ],
    createdAt: '2026-09-29T14:30:00Z',
  };

  it('generates an 80mm thermal receipt PDF fully offline with QR verification code', async () => {
    const receiptPath = path.join(OUTPUT_DIR, 'Test-Receipt-80mm.pdf');
    if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath);

    const res = await generateReceiptPdf(dummySale, receiptPath);

    expect(fs.existsSync(res.filePath)).toBe(true);
    expect(res.pageCount).toBe(1);
    expect(res.integrityHash).toBeDefined();
    expect(res.integrityHash.length).toBe(64); // SHA-256
    expect(fs.statSync(receiptPath).size).toBeGreaterThan(1000);
  });

  it('generates an official A4 multi-page commercial invoice PDF with pagination and Unicode', async () => {
    const invoicePath = path.join(OUTPUT_DIR, 'Test-Invoice-A4.pdf');
    if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);

    const res = await generateA4InvoicePdf(dummySale, invoicePath);

    expect(fs.existsSync(res.filePath)).toBe(true);
    expect(res.pageCount).toBeGreaterThanOrEqual(1);
    expect(res.integrityHash.length).toBe(64);
    expect(fs.statSync(invoicePath).size).toBeGreaterThan(2000);
  });

  it('generates a Customer Statement PDF with running ledger balances', async () => {
    const statementPath = path.join(OUTPUT_DIR, 'Test-Customer-Statement.pdf');
    if (fs.existsSync(statementPath)) fs.unlinkSync(statementPath);

    const dummyCustomer: Customer = {
      id: 'cst_test_01',
      customerCode: 'CST-00042',
      customerType: 'BUSINESS',
      name: 'Lanka Tech Solutions (Pvt) Ltd',
      phone: '+94 11 234 5678',
      addressBilling: 'Level 5, World Trade Center, Colombo 01',
      taxId: 'TIN-987654321',
      creditLimitMinor: 10000000,
      paymentTermsDays: 30,
      currentBalanceMinor: 2500000, // LKR 25,000.00
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-09-29',
    };

    const dummyTxs: CustomerTransaction[] = [
      {
        id: 'tx_01',
        timestamp: '2026-09-01T10:00:00Z',
        customerId: dummyCustomer.id,
        transactionType: 'OPENING_BALANCE',
        debitMinor: 1000000,
        creditMinor: 0,
        runningBalanceMinor: 1000000,
        userId: 'usr_001',
      },
      {
        id: 'tx_02',
        timestamp: '2026-09-15T14:00:00Z',
        customerId: dummyCustomer.id,
        transactionType: 'INVOICE_CHARGE',
        referenceNumber: 'INV-2026-00010',
        debitMinor: 2000000,
        creditMinor: 0,
        runningBalanceMinor: 3000000,
        userId: 'usr_001',
      },
      {
        id: 'tx_03',
        timestamp: '2026-09-20T16:00:00Z',
        customerId: dummyCustomer.id,
        transactionType: 'SETTLEMENT_PAYMENT',
        debitMinor: 0,
        creditMinor: 500000,
        runningBalanceMinor: 2500000,
        notes: 'Cheque settlement #778899',
        userId: 'usr_001',
      },
    ];

    const res = await generateCustomerStatementPdf(dummyCustomer, dummyTxs, statementPath);

    expect(fs.existsSync(res.filePath)).toBe(true);
    expect(res.integrityHash.length).toBe(64);
    expect(fs.statSync(statementPath).size).toBeGreaterThan(1500);
  });
});
