import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase, closeDatabase, getDb } from '../src/main/services/db';
import * as authService from '../src/main/services/authService';
import * as repairService from '../src/main/services/repairService';
import * as tradeInService from '../src/main/services/tradeInService';
import * as expenseService from '../src/main/services/expenseService';
import * as procurementService from '../src/main/services/procurementService';
import { UserSession } from '../src/shared/types';

describe('Commercial Operations: Roles, Repairs, Trade-Ins, Expenses & Procurement', () => {
  const testDbPath = path.join(__dirname, 'test_operations.db');

  let adminSession: UserSession;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    await initDatabase(testDbPath);

    // Setup initial owner
    adminSession = authService.setupInitialOwner({
      username: 'harshapex',
      fullName: 'Harsh Apex Administrator',
      password: 'StrongPassword123!',
      pin: '2003',
    });
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('authenticates via PIN keypad using constant-time hashing', () => {
    const pinSession = authService.loginWithPin('2003');
    expect(pinSession).toBeDefined();
    expect(pinSession.username).toBe('harshapex');
    expect(pinSession.role).toBe('owner');

    expect(() => authService.loginWithPin('9999')).toThrow('Invalid PIN code.');
  });

  it('manages roles and granular permissions', () => {
    const roles = authService.getRoles();
    expect(roles.length).toBeGreaterThanOrEqual(5);

    const customRole = authService.createRole(
      'Senior Technician',
      'Can inspect, repair, and adjust stock',
      ['repairs.manage', 'inventory.manage'],
      adminSession
    );
    expect(customRole.name).toBe('Senior Technician');

    // Create staff member with custom role
    const staff = authService.createUser({
      username: 'technician_saman',
      fullName: 'Saman Jayasinghe',
      role: customRole.name,
      password: 'SamanPassword123!',
      pin: '4455',
    }, adminSession);
    expect(staff.username).toBe('technician_saman');

    const users = authService.getUsers();
    expect(users.find(u => u.username === 'technician_saman')).toBeDefined();
  });

  it('manages repair tickets through full lifecycle', () => {
    const ticket = repairService.createRepairTicket({
      customerName: 'Dinesh Gamage',
      customerPhone: '077 123 4567',
      customerEmail: 'dinesh@example.com',
      deviceModel: 'Apple iPhone 14 Pro',
      imeiOrSerial: '354892110294821',
      passcode: '1234',
      faultDescription: 'Battery drains rapidly under load',
      physicalCondition: 'Minor bezel scratches, display clean',
      estimatedCostMinor: 1850000, // LKR 18,500.00
      advancePaidMinor: 500000,    // LKR 5,000.00
      assignedTechnician: 'Nuwan Pradeep',
    }, adminSession);

    expect(ticket.ticketNumber).toMatch(/^REP-/);
    expect(ticket.status).toBe('Received');

    // Update status to Diagnostics
    repairService.updateRepairStatus(ticket.id, 'Diagnostics', 'Bench load test started', adminSession);
    let list = repairService.listRepairTickets('iPhone 14');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('Diagnostics');

    // Update status to Ready for Pickup
    repairService.updateRepairStatus(ticket.id, 'Ready for Pickup', 'OEM Battery replaced & calibrated');
    list = repairService.listRepairTickets(undefined, 'Ready for Pickup');
    expect(list.length).toBe(1);
    expect(list[0].completedAt).toBeDefined();
  });

  it('performs trade-in inspection valuation and converts to available inventory', () => {
    const tradeIn = tradeInService.createTradeIn({
      customerName: 'Anura Kumara',
      customerPhone: '071 999 8888',
      brand: 'Apple',
      model: 'iPhone 13',
      storage: '128GB',
      color: 'Midnight',
      imei1: '359998887776665',
      imei2: '359998887776666',
      batteryHealth: 83,
      physicalGrade: 'Grade B',
      baseGuidePriceMinor: 12500000, // LKR 125,000.00
      suggestedValueMinor: 10800000, // LKR 108,000.00
      deductions: [
        { key: 'battery', label: 'Battery 83%', amountMinor: 700000, reason: 'Requires replacement' },
        { key: 'grade', label: 'Grade B Bezel', amountMinor: 500000, reason: 'Edge scratches' }
      ],
      finalApprovedValueMinor: 11000000, // LKR 110,000.00
      refurbishmentCostMinor: 850000,   // LKR 8,500.00
      staffNotes: 'Customer upgraded to iPhone 15',
    }, adminSession);

    expect(tradeIn.tradeInNumber).toMatch(/^TI-/);
    expect(tradeIn.trueCostMinor).toBe(11850000); // 110,000 + 8,500

    // Convert trade-in device to available sellable inventory
    const { productId, itemId } = tradeInService.convertTradeInToInventory(tradeIn.id, adminSession);
    expect(productId).toBeDefined();
    expect(itemId).toBeDefined();

    const db = getDb();
    const invItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId) as any;
    expect(invItem.imei_1).toBe('359998887776665');
    expect(invItem.status).toBe('AVAILABLE');

    const updatedTi = db.prepare('SELECT status FROM trade_ins WHERE id = ?').get(tradeIn.id) as any;
    expect(updatedTi.status).toBe('READY_FOR_SALE');
  });

  it('records expenses and calculates operational outflows', () => {
    const exp1 = expenseService.recordExpense({
      category: 'Utilities & Internet',
      amountMinor: 850000, // LKR 8,500.00
      paymentMethod: 'Cash',
      description: 'Fiber internet monthly bill',
    }, adminSession);

    const exp2 = expenseService.recordExpense({
      category: 'Tea & Refreshments',
      amountMinor: 120000, // LKR 1,200.00
      paymentMethod: 'Cash',
      description: 'Staff evening tea',
    }, adminSession);

    const allExpenses = expenseService.listExpenses();
    expect(allExpenses.length).toBe(2);

    const totalMinor = allExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
    expect(totalMinor).toBe(970000);

    // Delete expense
    expenseService.deleteExpense(exp2.id, adminSession);
    expect(expenseService.listExpenses().length).toBe(1);
  });
});
