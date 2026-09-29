// Harsh Apex Universal POS - Authentication & Permissions Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { hashPassword, verifyPassword, generateSessionToken } from '../crypto/hasher';
import { UserRole, UserSession } from '../../shared/types';

interface LoginAttemptTracker {
  failedCount: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptTracker>();
const activeSessions = new Map<string, UserSession>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export function ensureProductionOwner(): void {
  const db = getDb();
  const cleanUsername = 'harshapex';
  const fullName = 'Harsh Apex Administrator';
  const passwordHash = hashPassword('chami2003');
  const pinHash = hashPassword('2003');
  const now = new Date().toISOString();

  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get(cleanUsername) as any;
  if (!user) {
    const anyOwner = db.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").get() as any;
    if (anyOwner) {
      db.prepare(`
        UPDATE users SET
          username = ?,
          full_name = ?,
          password_hash = ?,
          pin_hash = ?,
          is_active = 1,
          updated_at = ?
        WHERE id = ?
      `).run(cleanUsername, fullName, passwordHash, pinHash, now, anyOwner.id);
    } else {
      const userId = 'usr_harshapex_owner';
      db.prepare(`
        INSERT INTO users (id, username, full_name, role, password_hash, pin_hash, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'owner', ?, ?, 1, ?, ?)
      `).run(userId, cleanUsername, fullName, passwordHash, pinHash, now, now);
    }
  } else {
    db.prepare(`
      UPDATE users SET
        full_name = ?,
        password_hash = ?,
        pin_hash = ?,
        is_active = 1,
        updated_at = ?
      WHERE username = ?
    `).run(fullName, passwordHash, pinHash, now, cleanUsername);
  }
}

export function checkHasUsers(): boolean {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row.count > 0;
}

export function setupInitialOwner(payload: {
  username: string;
  fullName: string;
  password: string;
  pin?: string;
}): UserSession {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (countRow.count > 0) {
    const existingOwner = db.prepare(`SELECT id, username, full_name, role, password_hash, is_active FROM users WHERE role = 'owner' LIMIT 1`).get() as any;
    if (existingOwner) {
      const token = generateSessionToken();
      const session: UserSession = {
        userId: existingOwner.id,
        username: existingOwner.username,
        fullName: existingOwner.full_name,
        role: 'owner',
        token,
        permissions: ['*'],
      };
      activeSessions.set(token, session);
      return session;
    }
    throw new Error('Initial setup already completed. An owner account already exists.');
  }

  if (payload.password.length < 8) {
    throw new Error('Owner password must be at least 8 characters long.');
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(payload.password);
  const pinHash = payload.pin ? hashPassword(payload.pin) : null;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, full_name, role, password_hash, pin_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', ?, ?, 1, ?, ?)
    `).run(userId, payload.username.trim().toLowerCase(), payload.fullName.trim(), passwordHash, pinHash, now, now);

    // Record audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'SETUP_INITIAL_OWNER', 'USER', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      now,
      userId,
      userId,
      JSON.stringify({ username: payload.username, role: 'owner' })
    );
  })();

  const token = generateSessionToken();
  const session: UserSession = {
    userId,
    username: payload.username.trim().toLowerCase(),
    fullName: payload.fullName.trim(),
    role: 'owner',
    token,
    permissions: ['*'], // Owner has full business permissions
  };
  activeSessions.set(token, session);
  return session;
}

export function loginUser(username: string, password: string): UserSession {
  const db = getDb();
  const cleanUsername = username.trim().toLowerCase();
  const now = Date.now();

  const attempt = loginAttempts.get(cleanUsername) || { failedCount: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
    throw new Error(`Account temporarily locked due to repeated failed attempts. Please retry in ${remainingSeconds} seconds.`);
  }

  const user = db.prepare(`
    SELECT id, username, full_name, role, password_hash, is_active 
    FROM users 
    WHERE username = ?
  `).get(cleanUsername) as any;

  if (!user || user.is_active !== 1 || !verifyPassword(password, user.password_hash)) {
    attempt.failedCount += 1;
    if (attempt.failedCount >= MAX_FAILED_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
      attempt.failedCount = 0;
    }
    loginAttempts.set(cleanUsername, attempt);
    throw new Error('Invalid username or password.');
  }

  // Reset failed attempts on success
  loginAttempts.delete(cleanUsername);

  // Fetch individual permissions
  const permRows = db.prepare('SELECT permission_key FROM user_permissions WHERE user_id = ? AND is_granted = 1').all(user.id) as { permission_key: string }[];
  const permissions = user.role === 'owner' ? ['*'] : permRows.map(r => r.permission_key);

  const token = generateSessionToken();
  const session: UserSession = {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    token,
    permissions,
  };

  activeSessions.set(token, session);

  // Record audit event
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, 'USER_LOGIN', 'SESSION', ?, ?)
  `).run(
    `aud_${crypto.randomUUID()}`,
    new Date().toISOString(),
    user.id,
    token.substring(0, 8),
    JSON.stringify({ role: user.role })
  );

  return session;
}

export function logoutUser(token: string): void {
  activeSessions.delete(token);
}

export function registerActiveSession(session: UserSession): void {
  activeSessions.set(session.token, session);
}

export function getSession(token: string): UserSession | null {
  return activeSessions.get(token) || null;
}

export function assertPermission(session: UserSession | null, requiredPermission: string): void {
  if (!session) {
    throw new Error('Authentication required.');
  }
  if (session.role === 'owner' || session.permissions.includes('*')) {
    return;
  }
  if (requiredPermission === 'staff.manage' && (session.permissions.includes('staff.manage') || session.permissions.includes('users.manage'))) {
    return;
  }
  if (requiredPermission === 'catalog.manage' && (session.permissions.includes('catalog.manage') || session.permissions.includes('inventory.adjust') || session.permissions.includes('inventory.view'))) {
    return;
  }
  if (requiredPermission === 'pos.checkout' && (session.permissions.includes('pos.checkout') || session.permissions.includes('pos.billing'))) {
    return;
  }
  if (!session.permissions.includes(requiredPermission)) {
    throw new Error(`Forbidden: Missing required permission '${requiredPermission}'.`);
  }
}

export function reauthenticate(userId: string, password: string): boolean {
  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
  if (!user) return false;
  return verifyPassword(password, user.password_hash);
}

export function loginWithPin(pin: string): UserSession {
  const db = getDb();
  const users = db.prepare('SELECT id, username, full_name, role, pin_hash, is_active FROM users WHERE is_active = 1').all() as any[];

  for (const u of users) {
    if (u.pin_hash && verifyPassword(pin, u.pin_hash)) {
      const permRows = db.prepare('SELECT permission_key FROM user_permissions WHERE user_id = ? AND is_granted = 1').all(u.id) as { permission_key: string }[];
      const permissions = u.role === 'owner' ? ['*'] : permRows.map(r => r.permission_key);

      const token = generateSessionToken();
      const session: UserSession = {
        userId: u.id,
        username: u.username,
        fullName: u.full_name,
        role: u.role,
        token,
        permissions,
      };
      activeSessions.set(token, session);
      return session;
    }
  }

  throw new Error('Invalid PIN code.');
}

export function getUsers(): any[] {
  const db = getDb();
  const rows = db.prepare('SELECT id, username, full_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    role: r.role,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function createUser(payload: {
  username: string;
  fullName: string;
  role: string;
  password?: string;
  pin?: string;
}, session: UserSession): any {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  const cleanUsername = payload.username.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    throw new Error(`Username '${cleanUsername}' is already taken.`);
  }

