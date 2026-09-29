// Harsh Apex Universal POS - Catalog, Products & Variants Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { Product, ProductVariant, UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export function searchProducts(query: string = '', categoryId?: string, limit: number = 50): Product[] {
  const db = getDb();
  const cleanQuery = query.trim();
  let sql = `
    SELECT 
      p.*,
      c.name as category_name,
      b.name as brand_name,
      COALESCE(sl.quantity_scale4, 0) as current_stock_scale4
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id AND sl.variant_id = ''
    WHERE p.is_active = 1
  `;
  const params: any[] = [];

  if (categoryId) {
    sql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }

  if (cleanQuery) {
    // Preserve leading zeros by checking exact barcode or SKU first, then substring match
    sql += ` AND (p.barcode = ? OR p.sku = ? OR p.code = ? OR p.name LIKE ?)`;
    params.push(cleanQuery, cleanQuery, cleanQuery, `%${cleanQuery}%`);
  }

  sql += ` ORDER BY p.name ASC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(formatProductRow);
}

export function getProductByBarcode(barcode: string): Product | null {
  const db = getDb();
  const cleanBarcode = barcode.trim();
  
  // 1. Direct product match
  const row = db.prepare(`
    SELECT 
      p.*,
      c.name as category_name,
      b.name as brand_name,
      COALESCE(sl.quantity_scale4, 0) as current_stock_scale4
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id AND sl.variant_id = ''
    WHERE (p.barcode = ? OR p.sku = ? OR p.code = ?) AND p.is_active = 1
    LIMIT 1
  `).get(cleanBarcode, cleanBarcode, cleanBarcode) as any;

  if (row) {
    return formatProductRow(row);
  }

  // 2. Check product variant barcode
  const variantRow = db.prepare(`
    SELECT 
      v.*,
      p.name as parent_name,
      p.category_id,
      p.brand_id,
      p.tax_rate_bps,
      p.is_tax_inclusive,
      p.unit_of_measure,
      c.name as category_name,
      b.name as brand_name,
      COALESCE(sl.quantity_scale4, 0) as current_stock_scale4
    FROM product_variants v
    JOIN products p ON v.parent_product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id AND sl.variant_id = v.id
    WHERE (v.barcode = ? OR v.sku = ?) AND v.is_active = 1 AND p.is_active = 1
    LIMIT 1
  `).get(cleanBarcode, cleanBarcode) as any;

  if (variantRow) {
    return {
      id: variantRow.parent_product_id,
      code: variantRow.sku,
      sku: variantRow.sku,
      barcode: variantRow.barcode,
      name: `${variantRow.parent_name} - ${variantRow.variant_name}`,
      productType: 'VARIANT_PARENT',
      unitOfMeasure: variantRow.unit_of_measure,
      costPriceMinor: variantRow.cost_price_minor,
      retailPriceMinor: variantRow.retail_price_minor,
      taxRateBps: variantRow.tax_rate_bps,
      isTaxInclusive: variantRow.is_tax_inclusive === 1,
      trackInventory: true,
      reorderLevel: 5,
      currentStockScale4: variantRow.current_stock_scale4,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
  }

  return null;
}

export function createProduct(payload: Partial<Product>, session: UserSession): Product {
  assertPermission(session, 'catalog.manage_products');
  const db = getDb();

  const id = `prd_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const code = (payload.code || `PRD-${Date.now().toString().slice(-6)}`).trim();
  const sku = (payload.sku || code).trim();
  const barcode = (payload.barcode || sku).trim();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO products (
        id, code, sku, barcode, name, description, category_id, brand_id,
        product_type, unit_of_measure, cost_price_minor, retail_price_minor,
        wholesale_price_minor, min_price_minor, tax_rate_bps, is_tax_inclusive,
        track_inventory, reorder_level, image_path, custom_fields_json, is_active,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, 1,
        ?, ?
      )
    `).run(
      id,
      code,
      sku,
      barcode,
      payload.name!.trim(),
      payload.description || '',
      payload.categoryId || null,
      payload.brandId || null,
      payload.productType || 'STANDARD',
      payload.unitOfMeasure || 'PCS',
      payload.costPriceMinor || 0,
      payload.retailPriceMinor || 0,
      payload.wholesalePriceMinor || null,
      payload.minPriceMinor || null,
      payload.taxRateBps || 0,
      payload.isTaxInclusive ? 1 : 0,
      payload.trackInventory !== false ? 1 : 0,
      payload.reorderLevel || 5,
      payload.imagePath || null,
      payload.customFields ? JSON.stringify(payload.customFields) : null,
      now,
      now
    );

    // Initialize stock level record
    const initialQtyScale4 = payload.currentStockScale4 || 0;
    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, '', ?)
    `).run(id, initialQtyScale4);

    if (initialQtyScale4 > 0) {
      db.prepare(`
        INSERT INTO stock_movements (id, timestamp, product_id, variant_id, movement_type, quantity_scale4, unit_cost_minor, notes, user_id)
        VALUES (?, ?, ?, '', 'ADJUSTMENT_ADD', ?, ?, 'Initial opening stock', ?)
      `).run(`mov_${crypto.randomUUID()}`, now, id, initialQtyScale4, payload.costPriceMinor || 0, session.userId);
    }
  })();

  return getProductByBarcode(barcode)!;
}

