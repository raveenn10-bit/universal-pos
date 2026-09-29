# Harsh Apex Universal POS - Hardware Compatibility Notes

## 1. Supported Operating Systems
- **Windows 10 (64-bit)**: Build 1909 or later.
- **Windows 11 (64-bit)**: All versions.
- **Architecture**: x64 (AMD64 / Intel 64).

---

## 2. Recommended Terminal Specifications
- **CPU**: Intel Core i3 (7th Gen or later) / AMD Ryzen 3 or equivalent.
- **RAM**: Minimum 4 GB RAM (8 GB recommended for large catalogs >10,000 SKUs).
- **Storage**: Solid State Drive (SSD) with at least 2 GB free disk space.
- **Display Resolution**: Optimized for `1366x768`, `1600x900`, `1920x1080` with standard Windows DPI scaling (100%, 125%, 150%).

---

## 3. Peripheral Hardware Support

### 3.1 Barcode Scanners
- Standard 1D/2D USB Barcode Scanners operating in HID Keyboard Emulation mode.
- Bluetooth handheld wireless scanners paired to Windows.
- Preserves leading zeroes for UPC-A, EAN-13, Code 128, and IMEI barcodes.

### 3.2 Receipt & Invoice Printers
- **Thermal Receipt Printers (80mm & 58mm)**:
  - ESC/POS compatible thermal receipt printers connected via USB, Windows Spooler, or Network.
  - Direct offline PDF printing and print-to-printer pipeline.
- **Standard A4 Office Printers**:
  - Inkjet / Laser printers supported via standard Windows print spooler for multi-page commercial invoices and statements.

### 3.3 Cash Drawers
- RJ11 / RJ12 interface connected via receipt printer drawer kick port.
- Electron print pipeline sends ESC/POS kick pulse (`ESC p 0 25 250` / `27, 112, 0, 25, 250`) upon cash tender confirmation.
