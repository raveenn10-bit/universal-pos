// Harsh Apex Universal POS - Expenses & Petty Cash Engine
import crypto from 'node:crypto';
import { getDb } from './db';
import { UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  amountMinor: number;
  paymentMethod: string;
  description: string;
  receiptRef?: string;
  recordedBy: string;
  createdAt: string;
}

export function listExpenses(search?: string, category?: string): ExpenseRecord[] {
  const db = getDb();
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params: any[] = [];

  if (category && category !== 'ALL') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ' AND (LOWER(description) LIKE ? OR LOWER(category) LIKE ? OR LOWER(receipt_ref) LIKE ? OR LOWER(recorded_by) LIKE ?)';
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY date DESC, created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    date: r.date,
    category: r.category,
    amountMinor: r.amount_minor,
    paymentMethod: r.payment_method,
    description: r.description,
    receiptRef: r.receipt_ref || undefined,
    recordedBy: r.recorded_by,
    createdAt: r.created_at,
  }));
}

export function recordExpense(payload: {
  date?: string;
  category: string;
  amountMinor: number;
  paymentMethod?: string;
  description: string;
  receiptRef?: string;
}, session: UserSession): ExpenseRecord {
  assertPermission(session, 'expenses.manage');
  const db = getDb();
  const id = `exp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const date = payload.date || now.substring(0, 10);
  const voucherRef = payload.receiptRef?.trim() || `VOUCH-${Date.now().toString().slice(-6)}`;

  db.prepare(`
    INSERT INTO expenses (id, date, category, amount_minor, payment_method, description, receipt_ref, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    date,
    payload.category.trim(),
    payload.amountMinor,
    payload.paymentMethod || 'Cash',
    payload.description.trim(),
    voucherRef,
    session.fullName || session.username,
    now
  );

  return {
    id,
    date,
    category: payload.category.trim(),
    amountMinor: payload.amountMinor,
    paymentMethod: payload.paymentMethod || 'Cash',
    description: payload.description.trim(),
    receiptRef: voucherRef,
    recordedBy: session.fullName || session.username,
    createdAt: now,
  };
}

export function deleteExpense(expenseId: string, session: UserSession): boolean {
  assertPermission(session, 'expenses.manage');
  const db = getDb();
  db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
  return true;
}
