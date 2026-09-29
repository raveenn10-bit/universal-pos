// Harsh Apex Universal POS - Ed25519 Cryptographic Signer & Verifier
import crypto from 'node:crypto';
import os from 'node:os';

/**
 * Generates an Ed25519 key pair for developer provisioning.
 * Private key must NEVER be distributed in customer POS builds.
 */
export function generateEd25519KeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/**
 * Deterministically serialize an object to JSON ensuring key ordering.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return '{' + parts.join(',') + '}';
}

/**
 * Signs a payload using an Ed25519 private key.
 * Developer-only operation.
 */
export function signPayload(payload: any, privateKeyPem: string): string {
  const data = Buffer.from(canonicalizeJson(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKeyPem);
  return signature.toString('base64');
}

/**
 * Verifies a signed payload using an Ed25519 public key.
 * Embedded in POS client.
 */
export function verifySignature(payload: any, signatureBase64: string, publicKeyPem: string): boolean {
  try {
    const data = Buffer.from(canonicalizeJson(payload), 'utf8');
    const signature = Buffer.from(signatureBase64, 'base64');
    return crypto.verify(null, data, publicKeyPem, signature);
  } catch (err) {
    return false;
  }
}

/**
 * Computes an offline hardware fingerprint for binding installations.
 */
export function getHardwareFingerprint(): string {
  const host = os.hostname();
  const cpus = os.cpus().map(c => c.model).join(',');
  const arch = os.arch();
  const platform = os.platform();
  const raw = `${host}::${platform}::${arch}::${cpus}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}
