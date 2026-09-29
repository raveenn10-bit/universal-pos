# Harsh Apex Universal POS - Backup, Recovery & Disaster Planning

## 1. Backup Architecture
- **Engine**: Native SQLite Online Backup API (`db.backup()`).
- **Consistency**: Guarantees a clean, point-in-time snapshot even while the system is processing live sales.
- **WAL-Safety**: Checkpoints write-ahead logging (WAL) pages to ensure zero uncommitted or orphaned data.
- **Integrity Check**: Every created backup is automatically verified using `PRAGMA integrity_check;` before being marked successful.

---

## 2. Backup Procedures
- **Manual Backups**: Initiated from the **Settings** view (`Create Immediate Database Backup`).
- **Storage Location**: Backups are written to `%APPDATA%/HarshApexPOS/backups/`. It is strongly recommended to regularly copy these timestamped `.db` files to an external USB drive or secure local storage.

---

## 3. Disaster Recovery & Restoration
- When restoring from a backup:
  1. The system validates the backup file's SQLite header and schema.
  2. The system automatically creates a safety **pre-restore recovery snapshot** (`pre-restore-safety-[timestamp].db`) of the live database.
  3. The active database connection is safely closed.
  4. The live database file is atomically replaced.
  5. The database connection and schema are re-initialized cleanly.
