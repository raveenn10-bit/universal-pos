# Harsh Apex Universal POS - Customer Management & Credit Ledger Guide

## 1. Customer Records
Every customer in Harsh Apex Universal POS is tracked with:
- Unique sequential Customer Code (e.g. `CST-00001`).
- Customer Type: Individual or Corporate Business entity.
- Primary Phone & Secondary Phone.
- Billing Address & Tax TIN / Registration Number.
- Credit Limit (minor units) and payment terms in days.

---

## 2. Walk-in vs Registered Customers
- **Walk-in Sales**: Fast frontline sales require no customer registration. Cart checkout defaults to "Walk-in Customer".
- **Quick-Add During Checkout**: Cashiers can register a customer on the fly without abandoning or clearing the current cart.
- **Duplicate Protection**: System indexes customer phone numbers and customer codes to warn on potential duplicates.

---

## 3. Authoritative Credit Ledger
- **No Arbitrary Edits**: Customer balance is not an editable field.
- **Transaction-Derived Balance**: Balance is derived exclusively from posted transactions:
  $$\text{Balance} = \sum(\text{Invoiced Charges}) - \sum(\text{Settlement Payments}) - \sum(\text{Return Credits})$$
- **Credit Limit Enforcement**: If a customer attempts to purchase on store credit that would cause their balance to exceed their defined credit limit, checkout blocks the transaction with an explicit error.
- **Settlement Payments**: Payments made by customers against outstanding accounts create an auditable `SETTLEMENT_PAYMENT` ledger record.
- **Account Statements**: Exportable A4 PDF statement detailing every transaction and running balance.
