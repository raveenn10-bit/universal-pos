# Harsh Apex Universal POS - Data Model Specification

## 1. Relational Database Design Principles
- **Driver**: SQLite3 (via `better-sqlite3` and `node:sqlite`).
- **Pragmas**:
  - `PRAGMA journal_mode = WAL;`
  - `PRAGMA foreign_keys = ON;`
  - `PRAGMA synchronous = NORMAL;`
  - `PRAGMA busy_timeout = 5000;`
- **Currency & Money Precision**: All monetary values are represented as integer minor units (`INTEGER`), e.g., `LKR 1,250.50` = `125050`. No floating-point numbers are used in financial calculations or stored totals.
- **Quantity Precision**: Quantities for continuous units (kg, liters, meters) are stored as fixed-scale integers with 4 decimal places (`scale = 10000`), e.g. `1.250 kg` = `12500`.

---

## 2. Core Tables Schema

### 2.1 System & Licensing
- `app_meta`: Key-value store for database version, migration level, schema timestamps.
- `licenses`: Stores active signed license manifest, hardware binding hash, edition, expiry/term, profile identifier, public key fingerprint.
- `business_profile_config`: Active profile attributes, enabled modules, custom fields schema, terminology mapping.
- `audit_logs`: Immutable security and financial audit trail (id, timestamp, user_id, action, entity_type, entity_id, details_json, ip_or_machine).

### 2.2 Users & Authentication
- `users`: id, username, full_name, role (`developer`, `owner`, `manager`, `cashier`), password_hash (Argon2id/PBKDF2-SHA256 with salt), pin_hash, is_active, created_at, updated_at.
- `user_permissions`: user_id or role, permission_key, is_granted.
- `shifts`: id, cashier_id, opened_at, closed_at, opening_cash_minor, closing_cash_counted_minor, closing_cash_expected_minor, discrepancy_minor, notes, status (`OPEN`, `CLOSED`).
- `shift_cash_events`: id, shift_id, event_type (`CASH_IN`, `CASH_OUT`, `DROP`), amount_minor, reason, created_at.

### 2.3 Catalog & Inventory
- `categories`: id, name, parent_id, code, description, is_active.
- `brands`: id, name, description, is_active.
- `products`:
  - id, code, sku, barcode, name, description, category_id, brand_id.
  - product_type (`STANDARD`, `VARIANT_PARENT`, `SERIALIZED`, `BATCHED`, `WEIGHTED`).
  - unit_of_measure (`PCS`, `KG`, `G`, `L`, `M`, etc.).
  - cost_price_minor (weighted average cost).
  - retail_price_minor (default selling price).
  - wholesale_price_minor, min_price_minor.
  - tax_rate_bps (basis points: 100 bps = 1.00%).
  - is_tax_inclusive (1 or 0).
  - track_inventory (1 or 0).
  - reorder_level, target_stock.
  - image_path.
  - custom_fields_json (typed industry attributes: e.g. compatibility, model, fashion season).
  - is_active, created_at, updated_at.
- `product_variants`:
  - id, parent_product_id, sku, barcode, variant_name, attribute_values_json (e.g. `{ "size": "42", "color": "Blue" }`), cost_price_minor, retail_price_minor, is_active.
- `inventory_items` (Serialized / IMEI tracking):
  - id, product_id, variant_id, serial_number, imei_1, imei_2, condition (`NEW`, `USED`, `REFURBISHED`), warranty_months, status (`AVAILABLE`, `SOLD`, `RESERVED`, `DAMAGED`, `RETURNED_QUARANTINE`), acquisition_cost_minor, intake_date, sold_at_sale_id.
  - *Unique Constraints*: `UNIQUE(serial_number)`, `UNIQUE(imei_1)`, `UNIQUE(imei_2)` with leading zeros preserved as text.
- `inventory_batches`:
  - id, product_id, batch_number, expiry_date, quantity_scale4, cost_price_minor, created_at.
- `stock_levels`:
  - product_id, variant_id, quantity_scale4 (current on-hand quantity).
- `stock_movements`:
  - id, timestamp, product_id, variant_id, movement_type (`PURCHASE_INTAKE`, `SALE`, `SALE_RETURN_RESTOCK`, `SALE_RETURN_DAMAGED`, `ADJUSTMENT_ADD`, `ADJUSTMENT_REDUCE`, `TRADE_IN`), quantity_scale4, unit_cost_minor, reference_id, reference_type, notes, user_id.

### 2.4 Customers & Credit
- `customers`:
  - id, customer_code, customer_type (`INDIVIDUAL`, `BUSINESS`), name, phone, phone_secondary, email, address_billing, company_name, tax_id, credit_limit_minor, payment_terms_days, notes, is_active, created_at, updated_at.
- `customer_transactions`:
  - id, timestamp, customer_id, transaction_type (`INVOICE_CHARGE`, `SETTLEMENT_PAYMENT`, `RETURN_CREDIT`, `OPENING_BALANCE`), reference_id, reference_number, debit_minor, credit_minor, running_balance_minor, notes, user_id.

### 2.5 Sales, Invoices & Checkout
- `sales`:
  - id, invoice_number (sequential format e.g. `INV-2026-00001`), sale_date, shift_id, cashier_id, customer_id, customer_snapshot_json, subtotal_minor, discount_minor, discount_type (`PERCENT`, `FIXED`), tax_minor, total_minor, paid_minor, change_minor, balance_due_minor, payment_status (`PAID`, `PARTIAL`, `UNPAID`), sale_status (`COMPLETED`, `VOIDED`, `CORRECTED`, `RETURNED`), template_version_id, notes, idempotency_key (prevents duplicate submission), created_at.
- `sale_items`:
  - id, sale_id, product_id, variant_id, product_name, sku, barcode, quantity_scale4, unit_price_minor, unit_cost_minor, discount_minor, tax_rate_bps, tax_minor, line_total_minor, serial_numbers_json, batch_id, is_returned.
- `sale_payments`:
  - id, sale_id, payment_method (`CASH`, `CARD`, `BANK_TRANSFER`, `CREDIT`), amount_minor, reference_info, created_at.
- `returns`:
  - id, return_number, original_sale_id, return_date, cashier_id, customer_id, total_refund_minor, refund_method (`CASH`, `CREDIT_NOTE`, `ORIGINAL_TENDER`), reason, created_at.
- `return_items`:
  - id, return_id, original_sale_item_id, product_id, variant_id, quantity_scale4, unit_price_minor, tax_refund_minor, total_refund_minor, disposition (`RESTOCK`, `DAMAGED_QUARANTINE`), serial_numbers_json.

### 2.6 Procurement & Suppliers
- `suppliers`: id, name, contact_person, phone, email, address, tax_id, is_active.
- `purchase_orders`: id, po_number, supplier_id, order_date, status (`DRAFT`, `RECEIVED`, `CANCELLED`), total_cost_minor, notes, created_at.
- `purchase_items`: id, purchase_order_id, product_id, variant_id, quantity_scale4, unit_cost_minor, line_total_minor, batch_number, expiry_date.

### 2.7 Document Templates
- `document_templates`:
  - id, template_type (`RECEIPT_58MM`, `RECEIPT_80MM`, `INVOICE_A4`), version, title, is_active, config_json (layout, margins, font_family, font_size, accent_color, header_text, footer_text, logo_path, terms_text, column_visibility), created_at, published_at.
