// Harsh Apex Universal POS - Sales Returns & Invoice Correction Engine
import crypto from 'node:crypto';
import { getDb } from './db';
import { UserSession, ItemDisposition } from '../../shared/types';
import { getSaleById } from './checkoutService';
import { getStockLevel } from './inventoryService';
import { assertPermission } from './authService';

export interface ProcessReturnItemRequest {
  originalSaleItemId: string;
  quantityScale4: number;
  disposition: ItemDisposition; // 'RESTOCK' | 'DAMAGED_QUARANTINE'
  serialNumber?: string;
}

export interface ProcessReturnRequest {
  originalSaleId: string;
  items: ProcessReturnItemRequest[];
  refundMethod: 'CASH' | 'CREDIT_NOTE' | 'ORIGINAL_TENDER';
  reason: string;
}

export function processReturn(
  req: ProcessReturnRequest,
  session: UserSession
): { returnId: string; returnNumber: string; totalRefundMinor: number } {
  assertPermission(session, 'pos.process_return');
  const db = getDb();
  const sale = getSaleById(req.originalSaleId);
  if (!sale) {
    throw new Error('Original sale not found.');
  }

  const now = new Date().toISOString();
  const returnId = `ret_${crypto.randomUUID()}`;
  const year = new Date().getFullYear();
  const returnNumber = `RET-${year}-${Date.now().toString().slice(-6)}`;

  let totalRefundMinor = 0;

  db.transaction(() => {
    // 1. Pre-validate return quantities and calculate refunds
    const preparedItems: {
      origItem: any;
      retItem: ProcessReturnItemRequest;
      lineRefund: number;
      taxRefund: number;
      itemTotalRefund: number;
    }[] = [];

    for (const retItem of req.items) {
      const origItem = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(
        retItem.originalSaleItemId,
        req.originalSaleId
      ) as any;

      if (!origItem) {
        throw new Error(`Sale item ID '${retItem.originalSaleItemId}' not found in original sale.`);
      }

      // Check already returned quantity
      const returnedRow = db.prepare(`
        SELECT COALESCE(SUM(quantity_scale4), 0) as returned_qty
        FROM return_items
        WHERE original_sale_item_id = ?
      `).get(retItem.originalSaleItemId) as { returned_qty: number };

      const maxReturnable = origItem.quantity_scale4 - returnedRow.returned_qty;
      if (retItem.quantityScale4 > maxReturnable) {
        throw new Error(
          `Cannot return ${retItem.quantityScale4 / 10000} of '${origItem.product_name}'. ` +
          `Only ${maxReturnable / 10000} remaining returnable.`
        );
      }

      const unitPrice = origItem.unit_price_minor;
      const rawQty = retItem.quantityScale4 / 10000;
      const lineRefund = Math.round(unitPrice * rawQty);
      const taxRefund = origItem.tax_rate_bps > 0 ? Math.round((lineRefund * origItem.tax_rate_bps) / 10000) : 0;
      const itemTotalRefund = lineRefund + taxRefund;

      totalRefundMinor += itemTotalRefund;

      preparedItems.push({
        origItem,
        retItem,
        lineRefund,
        taxRefund,
        itemTotalRefund,
      });
    }

    // 2. Insert master return record FIRST so foreign keys are satisfied
    db.prepare(`
      INSERT INTO returns (
        id, return_number, original_sale_id, return_date, cashier_id,
        customer_id, total_refund_minor, refund_method, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      returnId,
      returnNumber,
      req.originalSaleId,
      now,
      session.userId,
      sale.customerId || null,
      totalRefundMinor,
      req.refundMethod,
      req.reason,
      now
    );

    // 3. Insert return line items and adjust stock
    for (const { origItem, retItem, taxRefund, itemTotalRefund } of preparedItems) {
      const returnItemId = `rti_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO return_items (
          id, return_id, original_sale_item_id, product_id, variant_id,
          quantity_scale4, unit_price_minor, tax_refund_minor, total_refund_minor,
          disposition, serial_numbers_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        returnItemId,
        returnId,
        retItem.originalSaleItemId,
        origItem.product_id,
        origItem.variant_id || null,
        retItem.quantityScale4,
        origItem.unit_price_minor,
        taxRefund,
        itemTotalRefund,
        retItem.disposition,
        retItem.serialNumber ? JSON.stringify({ serial: retItem.serialNumber }) : null
      );

      // Handle stock and serial restoration
      if (retItem.disposition === 'RESTOCK') {
        const curStock = getStockLevel(origItem.product_id, origItem.variant_id || '');
        db.prepare(`
          UPDATE stock_levels SET quantity_scale4 = ? 
          WHERE product_id = ? AND variant_id = ?
        `).run(curStock + retItem.quantityScale4, origItem.product_id, origItem.variant_id || '');

        db.prepare(`
          INSERT INTO stock_movements (
            id, timestamp, product_id, variant_id, movement_type,
            quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
          ) VALUES (?, ?, ?, ?, 'SALE_RETURN_RESTOCK', ?, ?, ?, 'RETURN', ?, ?)
        `).run(
          `mov_${crypto.randomUUID()}`,
          now,
          origItem.product_id,
          origItem.variant_id || '',
          retItem.quantityScale4,
          origItem.unit_cost_minor,
          returnId,
          `Return ${returnNumber}`,
          session.userId
        );

        if (retItem.serialNumber) {
          db.prepare(`
            UPDATE inventory_items SET status = 'AVAILABLE', sold_at_sale_id = NULL
            WHERE product_id = ? AND serial_number = ?
          `).run(origItem.product_id, retItem.serialNumber);
        }
      } else {
        // Damaged quarantine
        db.prepare(`
          INSERT INTO stock_movements (
            id, timestamp, product_id, variant_id, movement_type,
            quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
          ) VALUES (?, ?, ?, ?, 'SALE_RETURN_DAMAGED', ?, ?, ?, 'RETURN', ?, ?)
        `).run(
          `mov_${crypto.randomUUID()}`,
          now,
          origItem.product_id,
          origItem.variant_id || '',
          retItem.quantityScale4,
          origItem.unit_cost_minor,
          returnId,
          `Damaged Return ${returnNumber}`,
          session.userId
        );

        if (retItem.serialNumber) {
          db.prepare(`
            UPDATE inventory_items SET status = 'RETURNED_QUARANTINE'
            WHERE product_id = ? AND serial_number = ?
          `).run(origItem.product_id, retItem.serialNumber);
        }
      }
    }

    // 4. If customer credit note, credit the customer ledger
    if (req.refundMethod === 'CREDIT_NOTE' && sale.customerId) {
      const curBal = db.prepare(`
        SELECT COALESCE(SUM(debit_minor - credit_minor), 0) as bal
        FROM customer_transactions WHERE customer_id = ?
      `).get(sale.customerId) as any;

      db.prepare(`
        INSERT INTO customer_transactions (
          id, timestamp, customer_id, transaction_type, reference_id, reference_number,
          debit_minor, credit_minor, running_balance_minor, notes, user_id
        ) VALUES (?, ?, ?, 'RETURN_CREDIT', ?, ?, 0, ?, ?, ?, ?)
      `).run(
        `ctx_${crypto.randomUUID()}`,
        now,
        sale.customerId,
        returnId,
        returnNumber,
        totalRefundMinor,
        curBal.bal - totalRefundMinor,
        `Credit note for Return ${returnNumber}`,
        session.userId
      );
    }
  })();

  return { returnId, returnNumber, totalRefundMinor };
}