  const id = `usr_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(payload.password || '12345678');
  const pinHash = payload.pin ? hashPassword(payload.pin) : null;

  db.prepare(`
    INSERT INTO users (id, username, full_name, role, password_hash, pin_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, cleanUsername, payload.fullName.trim(), payload.role, passwordHash, pinHash, now, now);

  return {
    id,
    username: cleanUsername,
    fullName: payload.fullName.trim(),
    role: payload.role,
    isActive: true,
    createdAt: now,
  };
}

export function updateUser(userId: string, payload: {
  fullName?: string;
  role?: string;
  password?: string;
  pin?: string;
  isActive?: boolean;
}, session: UserSession): any {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  const user = db.prepare('SELECT id, username, full_name, role, is_active FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new Error('User not found.');

  const now = new Date().toISOString();
  const newFullName = payload.fullName !== undefined ? payload.fullName.trim() : user.full_name;
  const newRole = payload.role !== undefined ? payload.role : user.role;
  const newActive = payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : user.is_active;

  if (payload.password) {
    const newHash = hashPassword(payload.password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  }

  if (payload.pin !== undefined) {
    const newPinHash = payload.pin ? hashPassword(payload.pin) : null;
    db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(newPinHash, userId);
  }

  db.prepare(`
    UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = ? WHERE id = ?
  `).run(newFullName, newRole, newActive, now, userId);

  return {
    id: userId,
    username: user.username,
    fullName: newFullName,
    role: newRole,
    isActive: newActive === 1,
    updatedAt: now,
  };
}

export function deleteUser(userId: string, session: UserSession): boolean {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new Error('User not found.');
  if (user.role === 'owner') throw new Error('Cannot delete owner account.');

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return true;
}

export function getRoles(): any[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM roles ORDER BY is_system DESC, name ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: JSON.parse(r.permissions_json || '[]'),
    isSystem: r.is_system === 1,
    createdAt: r.created_at,
  }));
}

export function createRole(name: string, description: string, permissions: string[], session: UserSession): any {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  const existing = db.prepare('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    throw new Error(`A role with the name '${name.trim()}' already exists.`);
  }
  const id = `role_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO roles (id, name, description, permissions_json, is_system, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, name.trim(), description.trim(), JSON.stringify(permissions), now);

  return {
    id,
    name: name.trim(),
    description: description.trim(),
    permissions,
    isSystem: false,
    createdAt: now,
  };
}

export function updateRole(id: string, name: string, description: string, permissions: string[], session: UserSession): any {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  db.prepare(`
    UPDATE roles SET name = ?, description = ?, permissions_json = ? WHERE id = ?
  `).run(name.trim(), description.trim(), JSON.stringify(permissions), id);

  return {
    id,
    name: name.trim(),
    description: description.trim(),
    permissions,
  };
}

export function deleteRole(id: string, session: UserSession): boolean {
  assertPermission(session, 'staff.manage');
  const db = getDb();
  const role = db.prepare('SELECT id, is_system FROM roles WHERE id = ?').get(id) as any;
  if (!role) throw new Error('Role not found.');
  if (role.is_system === 1) throw new Error('Cannot delete system role.');

  db.prepare('DELETE FROM roles WHERE id = ?').run(id);
  return true;
}
