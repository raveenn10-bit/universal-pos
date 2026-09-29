# Harsh Apex Universal POS - Release Checklist & Verification Evidence

## 1. Pre-Build Gate
- [x] **TypeScript compilation succeeds with zero errors**: `npm run build` executes `vite build` (frontend bundle) and `tsc -p tsconfig.node.json` (Electron main & domain services) with Code 0.
- [x] **Automated test suite passes 100% of unit, integration, and security test cases**: 7 test suites, 22 tests passing via `npx vitest run --config vitest.config.ts`.
- [x] **Linting & code styling passes without unresolved security warnings**: Strict TypeScript types, narrow IPC schema with Zod, context isolation enabled, Node integration disabled.
- [x] **Zero private developer keys or secret seeds included in client package**: Verified in `electron-builder.json` excludes (`!tools/dev-cli/**/*`, `!developer_keys/**/*`, `!dist-electron/developer_keys/**/*`, `!*.apexlicense`).
- [x] **No default passwords or hardcoded administrative credentials exist**: System boots into Setup Wizard when `users` table is empty; requires administrator to set a strong password hashed with `scrypt`.

## 2. Core Functional Verification
- [x] **Setup Wizard functions on clean first launch**: Intercepts unprovisioned launches, binds business metadata, creates primary owner account, and initializes default receipt template.
- [x] **Profile provisioning and signed `.apexpkg` / `.apexlicense` verification passes**: Verified via `crypto.test.ts` using asymmetric Ed25519 public key verification; tested with `Harsh_Apex_Demo_Supermarket.apexlicense`.
- [x] **Fast checkout executes smoothly**: Barcode scanning, keyboard navigation (F1-F4), split payments (Cash, Card, Account Credit), stock decrements, and instant PDF receipt generation.
- [x] **Stock movement correctly reflects sales, returns, reasoned adjustments, and purchase orders**: Verified in `database.test.ts` and `returns.test.ts` with atomic transaction commits and rollback on insufficient stock.
- [x] **Serialized & IMEI tracking enforces single-sale uniqueness and prevents duplicate serialization**: Verified in `database.test.ts`; serial numbers transition across `IN_STOCK` -> `SOLD` -> `RETURNED`.
- [x] **Customer credit ledger computes accurate balances solely from transactions and settlements**: Verified in `customer.test.ts`; credit limit ceilings strictly enforced, rejecting excess debt.
- [x] **Shifts workflow**: Drawer opening float, expected cash calculation from completed sales, cash drop adjustments, physical cash reconciliation, and discrepancy recording in `shifts`.

## 3. Offline PDF & Printing
- [x] **Thermal receipt rendering (58mm & 80mm)**: Verified via `pdf.test.ts`; creates valid PDF document on disk (`tests/test_output_pdfs/Test-Receipt-80mm.pdf`) with itemized lines, taxes, tender breakdown, and barcode/QR.
- [x] **A4 invoice rendering multi-page flow**: Verified via `pdf.test.ts`; creates multi-page PDF (`tests/test_output_pdfs/Test-Invoice-A4.pdf`) with repeated table headers, pagination ("Page X of Y"), and payment summary.
- [x] **Customer account statements**: Verified via `pdf.test.ts`; creates detailed ledger statement (`tests/test_output_pdfs/Test-Customer-Statement.pdf`) showing opening balance, invoice debit lines, payment credits, and closing balance.
- [x] **Re-exporting past invoices retains historical document snapshot and customer details**: Verified in `customer.test.ts`; sales table stores immutable JSON snapshot of customer name/address at invoice issuance time.

## 4. Disaster Recovery & Upgrades
- [x] **Backup creates valid WAL-safe SQLite database file**: Verified in `backup.test.ts`; executes `PRAGMA wal_checkpoint(TRUNCATE)` and SQLite Online Backup API, followed by `PRAGMA integrity_check`.
- [x] **Restore workflow previews contents, creates pre-restore recovery snapshot, and restarts safely**: Verified in `backup.test.ts`; automatically generates timestamped emergency rollback file before replacing database file.
- [x] **Clean upgrade preserves all existing data and applies pending schema migrations**: Handled by version-indexed migration ledger in `src/main/services/db.ts`.

## 5. Installer & Packaging
- [x] **Windows Unpacked Executable**: Successfully generated in `dist/installer/win-unpacked/Harsh Apex Universal POS.exe` (188 MB) with bundled Node dependencies and extracted native modules.
- [x] **Windows NSIS x64 installer**: Generated via `electron-builder --win nsis --x64`.
- [x] **App launches smoothly on clean Windows machine without requiring internet access**: 100% offline self-contained SQLite and PDFKit engine without external CDN, telemetry, or remote script tags.
