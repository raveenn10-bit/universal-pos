# Harsh Apex Universal POS - Product Specification

## 1. Product Overview
**Harsh Apex Universal POS** is a commercial-grade, multi-profile offline Windows desktop Point of Sale (POS) system engineered for high-reliability local retail and specialized storefront operations. 

It provides an extensible profile/module architecture that allows the product developer to configure and license bespoke retail configurations (such as supermarkets, mobile stores, electronics, apparel, and general retail) without modifying core application source code.

### Target Deployment Model
- **Deployment Platform**: Windows 10/11 x64 standalone workstations.
- **Operating Topology**: 100% offline-capable. Local embedded SQLite database per installation.
- **Client Segregation**: Single tenant / single business per installation with isolated local data directory.
- **Staff Accounts**: Role-based access control with multiple concurrent or shift-based cashier and manager logins on the same physical terminal.
- **Default Locale & Currency**: Currency = `LKR` (Sri Lankan Rupee), Default Timezone = `Asia/Colombo`. Configurable to international ISO currency minor-unit definitions.

---

## 2. Core Business Profiles
The product architecture separates universal commerce logic (catalog, pricing, discounts, tax, tenders, ledger, audit) from industry-specific profile dimensions:

1. **General Retail**: Standard SKU/barcode products, unit pricing, basic inventory, categories, and brands.
2. **Supermarket**: Fast barcode scanning, weighted/fractional quantities (grams, kg, liters), batch numbers, manufacturer expiry dates, FIFO/FEFO tracking.
3. **Mobile Phones**: Serial/IMEI lifecycle tracking (single and dual-SIM IMEIs), device condition (Brand New, Used, Refurbished), warranty durations, battery health, trade-in buyback workflows (acquisition value credited against sale).
4. **Mobile Accessories**: High-density SKU scanning, compatibility matrices (brand/model compatibility tags), bundle discounts.
5. **Electronics**: Serial number capture at intake and checkout, manufacturer warranty tracking, extended warranty slips, technical spec attributes.
6. **Shoes**: Matrix variants (Size, Color, Width), parent-child SKU relationships, box barcode support.
7. **Bags and Fashion**: Seasonal collections, style codes, color/fabric/size variant grids, garment tags.

*Note on Profile Integrity*: Specialized domains outside this scope (e.g. table-service dining, kitchen display systems, room reservations, pharmaceutical prescription controls) are not marketed or enabled without dedicated industry modules.

---

## 3. Operational Roles & Security Separation

### Tier A: Product Developer (External Authority Only)
- **Tooling**: Standalone Developer Console/CLI (`tools/dev-cli`), strictly excluded from client installer distributions.
- **Cryptographic Authority**: Ed25519 asymmetric key pair. Developer signs provisioning packages and profile conversions with a private key kept offline on the developer machine. The POS client contains only the public verification key.
- **Developer Scope**:
  - Issue cryptographically signed installation provisioning packages (`.apexlicense` / `.apexpkg`).
  - Configure enabled business modules, custom field schemas, and industry workflows.
  - Issue profile conversion packages (e.g., General Retail to Mobile Store) with automated rollback safeties.
  - License term enforcement and device-binding authorizations.
- **Anti-Backdoor Policy**: No master PIN, no backdoor developer accounts, no bypass shortcuts. Developer access to customer data requires explicit, auditable, owner-consented operational export.

### Tier B: Shop Owner / Administrator
- **Operational Scope**: Full administrative control within the developer-licensed profile.
- **Capabilities**: Complete product catalog, price management, purchase orders, customer ledgers, credit terms, sales and refund processing, expense entry, cashier shift controls, document template customization, system backups and restores, audit review.
- **Boundaries**: Cannot modify the signed business profile, cannot unlock unlicensed modules, cannot alter cryptographic verification keys, cannot silently alter committed financial records.

### Tier C: Manager & Cashier
- **Operational Scope**: Frontline checkout, barcode scanning, tender processing, customer lookup, cash drawer handling.
- **Privilege Enforcement**: Configurable granular permissions (e.g. line discount limits, manual price overrides, returns, voiding, drawer kick) enforced in the application backend/IPC layer. Sensitive operations require manager credential elevation.

---

## 4. Key Functional Modules
- **Fast Checkout & POS**: Keyboard-first interface (F-keys, Enter), rapid barcode ingestion, cart calculation with penny-accurate minor-unit math, split tenders (Cash, Card, Bank Transfer, Customer Credit), customer quick-add without cart loss.
- **Inventory & Variants**: Real-time stock counts, weighted averages, serial/IMEI uniqueness enforcement, batch/expiry controls, reasoned adjustments.
- **Procurement & Suppliers**: Supplier master, Purchase Orders, Goods Received Notes (GRN) posting directly to inventory, purchase returns.
- **Customer Ledger & Credit**: Walk-in sales, registered customer balances derived exclusively from posted transactions and settlements, credit limits, account statements.
- **Returns & Corrections**: Original invoice linkage, returned item quarantine/restock distinction, non-destructive invoice corrections.
- **Shifts & Cash Management**: Shift open, cash drop / cash out, expected cash computation, physical drawer reconciliation, blind close option.
- **Document Engine & PDF Generation**: 100% offline generation for 58mm/80mm thermal receipts and A4 invoices with multi-page flow, Unicode/Sinhala script support, selectable text, and integrity hashes.
- **Backup & Recovery**: WAL-safe SQLite backups, external storage support, pre-migration snapshots, authenticated encryption option.