export function createProductVariant(
  parentProductId: string,
  variant: {
    variantName: string;
    sku: string;
    barcode: string;
    attributeValues: Record<string, string>;
    costPriceMinor: number;
    retailPriceMinor: number;
    initialStockScale4?: number;
  },
  session: UserSession
): ProductVariant {
  assertPermission(session, 'catalog.manage_products');
  const db = getDb();
  const id = `var_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO product_variants (
        id, parent_product_id, sku, barcode, variant_name, attribute_values_json,
        cost_price_minor, retail_price_minor, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      parentProductId,
      variant.sku.trim(),
      variant.barcode.trim(),
      variant.variantName.trim(),
      JSON.stringify(variant.attributeValues),
      variant.costPriceMinor,
      variant.retailPriceMinor
    );

    const initialStock = variant.initialStockScale4 || 0;
    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, ?, ?)
    `).run(parentProductId, id, initialStock);

    if (initialStock > 0) {
      db.prepare(`
        INSERT INTO stock_movements (id, timestamp, product_id, variant_id, movement_type, quantity_scale4, unit_cost_minor, notes, user_id)
        VALUES (?, ?, ?, ?, 'ADJUSTMENT_ADD', ?, ?, 'Initial variant stock', ?)
      `).run(`mov_${crypto.randomUUID()}`, now, parentProductId, id, initialStock, variant.costPriceMinor, session.userId);
    }
  })();

  return {
    id,
    parentProductId,
    sku: variant.sku,
    barcode: variant.barcode,
    variantName: variant.variantName,
    attributeValues: variant.attributeValues,
    costPriceMinor: variant.costPriceMinor,
    retailPriceMinor: variant.retailPriceMinor,
    currentStockScale4: variant.initialStockScale4 || 0,
    isActive: true,
  };
}

function formatProductRow(r: any): Product {
  return {
    id: r.id,
    code: r.code,
    sku: r.sku,
    barcode: r.barcode,
    name: r.name,
    description: r.description,
    categoryId: r.category_id,
    categoryName: r.category_name,
    brandId: r.brand_id,
    brandName: r.brand_name,
    productType: r.product_type,
    unitOfMeasure: r.unit_of_measure,
    costPriceMinor: r.cost_price_minor,
    retailPriceMinor: r.retail_price_minor,
    wholesalePriceMinor: r.wholesale_price_minor,
    minPriceMinor: r.min_price_minor,
    taxRateBps: r.tax_rate_bps,
    isTaxInclusive: r.is_tax_inclusive === 1,
    trackInventory: r.track_inventory === 1,
    reorderLevel: r.reorder_level,
    currentStockScale4: r.current_stock_scale4 || 0,
    imagePath: r.image_path,
    customFields: r.custom_fields_json ? JSON.parse(r.custom_fields_json) : undefined,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
