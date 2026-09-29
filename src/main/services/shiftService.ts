// Harsh Apex Universal POS - Cashier Shift & Cash Management Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { Shift, UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export function getActiveShift(cashierId: string): Shift | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM shifts 
    WHERE cashier_id = ? AND status = 'OPEN' 
    ORDER BY opened_at DESC LIMIT 1
  `).get(cashierId) as any;

  if (!row) return null;
  return formatShift(row);
}

export function openShift(
  openingCashMinor: number,
  notes: string = '',
  session: UserSession
): Shift {
  assertPermission(session, 'pos.fast_checkout');
  const db = getDb();

  const active = getActiveShift(session.userId);
  if (active) {
    throw new Error(`You already have an open shift (Shift ID: ${active.id}). Close it before opening a new one.`);
  }

  const id = `shf_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO shifts (
        id, cashier_id, cashier_name, opened_at, opening_cash_minor,
        total_sales_cash_minor, total_sales_card_minor, total_sales_transfer_minor,
        total_sales_credit_minor, cash_in_minor, cash_out_minor, status, notes
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'OPEN', ?)
    `).run(id, session.userId, session.fullName, now, openingCashMinor, notes);

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'SHIFT_OPENED', 'SHIFT', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      session.userId,
      id,
      JSON.stringify({ openingCashMinor })
    );
  })();

  return getActiveShift(session.userId)!;
}

export function recordCashEvent(
  shiftId: string,
  eventType: 'CASH_IN' | 'CASH_OUT' | 'DROP',
  amountMinor: number,
  reason: string,
  session: UserSession
): void {
  const db = getDb();
  const now = new Date().toISOString();

  if (amountMinor <= 0) {
    throw new Error('Cash event amount must be positive.');
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO shift_cash_events (id, shift_id, event_type, amount_minor, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`cev_${crypto.randomUUID()}`, shiftId, eventType, amountMinor, reason.trim(), now);

    if (eventType === 'CASH_IN') {
      db.prepare('UPDATE shifts SET cash_in_minor = cash_in_minor + ? WHERE id = ?').run(amountMinor, shiftId);
    } else {
      db.prepare('UPDATE shifts SET cash_out_minor = cash_out_minor + ? WHERE id = ?').run(amountMinor, shiftId);
    }
  })();
}

export function closeShift(
  shiftId: string,
  countedCashMinor: number,
  notes: string = '',
  session: UserSession
): Shift {
  const db = getDb();
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId) as any;
  if (!shift || shift.status !== 'OPEN') {
    throw new Error('Shift is not currently open.');
  }

  const now = new Date().toISOString();
  const expectedCash = shift.opening_cash_minor + shift.total_sales_cash_minor + shift.cash_in_minor - shift.cash_out_minor;
  const discrepancy = countedCashMinor - expectedCash;

  db.transaction(() => {
    db.prepare(`
      UPDATE shifts SET
        closed_at = ?,
        closing_cash_counted_minor = ?,
        closing_cash_expected_minor = ?,
        discrepancy_minor = ?,
        status = 'CLOSED',
        notes = COALESCE(notes || ' | ', '') || ?
      WHERE id = ?
    `).run(now, countedCashMinor, expectedCash, discrepancy, notes, shiftId);

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'SHIFT_CLOSED', 'SHIFT', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      session.userId,
      shiftId,
      JSON.stringify({ countedCashMinor, expectedCash, discrepancy })
    );
  })();

  const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId) as any;
  return formatShift(updated);
}

export function getShiftHistory(limit: number = 30): Shift[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM shifts ORDER BY opened_at DESC LIMIT ?').all(limit) as any[];
  return rows.map(formatShift);
}

function formatShift(r: any): Shift {
  return {
    id: r.id,
    cashierId: r.cashier_id,
    cashierName: r.cashier_name,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    openingCashMinor: r.opening_cash_minor,
    closingCashCountedMinor: r.closing_cash_counted_minor,
    closingCashExpectedMinor: r.closing_cash_expected_minor,
    discrepancyMinor: r.discrepancy_minor,
    totalSalesCashMinor: r.total_sales_cash_minor,
    totalSalesCardMinor: r.total_sales_card_minor,
    totalSalesTransferMinor: r.total_sales_transfer_minor,
    totalSalesCreditMinor: r.total_sales_credit_minor,
    cashInMinor: r.cash_in_minor,
    cashOutMinor: r.cash_out_minor,
    status: r.status,
    notes: r.notes,
  };
}
