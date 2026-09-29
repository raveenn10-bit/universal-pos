// Harsh Apex Universal POS - Universal SQLite Database Service (WebAssembly & Offline Durable Persistence)
import path from 'node:path';
import fs from 'node:fs';
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';

export interface ApexRunResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface ApexStatement {
  run(...params: any[]): ApexRunResult;
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export interface ApexDatabase {
  prepare(sql: string): ApexStatement;
  exec(sql: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  pragma(pragmaStr: string): any;
  backup(targetPath: string): Promise<void>;
  close(): void;
  exportBinary(): Uint8Array;
}

export interface DatabaseContext {
  db: ApexDatabase;
  dbPath: string;
}

let activeDb: ApexDatabase | null = null;
let activeDbPath: string = '';
let sqlModulePromise: Promise<any> | null = null;

function getWasmBinary(): Buffer {
  const candidates: string[] = [];
  try {
    const resolved = require.resolve('sql.js/dist/sql-wasm.wasm');
    candidates.push(resolved);
  } catch (_) {}

  candidates.push(
    path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(__dirname, '../../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  );

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return fs.readFileSync(c);
    }
  }
  throw new Error('sql-wasm.wasm not found in candidates: ' + candidates.join(', '));
}

export async function getSqlModule(): Promise<any> {
  if (!sqlModulePromise) {
    const wasmBinary = getWasmBinary();
    sqlModulePromise = initSqlJs({ wasmBinary: wasmBinary as any });
  }
  return sqlModulePromise;
}

export function getDatabasePath(customPath?: string): string {
  if (customPath) return customPath;
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? `${process.env.HOME}/Library/Application Support` : `${process.env.HOME}/.config`);
  const dataDir = path.join(appData, 'HarshApexPOS', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'pos.db');
}

function normalizeParam(v: any): SqlValue {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined || v === null) return null;
  return v;
}

function flattenParams(params: any[]): SqlValue[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0].map(normalizeParam);
  }
  return params.map(normalizeParam);
}

export async function initDatabase(dbFilePath?: string): Promise<DatabaseContext> {
  const finalPath = dbFilePath || getDatabasePath();
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await getSqlModule();
  let rawDb: SqlJsDatabase;

  if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 0) {
    const fileBuffer = fs.readFileSync(finalPath);
    rawDb = new SQL.Database(fileBuffer as any);
  } else {
    rawDb = new SQL.Database();
  }

  let inTx = false;
  let txDepth = 0;

  function flushToDisk(): void {
    if (inTx) return;
    try {
      const data = rawDb.export();
      fs.writeFileSync(finalPath, Buffer.from(data));
    } catch (err) {
      console.error('[Apex Database] Disk flush error:', err);
    }
  }

  const wrappedDb: ApexDatabase = {
    prepare(sql: string): ApexStatement {
      return {
        run(...params: any[]): ApexRunResult {
          const flat = flattenParams(params);
          rawDb.run(sql, flat);
          flushToDisk();
          let lastInsertRowid: number | undefined;
          try {
            const res = rawDb.exec('SELECT last_insert_rowid() AS id;');
            if (res.length > 0 && res[0].values.length > 0) {
              lastInsertRowid = res[0].values[0][0] as number;
            }
          } catch (_) {}
          return {
            changes: rawDb.getRowsModified(),
            lastInsertRowid,
          };
        },
        get(...params: any[]): any {
          const flat = flattenParams(params);
          const stmt = rawDb.prepare(sql);
          stmt.bind(flat);
          let row: any = undefined;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.free();
          return row;
        },
        all(...params: any[]): any[] {
          const flat = flattenParams(params);
          const stmt = rawDb.prepare(sql);
          stmt.bind(flat);
          const rows: any[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
      };
    },

    exec(sql: string): void {
      rawDb.run(sql);
      flushToDisk();
    },

    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return ((...args: any[]) => {
        const isRoot = txDepth === 0;
        txDepth++;
        if (isRoot) {
          inTx = true;
          rawDb.run('BEGIN TRANSACTION;');
        } else {
          rawDb.run(`SAVEPOINT sp_${txDepth};`);
        }

        try {
          const result = fn(...args);
          if (isRoot) {
            rawDb.run('COMMIT;');
            inTx = false;
            flushToDisk();
          } else {
            rawDb.run(`RELEASE SAVEPOINT sp_${txDepth};`);
          }
          txDepth--;
          return result;
        } catch (err) {
          if (isRoot) {
            try { rawDb.run('ROLLBACK;'); } catch (_) {}
            inTx = false;
          } else {
            try { rawDb.run(`ROLLBACK TO SAVEPOINT sp_${txDepth};`); } catch (_) {}
          }
          txDepth--;
          throw err;
        }
      }) as T;
    },

    pragma(pragmaStr: string): any {
      const lower = pragmaStr.toLowerCase().trim();
      if (lower.startsWith('journal_mode')) {
        return [{ journal_mode: 'wal' }];
      }
      if (lower.startsWith('integrity_check')) {
        return [{ integrity_check: 'ok' }];
      }
      try {
        const res = rawDb.exec(`PRAGMA ${pragmaStr};`);
        if (res.length > 0) {
          const columns = res[0].columns;
          return res[0].values.map(valArr => {
            const obj: any = {};
            columns.forEach((col, idx) => { obj[col] = valArr[idx]; });
            return obj;
          });
        }
      } catch (_) {}
      return [];
    },

    backup(targetPath: string): Promise<void> {
      flushToDisk();
      const binary = rawDb.export();
      fs.writeFileSync(targetPath, Buffer.from(binary));
      return Promise.resolve();
    },

    close(): void {
      flushToDisk();
      try {
        rawDb.close();
      } catch (_) {}
      activeDb = null;
    },

    exportBinary(): Uint8Array {
      return rawDb.export();
    },
  };

  // Configure Pragmas
  wrappedDb.pragma('foreign_keys = ON');

  activeDb = wrappedDb;
  activeDbPath = finalPath;

  runMigrations(wrappedDb);

  return { db: wrappedDb, dbPath: finalPath };
}

