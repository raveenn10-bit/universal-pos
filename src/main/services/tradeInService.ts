// Harsh Apex Universal POS - Phone & Electronics Trade-In Engine
import crypto from 'node:crypto';
import { getDb } from './db';
import { UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export interface TradeInItem {
  id: string;
  tradeInNumber: string;
  customerName: string;
  customerPhone: string;
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  imei1: string;
  imei2?: string;
  batteryHealth: number;
  physicalGrade: 'Grade A' | 'Grade B' | 'Grade C' | 'Grade D';
  screenCondition?: string;
  backGlassCondition?: string;
  baseGuidePriceMinor: number;
  suggestedValueMinor: number;
  deductions: { key: string; label: string; amountMinor: number; reason: string }[];
  finalApprovedValueMinor: number;
  status: 'RECEIVED' | 'INSPECTION' | 'REPAIR_PREPARATION' | 'READY_FOR_SALE' | 'SOLD' | 'CANCELLED';
  acquisitionCostMinor: number;
  refurbishmentCostMinor: number;
  trueCostMinor: number;
  staffNotes?: string;
  createdAt: string;
}

export function listTradeIns(search?: string, status?: string): TradeInItem[] {
  const db = getDb();
  let sql = 'SELECT * FROM trade_ins WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'ALL') {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ' AND (LOWER(trade_in_number) LIKE ? OR LOWER(customer_name) LIKE ? OR customer_phone LIKE ? OR LOWER(model) LIKE ? OR LOWER(imei1) LIKE ?)';
    params.push(term, term, term, term, term);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    tradeInNumber: r.trade_in_number,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    brand: r.brand,
    model: r.model,
    storage: r.storage || undefined,
    color: r.color || undefined,
    imei1: r.imei1,
    imei2: r.imei2 || undefined,
    batteryHealth: r.battery_health,
    physicalGrade: r.physical_grade,
    screenCondition: r.screen_condition || undefined,
    backGlassCondition: r.back_glass_condition || undefined,
    baseGuidePriceMinor: r.base_guide_price_minor,
    suggestedValueMinor: r.suggested_value_minor,
    deductions: r.deductions_json ? JSON.parse(r.deductions_json) : [],
    finalApprovedValueMinor: r.final_approved_value_minor,
    status: r.status,
    acquisitionCostMinor: r.acquisition_cost_minor,
    refurbishmentCostMinor: r.refurbishment_cost_minor,
    trueCostMinor: r.true_cost_minor,
    staffNotes: r.staff_notes || undefined,
    createdAt: r.created_at,
  }));
}

