// Harsh Apex Universal POS - Checkout & Sales Transaction Engine
import crypto from 'node:crypto';
import { getDb } from './db';
import { CartItem, Sale, TenderPayment, UserSession, Customer } from '../../shared/types';
import { getCustomerById, getCustomerBalance } from './customerService';
import { getStockLevel } from './inventoryService';
import { assertPermission } from './authService';

export interface ProcessSaleRequest {
  items: CartItem[];
  payments: TenderPayment[];
  customerId?: string;
  discountMinor?: number;
  discountType?: 'PERCENT' | 'FIXED';
  notes?: string;
  idempotencyKey: string;
}

export function generateNextInvoiceNumber(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastSale = db.prepare(`
    SELECT invoice_number FROM sales 
    WHERE invoice_number LIKE ? 
    ORDER BY invoice_number DESC LIMIT 1
  `).get(`${prefix}%`) as { invoice_number: string } | undefined;

  let nextSeq = 1;
  if (lastSale && lastSale.invoice_number) {
    const parts = lastSale.invoice_number.split('-');
    const currentSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(6, '0')}`;
}

export function processSale(
  req: ProcessSaleRequest,
  session: UserSession
): Sale {
  assertPermission(session, 'pos.fast_checkout');
  const db = getDb();

  if (!req.items || req.items.length === 0) {
    throw new Error('Cannot process an empty cart.');
  }

  if (!req.payments || req.payments.length === 0) {
    throw new Error('At least one payment tender must be provided.');
  }

  // Idempotency check: if sale with this key already exists, return the existing sale safely
  const existing = db.prepare('SELECT id FROM sales WHERE idempotency_key = ?').get(req.idempotencyKey) as { id: string } | undefined;
  if (existing) {
    return getSaleById(existing.id)!;
  }

  const now = new Date().toISOString();
  const saleId = `sal_${crypto.randomUUID()}`;
  const invoiceNumber = generateNextInvoiceNumber();

  // 1. Calculate line totals and subtotal
  let subtotalMinor = 0;
  let totalTaxMinor = 0;

  for (const item of req.items) {
    const rawQty = item.quantityScale4 / 10000;
    const baseAmount = Math.round(item.unitPriceMinor * rawQty);
    const lineDiscount = item.discountMinor || 0;
    const taxableAmount = Math.max(0, baseAmount - lineDiscount);

    let taxMinor = 0;
    if (item.taxRateBps > 0) {
      taxMinor = Math.round((taxableAmount * item.taxRateBps) / 10000);
    }

    item.taxMinor = taxMinor;
    item.lineTotalMinor = taxableAmount + taxMinor;

    subtotalMinor += baseAmount;
    totalTaxMinor += taxMinor;
  }

  // 2. Global cart discount calculation
  let cartDiscountMinor = req.discountMinor || 0;
  if (req.discountType === 'PERCENT' && req.discountMinor) {
    cartDiscountMinor = Math.round((subtotalMinor * req.discountMinor) / 10000);
  }
  const totalMinor = Math.max(0, subtotalMinor - cartDiscountMinor + totalTaxMinor);

  // 3. Payment reconciliation
  let totalPaidMinor = 0;
  let creditPaidMinor = 0;
  for (const p of req.payments) {
    totalPaidMinor += p.amountMinor;
    if (p.method === 'CREDIT') {
      creditPaidMinor += p.amountMinor;
    }
  }

  let changeMinor = 0;
  let balanceDueMinor = 0;

  if (totalPaidMinor > totalMinor) {
    changeMinor = totalPaidMinor - totalMinor;
  } else if (totalPaidMinor < totalMinor) {
    balanceDueMinor = totalMinor - totalPaidMinor;
  }

  const paymentStatus = balanceDueMinor === 0 ? 'PAID' : (totalPaidMinor > 0 ? 'PARTIAL' : 'UNPAID');

  // 4. Validate customer credit limit if credit tender is used
  let customerSnapshot: Partial<Customer> | undefined = undefined;
  if (req.customerId) {
    const customer = getCustomerById(req.customerId);
    if (!customer) {
      throw new Error(`Customer with ID '${req.customerId}' not found.`);
    }
    customerSnapshot = {
      id: customer.id,
      customerCode: customer.customerCode,
      name: customer.name,
      phone: customer.phone,
      addressBilling: customer.addressBilling,
      taxId: customer.taxId,
      companyName: customer.companyName,
    };

    if (creditPaidMinor > 0) {
      const currentBalance = getCustomerBalance(customer.id);
      if (customer.creditLimitMinor > 0 && (currentBalance + creditPaidMinor) > customer.creditLimitMinor) {
        throw new Error(
          `Customer credit limit exceeded. Current balance: LKR ${(currentBalance / 100).toFixed(2)}, ` +
          `Charge: LKR ${(creditPaidMinor / 100).toFixed(2)}, Limit: LKR ${(customer.creditLimitMinor / 100).toFixed(2)}.`
        );
      }
    }
  } else if (creditPaidMinor > 0) {
    throw new Error('A customer must be selected to process payments on store credit.');
  }

  // 5. ATOMIC TRANSACTION EXECUTION
  db.transaction(() => {
    // 5.1 Re-validate stock levels and serial numbers
    for (const item of req.items) {
      const currentStock = getStockLevel(item.productId, item.variantId || '');
      if (currentStock < item.quantityScale4) {
        throw new Error(`Insufficient stock for '${item.productName}'. Available: ${currentStock / 10000}, Required: ${item.quantityScale4 / 10000}`);
      }

      // If serialized, verify item is AVAILABLE
      if (item.serialNumber) {
        const srl = db.prepare(`
          SELECT id, status FROM inventory_items 
          WHERE product_id = ? AND serial_number = ?
        `).get(item.productId, item.serialNumber) as any;

        if (!srl || srl.status !== 'AVAILABLE') {
          throw new Error(`Serialized unit '${item.serialNumber}' is not available for sale (Status: ${srl?.status || 'NOT_FOUND'}).`);
        }
      }

      if (item.imei1) {
        const imeiRow = db.prepare(`
          SELECT id, status FROM inventory_items 
          WHERE product_id = ? AND (imei_1 = ? OR imei_2 = ?)
        `).get(item.productId, item.imei1, item.imei1) as any;

        if (!imeiRow || imeiRow.status !== 'AVAILABLE') {
          throw new Error(`Device with IMEI '${item.imei1}' is not available for sale.`);
        }
      }
    }

    // 5.2 Insert master sale record
    db.prepare(`
      INSERT INTO sales (
        id, invoice_number, sale_date, shift_id, cashier_id, cashier_name,
        customer_id, customer_name, customer_snapshot_json,
        subtotal_minor, discount_minor, discount_type, tax_minor, total_minor,
        paid_minor, change_minor, balance_due_minor, payment_status, sale_status,
        notes, idempotency_key, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'COMPLETED',
        ?, ?, ?
      )
    `).run(
      saleId,
      invoiceNumber,
      now,
      session.shiftId || null,
      session.userId,
      session.fullName,
      req.customerId || null,
      customerSnapshot?.name || 'Walk-in Customer',
      customerSnapshot ? JSON.stringify(customerSnapshot) : null,
      subtotalMinor,
      cartDiscountMinor,
      req.discountType || 'FIXED',
      totalTaxMinor,
      totalMinor,
      totalPaidMinor,
      changeMinor,
      balanceDueMinor,
      paymentStatus,
      req.notes || null,
      req.idempotencyKey,
      now
    );

    // 5.3 Insert sale line items, decrement stock, record movements
    for (const item of req.items) {
      const lineItemId = `sli_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, product_id, variant_id, product_name, sku, barcode,
          quantity_scale4, unit_price_minor, unit_cost_minor, discount_minor,
          tax_rate_bps, tax_minor, line_total_minor, serial_numbers_json, batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lineItemId,
        saleId,
        item.productId,
        item.variantId || null,
        item.productName,
        item.sku,
        item.barcode,
        item.quantityScale4,
        item.unitPriceMinor,
        item.unitCostMinor,
        item.discountMinor || 0,
        item.taxRateBps,
        item.taxMinor,
        item.lineTotalMinor,
        item.serialNumber || item.imei1 ? JSON.stringify({ serial: item.serialNumber, imei1: item.imei1, imei2: item.imei2 }) : null,
        item.batchId || null
      );

      // Decrement stock level
      const currentStock = getStockLevel(item.productId, item.variantId || '');
      db.prepare(`
        UPDATE stock_levels 
        SET quantity_scale4 = ? 
        WHERE product_id = ? AND variant_id = ?
      `).run(currentStock - item.quantityScale4, item.productId, item.variantId || '');

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, timestamp, product_id, variant_id, movement_type,
          quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
        ) VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, 'SALE', ?, ?)
      `).run(
        `mov_${crypto.randomUUID()}`,
        now,
        item.productId,
        item.variantId || '',
        item.quantityScale4,
        item.unitCostMinor,
        saleId,
        `Sale ${invoiceNumber}`,
        session.userId
      );

      // Mark serial unit as SOLD
      if (item.serialNumber) {
        db.prepare(`
          UPDATE inventory_items 
          SET status = 'SOLD', sold_at_sale_id = ? 
          WHERE product_id = ? AND serial_number = ?
        `).run(saleId, item.productId, item.serialNumber);
      }
      if (item.imei1) {
        db.prepare(`
          UPDATE inventory_items 
          SET status = 'SOLD', sold_at_sale_id = ? 
          WHERE product_id = ? AND (imei_1 = ? OR imei_2 = ?)
        `).run(saleId, item.productId, item.imei1, item.imei1);
      }
    }

    // 5.4 Insert payment tenders
    for (const p of req.payments) {
      db.prepare(`
        INSERT INTO sale_payments (id, sale_id, payment_method, amount_minor, reference_info, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`spm_${crypto.randomUUID()}`, saleId, p.method, p.amountMinor, p.referenceInfo || null, now);
    }

    // 5.5 If store credit tender used, post to customer ledger
    if (creditPaidMinor > 0 && req.customerId) {
      const currentBalance = getCustomerBalance(req.customerId);
      db.prepare(`
        INSERT INTO customer_transactions (
          id, timestamp, customer_id, transaction_type, reference_id, reference_number,
          debit_minor, credit_minor, running_balance_minor, notes, user_id
        ) VALUES (?, ?, ?, 'INVOICE_CHARGE', ?, ?, ?, 0, ?, ?, ?)
      `).run(
        `ctx_${crypto.randomUUID()}`,
        now,
        req.customerId,
        saleId,
        invoiceNumber,
        creditPaidMinor,
        currentBalance + creditPaidMinor,
        `Charged for Sale ${invoiceNumber}`,
        session.userId
      );
    }

    // 5.6 Update active shift totals if cashier is in an active shift
    if (session.shiftId) {
      let cashDelta = 0;
      let cardDelta = 0;
      let transferDelta = 0;
      let creditDelta = 0;

      for (const p of req.payments) {
        if (p.method === 'CASH') cashDelta += (p.amountMinor - changeMinor);
        else if (p.method === 'CARD') cardDelta += p.amountMinor;
        else if (p.method === 'BANK_TRANSFER') transferDelta += p.amountMinor;
        else if (p.method === 'CREDIT') creditDelta += p.amountMinor;
      }

      db.prepare(`
        UPDATE shifts SET
          total_sales_cash_minor = total_sales_cash_minor + ?,
          total_sales_card_minor = total_sales_card_minor + ?,
          total_sales_transfer_minor = total_sales_transfer_minor + ?,
          total_sales_credit_minor = total_sales_credit_minor + ?
        WHERE id = ?
      `).run(cashDelta, cardDelta, transferDelta, creditDelta, session.shiftId);
    }
  })();

  return getSaleById(saleId)!;
}

