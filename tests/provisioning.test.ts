import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase } from '../src/main/services/db';
import * as storeConfigService from '../src/main/services/storeConfigService';
import * as authService from '../src/main/services/authService';

const TEST_DB_PATH = path.resolve(__dirname, 'test_prov.db');

describe('Developer 1-Time Provisioning & Store Branding Tests', () => {
  beforeEach(async () => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
    await initDatabase(TEST_DB_PATH);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('verifies store is unprovisioned by default and successfully provisions once', () => {
    // 1. Initial state should be unprovisioned
    expect(storeConfigService.isStoreProvisioned()).toBe(false);

    // 2. Perform Developer 1-time provisioning
    const result = storeConfigService.completeDeveloperProvisioning({
      businessType: 'MOBILE_PHONES',
      businessName: 'Apple Vision Store',
      appName: 'Apple Vision Mobile POS',
      ownerUsername: 'harshapex',
      ownerFullName: 'Harsh Apex Administrator',
      ownerPassword: 'chami2003',
      ownerPin: '2003',
      phone: '+94 77 123 4567',
      address: 'Galle, Sri Lanka',
    });

    expect(result.success).toBe(true);
    expect(result.session.username).toBe('harshapex');
    expect(result.session.role).toBe('owner');
    expect(result.branding.businessType).toBe('MOBILE_PHONES');
    expect(result.branding.appName).toBe('Apple Vision Mobile POS');
    expect(storeConfigService.isStoreProvisioned()).toBe(true);

    // 3. Strict 1-Time Rule: Second provisioning attempt must be rejected
    expect(() => {
      storeConfigService.completeDeveloperProvisioning({
        businessType: 'SUPERMARKET',
        businessName: 'Hacker Supermarket',
        appName: 'Hacked POS',
        ownerUsername: 'hacker',
        ownerFullName: 'Hacker',
        ownerPassword: 'password123',
      });
    }).toThrow(/already provisioned and locked/);
  });

  it('allows shop owner to update store branding and logos without changing profile type', () => {
    const provResult = storeConfigService.completeDeveloperProvisioning({
      businessType: 'SHOES',
      businessName: 'Apex Shoes',
      appName: 'Apex Footwear POS',
      ownerUsername: 'harshapex',
      ownerFullName: 'Harsh Apex Admin',
      ownerPassword: 'chami2003',
    });

    const updated = storeConfigService.updateStoreBranding({
      businessName: 'Apex Footwear Flagship',
      phone: '+94 11 999 8888',
      appLogo: 'data:image/png;base64,mockAppLogo123',
      businessLogo: 'data:image/png;base64,mockReceiptLogo456',
    }, provResult.session);

    expect(updated.businessName).toBe('Apex Footwear Flagship');
    expect(updated.phone).toBe('+94 11 999 8888');
    expect(updated.appLogo).toBe('data:image/png;base64,mockAppLogo123');
    expect(updated.businessLogo).toBe('data:image/png;base64,mockReceiptLogo456');
    // Profile type must stay locked
    expect(updated.businessType).toBe('SHOES');
  });

  it('creates and manages custom staff roles with granular permissions', () => {
    const provResult = storeConfigService.completeDeveloperProvisioning({
      businessType: 'GENERAL_RETAIL',
      businessName: 'Retail Shop',
      appName: 'Retail POS',
      ownerUsername: 'harshapex',
      ownerFullName: 'Harsh Apex Admin',
      ownerPassword: 'chami2003',
    });

    // 1. Create a custom role
    const newRole = authService.createRole(
      'Senior Cashier',
      'Can bill and apply discounts',
      ['pos.checkout', 'pos.discount'],
      provResult.session
    );

    expect(newRole.id).toBeDefined();
    expect(newRole.name).toBe('Senior Cashier');
    expect(newRole.permissions).toContain('pos.checkout');
    expect(newRole.permissions).toContain('pos.discount');

    // 2. Fetch roles
    const allRoles = authService.getRoles();
    const createdRole = allRoles.find(r => r.name === 'Senior Cashier');
    expect(createdRole).toBeDefined();

    // 3. Reject duplicate role name
    expect(() => {
      authService.createRole('Senior Cashier', 'Duplicate', [], provResult.session);
    }).toThrow(/already exists/);
  });
});