export function createTradeIn(payload: {
  customerName: string;
  customerPhone: string;
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  imei1: string;
  imei2?: string;
  batteryHealth?: number;
  physicalGrade: 'Grade A' | 'Grade B' | 'Grade C' | 'Grade D';
  screenCondition?: string;
  backGlassCondition?: string;
  baseGuidePriceMinor: number;
  suggestedValueMinor: number;
  deductions?: { key: string; label: string; amountMinor: number; reason: string }[];
  finalApprovedValueMinor: number;
  refurbishmentCostMinor?: number;
  staffNotes?: string;
}, session: UserSession): TradeInItem {
  assertPermission(session, 'tradein.manage');
  const db = getDb();
  const id = `ti_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const tradeInNumber = `TI-${Date.now().toString().slice(-6)}`;

  const finalVal = payload.finalApprovedValueMinor;
  const refurb = payload.refurbishmentCostMinor || 0;
  const trueCost = finalVal + refurb;

  db.prepare(`
    INSERT INTO trade_ins (
      id, trade_in_number, customer_name, customer_phone, brand, model,
      storage, color, imei1, imei2, battery_health, physical_grade,
      screen_condition, back_glass_condition, base_guide_price_minor,
      suggested_value_minor, deductions_json, final_approved_value_minor,
      status, acquisition_cost_minor, refurbishment_cost_minor, true_cost_minor,
      staff_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?)
  `).run(
    id,
    tradeInNumber,
    payload.customerName.trim(),
    payload.customerPhone.trim(),
    payload.brand.trim(),
    payload.model.trim(),
    payload.storage?.trim() || '128GB',
    payload.color?.trim() || 'Black',
    payload.imei1.trim(),
    payload.imei2?.trim() || null,
    payload.batteryHealth !== undefined ? payload.batteryHealth : 100,
    payload.physicalGrade || 'Grade A',
    payload.screenCondition?.trim() || 'Flawless',
    payload.backGlassCondition?.trim() || 'Perfect',
    payload.baseGuidePriceMinor,
    payload.suggestedValueMinor,
    JSON.stringify(payload.deductions || []),
    finalVal,
    finalVal,
    refurb,
    trueCost,
    payload.staffNotes?.trim() || null,
    now
  );

  return {
    id,
    tradeInNumber,
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    brand: payload.brand.trim(),
    model: payload.model.trim(),
    storage: payload.storage?.trim() || '128GB',
    color: payload.color?.trim() || 'Black',
    imei1: payload.imei1.trim(),
    imei2: payload.imei2?.trim(),
    batteryHealth: payload.batteryHealth !== undefined ? payload.batteryHealth : 100,
    physicalGrade: payload.physicalGrade || 'Grade A',
    screenCondition: payload.screenCondition?.trim(),
    backGlassCondition: payload.backGlassCondition?.trim(),
    baseGuidePriceMinor: payload.baseGuidePriceMinor,
    suggestedValueMinor: payload.suggestedValueMinor,
    deductions: payload.deductions || [],
    finalApprovedValueMinor: finalVal,
    status: 'RECEIVED',
    acquisitionCostMinor: finalVal,
    refurbishmentCostMinor: refurb,
    trueCostMinor: trueCost,
    staffNotes: payload.staffNotes?.trim(),
    createdAt: now,
  };
}

export function updateTradeInStatus(
  tradeInId: string,
  status: 'RECEIVED' | 'INSPECTION' | 'REPAIR_PREPARATION' | 'READY_FOR_SALE' | 'SOLD' | 'CANCELLED',
  session: UserSession
): boolean {
  assertPermission(session, 'tradein.manage');
  const db = getDb();
  db.prepare('UPDATE trade_ins SET status = ? WHERE id = ?').run(status, tradeInId);
  return true;
}

export function convertTradeInToInventory(tradeInId: string, session: UserSession): { productId: string; itemId: string } {
  assertPermission(session, 'tradein.manage');
  const db = getDb();
  const ti = db.prepare('SELECT * FROM trade_ins WHERE id = ?').get(tradeInId) as any;
  if (!ti) throw new Error('Trade-in record not found.');

  // Find or create Pre-Owned product for this model
  const productName = `Pre-Owned ${ti.brand} ${ti.model} (${ti.storage || '128GB'}) [${ti.physical_grade}]`;
  let prod = db.prepare('SELECT * FROM products WHERE name = ?').get(productName) as any;
  const now = new Date().toISOString();

  if (!prod) {
    const prodId = `prod_po_${crypto.randomUUID()}`;
    const code = `PO-${Date.now().toString().slice(-6)}`;
    const sku = `SKU-PO-${Date.now().toString().slice(-6)}`;
    const barcode = `BAR-PO-${Date.now().toString().slice(-6)}`;
    const retailPriceMinor = Math.round(ti.true_cost_minor * 1.25); // 25% markup default

    db.prepare(`
      INSERT INTO products (
        id, code, sku, barcode, name, description, product_type, unit_of_measure,
        cost_price_minor, retail_price_minor, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'Pre-owned trade-in unit', 'SERIALIZED', 'PCS', ?, ?, 1, ?, ?)
    `).run(prodId, code, sku, barcode, productName, ti.true_cost_minor, retailPriceMinor, now, now);

    // Initial stock level
    db.prepare(`
      INSERT OR IGNORE INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, '', 0)
    `).run(prodId);

    prod = { id: prodId };
  }

  // Insert serialized inventory item
  const itemId = `inv_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO inventory_items (
      id, product_id, variant_id, imei_1, imei_2, condition,
      warranty_months, status, acquisition_cost_minor, intake_date
    ) VALUES (?, ?, '', ?, ?, ?, 6, 'AVAILABLE', ?, ?)
  `).run(itemId, prod.id, ti.imei1, ti.imei2 || null, ti.physical_grade === 'Grade A' ? 'REFURBISHED' : 'USED', ti.true_cost_minor, now);

  // Increase stock level
  db.prepare(`
    UPDATE stock_levels SET quantity_scale4 = quantity_scale4 + 10000 WHERE product_id = ?
  `).run(prod.id);

  // Update trade-in status to READY_FOR_SALE
  db.prepare("UPDATE trade_ins SET status = 'READY_FOR_SALE' WHERE id = ?").run(tradeInId);

  return { productId: prod.id, itemId };
}