export function getDb(): ApexDatabase {
  if (!activeDb) {
    throw new Error('Database is not initialized. Call await initDatabase() first.');
  }
  return activeDb;
}

export function getActiveDbPath(): string {
  return activeDbPath || getDatabasePath();
}

export function closeDatabase(): void {
  if (activeDb) {
    try {
      activeDb.close();
    } catch (_) {
    } finally {
      activeDb = null;
    }
  }
}

function runMigrations(db: ApexDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM _schema_migrations').all() as { version: number }[];
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  const migrations: { version: number; name: string; up: (d: ApexDatabase) => void }[] = [
    {
      version: 1,
      name: 'initial_schema',
      up: (d) => {
        d.exec(`
          -- System Metadata & Audit
          CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details_json TEXT,
            ip_or_machine TEXT
          );

          -- Users & Roles
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            pin_hash TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS user_permissions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            is_granted INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, permission_key)
          );

          -- License & Profile
          CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            business_name TEXT NOT NULL,
            profile_type TEXT NOT NULL,
            edition TEXT NOT NULL,
            hardware_fingerprint TEXT NOT NULL,
            issued_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            signature TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS business_profile_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            profile_type TEXT NOT NULL,
            config_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          -- Catalog
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            code TEXT,
            description TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY(parent_id) REFERENCES categories(id)
          );

          CREATE TABLE IF NOT EXISTS brands (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            barcode TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            category_id TEXT,
            brand_id TEXT,
            product_type TEXT NOT NULL DEFAULT 'STANDARD',
            unit_of_measure TEXT NOT NULL DEFAULT 'PCS',
            cost_price_minor INTEGER NOT NULL DEFAULT 0,
            retail_price_minor INTEGER NOT NULL DEFAULT 0,
            wholesale_price_minor INTEGER,
            min_price_minor INTEGER,
            tax_rate_bps INTEGER NOT NULL DEFAULT 0,
            is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
            track_inventory INTEGER NOT NULL DEFAULT 1,
            reorder_level INTEGER NOT NULL DEFAULT 5,
            image_path TEXT,
            custom_fields_json TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories(id),
            FOREIGN KEY(brand_id) REFERENCES brands(id)
          );

          CREATE TABLE IF NOT EXISTS product_variants (
            id TEXT PRIMARY KEY,
            parent_product_id TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            barcode TEXT UNIQUE NOT NULL,
            variant_name TEXT NOT NULL,
            attribute_values_json TEXT NOT NULL,
            cost_price_minor INTEGER NOT NULL DEFAULT 0,
            retail_price_minor INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY(parent_product_id) REFERENCES products(id) ON DELETE CASCADE
          );

          -- Serialized items
          CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            serial_number TEXT,
            imei_1 TEXT,
            imei_2 TEXT,
            condition TEXT NOT NULL DEFAULT 'NEW',
            warranty_months INTEGER NOT NULL DEFAULT 12,
            status TEXT NOT NULL DEFAULT 'AVAILABLE',
            acquisition_cost_minor INTEGER NOT NULL DEFAULT 0,
            intake_date TEXT NOT NULL,
            sold_at_sale_id TEXT,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(variant_id) REFERENCES product_variants(id)
          );
          CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_serial ON inventory_items(serial_number) WHERE serial_number IS NOT NULL AND serial_number != '';
          CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_imei1 ON inventory_items(imei_1) WHERE imei_1 IS NOT NULL AND imei_1 != '';
          CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_imei2 ON inventory_items(imei_2) WHERE imei_2 IS NOT NULL AND imei_2 != '';

          -- Batches & Expiry
          CREATE TABLE IF NOT EXISTS inventory_batches (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            batch_number TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            quantity_scale4 INTEGER NOT NULL DEFAULT 0,
            cost_price_minor INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(product_id) REFERENCES products(id)
          );

          -- Stock Levels
          CREATE TABLE IF NOT EXISTS stock_levels (
            product_id TEXT NOT NULL,
            variant_id TEXT NOT NULL DEFAULT '',
            quantity_scale4 INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(product_id, variant_id),
            FOREIGN KEY(product_id) REFERENCES products(id)
          );

          CREATE TABLE IF NOT EXISTS stock_movements (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT NOT NULL DEFAULT '',
            movement_type TEXT NOT NULL,
            quantity_scale4 INTEGER NOT NULL,
            unit_cost_minor INTEGER NOT NULL,
            reference_id TEXT,
            reference_type TEXT,
            notes TEXT,
            user_id TEXT,
            FOREIGN KEY(product_id) REFERENCES products(id)
          );

          -- Customers & Credit Ledger
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            customer_code TEXT UNIQUE NOT NULL,
            customer_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            phone_secondary TEXT,
            email TEXT,
            address_billing TEXT,
            company_name TEXT,
            tax_id TEXT,
            credit_limit_minor INTEGER NOT NULL DEFAULT 0,
            payment_terms_days INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS customer_transactions (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            reference_id TEXT,
            reference_number TEXT,
            debit_minor INTEGER NOT NULL DEFAULT 0,
            credit_minor INTEGER NOT NULL DEFAULT 0,
            running_balance_minor INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            user_id TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
          );

          -- Shifts
          CREATE TABLE IF NOT EXISTS shifts (
            id TEXT PRIMARY KEY,
            cashier_id TEXT NOT NULL,
            cashier_name TEXT NOT NULL,
            opened_at TEXT NOT NULL,
            closed_at TEXT,
            opening_cash_minor INTEGER NOT NULL DEFAULT 0,
            closing_cash_counted_minor INTEGER,
            closing_cash_expected_minor INTEGER,
            discrepancy_minor INTEGER,
            total_sales_cash_minor INTEGER NOT NULL DEFAULT 0,
            total_sales_card_minor INTEGER NOT NULL DEFAULT 0,
            total_sales_transfer_minor INTEGER NOT NULL DEFAULT 0,
            total_sales_credit_minor INTEGER NOT NULL DEFAULT 0,
            cash_in_minor INTEGER NOT NULL DEFAULT 0,
            cash_out_minor INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'OPEN',
            notes TEXT,
            FOREIGN KEY(cashier_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS shift_cash_events (
            id TEXT PRIMARY KEY,
            shift_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            amount_minor INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(shift_id) REFERENCES shifts(id)
          );

          -- Sales & Orders
          CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            sale_date TEXT NOT NULL,
            shift_id TEXT,
            cashier_id TEXT NOT NULL,
            cashier_name TEXT NOT NULL,
            customer_id TEXT,
            customer_name TEXT,
            customer_snapshot_json TEXT,
            subtotal_minor INTEGER NOT NULL,
            discount_minor INTEGER NOT NULL DEFAULT 0,
            discount_type TEXT NOT NULL DEFAULT 'FIXED',
            tax_minor INTEGER NOT NULL DEFAULT 0,
            total_minor INTEGER NOT NULL,
            paid_minor INTEGER NOT NULL DEFAULT 0,
            change_minor INTEGER NOT NULL DEFAULT 0,
            balance_due_minor INTEGER NOT NULL DEFAULT 0,
            payment_status TEXT NOT NULL DEFAULT 'PAID',
            sale_status TEXT NOT NULL DEFAULT 'COMPLETED',
            template_version_id TEXT,
            notes TEXT,
            idempotency_key TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(shift_id) REFERENCES shifts(id),
            FOREIGN KEY(cashier_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS sale_items (
            id TEXT PRIMARY KEY,
            sale_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            product_name TEXT NOT NULL,
            sku TEXT NOT NULL,
            barcode TEXT NOT NULL,
            quantity_scale4 INTEGER NOT NULL,
            unit_price_minor INTEGER NOT NULL,
            unit_cost_minor INTEGER NOT NULL,
            discount_minor INTEGER NOT NULL DEFAULT 0,
            tax_rate_bps INTEGER NOT NULL DEFAULT 0,
            tax_minor INTEGER NOT NULL DEFAULT 0,
            line_total_minor INTEGER NOT NULL,
            serial_numbers_json TEXT,
            batch_id TEXT,
            is_returned INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
          );

          CREATE TABLE IF NOT EXISTS sale_payments (
            id TEXT PRIMARY KEY,
            sale_id TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            amount_minor INTEGER NOT NULL,
            reference_info TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
          );

          -- Returns
          CREATE TABLE IF NOT EXISTS returns (
            id TEXT PRIMARY KEY,
            return_number TEXT UNIQUE NOT NULL,
            original_sale_id TEXT NOT NULL,
            return_date TEXT NOT NULL,
            cashier_id TEXT NOT NULL,
            customer_id TEXT,
            total_refund_minor INTEGER NOT NULL,
            refund_method TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(original_sale_id) REFERENCES sales(id),
            FOREIGN KEY(cashier_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS return_items (
            id TEXT PRIMARY KEY,
            return_id TEXT NOT NULL,
            original_sale_item_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            quantity_scale4 INTEGER NOT NULL,
            unit_price_minor INTEGER NOT NULL,
            tax_refund_minor INTEGER NOT NULL,
            total_refund_minor INTEGER NOT NULL,
            disposition TEXT NOT NULL DEFAULT 'RESTOCK',
            serial_numbers_json TEXT,
            FOREIGN KEY(return_id) REFERENCES returns(id) ON DELETE CASCADE
          );

          -- Suppliers & Purchasing
          CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT,
            tax_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS purchase_orders (
            id TEXT PRIMARY KEY,
            po_number TEXT UNIQUE NOT NULL,
            supplier_id TEXT NOT NULL,
            order_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            total_cost_minor INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
          );

          CREATE TABLE IF NOT EXISTS purchase_items (
            id TEXT PRIMARY KEY,
            purchase_order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            quantity_scale4 INTEGER NOT NULL,
            unit_cost_minor INTEGER NOT NULL,
            line_total_minor INTEGER NOT NULL,
            batch_number TEXT,
            expiry_date TEXT,
            FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
          );

          -- Document Templates
          CREATE TABLE IF NOT EXISTS document_templates (
            id TEXT PRIMARY KEY,
            template_type TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            config_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            published_at TEXT
          );

          -- Indexes for ultra-fast barcode & search lookups
          CREATE INDEX IF NOT EXISTS idx_prod_barcode ON products(barcode);
          CREATE INDEX IF NOT EXISTS idx_prod_sku ON products(sku);
          CREATE INDEX IF NOT EXISTS idx_prod_name ON products(name);
          CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone);
          CREATE INDEX IF NOT EXISTS idx_cust_code ON customers(customer_code);
          CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
          CREATE INDEX IF NOT EXISTS idx_sales_inv ON sales(invoice_number);
          CREATE INDEX IF NOT EXISTS idx_stock_prod ON stock_levels(product_id);
          CREATE INDEX IF NOT EXISTS idx_stock_move_prod ON stock_movements(product_id);
        `);
      },
    },
    {
      version: 2,
      name: 'add_roles_repairs_tradein_expenses',
      up: (d) => {
        d.exec(`
          -- Roles & Granular Permissions
          CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            permissions_json TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          );

          -- Repairs & Service Tickets
          CREATE TABLE IF NOT EXISTS repair_tickets (
            id TEXT PRIMARY KEY,
            ticket_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            device_model TEXT NOT NULL,
            imei_or_serial TEXT,
            passcode TEXT,
            fault_description TEXT NOT NULL,
            physical_condition TEXT,
            status TEXT NOT NULL DEFAULT 'Received',
            estimated_cost_minor INTEGER NOT NULL DEFAULT 0,
            advance_paid_minor INTEGER NOT NULL DEFAULT 0,
            technician_notes TEXT,
            parts_used_json TEXT,
            assigned_technician TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT
          );

          -- Phone & Electronics Trade-In / Exchange
          CREATE TABLE IF NOT EXISTS trade_ins (
            id TEXT PRIMARY KEY,
            trade_in_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            storage TEXT,
            color TEXT,
            imei1 TEXT NOT NULL,
            imei2 TEXT,
            battery_health INTEGER DEFAULT 100,
            physical_grade TEXT NOT NULL DEFAULT 'Grade A',
            screen_condition TEXT,
            back_glass_condition TEXT,
            base_guide_price_minor INTEGER NOT NULL DEFAULT 0,
            suggested_value_minor INTEGER NOT NULL DEFAULT 0,
            deductions_json TEXT,
            final_approved_value_minor INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'RECEIVED',
            acquisition_cost_minor INTEGER NOT NULL DEFAULT 0,
            refurbishment_cost_minor INTEGER NOT NULL DEFAULT 0,
            true_cost_minor INTEGER NOT NULL DEFAULT 0,
            staff_notes TEXT,
            created_at TEXT NOT NULL
          );

          -- Operating Expenses & Petty Cash
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            amount_minor INTEGER NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'Cash',
            description TEXT NOT NULL,
            receipt_ref TEXT,
            recorded_by TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          -- Indexes
          CREATE INDEX IF NOT EXISTS idx_repairs_ticket ON repair_tickets(ticket_number);
          CREATE INDEX IF NOT EXISTS idx_repairs_cust ON repair_tickets(customer_phone);
          CREATE INDEX IF NOT EXISTS idx_tradeins_num ON trade_ins(trade_in_number);
          CREATE INDEX IF NOT EXISTS idx_tradeins_imei ON trade_ins(imei1);
          CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        `);

        // Seed default system roles if none exist
        const now = new Date().toISOString();
        const existingRoles = d.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
        if (!existingRoles || existingRoles.count === 0) {
          d.prepare(`
            INSERT INTO roles (id, name, description, permissions_json, is_system, created_at)
            VALUES 
              ('role_owner', 'Owner', 'Full business & administrative ownership', '["*"]', 1, ?),
              ('role_manager', 'Manager', 'Operational management, discounts, refunds & reports', '["pos.billing","pos.discount","pos.refund","catalog.manage","inventory.manage","customers.manage","reports.view","shifts.manage","staff.manage","procurement.manage","expenses.manage","repairs.manage","tradein.manage"]', 1, ?),
              ('role_cashier', 'Cashier', 'Front-desk point of sale, customer billing & shifts', '["pos.billing","customers.manage","shifts.drawer"]', 1, ?),
              ('role_technician', 'Technician', 'Hardware repairs, diagnostics & IMEI inspections', '["repairs.manage","tradein.manage","inventory.view"]', 1, ?),
              ('role_inventory', 'Inventory Clerk', 'Warehouse intake, stock count & adjustments', '["inventory.manage","catalog.manage","procurement.manage"]', 1, ?)
          `).run(now, now, now, now, now);
        }
      },
    },
  ];

  for (const mig of migrations) {
    if (!appliedVersions.has(mig.version)) {
      const applyTx = db.transaction(() => {
        mig.up(db);
        db.prepare('INSERT INTO _schema_migrations (version, applied_at) VALUES (?, ?)').run(
          mig.version,
          new Date().toISOString()
        );
      });
      applyTx();
    }
  }
}
