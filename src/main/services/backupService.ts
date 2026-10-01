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
  reason?: string;
}

export interface BackupsSummary {
  totalCount: number;
  totalSizeBytes: number;
  lastBackupTime: string | null;
  lastBackupFilename: string | null;
  backupsDir: string;
  autoBackupEnabled: boolean;
  autoBackupScheduleText: string;
  recentBackups: {
    filename: string;
    filePath: string;
    sizeBytes: number;
    createdAt: string;
    isAuto: boolean;
  }[];
}

const MAX_AUTO_BACKUPS = 30; // Rotate and keep most recent 30 automated snapshots

/**
 * Creates an on-demand manual or triggered database backup with SQLite integrity verification.
 */
export async function createBackup(
  destinationDir?: string,
  session?: UserSession,
  reason: string = 'MANUAL'
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
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
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
    JSON.stringify({ sha256, sizeBytes: fileBytes.length, reason })
  );

  return {
    backupPath,
    fileSizeBytes: fileBytes.length,
    sha256,
    createdAt: new Date().toISOString(),
    reason,
  };
}

/**
 * Creates an automated background backup.
 * Invoked on shift closures, periodic intervals (every 4 hours), or application startup/exit.
 * Automatically prunes old backups beyond MAX_AUTO_BACKUPS.
 */
export async function createAutoBackup(
  reason: 'SHIFT_CLOSE' | 'HOURLY' | 'DAILY' | 'STARTUP' | 'MANUAL' = 'HOURLY',
  destinationDir?: string
): Promise<BackupResult> {
  const db = getDb();
  const targetDir = destinationDir || path.join(path.dirname(getDatabasePath()), 'backups');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `autobackup-${reason}-${timestamp}.db`;
  const backupPath = path.join(targetDir, filename);

  // 1. Atomically backup SQLite memory/file to disk
  await db.backup(backupPath);

  // 2. Validate integrity
  const SQL = await getSqlModule();
  const backupDb = new SQL.Database(fs.readFileSync(backupPath));
  const check = backupDb.exec('PRAGMA integrity_check;');
  backupDb.close();

  if (!check || check.length === 0 || check[0].values[0][0] !== 'ok') {
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    throw new Error(`Auto-backup rejected: Integrity check failed for '${filename}'.`);
  }

  const fileBytes = fs.readFileSync(backupPath);
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

  // 3. Log audit event
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, 'SYSTEM_DAEMON', 'AUTOBACKUP_CREATED', 'DATABASE', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      new Date().toISOString(),
      filename,
      JSON.stringify({ sha256, sizeBytes: fileBytes.length, reason })
    );
  } catch {}

  // 4. Prune older automated backups to prevent disk bloat
  try {
    pruneOldAutoBackups(targetDir);
  } catch (err) {
    console.warn('[AutoBackup] Pruning warning:', err);
  }

  return {
    backupPath,
    fileSizeBytes: fileBytes.length,
    sha256,
    createdAt: new Date().toISOString(),
    reason,
  };
}

/**
 * Prunes automated backups keeping the most recent MAX_AUTO_BACKUPS.
 */
function pruneOldAutoBackups(targetDir: string): void {
  if (!fs.existsSync(targetDir)) return;
  const files = fs.readdirSync(targetDir)
    .filter(f => f.startsWith('autobackup-') && f.endsWith('.db'))
    .map(f => {
      const p = path.join(targetDir, f);
      const stat = fs.statSync(p);
      return { path: p, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime); // Newest first

  if (files.length > MAX_AUTO_BACKUPS) {
    const toDelete = files.slice(MAX_AUTO_BACKUPS);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(f.path);
      } catch {}
    }
  }
}

/**
 * Returns comprehensive summary information about local backups for Settings UI.
 */
export function getBackupsSummary(destinationDir?: string): BackupsSummary {
  const targetDir = destinationDir || path.join(path.dirname(getDatabasePath()), 'backups');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const entries = fs.readdirSync(targetDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const p = path.join(targetDir, f);
      const stat = fs.statSync(p);
      return {
        filename: f,
        filePath: p,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        isAuto: f.startsWith('autobackup-'),
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const totalCount = entries.length;
  const totalSizeBytes = entries.reduce((acc, it) => acc + it.sizeBytes, 0);
  const lastBackup = entries[0] || null;

  return {
    totalCount,
    totalSizeBytes,
    lastBackupTime: lastBackup ? lastBackup.createdAt : null,
    lastBackupFilename: lastBackup ? lastBackup.filename : null,
    backupsDir: targetDir,
    autoBackupEnabled: true,
    autoBackupScheduleText: 'Every Shift Closure & 4-Hour Schedule',
    recentBackups: entries.slice(0, 8).map(e => ({
      filename: e.filename,
      filePath: e.filePath,
      sizeBytes: e.sizeBytes,
      createdAt: e.createdAt,
      isAuto: e.isAuto,
    })),
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
