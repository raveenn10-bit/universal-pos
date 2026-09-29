# Harsh Apex Universal POS - Known Limitations & Assumptions

## 1. Operating Environment & Assumptions
- **Host Operating System**: Windows 10/11 x64.
- **Physical Machine**: Single terminal deployment per business location. Database is stored locally in Windows `AppData` directory (`%APPDATA%/HarshApexPOS/data/pos.db`).
- **Concurrent Instances**: Mutex / single-instance lock prevents two application instances from accessing the same SQLite database file simultaneously.
- **Local Administrator Access**: As with any on-premise native application, users with Windows Local Administrator privileges have underlying access to files on disk. Database integrity checks, signed configs, and audit logs provide strong operational defense, but OS-level physical disk encryption (e.g. BitLocker) is advised for full physical security.

## 2. Business Scope Limitations
- **Hospitality & Restaurants**: Table layout management, kitchen order tickets (KOT), course firing, split bills per seat, and room booking workflows are outside the retail scope and are deliberately not supported in this release.
- **Healthcare & Prescription Pharmacy**: Controlled substance tracking, doctor prescription validation, and regulatory batch reporting are not implemented.
- **Cloud Synchronization**: Daily operations operate 100% offline. Multi-branch cloud sync is reserved for a future hybrid sync release; current version supports manual/scheduled backup file transfers.

## 3. Financial & Tax Reporting Scope
- The system generates management reports (Gross Sales, Net Sales, Discounts, Cost of Goods Sold via Weighted Average Cost, Gross Profit, Operating Expenses, and Cashier Shift Reconciliations).
- These reports provide management accounting metrics and should not be construed as full statutory corporate accounting or tax filing returns.
