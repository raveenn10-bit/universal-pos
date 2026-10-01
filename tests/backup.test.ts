import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase, getDb, getSqlModule } from '../src/main/services/db';
import { setupInitialOwner } from '../src/main/services/authService';
import { createBackup, restoreBackup, createAutoBackup, getBackupsSummary } from '../src/main/services/backupService';
import { createProduct } from '../src/main/services/catalogService';
import { UserSession } from '../src/shared/types';

const TEST_DB_PATH = path.resolve(__dirname, 'test_backup.db');
const BACKUP_DIR = path.resolve(__dirname, 'test_backups_dir');

describe('Backup, Restore & Disaster Recovery Tests', () => {
  let ownerSession: UserSession;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);

    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    await initDatabase(TEST_DB_PATH);
    ownerSession = setupInitialOwner({
      username: 'owner',
      fullName: 'Shop Owner',
      password: 'StrongPassword123!',
    });
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const wal = `${TEST_DB_PATH}-wal`;
    const shm = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);

    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  });

  it('creates an atomic, WAL-checkpointed SQLite backup and verifies integrity', async () => {
    // Add product record before backup
    createProduct({
      name: 'Backup Test Product',
      code: 'BKP-01',
      sku: 'BKP-SKU',
      barcode: '9988776655443',
      costPriceMinor: 1000,
      retailPriceMinor: 2000,
      currentStockScale4: 10000,
    }, ownerSession);

    const backupResult = await createBackup(BACKUP_DIR, ownerSession);

    expect(fs.existsSync(backupResult.backupPath)).toBe(true);
    expect(backupResult.fileSizeBytes).toBeGreaterThan(0);
    expect(backupResult.sha256).toBeDefined();
    expect(backupResult.sha256.length).toBe(64);

    // Verify backup file can be opened and contains data using pure WebAssembly SQLite
    const SQL = await getSqlModule();
    const bkpDb = new SQL.Database(fs.readFileSync(backupResult.backupPath));
    const stmt = bkpDb.prepare('SELECT name FROM products WHERE code = ?');
    stmt.bind(['BKP-01']);
    let row: any = undefined;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    bkpDb.close();

    expect(row).toBeDefined();
    expect(row.name).toBe('Backup Test Product');
  });

  it('creates a safety pre-restore snapshot and restores database state cleanly', async () => {
    createProduct({
      name: 'Original Pre-Restore Item',
      code: 'ORIG-01',
      sku: 'ORIG-SKU',
      barcode: '1122334455667',
      costPriceMinor: 5000,
      retailPriceMinor: 9000,
      currentStockScale4: 20000,
    }, ownerSession);

    const bkp = await createBackup(BACKUP_DIR, ownerSession);

    // Now modify the live database by creating another item
    createProduct({
      name: 'Unwanted Post-Backup Item',
      code: 'UNWANTED-01',
      sku: 'UNWANTED-SKU',
      barcode: '7766554433221',
      costPriceMinor: 100,
      retailPriceMinor: 200,
      currentStockScale4: 10000,
    }, ownerSession);

    // Restore from backup
    const restoreResult = await restoreBackup(bkp.backupPath, ownerSession, TEST_DB_PATH);

    expect(restoreResult.success).toBe(true);
    expect(fs.existsSync(restoreResult.preRestoreSnapshotPath)).toBe(true);

    // Verify that the restored database contains original item, but not the unwanted post-backup item
    const db = getDb();
    const origProd = db.prepare('SELECT * FROM products WHERE code = ?').get('ORIG-01');
    const unwantedProd = db.prepare('SELECT * FROM products WHERE code = ?').get('UNWANTED-01');

    expect(origProd).toBeDefined();
    expect(unwantedProd).toBeUndefined();
  });

  it('creates automated background snapshots on shift closures and generates summary', async () => {
    // 1. Create auto-backup simulating shift close
    const autoResult = await createAutoBackup('SHIFT_CLOSE', BACKUP_DIR);

    expect(fs.existsSync(autoResult.backupPath)).toBe(true);
    expect(path.basename(autoResult.backupPath).startsWith('autobackup-SHIFT_CLOSE-')).toBe(true);
    expect(autoResult.sha256).toBeDefined();
    expect(autoResult.reason).toBe('SHIFT_CLOSE');

    // 2. Fetch backups summary
    const summary = getBackupsSummary(BACKUP_DIR);
    expect(summary.totalCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalSizeBytes).toBeGreaterThan(0);
    expect(summary.lastBackupTime).toBeDefined();
    expect(summary.autoBackupEnabled).toBe(true);
    expect(summary.recentBackups.length).toBeGreaterThanOrEqual(1);
    expect(summary.recentBackups[0].isAuto).toBe(true);
  });
});

