// Harsh Apex Universal POS - Backup & Disaster Recovery Service
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb, getDatabasePath, closeDatabase, initDatabase, getSqlModule } from './db';
import { UserSession } from '../../shared/types';
import { assertPermission } from './authService';

export interface BackupResult {
  backupPath: string;
  fileSizeBytes: number;
  sha256: string;
  createdAt: string;
}

export async function createBackup(
  destinationDir?: string,
  session?: UserSession
): Promise<BackupResult> {
  if (session) {
    assertPermission(session, 'shop.backup_restore');
  }

  const db = getDb();
  const targetDir = destinationDir || path.join(path.dirname(getDatabasePath()), 'backups');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-harsh-apex-${timestamp}.db`;
  const backupPath = path.join(targetDir, filename);

  // Backup active database atomically
  await db.backup(backupPath);

  // Validate integrity of newly created backup
  const SQL = await getSqlModule();
  const backupDb = new SQL.Database(fs.readFileSync(backupPath));
  const check = backupDb.exec('PRAGMA integrity_check;');
  backupDb.close();

  if (!check || check.length === 0 || check[0].values[0][0] !== 'ok') {
    fs.unlinkSync(backupPath);
    throw new Error('Backup creation failed: Backup file failed SQLite integrity check.');
  }

  const fileBytes = fs.readFileSync(backupPath);
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

  // Record audit log in main db
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, 'BACKUP_CREATED', 'DATABASE', ?, ?)
  `).run(
    `aud_${crypto.randomUUID()}`,
    new Date().toISOString(),
    session?.userId || 'SYSTEM',
    filename,
    JSON.stringify({ sha256, sizeBytes: fileBytes.length })
  );

  return {
    backupPath,
    fileSizeBytes: fileBytes.length,
    sha256,
    createdAt: new Date().toISOString(),
  };
}

export async function restoreBackup(
  backupFilePath: string,
  session: UserSession,
  customDbPath?: string
): Promise<{ success: boolean; preRestoreSnapshotPath: string }> {
  assertPermission(session, 'shop.backup_restore');
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist at '${backupFilePath}'.`);
  }

  // 1. Verify backup file integrity before touching active database
  const SQL = await getSqlModule();
  const testDb = new SQL.Database(fs.readFileSync(backupFilePath));
  const check = testDb.exec('PRAGMA integrity_check;');
  testDb.close();

  if (!check || check.length === 0 || check[0].values[0][0] !== 'ok') {
    throw new Error('Restore rejected: The chosen backup file is corrupt or invalid.');
  }

  const liveDbPath = customDbPath || getDatabasePath();
  const dir = path.dirname(liveDbPath);

  // 2. Create safety pre-restore snapshot of current live database
  const preRestoreName = `pre-restore-safety-${Date.now()}.db`;
  const preRestorePath = path.join(dir, 'backups', preRestoreName);
  if (!fs.existsSync(path.dirname(preRestorePath))) {
    fs.mkdirSync(path.dirname(preRestorePath), { recursive: true });
  }

  // Close live db connection
  closeDatabase();

  // Copy live db to pre-restore
  if (fs.existsSync(liveDbPath)) {
    fs.copyFileSync(liveDbPath, preRestorePath);
  }

  // 3. Atomically overwrite live db with backup file
  fs.copyFileSync(backupFilePath, liveDbPath);

  // Clean up any remaining WAL/SHM files
  const walPath = `${liveDbPath}-wal`;
  const shmPath = `${liveDbPath}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // 4. Re-initialize database
  await initDatabase(liveDbPath);

  return {
    success: true,
    preRestoreSnapshotPath: preRestorePath,
  };
}
