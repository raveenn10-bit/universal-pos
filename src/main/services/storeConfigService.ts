// Harsh Apex Universal POS - Store Configuration & 1-Time Developer Provisioning Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { assertPermission, registerActiveSession } from './authService';
import { hashPassword, generateSessionToken } from '../crypto/hasher';
import { BusinessProfileConfig, BusinessProfileType, UserSession } from '../../shared/types';
import { DEFAULT_BUSINESS_PROFILES } from '../../shared/constants';

export interface StoreBranding {
  isProvisioned: boolean;
  businessType: BusinessProfileType;
  businessName: string;
  appName: string;
  appLogo: string;
  businessLogo: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
}

export interface InitialProvisioningPayload {
  businessType: BusinessProfileType;
  businessName: string;
  appName: string;
  appLogo?: string;
  businessLogo?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerPassword: string;
  ownerPin?: string;
}

export function isStoreProvisioned(): boolean {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM app_meta WHERE key = 'is_provisioned'").get() as any;
    return Boolean(row && row.value === 'true');
  } catch {
    return false;
  }
}

export function getStoreBranding(): StoreBranding {
  const db = getDb();
  const getMeta = (k: string, defaultVal: string = '') => {
    try {
      const r = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(k) as any;
      return r ? r.value : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const provisioned = getMeta('is_provisioned', 'false') === 'true';
  const businessType = (getMeta('business_type', 'GENERAL_RETAIL') as BusinessProfileType) || 'GENERAL_RETAIL';
  const businessName = getMeta('business_name', 'Harsh Apex Retail Store');
  const appName = getMeta('app_name', 'Harsh Apex Universal POS');
  const appLogo = getMeta('app_logo', '');
  const businessLogo = getMeta('business_logo', '');
  const phone = getMeta('phone', '+94 11 234 5678');
  const email = getMeta('email', 'info@harshapex.lk');
  const address = getMeta('address', 'Colombo, Sri Lanka');
  const taxId = getMeta('tax_id', '');

  return {
    isProvisioned: provisioned,
    businessType,
    businessName,
    appName,
    appLogo,
    businessLogo,
    phone,
    email,
    address,
    taxId,
  };
}

export function completeDeveloperProvisioning(payload: InitialProvisioningPayload): {
  success: boolean;
  message: string;
  session: UserSession;
  profileConfig: BusinessProfileConfig;
  branding: StoreBranding;
} {
  const db = getDb();

  // Strict 1-Time Rule: If already provisioned, block any re-provisioning
  if (isStoreProvisioned()) {
    throw new Error('This terminal is already provisioned and locked to its licensed business profile. Profile conversion requires an authorized developer cryptographic upgrade package.');
  }

  const baseProfile = DEFAULT_BUSINESS_PROFILES[payload.businessType];
  if (!baseProfile) {
    throw new Error(`Unsupported business type: ${payload.businessType}`);
  }

  const now = new Date().toISOString();
  let ownerSession: UserSession;

  db.transaction(() => {
    // 1. Set app_meta entries
    const setMeta = (k: string, v: string) => {
      db.prepare(`
        INSERT INTO app_meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(k, v);
    };

    setMeta('is_provisioned', 'true');
    setMeta('provisioned_at', now);
    setMeta('business_type', payload.businessType);
    setMeta('business_name', payload.businessName.trim());
    setMeta('app_name', payload.appName.trim());
    setMeta('app_logo', payload.appLogo || '');
    setMeta('business_logo', payload.businessLogo || '');
    setMeta('phone', payload.phone?.trim() || '');
    setMeta('email', payload.email?.trim() || '');
    setMeta('address', payload.address?.trim() || '');
    setMeta('tax_id', payload.taxId?.trim() || '');

    // 2. Configure active business profile config
    db.prepare(`
      INSERT INTO business_profile_config (id, profile_type, config_json, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        profile_type = excluded.profile_type,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).run(payload.businessType, JSON.stringify(baseProfile), now);

    // 3. Create or update the shop owner (admin) account
    const cleanUsername = payload.ownerUsername.trim().toLowerCase();
    const fullName = payload.ownerFullName.trim();
    const passwordHash = hashPassword(payload.ownerPassword);
    const pinHash = payload.ownerPin ? hashPassword(payload.ownerPin) : hashPassword('2003');
    const ownerUserId = `usr_${crypto.randomUUID()}`;

    // Deactivate previous owner if any
    db.prepare("DELETE FROM users WHERE role = 'owner'").run();

    db.prepare(`
      INSERT INTO users (id, username, full_name, role, password_hash, pin_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', ?, ?, 1, ?, ?)
    `).run(ownerUserId, cleanUsername, fullName, passwordHash, pinHash, now, now);

    // 4. Update document templates with business branding
    const templates = db.prepare('SELECT id, config_json FROM document_templates').all() as any[];
    for (const tpl of templates) {
      try {
        const cfg = JSON.parse(tpl.config_json);
        cfg.businessName = payload.businessName.trim();
        cfg.phone = payload.phone?.trim() || cfg.phone;
        cfg.email = payload.email?.trim() || cfg.email;
        cfg.address = payload.address?.trim() || cfg.address;
        cfg.taxNumber = payload.taxId?.trim() || cfg.taxNumber;
        if (payload.businessLogo) {
          cfg.logoBase64 = payload.businessLogo;
        }
        db.prepare('UPDATE document_templates SET config_json = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(cfg),
          now,
          tpl.id
        );
      } catch (_) {}
    }

    // 5. Seed industry-specific sample catalog if catalog is currently empty
    seedIndustryCatalog(payload.businessType, db);

    // 6. Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, 'DEVELOPER', 'INITIAL_PROVISIONING_LOCKED', 'STORE_CONFIG', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      payload.businessType,
      JSON.stringify({
        businessName: payload.businessName,
        appName: payload.appName,
        businessType: payload.businessType,
        ownerUsername: cleanUsername,
      })
    );

    // Generate session
    const token = generateSessionToken();
    ownerSession = {
      userId: ownerUserId,
      username: cleanUsername,
      fullName,
      role: 'owner',
      token,
      permissions: ['*'],
    };
    registerActiveSession(ownerSession);
  })();

  const branding = getStoreBranding();

  return {
    success: true,
    message: `Successfully provisioned and permanently locked ${branding.businessName} for profile ${baseProfile.displayName}.`,
    session: ownerSession!,
    profileConfig: baseProfile,
    branding,
  };
}

export function updateStoreBranding(
  data: Partial<StoreBranding>,
  session: UserSession
): StoreBranding {
  assertPermission(session, 'settings.manage');
  const db = getDb();
  const now = new Date().toISOString();

  const setMeta = (k: string, v: string) => {
    db.prepare(`
      INSERT INTO app_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(k, v);
  };

  db.transaction(() => {
    if (data.businessName !== undefined) setMeta('business_name', data.businessName.trim());
    if (data.appName !== undefined) setMeta('app_name', data.appName.trim());
    if (data.appLogo !== undefined) setMeta('app_logo', data.appLogo);
    if (data.businessLogo !== undefined) setMeta('business_logo', data.businessLogo);
    if (data.phone !== undefined) setMeta('phone', data.phone.trim());
    if (data.email !== undefined) setMeta('email', data.email.trim());
    if (data.address !== undefined) setMeta('address', data.address.trim());
    if (data.taxId !== undefined) setMeta('tax_id', data.taxId.trim());

    // Update templates
    const templates = db.prepare('SELECT id, config_json FROM document_templates').all() as any[];
    for (const tpl of templates) {
      try {
        const cfg = JSON.parse(tpl.config_json);
        if (data.businessName !== undefined) cfg.businessName = data.businessName.trim();
        if (data.phone !== undefined) cfg.phone = data.phone.trim();
        if (data.email !== undefined) cfg.email = data.email.trim();
        if (data.address !== undefined) cfg.address = data.address.trim();
        if (data.taxId !== undefined) cfg.taxNumber = data.taxId.trim();
        if (data.businessLogo !== undefined) cfg.logoBase64 = data.businessLogo;
        db.prepare('UPDATE document_templates SET config_json = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(cfg),
          now,
          tpl.id
        );
      } catch (_) {}
    }
  })();

  return getStoreBranding();
}

function seedIndustryCatalog(profileType: BusinessProfileType, db: any) {
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (prodCount.count > 0) return; // Don't overwrite existing products

  const now = new Date().toISOString();

  const insertCategory = (id: string, name: string) => {
    db.prepare(`
      INSERT INTO categories (id, name, is_active) VALUES (?, ?, 1)
      ON CONFLICT(id) DO NOTHING
    `).run(id, name);
  };

  const insertProduct = (p: {
    id: string;
    code: string;
    sku: string;
    barcode: string;
    name: string;
    categoryId: string;
    costMinor: number;
    retailMinor: number;
    taxRateBps?: number;
    unit?: string;
    stock: number;
    serials?: { serial?: string; imei1?: string; imei2?: string; warranty?: number }[];
    batch?: { number: string; expiry: string };
  }) => {
    db.prepare(`
      INSERT INTO products (
        id, code, sku, barcode, name, category_id, cost_price_minor, retail_price_minor,
        tax_rate_bps, unit_of_measure, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      p.id, p.code, p.sku, p.barcode, p.name, p.categoryId,
      p.costMinor, p.retailMinor, p.taxRateBps || 0, p.unit || 'PCS', now, now
    );

    // Initial stock
    db.prepare(`
      INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
      VALUES (?, '', ?)
      ON CONFLICT(product_id, variant_id) DO UPDATE SET quantity_scale4 = excluded.quantity_scale4
    `).run(p.id, p.stock * 10000);

    // Initial Serials/IMEIs
    if (p.serials) {
      for (const s of p.serials) {
        db.prepare(`
          INSERT INTO inventory_items (
            id, product_id, serial_number, imei_1, imei_2, condition, warranty_months, status, acquisition_cost_minor, intake_date
          ) VALUES (?, ?, ?, ?, ?, 'NEW', ?, 'AVAILABLE', ?, ?)
        `).run(
          `inv_${crypto.randomUUID()}`, p.id, s.serial || null, s.imei1 || null, s.imei2 || null,
          s.warranty || 12, p.costMinor, now
        );
      }
    }

    // Initial Batch
    if (p.batch) {
      db.prepare(`
        INSERT INTO inventory_batches (id, product_id, batch_number, expiry_date, quantity_scale4, cost_price_minor, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`bat_${crypto.randomUUID()}`, p.id, p.batch.number, p.batch.expiry, p.stock * 10000, p.costMinor, now);
    }
  };

  if (profileType === 'MOBILE_PHONES') {
    insertCategory('cat_iphones', 'iPhones & Apple Devices');
    insertCategory('cat_samsung', 'Samsung Galaxy Series');
    insertCategory('cat_accessories', 'Genuine Accessories');

    insertProduct({
      id: 'prod_ip15pm',
      code: 'DEV-IP15PM-256',
      sku: 'IPHONE-15PM-NT',
      barcode: '195949012345',
      name: 'iPhone 15 Pro Max 256GB Natural Titanium',
      categoryId: 'cat_iphones',
      costMinor: 34500000,
      retailMinor: 38900000,
      stock: 4,
      serials: [
        { imei1: '359123456789011', imei2: '359123456789012', warranty: 12 },
        { imei1: '359123456789021', imei2: '359123456789022', warranty: 12 },
        { imei1: '359123456789031', imei2: '359123456789032', warranty: 12 },
        { imei1: '359123456789041', imei2: '359123456789042', warranty: 12 },
      ]
    });

    insertProduct({
      id: 'prod_ip14p',
      code: 'DEV-IP14P-128',
      sku: 'IPHONE-14P-DP',
      barcode: '195949012399',
      name: 'iPhone 14 Pro 128GB Deep Purple (Pre-Owned)',
      categoryId: 'cat_iphones',
      costMinor: 21500000,
      retailMinor: 24900000,
      stock: 2,
      serials: [
        { imei1: '358999888777111', imei2: '358999888777112', warranty: 6 },
        { imei1: '358999888777221', imei2: '358999888777222', warranty: 6 },
      ]
    });

    insertProduct({
      id: 'prod_s24u',
      code: 'DEV-S24U-512',
      sku: 'SAMS-S24U-BLK',
      barcode: '880609123456',
      name: 'Samsung Galaxy S24 Ultra 512GB Titanium Black',
      categoryId: 'cat_samsung',
      costMinor: 33000000,
      retailMinor: 36800000,
      stock: 3,
      serials: [
        { imei1: '351234567890011', imei2: '351234567890012', warranty: 12 },
        { imei1: '351234567890021', imei2: '351234567890022', warranty: 12 },
        { imei1: '351234567890031', imei2: '351234567890032', warranty: 12 },
      ]
    });

    insertProduct({
      id: 'prod_adapter20w',
      code: 'ACC-ADP-20W',
      sku: 'APPLE-20W-USB',
      barcode: '194252157008',
      name: 'Apple 20W USB-C Power Adapter Original',
      categoryId: 'cat_accessories',
      costMinor: 650000,
      retailMinor: 950000,
      stock: 25,
    });
  } else if (profileType === 'SUPERMARKET') {
    insertCategory('cat_produce', 'Fresh Fruits & Vegetables');
    insertCategory('cat_dairy', 'Dairy, Milk & Eggs');
    insertCategory('cat_grains', 'Rice, Flour & Pantry');

    insertProduct({
      id: 'prod_apples',
      code: 'SUP-APPL-KG',
      sku: 'FRUIT-APPLE-RED',
      barcode: '200100100001',
      name: 'Fresh Crisp Red Apples (Weighted)',
      categoryId: 'cat_produce',
      costMinor: 68000,
      retailMinor: 89000,
      unit: 'KG',
      stock: 85,
    });

    insertProduct({
      id: 'prod_milk',
      code: 'SUP-MILK-1L',
      sku: 'DAIRY-MILK-1L',
      barcode: '479100123456',
      name: 'Fresh Pasteurized Whole Milk 1 Litre',
      categoryId: 'cat_dairy',
      costMinor: 41000,
      retailMinor: 49000,
      stock: 40,
      batch: { number: 'BATCH-MK-991', expiry: '2026-10-12' },
    });

    insertProduct({
      id: 'prod_rice',
      code: 'SUP-RICE-5KG',
      sku: 'GRAIN-RICE-5KG',
      barcode: '479200987654',
      name: 'Premium White Samba Rice 5kg Case',
      categoryId: 'cat_grains',
      costMinor: 115000,
      retailMinor: 135000,
      stock: 30,
      batch: { number: 'LOT-RC-404', expiry: '2027-06-30' },
    });
  } else if (profileType === 'SHOES') {
    insertCategory('cat_runners', 'Athletic & Running Shoes');
    insertCategory('cat_casual', 'Lifestyle & Casual Sneakers');

    insertProduct({
      id: 'prod_nike_peg',
      code: 'SH-NK-PEG40',
      sku: 'NIKE-PEGASUS-40',
      barcode: '091201928374',
      name: 'Nike Air Zoom Pegasus 40 (Size Matrix 39-45)',
      categoryId: 'cat_runners',
      costMinor: 2800000,
      retailMinor: 3850000,
      stock: 18,
    });

    insertProduct({
      id: 'prod_adi_boost',
      code: 'SH-AD-UB',
      sku: 'ADIDAS-ULTRA-LT',
      barcode: '091201928888',
      name: 'Adidas Ultraboost Light Core Black (Size 40-44)',
      categoryId: 'cat_runners',
      costMinor: 3100000,
      retailMinor: 4200000,
      stock: 12,
    });
  } else {
    // General Retail default
    insertCategory('cat_general', 'General Merchandise');
    insertProduct({
      id: 'prod_sample_1',
      code: 'RET-GEN-001',
      sku: 'GEN-ITEM-01',
      barcode: '100000000001',
      name: 'Universal Retail Item Pack',
      categoryId: 'cat_general',
      costMinor: 120000,
      retailMinor: 180000,
      stock: 50,
    });
  }
}
