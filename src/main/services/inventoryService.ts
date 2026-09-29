// Harsh Apex Universal POS - Inventory, Serial/IMEI & Batch Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { SerializedItem, BatchItem, UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export function getStockLevel(productId: string, variantId: string = ''): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT quantity_scale4 
    FROM stock_levels 
    WHERE product_id = ? AND variant_id = ?
  `).get(productId, variantId) as { quantity_scale4: number } | undefined;
  return row ? row.quantity_scale4 : 0;
}

export function adjustStock(
  productId: string,
  variantId: string = '',
  deltaScale4: number,
  unitCostMinor: number,
  reason: string,
  session: UserSession
): number {
  assertPermission(session, 'catalog.adjust_stock');
  const db = getDb();
  const now = new Date().toISOString();

  let newStockScale4 = 0;

  db.transaction(() => {
    const current = getStockLevel(productId, variantId);
    newStockScale4 = current + deltaScale4;

    // Block negative stock
    if (newStockScale4 < 0) {
      throw new Error(`Insufficient stock. Current on-hand is ${current / 10000}, adjustment would result in ${newStockScale4 / 10000}.`);
    }

    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id, variant_id) DO UPDATE SET
        quantity_scale4 = excluded.quantity_scale4
    `).run(productId, variantId, newStockScale4);

    const movementType = deltaScale4 >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REDUCE';
    db.prepare(`
      INSERT INTO stock_movements (
        id, timestamp, product_id, variant_id, movement_type,
        quantity_scale4, unit_cost_minor, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `mov_${crypto.randomUUID()}`,
      now,
      productId,
      variantId,
      movementType,
      Math.abs(deltaScale4),
      unitCostMinor,
      reason,
      session.userId
    );
  })();

  return newStockScale4;
}

export function registerSerializedItem(
  item: {
    productId: string;
    variantId?: string;
    serialNumber?: string;
    imei1?: string;
    imei2?: string;
    condition?: 'NEW' | 'USED' | 'REFURBISHED';
    warrantyMonths?: number;
    acquisitionCostMinor: number;
  },
  session: UserSession
): SerializedItem {
  assertPermission(session, 'catalog.manage_products');
  const db = getDb();
  const id = `srl_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Validate that at least one identifier is present
  const cleanSerial = item.serialNumber?.trim() || null;
  const cleanImei1 = item.imei1?.trim() || null;
  const cleanImei2 = item.imei2?.trim() || null;

  if (!cleanSerial && !cleanImei1) {
    throw new Error('Either Serial Number or IMEI 1 must be provided.');
  }

  // Check uniqueness constraints explicitly with clean error messaging
  if (cleanSerial) {
    const existing = db.prepare('SELECT id, status FROM inventory_items WHERE serial_number = ?').get(cleanSerial) as any;
    if (existing) {
      throw new Error(`Serial number '${cleanSerial}' already exists in inventory (Status: ${existing.status}).`);
    }
  }

  if (cleanImei1) {
    const existing = db.prepare('SELECT id, status FROM inventory_items WHERE imei_1 = ? OR imei_2 = ?').get(cleanImei1, cleanImei1) as any;
    if (existing) {
      throw new Error(`IMEI '${cleanImei1}' already exists in inventory.`);
    }
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO inventory_items (
        id, product_id, variant_id, serial_number, imei_1, imei_2,
        condition, warranty_months, status, acquisition_cost_minor,
        intake_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)
    `).run(
      id,
      item.productId,
      item.variantId || null,
      cleanSerial,
      cleanImei1,
      cleanImei2,
      item.condition || 'NEW',
      item.warrantyMonths || 12,
      item.acquisitionCostMinor,
      now
    );

    // Increase product stock count by 1 unit (10000 in scale 4)
    const current = getStockLevel(item.productId, item.variantId || '');
    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id, variant_id) DO UPDATE SET
        quantity_scale4 = excluded.quantity_scale4
    `).run(item.productId, item.variantId || '', current + 10000);

    db.prepare(`
      INSERT INTO stock_movements (
        id, timestamp, product_id, variant_id, movement_type,
        quantity_scale4, unit_cost_minor, reference_id, notes, user_id
      ) VALUES (?, ?, ?, ?, 'PURCHASE_INTAKE', 10000, ?, ?, 'Serialized unit intake', ?)
    `).run(
      `mov_${crypto.randomUUID()}`,
      now,
      item.productId,
      item.variantId || '',
      item.acquisitionCostMinor,
      id,
      session.userId
    );
  })();

  return {
    id,
    productId: item.productId,
    variantId: item.variantId,
    serialNumber: cleanSerial || undefined,
    imei1: cleanImei1 || undefined,
    imei2: cleanImei2 || undefined,
    condition: item.condition || 'NEW',
    warrantyMonths: item.warrantyMonths || 12,
    status: 'AVAILABLE',
    acquisitionCostMinor: item.acquisitionCostMinor,
    intakeDate: now,
  };
}

export function getAvailableSerials(productId: string): SerializedItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM inventory_items 
    WHERE product_id = ? AND status = 'AVAILABLE'
    ORDER BY intake_date ASC
  `).all(productId) as any[];

  return rows.map(r => ({
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id,
    serialNumber: r.serial_number,
    imei1: r.imei_1,
    imei2: r.imei_2,
    condition: r.condition,
    warrantyMonths: r.warranty_months,
    status: r.status,
    acquisitionCostMinor: r.acquisition_cost_minor,
    intakeDate: r.intake_date,
    soldAtSaleId: r.sold_at_sale_id,
  }));
}

export function registerBatch(
  batch: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantityScale4: number;
    costPriceMinor: number;
  },
  session: UserSession
): BatchItem {
  assertPermission(session, 'catalog.manage_products');
  const db = getDb();
  const id = `btc_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO inventory_batches (
        id, product_id, batch_number, expiry_date, quantity_scale4, cost_price_minor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      batch.productId,
      batch.batchNumber.trim(),
      batch.expiryDate,
      batch.quantityScale4,
      batch.costPriceMinor,
      now
    );

    const current = getStockLevel(batch.productId);
    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, '', ?)
      ON CONFLICT(product_id, variant_id) DO UPDATE SET
        quantity_scale4 = excluded.quantity_scale4
    `).run(batch.productId, current + batch.quantityScale4);
  })();

  return {
    id,
    productId: batch.productId,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate,
    quantityScale4: batch.quantityScale4,
    costPriceMinor: batch.costPriceMinor,
    createdAt: now,
  };
}
