# Harsh Apex Universal POS - Comprehensive Test Plan

## 1. Test Methodology & Scope
This test plan validates the entire operational lifecycle of Harsh Apex Universal POS, ensuring rock-solid data integrity, strict cryptographic separation, offline resilience, and fast cashier checkout.

---

## 2. Test Suites

### 2.1 Suite 1: Mathematical & Financial Precision
- **Minor-unit Money Calculations**: Verifies integer arithmetic across subtotal, line discounts, global percentage discounts, tax basis points (e.g. 8.00% = 800 bps), change calculation, and split payments.
- **Rounding Strategy**: Half-up / bankers rounding test vectors ensuring no 1-cent divergence between cart, receipt totals, invoice totals, and ledger entries.
- **Weighted Quantities**: Unit calculations for fractional weights (grams, kilograms) with 4-decimal fixed point scaling.

### 2.2 Suite 2: Cryptographic Security & Developer Authority
- **Ed25519 License Validation**: Validates legitimate signature acceptance, malformed signature rejection, expired term rejection, hardware fingerprint mismatches.
- **Tampering Resistance**: Simulating shop admin editing `licenses` or `business_profile_config` tables directly or unsigned files; system detects signature mismatch and halts unauthorized profile execution.
- **Private Key Exclusivity**: Verifies no private keys or test key material exist in client distribution builds.

### 2.3 Suite 3: Catalog, Inventory & Specialized Profile Rules
- **Serial & IMEI Uniqueness**: Preventing double selling of any active serial or IMEI. Preserving leading zeros (`00192837465`).
- **Batches & Expiry (Supermarkets)**: Verifying FIFO/FEFO picking and warnings for expired batches.
- **Variants (Shoes & Fashion)**: Matrix variant parent-child link, stock tracking per variant (e.g. Size 42 / Red vs Size 44 / Blue).
- **Mobile Trade-in Intake**: Verifying trade-in acquisition value records device intake into stock at acquisition cost without inflating sales revenue.

### 2.4 Suite 4: Transaction Atomicity & Idempotency
- **Duplicate Checkout Prevention**: Rapid duplicate submission testing with same idempotency key; only one sale record and stock decrement occurs.
- **Rollback on Error**: Simulated failure mid-transaction (e.g. out of stock or constraint violation); all tables (sales, sale_items, stock_levels, stock_movements, customer_transactions) remain completely unchanged.
- **Negative Stock Blocking**: Default blocking of sales when on-hand quantity is insufficient.

### 2.5 Suite 5: Returns, Exchanges & Corrections
- **Return Quantity Limits**: Ensuring cumulative return cannot exceed original purchase quantity.
- **Restock vs Damage**: Sellable returns increase on-hand stock; damaged items route to quarantined inventory.
- **Invoice Correction**: Modifying a non-financial error creates an auditable reissued invoice version; modifying a financial error requires linked reversal and credit note.

### 2.6 Suite 6: Offline PDF Generation & Template Customization
- **Receipt Formats**: 58mm and 80mm thermal receipt generation with crisp vector layout and barcode.
- **Invoice Format**: A4 multi-page pagination with repeated table headers, page numbers (`Page X of Y`), selectable text, and zero truncated rows.
- **Sinhala & Unicode**: Proper rendering of local typography and Sinhala text strings without character corruption.
- **Template Version Snapshot**: Re-exporting an old invoice reproduces its exact historical template and pricing state, immune to subsequent template changes.

### 2.7 Suite 7: Backup, Restore & Disaster Recovery
- **WAL-safe Snapshot**: Creating live backup while SQLite WAL journal is active.
- **Restore Validation**: Validating database header and schema version before replacing database file. Pre-restore snapshot generation.
