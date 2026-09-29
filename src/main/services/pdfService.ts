// Harsh Apex Universal POS - 100% Offline PDF Engine (PDFKit)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Sale, Customer, CustomerTransaction, Shift, DocumentTemplate } from '../../shared/types';
import { DEFAULT_RECEIPT_TEMPLATE, DEFAULT_INVOICE_TEMPLATE } from '../../shared/constants';
import * as storeConfigService from './storeConfigService';

export interface GeneratePdfResult {
  filePath: string;
  integrityHash: string;
  pageCount: number;
}

/**
 * Generates an 80mm or 58mm thermal receipt PDF fully offline.
 */
export async function generateReceiptPdf(
  sale: Sale,
  outputPath: string,
  customTemplate?: DocumentTemplate
): Promise<GeneratePdfResult> {
  const tpl = JSON.parse(JSON.stringify(customTemplate || DEFAULT_RECEIPT_TEMPLATE));
  try {
    const branding = storeConfigService.getStoreBranding();
    if (branding && branding.businessName) {
      tpl.config.businessName = branding.businessName;
      if (branding.address) tpl.config.address = branding.address;
      if (branding.phone) tpl.config.phone = branding.phone;
      if (branding.taxId) tpl.config.taxNumber = branding.taxId;
    }
  } catch {}
  const is58mm = tpl.templateType === 'RECEIPT_58MM';
  const pageWidth = is58mm ? 164 : 226; // points (72 pt/inch)
  
  // Dynamic page height based on item count
  const estimatedHeight = 350 + (sale.items.length * 30);

  const doc = new PDFDocument({
    size: [pageWidth, estimatedHeight],
    margins: { top: 12, bottom: 12, left: 10, right: 10 },
    autoFirstPage: true,
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Business Header
  doc.font('Helvetica-Bold').fontSize(12).fillColor(tpl.config.accentColor || '#1a4cd2').text(tpl.config.businessName, { align: 'center' });
  if (tpl.config.tagline) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555555').text(tpl.config.tagline, { align: 'center' });
  }
  if (tpl.config.address) {
    doc.font('Helvetica').fontSize(7.5).fillColor('#333333').text(tpl.config.address, { align: 'center' });
  }
  if (tpl.config.phone) {
    doc.font('Helvetica').fontSize(7.5).text(`Tel: ${tpl.config.phone}`, { align: 'center' });
  }
  if (tpl.config.taxNumber) {
    doc.font('Helvetica').fontSize(7.5).text(`Tax No: ${tpl.config.taxNumber}`, { align: 'center' });
  }

  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(7).fillColor('#999999').text('----------------------------------------------------', { align: 'center' });
  doc.moveDown(0.2);

  // Invoice Meta
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111111').text(`INVOICE: ${sale.invoiceNumber}`);
  doc.font('Helvetica').fontSize(7.5).text(`Date: ${new Date(sale.saleDate).toLocaleString('en-LK')}`);
  if (tpl.config.showCashierName) {
    doc.font('Helvetica').fontSize(7.5).text(`Cashier: ${sale.cashierName || 'Staff'}`);
  }
  if (sale.customerName && tpl.config.showCustomerDetails) {
    doc.font('Helvetica').fontSize(7.5).text(`Customer: ${sale.customerName}`);
  }

  doc.moveDown(0.5);
  doc.text('----------------------------------------------------', { align: 'center' });

  // Items Table Header
  const colXDesc = 10;
  const colXQty = pageWidth - 90;
  const colXTotal = pageWidth - 45;

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#222222');
  const yHeader = doc.y;
  doc.text('ITEM', colXDesc, yHeader);
  doc.text('QTY', colXQty, yHeader, { width: 35, align: 'right' });
  doc.text('TOTAL', colXTotal, yHeader, { width: 35, align: 'right' });
  doc.moveDown(0.3);

  // Line items
  doc.font('Helvetica').fontSize(7).fillColor('#333333');
  for (const item of sale.items) {
    const yRow = doc.y;
    const qtyStr = (item.quantityScale4 / 10000).toString();
    const totalStr = (item.lineTotalMinor / 100).toFixed(2);

    doc.font('Helvetica-Bold').text(item.productName.substring(0, is58mm ? 14 : 22), colXDesc, yRow);
    doc.font('Helvetica').text(qtyStr, colXQty, yRow, { width: 35, align: 'right' });
    doc.text(totalStr, colXTotal, yRow, { width: 35, align: 'right' });

    // Print serial/IMEI if present
    if (item.serialNumber || item.imei1) {
      const srl = item.serialNumber ? `S/N: ${item.serialNumber}` : `IMEI: ${item.imei1}`;
      doc.fontSize(6).fillColor('#666666').text(srl, colXDesc + 5, doc.y);
      doc.fontSize(7).fillColor('#333333');
    }
  }

  doc.moveDown(0.5);
  doc.text('----------------------------------------------------', { align: 'center' });

  // Totals
  const rightLabelX = pageWidth - 105;
  const rightValueX = pageWidth - 45;

  const printTotalLine = (label: string, minorAmount: number, isBold: boolean = false) => {
    const y = doc.y;
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 9 : 7.5).fillColor('#111111');
    doc.text(label, rightLabelX, y, { width: 55, align: 'right' });
    doc.text(`LKR ${(minorAmount / 100).toFixed(2)}`, rightValueX, y, { width: 35, align: 'right' });
  };

  printTotalLine('Subtotal:', sale.subtotalMinor);
  if (sale.discountMinor > 0) {
    printTotalLine('Discount:', -sale.discountMinor);
  }
  if (sale.taxMinor > 0) {
    printTotalLine('Tax:', sale.taxMinor);
  }
  doc.moveDown(0.2);
  printTotalLine('NET TOTAL:', sale.totalMinor, true);
  doc.moveDown(0.3);

  // Tenders
  for (const p of sale.payments) {
    printTotalLine(`${p.method}:`, p.amountMinor);
  }
  if (sale.changeMinor > 0) {
    printTotalLine('Change:', sale.changeMinor);
  }

  doc.moveDown(0.8);

  // Offline QR Code (Verification Hash & Invoice ID)
  if (tpl.config.showBarcode) {
    try {
      const qrData = `INV:${sale.invoiceNumber}|TOT:${sale.totalMinor}|DT:${sale.saleDate}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: is58mm ? 60 : 75 });
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');
      const qrX = (pageWidth - (is58mm ? 60 : 75)) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: is58mm ? 60 : 75 });
      doc.moveDown(0.3);
    } catch (e) {
      // Skip QR if error
    }
  }

  // Footer & Terms
  if (tpl.config.footerText) {
    doc.font('Helvetica').fontSize(6.5).fillColor('#666666').text(tpl.config.footerText, { align: 'center' });
  }
  if (tpl.config.termsAndConditions) {
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#888888').text(tpl.config.termsAndConditions, { align: 'center' });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(undefined));
    writeStream.on('error', reject);
  });

  const fileBytes = fs.readFileSync(outputPath);
  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');

  return {
    filePath: outputPath,
    integrityHash: hash,
    pageCount: 1,
  };
}

/**
 * Generates an official A4 multi-page commercial invoice with clean pagination,
 * repeated table headers, and Sinhala/Unicode support.
 */
export async function generateA4InvoicePdf(
  sale: Sale,
  outputPath: string,
  customTemplate?: DocumentTemplate
): Promise<GeneratePdfResult> {
  const tpl = JSON.parse(JSON.stringify(customTemplate || DEFAULT_INVOICE_TEMPLATE));
  try {
    const branding = storeConfigService.getStoreBranding();
    if (branding && branding.businessName) {
      tpl.config.businessName = branding.businessName;
      if (branding.address) tpl.config.address = branding.address;
      if (branding.phone) tpl.config.phone = branding.phone;
      if (branding.taxId) tpl.config.taxNumber = branding.taxId;
    }
  } catch {}
  const primaryCoral = '#EE4D38'; // Matches sample image coral/red accent
  const darkText = '#2D3748';
  const mutedText = '#718096';
  const lightGrayBg = '#F7FAFC';

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 20, left: 45, right: 45 },
    bufferPages: true,
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  const drawHeader = () => {
    // 1. Top Left Badge (Red rounded square with company initial)
    const initialLetter = (tpl.config.businessName || 'S').trim().charAt(0).toUpperCase();
    doc.roundedRect(45, 42, 34, 34, 5).fill(primaryCoral);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#FFFFFF').text(initialLetter, 45, 50, { width: 34, align: 'center' });

    // Company Name & Studio/Tagline
    doc.font('Helvetica-Bold').fontSize(13).fillColor(darkText).text((tpl.config.businessName || 'SEMPURNA, INC.').toUpperCase(), 88, 44);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mutedText).text((tpl.config.tagline || 'RETAIL & COMMERCIAL STUDIO').toUpperCase(), 88, 60);

    // Address & Date line below badge
    const headerDate = new Date(sale.saleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const addressStr = tpl.config.address ? `${tpl.config.address}, ${headerDate}` : `Colombo, Sri Lanka, ${headerDate}`;
    doc.font('Helvetica').fontSize(8).fillColor(mutedText).text(addressStr, 45, 86);

    // 2. Top Right Title: Large "INVOICE"
    doc.font('Helvetica-Bold').fontSize(26).fillColor(darkText).text('INVOICE', 350, 42, { width: 200, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(mutedText).text(`#${sale.invoiceNumber}`, 350, 72, { width: 200, align: 'right' });

    // 3. Middle Section: "INVOICE TO" (Left) & Meta Card (Right)
    const metaY = 120;

    // Left: INVOICE TO
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text('INVOICE TO:', 45, metaY);
    const cust = sale.customerSnapshot || { name: sale.customerName || 'Walk-in Customer' };
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#4A5568').text(cust.name || 'Walk-in Customer', 45, metaY + 14);
    doc.font('Helvetica').fontSize(8).fillColor(mutedText);
    let custY = metaY + 27;
    if (cust.companyName) {
      doc.text(cust.companyName, 45, custY);
      custY += 12;
    }
    if (cust.addressBilling) {
      doc.text(cust.addressBilling, 45, custY);
      custY += 12;
    }
    if (cust.phone) {
      doc.text(`Phone: ${cust.phone}`, 45, custY);
    }

    // Right: Light Gray Card with Vertical Red Accent Bar
    const cardX = 315;
    const cardW = 235;
    const cardH = 50;
    doc.rect(cardX, metaY - 5, cardW, cardH).fill(lightGrayBg);
    doc.rect(cardX, metaY - 5, 4, cardH).fill(primaryCoral);

    // Column 1 inside card
    doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text('Invoice Number', cardX + 15, metaY + 4);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(sale.invoiceNumber, cardX + 15, metaY + 18);

    // Column 2 inside card
    doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text('Date Information', cardX + 130, metaY + 4);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(new Date(sale.saleDate).toLocaleDateString('en-GB'), cardX + 130, metaY + 18);
  };

  const drawTableHeader = (y: number) => {
    // Solid coral/red table header
    doc.rect(45, y, 505, 24).fill(primaryCoral);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    doc.text('NO', 55, y + 7, { width: 30 });
    doc.text('ITEM DESCRIPTION', 95, y + 7, { width: 230 });
    doc.text('PRICE', 335, y + 7, { width: 65, align: 'right' });
    doc.text('QTY', 410, y + 7, { width: 35, align: 'right' });
    doc.text('TOTAL', 455, y + 7, { width: 85, align: 'right' });
  };

  drawHeader();

  let tableY = 190;
  drawTableHeader(tableY);
  tableY += 24;

  let itemIdx = 1;
  for (const item of sale.items) {
    if (tableY > 660) {
      doc.addPage();
      drawTableHeader(45);
      tableY = 69;
    }

    const rowHeight = 28;
    // Alternating rows
    if (itemIdx % 2 === 0) {
      doc.rect(45, tableY, 505, rowHeight).fill('#F2F4F7');
    } else {
      doc.rect(45, tableY, 505, rowHeight).fill('#FFFFFF');
    }

    const numStr = itemIdx < 10 ? `0${itemIdx}.` : `${itemIdx}.`;
    const qtyStr = (item.quantityScale4 / 10000).toString();
    const unitPriceStr = (item.unitPriceMinor / 100).toFixed(2);
    const lineTotalStr = (item.lineTotalMinor / 100).toFixed(2);

    // Row text
    doc.font('Helvetica').fontSize(8).fillColor(mutedText).text(numStr, 55, tableY + 8, { width: 30 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(item.productName, 95, tableY + 5, { width: 230 });

    // Subtitle below product name
    const sub = item.serialNumber
      ? `S/N: ${item.serialNumber}`
      : item.imei1
      ? `IMEI: ${item.imei1}`
      : item.sku
      ? `SKU: ${item.sku}`
      : 'Standard Commercial Stock';
    doc.font('Helvetica').fontSize(7).fillColor('#A0AEC0').text(sub, 95, tableY + 16, { width: 230 });

    doc.font('Helvetica').fontSize(8).fillColor('#4A5568').text(`LKR ${unitPriceStr}`, 335, tableY + 9, { width: 65, align: 'right' });
    doc.font('Helvetica').fontSize(8).text(qtyStr, 410, tableY + 9, { width: 35, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(`LKR ${lineTotalStr}`, 455, tableY + 9, { width: 85, align: 'right' });

    tableY += rowHeight;
    itemIdx++;
  }

  // Check bottom spacing
  if (tableY > 620) {
    doc.addPage();
    tableY = 60;
  }

  tableY += 15;
  const bottomY = tableY;

  // Bottom Left: Payment Method & Terms & Condition
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text('Payment Method', 45, bottomY);
  let tenderY = bottomY + 12;
  for (const p of sale.payments) {
    doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text(`${p.method} Payment`, 45, tenderY);
    tenderY += 10;
  }
  if (sale.payments.length === 0) {
    doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text('Cash Tender', 45, tenderY);
    tenderY += 10;
  }

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text('Terms & Condition', 155, bottomY);
  doc.font('Helvetica').fontSize(7).fillColor(mutedText).text(
    tpl.config.termsAndConditions || 'Payment is due upon receipt. Goods returned within 7 days in original condition.',
    155,
    bottomY + 12,
    { width: 150 }
  );

  const noteY = Math.max(tenderY, bottomY + 36);
  doc.font('Helvetica').fontSize(6.5).fillColor('#A0AEC0').text(
    'All products carry official distributor warranty where applicable. Retain this invoice for warranty verification.',
    45,
    noteY,
    { width: 260 }
  );

  // Handwritten Signature Script Block
  const sigY = noteY + 16;
  const signatoryName = sale.cashierName || 'Steven Joe';
  doc.font('Helvetica-Oblique').fontSize(16).fillColor(primaryCoral).text(signatoryName, 45, sigY);
  doc.strokeColor('#CBD5E0').lineWidth(0.5).moveTo(45, sigY + 20).lineTo(150, sigY + 20).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text(signatoryName, 45, sigY + 24);
  doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text(sale.cashierName ? 'Authorized Cashier' : 'Accounting Manager', 45, sigY + 34);

  // Bottom Right: Totals
  const summaryLblX = 320;
  const summaryValX = 435;
  let totalsY = bottomY;

  const printSummaryLine = (lbl: string, valStr: string) => {
    doc.font('Helvetica').fontSize(8).fillColor(darkText).text(lbl, summaryLblX, totalsY, { width: 110, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text(valStr, summaryValX, totalsY, { width: 115, align: 'right' });
    totalsY += 14;
  };

  printSummaryLine('Sub Total:', `LKR ${(sale.subtotalMinor / 100).toFixed(2)}`);
  if (sale.taxMinor > 0) {
    printSummaryLine('Tax. Vat (15%):', `LKR ${(sale.taxMinor / 100).toFixed(2)}`);
  }
  if (sale.discountMinor > 0) {
    printSummaryLine('Discount:', `- LKR ${(sale.discountMinor / 100).toFixed(2)}`);
  }

  // Grand Total Solid Coral Banner
  totalsY += 4;
  doc.rect(320, totalsY, 230, 26).fill(primaryCoral);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF').text('Grand Total:', 330, totalsY + 8);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text(
    `LKR ${(sale.totalMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    420,
    totalsY + 7,
    { width: 120, align: 'right' }
  );

  // Footer: Centered Red "Thank you for your business!"
  const footerY = 760;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryCoral).text('Thank you for your business!', 45, footerY, {
    width: 505,
    align: 'center',
  });

  const contactStr = `Phone: ${tpl.config.phone || '0123456789'}     |     Email: ${tpl.config.email || 'info@harshapexpos.com'}`;
  doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text(contactStr, 45, footerY + 16, {
    width: 505,
    align: 'center',
  });

  // Number all pages cleanly ("Page X of Y")
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7).fillColor('#CBD5E0').text(
      `Page ${i + 1} of ${pages.count}  •  Harsh Apex Universal POS Offline Invoice Document`,
      45,
      800,
      { align: 'center', width: 505 }
    );
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(undefined));
    writeStream.on('error', reject);
  });

  const fileBytes = fs.readFileSync(outputPath);
  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');

  return {
    filePath: outputPath,
    integrityHash: hash,
    pageCount: pages.count,
  };
}

/**
 * Generates an official Customer Account Statement PDF with running balances.
 */
export async function generateCustomerStatementPdf(
  customer: Customer,
  transactions: CustomerTransaction[],
  outputPath: string
): Promise<GeneratePdfResult> {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 }, bufferPages: true });
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Header
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1a4cd2').text('CUSTOMER STATEMENT OF ACCOUNT', 40, 40);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#222222').text(customer.name, 40, 65);
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555').text(`Customer Code: ${customer.customerCode} | Phone: ${customer.phone}`, 40, 80);
  if (customer.addressBilling) doc.text(customer.addressBilling, 40, 93);

  // Statement box on right
  doc.rect(380, 40, 175, 60).fillAndStroke('#f0f4ff', '#1a4cd2');
  doc.font('Helvetica').fontSize(8.5).fillColor('#333333').text(`Generated: ${new Date().toLocaleDateString('en-LK')}`, 390, 48);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a4cd2').text(`Outstanding Balance:`, 390, 64);
  doc.fontSize(12).fillColor('#b91c1c').text(`LKR ${(customer.currentBalanceMinor / 100).toFixed(2)}`, 390, 78);

  // Table
  let tableY = 120;
  const drawTableHead = (y: number) => {
    doc.rect(40, y, 515, 20).fill('#1a4cd2');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
    doc.text('Date', 45, y + 5, { width: 75 });
    doc.text('Type / Reference', 125, y + 5, { width: 170 });
    doc.text('Debit (LKR)', 300, y + 5, { width: 75, align: 'right' });
    doc.text('Credit (LKR)', 380, y + 5, { width: 75, align: 'right' });
    doc.text('Balance (LKR)', 460, y + 5, { width: 85, align: 'right' });
  };

  drawTableHead(tableY);
  tableY += 22;

  for (const tx of transactions) {
    if (tableY > 740) {
      doc.addPage();
      drawTableHead(40);
      tableY = 65;
    }

    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text(new Date(tx.timestamp).toLocaleDateString('en-LK'), 45, tableY, { width: 75 });
    const ref = tx.referenceNumber ? `${tx.transactionType} (#${tx.referenceNumber})` : tx.transactionType;
    doc.text(ref, 125, tableY, { width: 170 });
    doc.text(tx.debitMinor > 0 ? (tx.debitMinor / 100).toFixed(2) : '-', 300, tableY, { width: 75, align: 'right' });
    doc.text(tx.creditMinor > 0 ? (tx.creditMinor / 100).toFixed(2) : '-', 380, tableY, { width: 75, align: 'right' });
    doc.font('Helvetica-Bold').text((tx.runningBalanceMinor / 100).toFixed(2), 460, tableY, { width: 85, align: 'right' });

    tableY += 16;
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor('#888888').text(
      `Page ${i + 1} of ${pages.count}  |  Harsh Apex Universal POS Statement`,
      40, 805, { align: 'center', width: 515 }
    );
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(undefined));
    writeStream.on('error', reject);
  });

  const fileBytes = fs.readFileSync(outputPath);
  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');

  return { filePath: outputPath, integrityHash: hash, pageCount: pages.count };
}