export function getSaleById(saleId: string): Sale | null {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as any;
  if (!sale) return null;

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId) as any[];
  const payments = db.prepare('SELECT * FROM sale_payments WHERE sale_id = ?').all(saleId) as any[];

  return {
    id: sale.id,
    invoiceNumber: sale.invoice_number,
    saleDate: sale.sale_date,
    shiftId: sale.shift_id,
    cashierId: sale.cashier_id,
    cashierName: sale.cashier_name,
    customerId: sale.customer_id,
    customerName: sale.customer_name,
    customerSnapshot: sale.customer_snapshot_json ? JSON.parse(sale.customer_snapshot_json) : undefined,
    subtotalMinor: sale.subtotal_minor,
    discountMinor: sale.discount_minor,
    discountType: sale.discount_type,
    taxMinor: sale.tax_minor,
    totalMinor: sale.total_minor,
    paidMinor: sale.paid_minor,
    changeMinor: sale.change_minor,
    balanceDueMinor: sale.balance_due_minor,
    paymentStatus: sale.payment_status,
    saleStatus: sale.sale_status,
    templateVersionId: sale.template_version_id,
    notes: sale.notes,
    idempotencyKey: sale.idempotency_key,
    items: items.map(i => ({
      productId: i.product_id,
      variantId: i.variant_id,
      productName: i.product_name,
      sku: i.sku,
      barcode: i.barcode,
      unitPriceMinor: i.unit_price_minor,
      unitCostMinor: i.unit_cost_minor,
      quantityScale4: i.quantity_scale4,
      discountMinor: i.discount_minor,
      taxRateBps: i.tax_rate_bps,
      taxMinor: i.tax_minor,
      lineTotalMinor: i.line_total_minor,
      serialNumber: i.serial_numbers_json ? JSON.parse(i.serial_numbers_json).serial : undefined,
      imei1: i.serial_numbers_json ? JSON.parse(i.serial_numbers_json).imei1 : undefined,
      imei2: i.serial_numbers_json ? JSON.parse(i.serial_numbers_json).imei2 : undefined,
      batchId: i.batch_id,
    })),
    payments: payments.map(p => ({
      method: p.payment_method,
      amountMinor: p.amount_minor,
      referenceInfo: p.reference_info,
    })),
    createdAt: sale.created_at,
  };
}

