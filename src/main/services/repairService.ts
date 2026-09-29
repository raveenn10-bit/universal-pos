// Harsh Apex Universal POS - Repair & Service Ticket Engine
import crypto from 'node:crypto';
import { getDb } from './db';
import { UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export interface RepairTicketItem {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceModel: string;
  imeiOrSerial?: string;
  passcode?: string;
  faultDescription: string;
  physicalCondition?: string;
  status: 'Received' | 'Diagnostics' | 'Waiting for Parts' | 'Repairing' | 'Ready for Pickup' | 'Delivered';
  estimatedCostMinor: number;
  advancePaidMinor: number;
  technicianNotes?: string;
  partsUsed?: string[];
  assignedTechnician?: string;
  createdAt: string;
  completedAt?: string;
}

export function listRepairTickets(search?: string, status?: string): RepairTicketItem[] {
  const db = getDb();
  let sql = 'SELECT * FROM repair_tickets WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'ALL') {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ' AND (LOWER(ticket_number) LIKE ? OR LOWER(customer_name) LIKE ? OR customer_phone LIKE ? OR LOWER(device_model) LIKE ? OR LOWER(imei_or_serial) LIKE ?)';
    params.push(term, term, term, term, term);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    ticketNumber: r.ticket_number,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email || undefined,
    deviceModel: r.device_model,
    imeiOrSerial: r.imei_or_serial || undefined,
    passcode: r.passcode || undefined,
    faultDescription: r.fault_description,
    physicalCondition: r.physical_condition || undefined,
    status: r.status,
    estimatedCostMinor: r.estimated_cost_minor,
    advancePaidMinor: r.advance_paid_minor,
    technicianNotes: r.technician_notes || undefined,
    partsUsed: r.parts_used_json ? JSON.parse(r.parts_used_json) : [],
    assignedTechnician: r.assigned_technician || undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at || undefined,
  }));
}

export function createRepairTicket(payload: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceModel: string;
  imeiOrSerial?: string;
  passcode?: string;
  faultDescription: string;
  physicalCondition?: string;
  estimatedCostMinor: number;
  advancePaidMinor?: number;
  technicianNotes?: string;
  assignedTechnician?: string;
}, session: UserSession): RepairTicketItem {
  assertPermission(session, 'repairs.manage');
  const db = getDb();
  const id = `rep_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const ticketNumber = `REP-${Date.now().toString().slice(-6)}`;

  db.prepare(`
    INSERT INTO repair_tickets (
      id, ticket_number, customer_name, customer_phone, customer_email,
      device_model, imei_or_serial, passcode, fault_description, physical_condition,
      status, estimated_cost_minor, advance_paid_minor, technician_notes,
      parts_used_json, assigned_technician, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?, ?, ?, '[]', ?, ?)
  `).run(
    id,
    ticketNumber,
    payload.customerName.trim(),
    payload.customerPhone.trim(),
    payload.customerEmail?.trim() || null,
    payload.deviceModel.trim(),
    payload.imeiOrSerial?.trim() || null,
    payload.passcode?.trim() || null,
    payload.faultDescription.trim(),
    payload.physicalCondition?.trim() || 'Cosmetic scuffs, glass intact',
    payload.estimatedCostMinor || 0,
    payload.advancePaidMinor || 0,
    payload.technicianNotes?.trim() || null,
    payload.assignedTechnician?.trim() || session.fullName,
    now
  );

  return {
    id,
    ticketNumber,
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    customerEmail: payload.customerEmail?.trim(),
    deviceModel: payload.deviceModel.trim(),
    imeiOrSerial: payload.imeiOrSerial?.trim(),
    passcode: payload.passcode?.trim(),
    faultDescription: payload.faultDescription.trim(),
    physicalCondition: payload.physicalCondition?.trim(),
    status: 'Received',
    estimatedCostMinor: payload.estimatedCostMinor || 0,
    advancePaidMinor: payload.advancePaidMinor || 0,
    technicianNotes: payload.technicianNotes?.trim(),
    partsUsed: [],
    assignedTechnician: payload.assignedTechnician?.trim() || session.fullName,
    createdAt: now,
  };
}

export function updateRepairStatus(
  ticketId: string,
  status: 'Received' | 'Diagnostics' | 'Waiting for Parts' | 'Repairing' | 'Ready for Pickup' | 'Delivered',
  technicianNotes?: string,
  session?: UserSession
): boolean {
  if (session) assertPermission(session, 'repairs.manage');
  const db = getDb();
  const completedAt = (status === 'Delivered' || status === 'Ready for Pickup') ? new Date().toISOString() : null;

  if (technicianNotes !== undefined) {
    db.prepare(`
      UPDATE repair_tickets 
      SET status = ?, technician_notes = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, technicianNotes, completedAt, ticketId);
  } else {
    db.prepare(`
      UPDATE repair_tickets 
      SET status = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, completedAt, ticketId);
  }
  return true;
}

export function updateRepairTicket(
  ticketId: string,
  updates: Partial<RepairTicketItem>,
  session: UserSession
): boolean {
  assertPermission(session, 'repairs.manage');
  const db = getDb();
  const existing = db.prepare('SELECT * FROM repair_tickets WHERE id = ?').get(ticketId) as any;
  if (!existing) throw new Error('Repair ticket not found.');

  db.prepare(`
    UPDATE repair_tickets SET
      customer_name = COALESCE(?, customer_name),
      customer_phone = COALESCE(?, customer_phone),
      device_model = COALESCE(?, device_model),
      imei_or_serial = COALESCE(?, imei_or_serial),
      fault_description = COALESCE(?, fault_description),
      estimated_cost_minor = COALESCE(?, estimated_cost_minor),
      advance_paid_minor = COALESCE(?, advance_paid_minor),
      technician_notes = COALESCE(?, technician_notes),
      assigned_technician = COALESCE(?, assigned_technician)
    WHERE id = ?
  `).run(
    updates.customerName?.trim() || null,
    updates.customerPhone?.trim() || null,
    updates.deviceModel?.trim() || null,
    updates.imeiOrSerial?.trim() || null,
    updates.faultDescription?.trim() || null,
    updates.estimatedCostMinor !== undefined ? updates.estimatedCostMinor : null,
    updates.advancePaidMinor !== undefined ? updates.advancePaidMinor : null,
    updates.technicianNotes?.trim() || null,
    updates.assignedTechnician?.trim() || null,
    ticketId
  );

  return true;
}
