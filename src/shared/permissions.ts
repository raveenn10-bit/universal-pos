// Harsh Apex Universal POS - Central Role-Based Access Control (RBAC) & Permissions Engine
import { UserSession } from './types';

export type NavTab = 
  | 'dashboard' 
  | 'checkout' 
  | 'customers' 
  | 'products' 
  | 'orders' 
  | 'shifts' 
  | 'purchases'
  | 'expenses'
  | 'repairs'
  | 'tradein'
  | 'staff'
  | 'reports' 
  | 'templates' 
  | 'settings';

export const PERMISSION_ALIASES: Record<string, string[]> = {
  // POS, billing, checkout
  'pos.billing': ['pos.checkout', 'pos.fast_checkout'],
  'pos.checkout': ['pos.billing', 'pos.fast_checkout'],
  'pos.fast_checkout': ['pos.billing', 'pos.checkout'],
  'pos.process_return': ['pos.refund', 'pos.billing', 'pos.checkout'],
  'pos.refund': ['pos.process_return', 'pos.billing'],

  // Staff and users management
  'staff.manage': ['users.manage'],
  'users.manage': ['staff.manage'],

  // Shifts and cash drawer
  'shifts.drawer': ['shifts.manage', 'shifts.open_close', 'pos.fast_checkout'],
  'shifts.manage': ['shifts.drawer', 'shifts.open_close'],
  'shifts.open_close': ['shifts.drawer', 'shifts.manage'],

  // Customers management
  'customers.manage': ['customers.view', 'customer.manage'],
  'customer.manage': ['customers.manage', 'customers.view'],
  'customers.view': ['customers.manage', 'customer.manage'],

  // Products and inventory
  'catalog.manage': ['inventory.manage', 'catalog.manage_products', 'inventory.view', 'inventory.adjust', 'catalog.adjust_stock'],
  'inventory.manage': ['catalog.manage', 'catalog.manage_products', 'inventory.view', 'inventory.adjust', 'catalog.adjust_stock'],
  'catalog.manage_products': ['catalog.manage', 'inventory.manage'],
  'inventory.view': ['catalog.manage', 'inventory.manage', 'catalog.manage_products'],
  'inventory.adjust': ['catalog.manage', 'inventory.manage', 'catalog.adjust_stock'],
  'catalog.adjust_stock': ['inventory.adjust', 'inventory.manage', 'catalog.manage'],

  // Procurement and suppliers
  'procurement.manage': ['procurement.manage_suppliers', 'procurement.manage_po', 'inventory.manage'],
  'procurement.manage_suppliers': ['procurement.manage'],
  'procurement.manage_po': ['procurement.manage'],

  // Settings and system
  'settings.manage': ['system.manage', 'shop.backup_restore', 'templates.manage'],
  'system.manage': ['settings.manage', 'shop.backup_restore', 'templates.manage'],
  'shop.backup_restore': ['settings.manage', 'system.manage'],
  'templates.manage': ['settings.manage', 'system.manage'],

  // Repairs and service
  'repairs.manage': ['service.manage'],
  'service.manage': ['repairs.manage'],
};

export const TAB_PERMISSIONS: Record<NavTab, string[]> = {
  dashboard: ['reports.view', 'dashboard.view', '*'],
  checkout: ['pos.billing', 'pos.checkout', '*'],
  customers: ['customers.manage', 'customers.view', '*'],
  products: ['catalog.manage', 'inventory.manage', '*'],
  orders: ['pos.billing', 'reports.view', '*'],
  shifts: ['shifts.drawer', 'shifts.manage', '*'],
  purchases: ['procurement.manage', 'inventory.manage', '*'],
  expenses: ['expenses.manage', '*'],
  repairs: ['repairs.manage', 'service.manage', '*'],
  tradein: ['tradein.manage', '*'],
  staff: ['staff.manage', 'users.manage', '*'],
  reports: ['reports.view', '*'],
  templates: ['templates.manage', '*'],
  settings: ['settings.manage', 'system.manage', '*'],
};

/**
 * Check whether a user session has the required permission(s).
 * - Owners (role === 'owner' or '*' in permissions) have all permissions.
 * - Supports permission aliases across modules.
 * - Supports arrays of permissions (treated as OR condition).
 */
export function hasPermission(user: UserSession | null, perm: string | string[]): boolean {
  if (!user) return false;
  if (user.role === 'owner' || user.permissions?.includes('*')) return true;
  if (!user.permissions || user.permissions.length === 0) return false;

  const targetPerms = Array.isArray(perm) ? perm : [perm];

  // Build effective permissions of user with aliases
  const effectivePerms = new Set<string>();
  for (const p of user.permissions) {
    effectivePerms.add(p);
    const aliases = PERMISSION_ALIASES[p];
    if (aliases) {
      for (const a of aliases) {
        effectivePerms.add(a);
      }
    }
  }

  // Check if any target permission or any of its aliases is satisfied
  for (const tp of targetPerms) {
    if (tp === '*') continue; // already checked wildcard above
    if (effectivePerms.has(tp)) return true;
    const aliases = PERMISSION_ALIASES[tp];
    if (aliases && aliases.some(a => effectivePerms.has(a))) {
      return true;
    }
  }

  return false;
}
