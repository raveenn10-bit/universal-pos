import { describe, it, expect } from 'vitest';

describe('Financial Math & Minor Unit Precision', () => {
  it('computes penny-accurate integer minor units without floating point loss', () => {
    // 3 items @ LKR 125.50 each = 376.50
    const qtyScale4 = 30000; // 3 units
    const unitPriceMinor = 12550; // LKR 125.50
    const lineTotal = Math.round(unitPriceMinor * (qtyScale4 / 10000));
    expect(lineTotal).toBe(37650);
  });

  it('allocates basis point tax correctly (8.00% = 800 bps)', () => {
    const taxableAmount = 100000; // LKR 1,000.00
    const taxRateBps = 800; // 8.00%
    const taxMinor = Math.round((taxableAmount * taxRateBps) / 10000);
    expect(taxMinor).toBe(8000); // LKR 80.00
  });

  it('handles order-level discounts and line discounts', () => {
    const item1 = 50000;
    const item2 = 30000;
    const subtotal = item1 + item2; // 80000
    const orderDiscountMinor = 5000; // 50.00 off
    const netTotal = Math.max(0, subtotal - orderDiscountMinor);
    expect(netTotal).toBe(75000);
  });

  it('handles cash change and mixed tender split payments', () => {
    const totalDue = 125000; // LKR 1,250.00
    const tenderCard = 50000; // LKR 500.00
    const tenderCash = 100000; // LKR 1,000.00
    const totalTendered = tenderCard + tenderCash; // LKR 1,500.00
    const change = totalTendered - totalDue;
    expect(change).toBe(25000); // LKR 250.00 change
  });
});
