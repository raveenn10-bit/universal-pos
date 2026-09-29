// Harsh Apex Universal POS - Main Process Entry Point
import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase, closeDatabase, getDb } from './services/db';
import { registerIpcHandlers } from './ipc';
import { ensureProductionOwner } from './services/authService';
import { DEFAULT_BUSINESS_PROFILES } from '../shared/constants';

// Disable hardware acceleration to guarantee stability on all Windows machines & Intel/AMD iGPUs
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.warn('[Harsh Apex POS] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      // 1. Initialize SQLite Database & Migrations
      await initDatabase();
      seedInitialDemoDataIfEmpty();
    } catch (dbErr) {
      console.error('[Harsh Apex POS] Database init failed:', dbErr);
    }

    // 2. Set strict Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*;"
          ],
        },
      });
    });

    // 3. Create Desktop Window
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1200,
      minHeight: 768,
      backgroundColor: '#f8fafc',
      show: false,
      title: 'Harsh Apex Universal POS',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    // Fallback: If ready-to-show hasn't fired in 1.5 seconds, force show
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 1500);

    // Register all secure IPC channels
    registerIpcHandlers(mainWindow);

    // Prevent navigation to external sites
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        event.preventDefault();
      }
    });

    // Load dev server or production build
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      // Robust path resolution for packaged vs unpackaged builds
      const candidatePaths = [
        path.join(app.getAppPath(), 'dist/renderer/index.html'),
        path.join(__dirname, '../../../dist/renderer/index.html'),
        path.join(__dirname, '../dist/renderer/index.html'),
        path.join(__dirname, '../../renderer/index.html'),
      ];

      let targetIndex = candidatePaths[0];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          targetIndex = p;
          break;
        }
      }
      mainWindow.loadFile(targetIndex);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  });

  app.on('window-all-closed', () => {
    closeDatabase();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function seedInitialDemoDataIfEmpty(): void {
  try {
    const db = getDb();

    // 1. Ensure production owner account: harshapex / chami2003
    ensureProductionOwner();

    // 2. Ensure default business profile config exists
    const profRow = db.prepare('SELECT COUNT(*) as count FROM business_profile_config').get() as { count: number };
    if (!profRow || profRow.count === 0) {
      db.prepare(`
        INSERT INTO business_profile_config (id, profile_type, config_json, updated_at)
        VALUES (1, 'GENERAL_RETAIL', ?, ?)
      `).run(JSON.stringify(DEFAULT_BUSINESS_PROFILES.GENERAL_RETAIL), new Date().toISOString());
    }

    // 3. Ensure default commercial customer exists
    const custRow = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    if (!custRow || custRow.count === 0) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO customers (
          id, customer_code, name, phone, email, company_name, address_billing,
          credit_limit_minor, is_active, created_at, updated_at
        ) VALUES (
          'cust_001', 'CUST-0001', 'Makelar Studio Partners', '077 123 4567',
          'billing@makelar.com', 'Makelar Inc', '270 5th Avenue, New Road, Colombo 03',
          5000000, 1, ?, ?
        )
      `).run(now, now);
    }

    // 4. Seed diverse commercial products across profiles if catalog is empty
    const prodRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (!prodRow || prodRow.count === 0) {
      const now = new Date().toISOString();
      const commercialProducts = [
        // Mobile Phones & Devices (IMEI tracking)
        { id: 'prd_001', code: 'SMP-S24', sku: 'SMP-S24-256', barcode: '8806095312345', name: 'Samsung Galaxy S24 Ultra 256GB', cost: 24500000, price: 34500000, stock: 120000, tracksImei: 1, tracksSerial: 0, warranty: 12, unit: 'PCS' },
        { id: 'prd_002', code: 'APL-IP15', sku: 'APL-15P-128', barcode: '1959490123456', name: 'Apple iPhone 15 Pro 128GB Blue Titanium', cost: 26500000, price: 36000000, stock: 80000, tracksImei: 1, tracksSerial: 0, warranty: 12, unit: 'PCS' },
        // Electronics & Appliances (Serial tracking)
        { id: 'prd_003', code: 'ELE-SNY', sku: 'SNY-WH1000', barcode: '4548736123456', name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', cost: 8500000, price: 12500000, stock: 150000, tracksImei: 0, tracksSerial: 1, warranty: 12, unit: 'PCS' },
        { id: 'prd_004', code: 'ELE-MIC', sku: 'LG-MW-25L', barcode: '8801038123456', name: 'LG NeoChef Smart Inverter Microwave 25L', cost: 2800000, price: 4200000, stock: 60000, tracksImei: 0, tracksSerial: 1, warranty: 24, unit: 'PCS' },
        // Mobile Accessories
        { id: 'prd_005', code: 'ACC-CHG', sku: 'ANK-65W-GAN', barcode: '8480610123456', name: 'Anker Nano II 65W GaN Fast Charger', cost: 850000, price: 1450000, stock: 450000, tracksImei: 0, tracksSerial: 0, warranty: 6, unit: 'PCS' },
        { id: 'prd_006', code: 'ACC-CAS', sku: 'IP15P-SIL-MAG', barcode: '8480610123457', name: 'Liquid Silicone MagSafe Case iPhone 15 Pro', cost: 120000, price: 350000, stock: 850000, tracksImei: 0, tracksSerial: 0, warranty: 1, unit: 'PCS' },
        // Supermarket & Grocery (Weighted / Packed)
        { id: 'prd_007', code: 'GRO-RIC', sku: 'AHL-SAMBA-5KG', barcode: '4792024123456', name: 'Araliya Keeri Samba Super Rice 5kg', cost: 145000, price: 175000, stock: 1200000, tracksImei: 0, tracksSerial: 0, warranty: 0, unit: 'PACK' },
        { id: 'prd_008', code: 'GRO-TEA', sku: 'DLM-ENG-400G', barcode: '4791038123456', name: 'Dilmah Premium Ceylon Tea 400g Foil Pack', cost: 72000, price: 95000, stock: 850000, tracksImei: 0, tracksSerial: 0, warranty: 0, unit: 'PCS' },
        // Shoes & Footwear
        { id: 'prd_009', code: 'SHO-PEG', sku: 'NKE-PEG-40-BLK', barcode: '0196607123456', name: 'Nike Air Zoom Pegasus 40 Running Shoes (Size 42)', cost: 1850000, price: 2950000, stock: 40000, tracksImei: 0, tracksSerial: 0, warranty: 3, unit: 'PAIR' },
        // Fashion & Bags
        { id: 'prd_010', code: 'FAS-JNS', sku: 'LEV-501-REG-32', barcode: '0540000123456', name: "Levi's 501 Original Fit Denim Jeans (Waist 32)", cost: 1800000, price: 3200000, stock: 55000, tracksImei: 0, tracksSerial: 0, warranty: 0, unit: 'PCS' },
      ];

      db.transaction(() => {
        for (const p of commercialProducts) {
          db.prepare(`
            INSERT INTO products (
              id, code, sku, barcode, name, product_type, unit_of_measure,
              cost_price_minor, retail_price_minor, track_inventory,
              tracks_serial, tracks_imei, warranty_months, is_active,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'STANDARD', ?, ?, ?, 1, ?, ?, ?, 1, ?, ?)
          `).run(
            p.id, p.code, p.sku, p.barcode, p.name, p.unit,
            p.cost, p.price, p.tracksSerial, p.tracksImei, p.warranty,
            now, now
          );

          db.prepare(`
            INSERT INTO stock_levels (product_id, variant_id, quantity_scale4)
            VALUES (?, '', ?)
          `).run(p.id, p.stock);
        }
      })();
    }
  } catch (err) {
    console.error('[Harsh Apex POS] Seed commercial data error:', err);
  }
}
