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
