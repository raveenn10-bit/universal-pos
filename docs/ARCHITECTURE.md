# Harsh Apex Universal POS - Architecture Document

## 1. System Architecture Overview

Harsh Apex Universal POS is built upon a secure, multi-layer Electron architecture designed specifically to prevent client-side privilege escalation, preserve database consistency, and ensure 100% offline operational capability.

```
+--------------------------------------------------------------------------+
|                        Renderer Process (React 18)                       |
|   UI Components, Fast Checkout, Dashboards, Modals, Local State (Zustand)|
+--------------------------------------------------------------------------+
                                    |
                            window.apexApi (Typed IPC Bridge)
                                    |
+--------------------------------------------------------------------------+
|                        Preload Script (Context Isolation)                |
|   Strictly allowlisted methods, sender validation, input sanitization    |
+--------------------------------------------------------------------------+
                                    |
                            ipcRenderer.invoke() / ipcMain.handle()
                                    |
+--------------------------------------------------------------------------+
|                        Main Process Services (Node.js)                   |
|  - Security & Auth Service (Argon2id/PBKDF2, Session Token, Rate Limits)  |
|  - License & Verification Service (Ed25519 Public Key Verification)      |
|  - Sales & Checkout Service (Atomic Transaction Execution, Idempotency) |
|  - Inventory & Variant Service (Stock Movements, Serial/IMEI Tracking)   |
|  - Customer & Credit Ledger Service (Derived Balances, Statements)       |
|  - Procurement & Supplier Service (GRN Intake, Weighted Cost Valuation)   |
|  - PDF & Print Engine (Offline PDFKit & Electron Print Pipeline)         |
|  - Backup & Maintenance Service (SQLite Backup API, WAL Checkpointing)   |
+--------------------------------------------------------------------------+
                                    |
                            Zod Schema Validation & Domain Rules
                                    |
+--------------------------------------------------------------------------+
|                        Repository & Persistence Layer                    |
|   SQLite with WAL Mode, Foreign Keys ON, Parameterized Prepared Queries   |
+--------------------------------------------------------------------------+
```

---

## 2. Layer Definitions & Boundaries

### 2.1 Renderer Layer (Presentation)
- **Technology**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Security Constraints**:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true` (where compatible)
  - Content Security Policy (CSP): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';`
- **State Management**: Reactive UI state with zero direct access to filesystem, child processes, or SQLite. All domain operations trigger typed preload API methods.

### 2.2 Preload Bridge (`window.apexApi`)
- Uses Electron `contextBridge.exposeInMainWorld('apexApi', ...)`.
- Exposes only explicit, domain-specific request/response functions (e.g. `apexApi.checkout.processSale(payload)`).
- Never exposes generic IPC dispatchers (`send`, `invoke('arbitrary-channel')`) or raw SQL strings.

### 2.3 Privileged Main Process & Application Services
- Validates every IPC payload using strict **Zod** schemas before dispatching to business services.
- Verifies session tokens, active role permissions, and cashier shift state before executing state-mutating commands.
- Implements transaction wrappers ensuring atomic commits and rollbacks across related ledger tables.

### 2.4 Data Persistence Layer
- Embedded SQLite with write-ahead logging (`PRAGMA journal_mode = WAL;`).
- Foreign key enforcement: `PRAGMA foreign_keys = ON;`.
- Synchronous durability: `PRAGMA synchronous = NORMAL;`.
- Busy timeouts configured to prevent table locking contention during concurrent reads/writes.
- Money stored as 64-bit integer minor units (cents / integer cents) to eradicate floating-point rounding errors.

---

## 3. Cryptographic Separation & Provisioning Architecture

```
+------------------------------------+          +------------------------------------+
|       Developer Console / CLI      |          |         Client POS Terminal        |
|      (Private Developer System)    |          |          (Customer Desktop)        |
|                                    |          |                                    |
|  [ Ed25519 Private Key (Secret) ]  |          |  [ Embedded Ed25519 Public Key ]   |
|                 |                  |          |                  |                 |
|  Creates & Signs Provisioning Pkg  | -------> |  Imports Signed Provisioning Pkg   |
|  - Profile: Supermarket/Mobile/etc | delivery |  - Verifies Ed25519 Signature      |
|  - Licensed Modules                |          |  - Validates Hardware Fingerprint  |
|  - Industry Custom Field Schemas   |          |  - Unlocks Permitted Workflows     |
+------------------------------------+          +------------------------------------+
```

- **Private Key**: Never leaves the product developer's build environment. Excluded from client builds via `.gitignore` and `electron-builder` filter rules.
- **Client Verification**: POS client reads the embedded public key to verify provisioning signatures. If a tampering attempt or unsigned package is supplied, the profile transition is rejected with audit logging.
