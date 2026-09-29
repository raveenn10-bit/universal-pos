// Harsh Apex Universal POS - Cryptographic Password Hashing & Token Service
import crypto from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * Computes a salted cryptographic hash of a plaintext password.
 * Format: scrypt:salt:derivedKey
 */
export function hashPassword(plaintext: string): string {
  if (!plaintext || plaintext.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.scryptSync(plaintext, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024,
  }).toString('hex');

  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored salted hash using constant-time comparison.
 */
export function verifyPassword(plaintext: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const salt = parts[1];
    const expectedKeyHex = parts[2];
    const derivedKey = crypto.scryptSync(plaintext, salt, KEY_BYTES, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 32 * 1024 * 1024,
    });
    const expectedKey = Buffer.from(expectedKeyHex, 'hex');

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch (err) {
    return false;
  }
}

/**
 * Generates an unpredictable high-entropy session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
