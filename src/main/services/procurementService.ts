// Harsh Apex Universal POS - Procurement & Supplier Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { UserSession } from '../../shared/types';
import { getStockLevel } from './inventoryService';
import { assertPermission } from './authService';

export interface SupplierItem {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  productId: string;
  variantId?: string;
  quantityScale4: number;
  unitCostMinor: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

export function listSuppliers(): SupplierItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    contactPerson: r.contact_person,
    phone: r.phone,
    email: r.email,
    address: r.address,
    taxId: r.tax_id,
    isActive: r.is_active === 1,
  }));
}

export function createSupplier(data: Partial<SupplierItem>, session: UserSession): SupplierItem {
  assertPermission(session, 'procurement.manage_suppliers');
  const db = getDb();
  const id = `sup_${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, phone, email, address, tax_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    data.name!.trim(),
    data.contactPerson?.trim() || null,
    data.phone!.trim(),
    data.email?.trim() || null,
    data.address?.trim() || null,
    data.taxId?.trim() || null
  );

  return {
    id,
    name: data.name!,
    contactPerson: data.contactPerson,
    phone: data.phone!,
    email: data.email,
    address: data.address,
    taxId: data.taxId,
    isActive: true,
  };
}

export function receiveGoods(
  supplierId: string,
  items: PurchaseOrderItem[],
  notes: string = '',
  session: UserSession
): { poNumber: string; totalCostMinor: number } {
  assertPermission(session, 'procurement.manage_po');
  const db = getDb();
  const now = new Date().toISOString();
  const poId = `po_${crypto.randomUUID()}`;
  const poNumber = `PO-${Date.now().toString().slice(-8)}`;

  let totalCostMinor = 0;

  db.transaction(() => {
    // Insert PO master
    db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, status, total_cost_minor, notes, created_at)
      VALUES (?, ?, ?, ?, 'RECEIVED', 0, ?, ?)
    `).run(poId, poNumber, supplierId, now, notes, now);

    for (const item of items) {
      const rawQty = item.quantityScale4 / 10000;
      const lineCost = Math.round(item.unitCostMinor * rawQty);
      totalCostMinor += lineCost;

      // Insert PO item
      db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_order_id, product_id, variant_id, quantity_scale4,
          unit_cost_minor, line_total_minor, batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `poi_${crypto.randomUUID()}`,
        poId,
        item.productId,
        item.variantId || null,
        item.quantityScale4,
        item.unitCostMinor,
        lineCost,
        item.batchNumber || null,
        item.expiryDate || null
      );

      // Fetch current stock and cost for Weighted Average Cost (WAC) update
      const prod = db.prepare('SELECT cost_price_minor FROM products WHERE id = ?').get(item.productId) as any;
      const currentStock = getStockLevel(item.productId, item.variantId || '');
      const curStockUnits = currentStock / 10000;
      const newStockUnits = curStockUnits + rawQty;

      let newWeightedCost = item.unitCostMinor;
      if (curStockUnits > 0 && prod) {
        newWeightedCost = Math.round(((curStockUnits * prod.cost_price_minor) + (rawQty * item.unitCostMinor)) / newStockUnits);
      }

      // Update product cost
      db.prepare('UPDATE products SET cost_price_minor = ? WHERE id = ?').run(newWeightedCost, item.productId);

      // Increment on-hand stock
      db.prepare(`
        INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
        VALUES (?, ?, ?)
        ON CONFLICT(product_id, variant_id) DO UPDATE SET
          quantity_scale4 = excluded.quantity_scale4
      `).run(item.productId, item.variantId || '', currentStock + item.quantityScale4);

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, timestamp, product_id, variant_id, movement_type,
          quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id
        ) VALUES (?, ?, ?, ?, 'PURCHASE_INTAKE', ?, ?, ?, 'PO', ?, ?)
      `).run(
        `mov_${crypto.randomUUID()}`,
        now,
        item.productId,
        item.variantId || '',
        item.quantityScale4,
        item.unitCostMinor,
        poId,
        `PO ${poNumber}`,
        session.userId
      );

      // If serials provided, register serialized inventory items
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        for (const srl of item.serialNumbers) {
          db.prepare(`
            INSERT INTO inventory_items (
              id, product_id, variant_id, serial_number, condition, warranty_months,
              status, acquisition_cost_minor, intake_date
            ) VALUES (?, ?, ?, ?, 'NEW', 12, 'AVAILABLE', ?, ?)
          `).run(`srl_${crypto.randomUUID()}`, item.productId, item.variantId || null, srl.trim(), item.unitCostMinor, now);
        }
      }
    }

    // Update PO total
    db.prepare('UPDATE purchase_orders SET total_cost_minor = ? WHERE id = ?').run(totalCostMinor, poId);
  })();

  return { poNumber, totalCostMinor };
}

export function listPurchaseOrders(): any[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT po.*, s.name as supplier_name, COUNT(poi.id) as items_count
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN purchase_items poi ON po.id = poi.purchase_order_id
    GROUP BY po.id
    ORDER BY po.created_at DESC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    poNumber: r.po_number,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name || 'Authorized Supplier',
    orderDate: r.order_date,
    status: r.status,
    totalCostMinor: r.total_cost_minor,
    itemsCount: r.items_count || 1,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));
}
