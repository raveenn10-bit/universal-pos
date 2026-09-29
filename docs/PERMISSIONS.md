# Harsh Apex Universal POS - Permissions & Access Control

## 1. Permission Matrix & Hierarchy

| Permission Key | Developer (External) | Shop Owner / Admin | Store Manager | Cashier | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `dev.issue_license` |  (Signed) |  |  |  | Requires offline Ed25519 private key |
| `dev.change_profile` |  (Signed) |  |  |  | Profile conversion requires signed package |
| `dev.unlock_module` |  (Signed) |  |  |  | Unlocking unlicensed features |
| `dev.manage_custom_fields` |  (Signed) |  |  |  | Schema expansion definitions |
| `shop.manage_settings` |  |  |  |  | Shop branding, contacts, receipt footer |
| `shop.edit_templates` |  |  |  |  | Document template customizer |
| `shop.backup_restore` |  |  |  |  | Database snapshots, recovery execution |
| `shop.manage_staff` |  |  |  |  | Create/edit accounts & operational roles |
| `shop.view_audit_log` |  |  |  |  | Audit inspection & export |
| `shop.correct_invoice` |  |  |  |  | Financial correction & re-issue flow |
| `catalog.manage_products` |  |  |  |  | Create, edit, delete products/variants |
| `catalog.adjust_stock` |  |  |  |  | Reasoned manual stock adjustments |
| `procurement.manage_po` |  |  |  |  | Create purchase orders & intake stock |
| `procurement.manage_suppliers`|  |  |  |  | Supplier records & payable balances |
| `pos.fast_checkout` |  |  |  |  | Core billing & barcode scanning |
| `pos.apply_line_discount` |  |  |  | Configurable | Cashier discount capped by threshold |
| `pos.apply_cart_discount` |  |  |  | Configurable | Re-authentication required if > limit |
| `pos.price_override` |  |  |  |  | Cashier cannot arbitrarily edit price |
| `pos.process_return` |  |  |  |  | Requires manager sign-off if configured |
| `pos.void_item` |  |  |  | Configurable | Requires manager approval for post-scan void |
| `pos.cash_drop` |  |  |  |  | Safe drop & cash movement tracking |
| `reports.view_daily_sales`|  |  |  |  | Cashier views own shift summary only |
| `reports.view_financials` |  |  |  |  | P&L summary, COGS, tax reports |
| `customer.manage` |  |  |  | Quick-Add | Cashiers can quick-add during checkout |
| `customer.export_ledger` |  |  |  |  | Bulk export restricted & audited |

---

## 2. Service-Layer Enforcement Rule
Permissions are not merely UI visual toggles. Every IPC invocation in the Electron main process invokes:
```typescript
authService.assertPermission(sessionContext, requiredPermission);
```
If the session lacks the active privilege, an unauthorized exception is thrown, the operation is blocked, and an audit warning event is permanently recorded in `audit_logs`.
