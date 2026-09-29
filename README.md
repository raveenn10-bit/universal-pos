# Harsh Apex Universal POS 🚀
**Offline Commercial Windows Desktop Point of Sale (POS) System**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-34.5-darkblue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_ACID-green.svg)](https://sqlite.org/)
[![Vitest](https://img.shields.io/badge/Tests-22%20Passed-success.svg)](https://vitest.dev/)

**Harsh Apex Universal POS** is a 100% offline, production-grade Windows desktop POS solution engineered with an extensible multi-business profile architecture. Designed for commercial client deployments, it empowers developers to provision and configure client installations across 7 major retail verticals without rewriting source code.

---

## 🌟 Key Capabilities & Highlights

1. **7 Native Commercial Business Profiles**:
   - **General Retail**: Fast barcode scanning, quick tender, receipts.
   - **Supermarket**: Weight scale integration (kg), barcode lookup, batch/expiry controls.
   - **Mobile Phones**: Dual IMEI tracking (IMEI 1 & 2), brand/model registry, warranty terms.
   - **Mobile Accessories**: Multi-compatibility mapping, bulk discounts, serial numbers.
   - **Electronics**: Serialized inventory tracking, warranty registration, RMA/repair returns.
   - **Shoes & Footwear**: Multi-dimensional variant matrices (EU/UK sizes 38–45, colorways, materials).
   - **Bags & Fashion**: Apparel sizing, seasonal styles, brand categorization, customer loyalty.

2. **Apple Vision POS Quick Actions & 5 Dedicated Dashboards**:
   - **Customers Dashboard**: Credit limit guardrails, ledger balances, settlements, A4 customer statements.
   - **Products Dashboard**: Catalog management, live stock status indicators, stock adjustments, batch/expiry tracking.
   - **Orders Dashboard**: Comprehensive sales history, detailed invoice modals, 80mm thermal reprint, A4 PDF generation.
   - **Shifts Dashboard**: Register opening floats, Cash In/Cash Out, discrepancy reconciliation (Over/Short), shift history logs.
   - **Reports Dashboard**: P&L analysis, COGS, gross margins, best-sellers, category breakdown.
   - **Quick Actions Bar**: Instant access to F1 New Sale, Add Product, Add Customer, Drawer Shifts, and A4 Invoices.

3. **Pixel-Perfect A4 Tax Invoices & Thermal Receipts**:
   - High-fidelity **A4 Tax Invoice** design matching enterprise standard (Coral Red `#EE4D38` accents, zebra rows, payment details, manager signature block, grand total banner, thank-you footer).
   - Direct offline PDFKit generation for **80mm & 58mm ESC/POS thermal receipts**.

4. **Ironclad Developer Protection (Ed25519 Cryptography)**:
   - Developer private signing key (`dev_priv.pem`) is kept strictly external to the customer runtime.
   - Runtime contains only the public verification key (`dev_pub.pem`).
   - Zero hardcoded backdoors, universal master PINs, or hidden menus.
   - Profile switching and feature unlocks require a developer-signed `.apexlicense` package.

---

## 🔑 Production Credentials (Default Seeded Account)

| Attribute | Value |
|---|---|
| **Username** | `harshapex` |
| **Password** | `chami2003` |
| **Quick POS PIN** | `2003` |
| **Full Name** | `Harsh Apex Administrator` |
| **Account Role** | `owner` (Full administrative & operational access) |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│               Renderer Process (React 18)              │
│       Tailwind CSS v4 · Recharts · Lucide Icons        │
└───────────────────────────┬────────────────────────────┘
                            │ contextBridge (window.apexApi)
┌───────────────────────────▼────────────────────────────┐
│                    Preload Script                      │
│        Strict IPC Type Validation & Allowlisting       │
└───────────────────────────┬────────────────────────────┘
                            │ IPC Invoke / Handle
┌───────────────────────────▼────────────────────────────┐
│           Electron Main Layer (Node.js runtime)        │
│   AuthService · CatalogService · InventoryService      │
│   CheckoutService · ReturnService · CustomerService    │
│   ShiftService · ReportService · PdfService · Backup   │
└───────────────────────────┬────────────────────────────┘
                            │ Parameterized SQL Queries
┌───────────────────────────▼────────────────────────────┐
│         SQLite Engine (Pure WebAssembly sql.js)        │
│    WAL Mode · Synchronous Normal · Foreign Keys Active │
│           Persistent Path: %APPDATA%/HarshApexPOS/     │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started (Development & Build)

### Prerequisites
- Windows 10 / 11 (x64)
- Node.js v20+ or v22+
- npm v10+

### Installation
```bash
git clone https://github.com/raveenn10-bit/universal-pos.git
cd universal-pos
npm install
```

### Run Automated Tests
```bash
npm test
# Running 7 test suites (22 tests) with 100% pass rate
```

### Build Renderer & Main
```bash
npm run build:vite
npm run build:electron
```

### Package Windows Installer (.exe)
```bash
npx electron-builder --win --x64
# Output: dist/installer/Harsh Apex Universal POS Setup 1.0.0.exe
```

---

## 📁 Repository Structure

```
├── .gitignore
├── electron-builder.json      # Windows NSIS packaging configuration
├── package.json
├── vite.config.ts             # Vite configuration with targeted sources
├── vitest.config.ts           # Vitest configuration
├── docs/                      # Architectural & operational documentation
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PERMISSIONS.md
│   ├── PRODUCT_SPEC.md
│   ├── TEST_PLAN.md
│   ├── RELEASE_CHECKLIST.md
│   └── PROGRESS.md
├── src/
│   ├── main/                  # Electron Main privileged processes
│   │   ├── crypto/            # Ed25519 signer & scrypt hasher
│   │   ├── ipc/               # Validated IPC handlers
│   │   ├── services/          # Business logic services & SQLite
│   │   ├── index.ts           # Electron app lifecycle & window
│   │   └── preload.ts         # contextBridge API
│   ├── renderer/              # React 18 UI
│   │   └── src/
│   │       ├── components/    # Dedicated dashboards & POS screens
│   │       └── App.tsx        # Main application router & quick actions
│   └── shared/                # Common TypeScript interfaces & schemas
├── tests/                     # 22 Automated Vitest test suites
└── tools/                     # Standalone developer provisioning CLI
```

---

## 🇱🇰 සිංහල සාරාංශය (Sinhala Summary)

**Harsh Apex Universal POS** යනු ඕනෑම වෙළඳ ව්‍යාපාරයකට ගැළපෙන පරිදි සකසන ලද 100% Offline ක්‍රියාත්මක වන Windows Desktop POS මෘදුකාංගයකි:
- සිල්ලර බඩු (Supermarket), දුරකථන (Mobile Phones - Dual IMEI), ඉලෙක්ට්‍රොනික්ස් (Electronics - Serial Number), පාවහන් (Shoes) සහ විලාසිතා (Fashion) ඇතුළු ව්‍යාපාරික ක්ෂේත්‍ර 7කට පූර්ණ සහය.
- Ed25519 Cryptographic ආරක්ෂාව සහිත බැවින් පාරිභෝගිකයාට අනවසරයෙන් Profile මාරු කිරීමට හෝ Developer බලතල ලබා ගැනීමට නොහැක.
- ආකර්ෂණීය A4 Tax Invoice සහ 80mm/58mm Thermal Receipt ක්ෂණික මුද්‍රණය.
- මුදල් ලාච්චු කළමනාකරණය (Cash Drawer Shifts), පාරිභෝගික ණය ගිණුම් (Customer Ledgers) සහ තොග පාලනය (Live Inventory).

---

## 📄 License & Rights
© 2026 Harsh Apex. Commercial Proprietary Desktop Software. All Rights Reserved.
