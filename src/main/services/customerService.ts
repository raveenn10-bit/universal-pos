// Harsh Apex Universal POS - Customer Management & Credit Ledger Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { Customer, CustomerTransaction, UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export function getCustomerBalance(customerId: string): number {
  const db = getDb();
  // Credit balance is derived exclusively from posted transactions: SUM(debit_minor) - SUM(credit_minor)
  const row = db.prepare(`
    SELECT COALESCE(SUM(debit_minor - credit_minor), 0) as balance_minor
    FROM customer_transactions
    WHERE customer_id = ?
  `).get(customerId) as { balance_minor: number };

  return row ? row.balance_minor : 0;
}

export function searchCustomers(query: string = '', limit: number = 25): Customer[] {
  const db = getDb();
  const clean = query.trim();
  let sql = `SELECT * FROM customers WHERE is_active = 1`;
  const params: any[] = [];

  if (clean) {
    sql += ` AND (phone = ? OR customer_code = ? OR name LIKE ? OR phone LIKE ?)`;
    params.push(clean, clean, `%${clean}%`, `%${clean}%`);
  }

  sql += ` ORDER BY name ASC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(r => formatCustomer(r, getCustomerBalance(r.id)));
}

export function getCustomerById(id: string): Customer | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!row) return null;
  return formatCustomer(row, getCustomerBalance(id));
}

export function createCustomer(
  data: {
    name: string;
    phone: string;
    phoneSecondary?: string;
    email?: string;
    addressBilling?: string;
    companyName?: string;
    taxId?: string;
    customerType?: 'INDIVIDUAL' | 'BUSINESS';
    creditLimitMinor?: number;
    paymentTermsDays?: number;
    notes?: string;
    openingBalanceMinor?: number;
  },
  session: UserSession
): Customer {
  assertPermission(session, 'customer.manage');
  const db = getDb();
  const id = `cst_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Generate readable sequential code
  const countRow = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  const customerCode = `CST-${(countRow.count + 1).toString().padStart(5, '0')}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO customers (
        id, customer_code, customer_type, name, phone, phone_secondary,
        email, address_billing, company_name, tax_id, credit_limit_minor,
        payment_terms_days, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      customerCode,
      data.customerType || 'INDIVIDUAL',
      data.name.trim(),
      data.phone.trim(),
      data.phoneSecondary?.trim() || null,
      data.email?.trim() || null,
      data.addressBilling?.trim() || null,
      data.companyName?.trim() || null,
      data.taxId?.trim() || null,
      data.creditLimitMinor || 0,
      data.paymentTermsDays || 0,
      data.notes || null,
      now,
      now
    );

    // If initial opening balance is provided
    if (data.openingBalanceMinor && data.openingBalanceMinor !== 0) {
      const isDebit = data.openingBalanceMinor > 0;
      db.prepare(`
        INSERT INTO customer_transactions (
          id, timestamp, customer_id, transaction_type, debit_minor, credit_minor,
          running_balance_minor, notes, user_id
        ) VALUES (?, ?, ?, 'OPENING_BALANCE', ?, ?, ?, 'Opening credit balance', ?)
      `).run(
        `ctx_${crypto.randomUUID()}`,
        now,
        id,
        isDebit ? data.openingBalanceMinor : 0,
        isDebit ? 0 : Math.abs(data.openingBalanceMinor),
        data.openingBalanceMinor,
        session.userId
      );
    }
  })();

  return getCustomerById(id)!;
}

export function quickAddCustomer(
  data: { name: string; phone: string },
  session: UserSession
): Customer {
  // Cashier quick-add permission: minimal fields, does not require full billing info
  return createCustomer({
    name: data.name,
    phone: data.phone,
    customerType: 'INDIVIDUAL',
    creditLimitMinor: 0,
    paymentTermsDays: 0,
  }, session);
}

export function updateCustomer(
  id: string,
  data: Partial<Customer>,
  session: UserSession
): Customer {
  assertPermission(session, 'customer.manage');
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      phone_secondary = COALESCE(?, phone_secondary),
      email = COALESCE(?, email),
      address_billing = COALESCE(?, address_billing),
      company_name = COALESCE(?, company_name),
      tax_id = COALESCE(?, tax_id),
      credit_limit_minor = COALESCE(?, credit_limit_minor),
      payment_terms_days = COALESCE(?, payment_terms_days),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name?.trim() || null,
    data.phone?.trim() || null,
    data.phoneSecondary?.trim() || null,
    data.email?.trim() || null,
    data.addressBilling?.trim() || null,
    data.companyName?.trim() || null,
    data.taxId?.trim() || null,
    data.creditLimitMinor !== undefined ? data.creditLimitMinor : null,
    data.paymentTermsDays !== undefined ? data.paymentTermsDays : null,
    data.notes || null,
    now,
    id
  );

  return getCustomerById(id)!;
}

export function recordSettlementPayment(
  customerId: string,
  amountMinor: number,
  paymentMethod: string,
  notes: string = '',
  session: UserSession
): CustomerTransaction {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `ctx_${crypto.randomUUID()}`;

  if (amountMinor <= 0) {
    throw new Error('Settlement payment amount must be greater than zero.');
  }

  let transactionRecord: CustomerTransaction | null = null;

  db.transaction(() => {
    const currentBalance = getCustomerBalance(customerId);
    const newBalance = currentBalance - amountMinor;

    db.prepare(`
      INSERT INTO customer_transactions (
        id, timestamp, customer_id, transaction_type, debit_minor, credit_minor,
        running_balance_minor, notes, user_id
      ) VALUES (?, ?, ?, 'SETTLEMENT_PAYMENT', 0, ?, ?, ?, ?)
    `).run(
      id,
      now,
      customerId,
      amountMinor,
      newBalance,
      `Settlement via ${paymentMethod}. ${notes}`.trim(),
      session.userId
    );

    transactionRecord = {
      id,
      timestamp: now,
      customerId,
      transactionType: 'SETTLEMENT_PAYMENT',
      debitMinor: 0,
      creditMinor: amountMinor,
      runningBalanceMinor: newBalance,
      notes: `Settlement via ${paymentMethod}`,
      userId: session.userId,
    };
  })();

  return transactionRecord!;
}

export function getCustomerStatement(
  customerId: string,
  fromDate?: string,
  toDate?: string
): { customer: Customer; transactions: CustomerTransaction[]; currentBalanceMinor: number } {
  const customer = getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  const db = getDb();
  let sql = `SELECT * FROM customer_transactions WHERE customer_id = ?`;
  const params: any[] = [customerId];

  if (fromDate) {
    sql += ` AND timestamp >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    sql += ` AND timestamp <= ?`;
    params.push(toDate);
  }
  sql += ` ORDER BY timestamp ASC`;

  const rows = db.prepare(sql).all(...params) as any[];
  const transactions: CustomerTransaction[] = rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    customerId: r.customer_id,
    transactionType: r.transaction_type,
    referenceId: r.reference_id,
    referenceNumber: r.reference_number,
    debitMinor: r.debit_minor,
    creditMinor: r.credit_minor,
    runningBalanceMinor: r.running_balance_minor,
    notes: r.notes,
    userId: r.user_id,
  }));

  return {
    customer,
    transactions,
    currentBalanceMinor: customer.currentBalanceMinor,
  };
}

function formatCustomer(r: any, balanceMinor: number): Customer {
  return {
    id: r.id,
    customerCode: r.customer_code,
    customerType: r.customer_type,
    name: r.name,
    phone: r.phone,
    phoneSecondary: r.phone_secondary,
    email: r.email,
    addressBilling: r.address_billing,
    companyName: r.company_name,
    taxId: r.tax_id,
    creditLimitMinor: r.credit_limit_minor,
    paymentTermsDays: r.payment_terms_days,
    currentBalanceMinor: balanceMinor,
    notes: r.notes,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