export function getRecentSales(limit: number = 10): Sale[] {
  const db = getDb();
  const rows = db.prepare('SELECT id FROM sales ORDER BY sale_date DESC LIMIT ?').all(limit) as { id: string }[];
  return rows.map(r => getSaleById(r.id)!);
}

export interface ReverseSaleRequest {
  saleId: string;
  reason: string;
}

export interface EditSaleItemPayload {
  productId: string;
  variantId?: string;
  productName: string;
  sku: string;
  barcode: string;
  quantityScale4: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  discountMinor?: number;
  taxRateBps?: number;
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
}

export interface EditSaleRequest {
  saleId: string;
  customerName?: string;
  customerId?: string;
  notes?: string;
  discountMinor?: number;
  discountType?: 'PERCENT' | 'FIXED';
  items?: EditSaleItemPayload[];
  reason?: string;
}

/**
 * Reverses (voids / cancels) a previously completed or corrected sale.
 * - Restores product inventory stock and serial numbers.
 * - Reverses customer credit ledger transactions if applicable.
 * - Reverses active shift sales totals if the shift is still open.
 * - Updates invoice status to 'VOIDED' with audit logging.
 */
export function reverseSale(
  saleId: string,
  reason: string,
  session: UserSession
): Sale {
  if (session.role !== 'owner' && !session.permissions.includes('*') && !session.permissions.includes('pos.refund') && !session.permissions.includes('pos.void')) {
    throw new Error('Forbidden: Only the Owner or authorized managers can reverse or void invoices.');
  }
  const db = getDb();
  const sale = getSaleById(saleId);
  if (!sale) {
    throw new Error(`Sale with ID '${saleId}' not found.`);
  }

  if (sale.saleStatus === 'VOIDED') {
    throw new Error('This invoice has already been reversed / voided.');
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    // 1. Mark sale as VOIDED and record reason in notes
    const reversalNote = `[REVERSED on ${new Date().toLocaleDateString('en-LK')} by ${session.fullName || session.username}: ${reason.trim() || 'Voided by Owner'}]`;
    const updatedNotes = sale.notes ? `${sale.notes}\n${reversalNote}` : reversalNote;

    db.prepare(`
      UPDATE sales 
      SET sale_status = 'VOIDED', notes = ?
      WHERE id = ?
    `).run(updatedNotes, saleId);

    // 2. Restore stock and release serial numbers for each item sold
    for (const item of sale.items) {
      const currentStock = getStockLevel(item.productId, item.variantId || '');
      db.prepare(`
        UPDATE stock_levels 
        SET quantity_scale4 = ? 
        WHERE product_id = ? AND variant_id = ?
      `).run(currentStock + item.quantityScale4, item.productId, item.variantId || '');

      // Record inventory movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, timestamp, product_id, variant_id, movement_type,
          quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
        ) VALUES (?, ?, ?, ?, 'SALE_REVERSAL_RESTOCK', ?, ?, ?, 'SALE', ?, ?)
      `).run(
        `mov_${crypto.randomUUID()}`,
        now,
        item.productId,
        item.variantId || '',
        item.quantityScale4,
        item.unitCostMinor,
        sale.id,
        `Reversal of Invoice ${sale.invoiceNumber}: ${reason.trim() || 'Voided'}`,
        session.userId
      );

      // Restore serialized unit
      if (item.serialNumber) {
        db.prepare(`
          UPDATE inventory_items 
          SET status = 'AVAILABLE', sold_at_sale_id = NULL 
          WHERE product_id = ? AND serial_number = ?
        `).run(item.productId, item.serialNumber);
      }
      if (item.imei1) {
        db.prepare(`
          UPDATE inventory_items 
          SET status = 'AVAILABLE', sold_at_sale_id = NULL 
          WHERE product_id = ? AND (imei_1 = ? OR imei_2 = ?)
        `).run(item.productId, item.imei1, item.imei1);
      }
    }

    // 3. Customer Ledger Reversal: If store credit was charged, refund/credit customer
    const creditPayment = sale.payments?.find(p => p.method === 'CREDIT');
    if (creditPayment && creditPayment.amountMinor > 0 && sale.customerId) {
      const curBal = getCustomerBalance(sale.customerId);
      db.prepare(`
        INSERT INTO customer_transactions (
          id, timestamp, customer_id, transaction_type, reference_id, reference_number,
          debit_minor, credit_minor, running_balance_minor, notes, user_id
        ) VALUES (?, ?, ?, 'RETURN_CREDIT', ?, ?, 0, ?, ?, ?, ?)
      `).run(
        `ctx_${crypto.randomUUID()}`,
        now,
        sale.customerId,
        sale.id,
        sale.invoiceNumber,
        creditPayment.amountMinor,
        curBal - creditPayment.amountMinor,
        `Reversal refund for Invoice ${sale.invoiceNumber}: ${reason.trim() || 'Voided'}`,
        session.userId
      );
    }

    // 4. Active Shift Reversal: If the shift is still OPEN, deduct from totals
    if (sale.shiftId) {
      const shift = db.prepare('SELECT status FROM shifts WHERE id = ?').get(sale.shiftId) as { status: string } | undefined;
      if (shift && shift.status === 'OPEN') {
        let cashDelta = 0;
        let cardDelta = 0;
        let transferDelta = 0;
        let creditDelta = 0;

        for (const p of sale.payments) {
          if (p.method === 'CASH') cashDelta += (p.amountMinor - sale.changeMinor);
          else if (p.method === 'CARD') cardDelta += p.amountMinor;
          else if (p.method === 'BANK_TRANSFER') transferDelta += p.amountMinor;
          else if (p.method === 'CREDIT') creditDelta += p.amountMinor;
        }

        db.prepare(`
          UPDATE shifts SET
            total_sales_cash_minor = MAX(0, total_sales_cash_minor - ?),
            total_sales_card_minor = MAX(0, total_sales_card_minor - ?),
            total_sales_transfer_minor = MAX(0, total_sales_transfer_minor - ?),
            total_sales_credit_minor = MAX(0, total_sales_credit_minor - ?)
          WHERE id = ?
        `).run(cashDelta, cardDelta, transferDelta, creditDelta, sale.shiftId);
      }
    }

    // 5. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'INVOICE_REVERSED', 'SALE', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      session.userId,
      sale.id,
      JSON.stringify({
        invoiceNumber: sale.invoiceNumber,
        reason: reason.trim(),
        totalMinor: sale.totalMinor,
        reversedBy: session.fullName || session.username,
      })
    );
  })();

  return getSaleById(saleId)!;
}

/**
 * Edits an existing POS invoice.
 * Allows owner/authorized staff to modify customer details, item quantities, prices, discounts, and notes.
 * Accurately reconciles inventory stock differences and updates financial totals.
 */
export function editSale(
  req: EditSaleRequest,
  session: UserSession
): Sale {
  if (session.role !== 'owner' && !session.permissions.includes('*') && !session.permissions.includes('pos.refund') && !session.permissions.includes('pos.edit_sale')) {
    throw new Error('Forbidden: Only the Owner or authorized managers can edit invoices.');
  }
  const db = getDb();
  const origSale = getSaleById(req.saleId);
  if (!origSale) {
    throw new Error(`Sale with ID '${req.saleId}' not found.`);
  }

  if (origSale.saleStatus === 'VOIDED') {
    throw new Error('Cannot edit an invoice that has been voided / reversed.');
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    let subtotalMinor = origSale.subtotalMinor;
    let totalTaxMinor = origSale.taxMinor;
    let cartDiscountMinor = req.discountMinor !== undefined ? req.discountMinor : origSale.discountMinor;
    const discountType = req.discountType || origSale.discountType;
    let totalMinor = origSale.totalMinor;

    // 1. If items are modified, reconcile stock and recalculate financials
    if (req.items && req.items.length > 0) {
      // Step A: Restore original stock and release serials
      for (const origItem of origSale.items) {
        const curStock = getStockLevel(origItem.productId, origItem.variantId || '');
        db.prepare(`
          UPDATE stock_levels 
          SET quantity_scale4 = ? 
          WHERE product_id = ? AND variant_id = ?
        `).run(curStock + origItem.quantityScale4, origItem.productId, origItem.variantId || '');

        if (origItem.serialNumber) {
          db.prepare(`
            UPDATE inventory_items 
            SET status = 'AVAILABLE', sold_at_sale_id = NULL 
            WHERE product_id = ? AND serial_number = ?
          `).run(origItem.productId, origItem.serialNumber);
        }
        if (origItem.imei1) {
          db.prepare(`
            UPDATE inventory_items 
            SET status = 'AVAILABLE', sold_at_sale_id = NULL 
            WHERE product_id = ? AND (imei_1 = ? OR imei_2 = ?)
          `).run(origItem.productId, origItem.imei1, origItem.imei1);
        }
      }

      // Step B: Delete old sale items
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(origSale.id);

      // Step C: Verify stock, insert new items, and deduct stock
      subtotalMinor = 0;
      totalTaxMinor = 0;

      for (const item of req.items) {
        const curStock = getStockLevel(item.productId, item.variantId || '');
        if (curStock < item.quantityScale4) {
          throw new Error(`Insufficient stock for '${item.productName}'. Available: ${curStock / 10000}, Required: ${item.quantityScale4 / 10000}`);
        }

        const rawQty = item.quantityScale4 / 10000;
        const baseAmount = Math.round(item.unitPriceMinor * rawQty);
        const lineDiscount = item.discountMinor || 0;
        const taxableAmount = Math.max(0, baseAmount - lineDiscount);
        let taxMinor = 0;
        if (item.taxRateBps && item.taxRateBps > 0) {
          taxMinor = Math.round((taxableAmount * item.taxRateBps) / 10000);
        }
        const lineTotalMinor = taxableAmount + taxMinor;

        subtotalMinor += baseAmount;
        totalTaxMinor += taxMinor;

        const lineItemId = `sli_${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO sale_items (
            id, sale_id, product_id, variant_id, product_name, sku, barcode,
            quantity_scale4, unit_price_minor, unit_cost_minor, discount_minor,
            tax_rate_bps, tax_minor, line_total_minor, serial_numbers_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          lineItemId,
          origSale.id,
          item.productId,
          item.variantId || null,
          item.productName,
          item.sku,
          item.barcode,
          item.quantityScale4,
          item.unitPriceMinor,
          item.unitCostMinor,
          item.discountMinor || 0,
          item.taxRateBps || 0,
          taxMinor,
          lineTotalMinor,
          item.serialNumber || item.imei1 ? JSON.stringify({ serial: item.serialNumber, imei1: item.imei1, imei2: item.imei2 }) : null
        );

        // Deduct new stock
        db.prepare(`
          UPDATE stock_levels 
          SET quantity_scale4 = ? 
          WHERE product_id = ? AND variant_id = ?
        `).run(curStock - item.quantityScale4, item.productId, item.variantId || '');

        // Record stock movement
        db.prepare(`
          INSERT INTO stock_movements (
            id, timestamp, product_id, variant_id, movement_type,
            quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
          ) VALUES (?, ?, ?, ?, 'SALE_EDIT_ADJUST', ?, ?, ?, 'SALE', ?, ?)
        `).run(
          `mov_${crypto.randomUUID()}`,
          now,
          item.productId,
          item.variantId || '',
          item.quantityScale4,
          item.unitCostMinor,
          origSale.id,
          `Correction of Invoice ${origSale.invoiceNumber}`,
          session.userId
        );

        // Mark serialized item as SOLD
        if (item.serialNumber) {
          db.prepare(`
            UPDATE inventory_items 
            SET status = 'SOLD', sold_at_sale_id = ? 
            WHERE product_id = ? AND serial_number = ?
          `).run(origSale.id, item.productId, item.serialNumber);
        }
        if (item.imei1) {
          db.prepare(`
            UPDATE inventory_items 
            SET status = 'SOLD', sold_at_sale_id = ? 
            WHERE product_id = ? AND (imei_1 = ? OR imei_2 = ?)
          `).run(origSale.id, item.productId, item.imei1, item.imei1);
        }
      }

      // Calculate global cart discount
      if (discountType === 'PERCENT' && cartDiscountMinor) {
        cartDiscountMinor = Math.round((subtotalMinor * cartDiscountMinor) / 10000);
      }
      totalMinor = Math.max(0, subtotalMinor - cartDiscountMinor + totalTaxMinor);
    }

    // 2. Customer resolution
    let customerId = req.customerId !== undefined ? req.customerId : origSale.customerId;
    let customerName = req.customerName !== undefined ? req.customerName : origSale.customerName;
    let customerSnapshotJson = origSale.customerSnapshot ? JSON.stringify(origSale.customerSnapshot) : null;

    if (customerId && customerId !== origSale.customerId) {
      const cust = getCustomerById(customerId);
      if (cust) {
        customerName = cust.name;
        customerSnapshotJson = JSON.stringify({
          id: cust.id,
          customerCode: cust.customerCode,
          name: cust.name,
          phone: cust.phone,
          addressBilling: cust.addressBilling,
          taxId: cust.taxId,
          companyName: cust.companyName,
        });
      }
    }

    // 3. Balance due and change calculation
    let balanceDueMinor = 0;
    let changeMinor = 0;
    if (origSale.paidMinor > totalMinor) {
      changeMinor = origSale.paidMinor - totalMinor;
    } else if (origSale.paidMinor < totalMinor) {
      balanceDueMinor = totalMinor - origSale.paidMinor;
    }
    const paymentStatus = balanceDueMinor === 0 ? 'PAID' : (origSale.paidMinor > 0 ? 'PARTIAL' : 'UNPAID');

    // 4. Update customer credit ledger if difference exists
    const creditPayment = origSale.payments?.find(p => p.method === 'CREDIT');
    if (creditPayment && customerId && totalMinor !== origSale.totalMinor) {
      const diff = totalMinor - origSale.totalMinor;
      const curBal = getCustomerBalance(customerId);
      db.prepare(`
        INSERT INTO customer_transactions (
          id, timestamp, customer_id, transaction_type, reference_id, reference_number,
          debit_minor, credit_minor, running_balance_minor, notes, user_id
        ) VALUES (?, ?, ?, 'INVOICE_CHARGE', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ctx_${crypto.randomUUID()}`,
        now,
        customerId,
        origSale.id,
        origSale.invoiceNumber,
        diff > 0 ? diff : 0,
        diff < 0 ? Math.abs(diff) : 0,
        curBal + diff,
        `Invoice ${origSale.invoiceNumber} adjusted by ${session.fullName || session.username}`,
        session.userId
      );
    }

    // 5. Update master sales table record
    const editNote = `[EDITED on ${new Date().toLocaleDateString('en-LK')} by ${session.fullName || session.username}: ${req.reason?.trim() || 'Invoice corrected'}]`;
    const finalNotes = req.notes !== undefined 
      ? (req.notes ? `${req.notes}\n${editNote}` : editNote)
      : (origSale.notes ? `${origSale.notes}\n${editNote}` : editNote);

    db.prepare(`
      UPDATE sales SET
        customer_id = ?,
        customer_name = ?,
        customer_snapshot_json = ?,
        subtotal_minor = ?,
        discount_minor = ?,
        discount_type = ?,
        tax_minor = ?,
        total_minor = ?,
        change_minor = ?,
        balance_due_minor = ?,
        payment_status = ?,
        sale_status = 'CORRECTED',
        notes = ?
      WHERE id = ?
    `).run(
      customerId || null,
      customerName || 'Walk-in Customer',
      customerSnapshotJson,
      subtotalMinor,
      cartDiscountMinor,
      discountType,
      totalTaxMinor,
      totalMinor,
      changeMinor,
      balanceDueMinor,
      paymentStatus,
      finalNotes,
      origSale.id
    );

    // 6. Record Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'INVOICE_EDITED', 'SALE', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      session.userId,
      origSale.id,
      JSON.stringify({
        invoiceNumber: origSale.invoiceNumber,
        previousTotal: origSale.totalMinor,
        newTotal: totalMinor,
        editedBy: session.fullName || session.username,
        reason: req.reason,
      })
    );
  })();

  return getSaleById(origSale.id)!;
}
