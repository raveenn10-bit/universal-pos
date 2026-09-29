import { describe, it, expect } from 'vitest';
import { generateEd25519KeyPair, signPayload, verifySignature, canonicalizeJson } from '../src/main/crypto/signer';
import { hashPassword, verifyPassword } from '../src/main/crypto/hasher';

describe('Cryptographic Security & Provisioning Verification', () => {
  it('generates an Ed25519 key pair and verifies a valid signature', () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPair();
    const payload = {
      licenseId: 'lic_123',
      businessName: 'Apex Store',
      profileType: 'SUPERMARKET',
      edition: 'PROFESSIONAL',
    };

    const signature = signPayload(payload, privateKeyPem);
    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(20);

    const isValid = verifySignature(payload, signature, publicKeyPem);
    expect(isValid).toBe(true);
  });

  it('rejects tampered payloads (e.g. shop owner attempting to change profile or business name)', () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPair();
    const legitimatePayload = {
      licenseId: 'lic_123',
      businessName: 'Legitimate Store',
      profileType: 'GENERAL_RETAIL',
    };

    const signature = signPayload(legitimatePayload, privateKeyPem);

    // Tampered payload
    const tamperedPayload = {
      ...legitimatePayload,
      profileType: 'SUPERMARKET', // Unauthorized profile change
    };

    const isValid = verifySignature(tamperedPayload, signature, publicKeyPem);
    expect(isValid).toBe(false);
  });

  it('canonicalizes JSON deterministically regardless of key order', () => {
    const objA = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const objB = { a: 1, c: { x: 10, y: 20 }, b: 2 };
    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
  });

  it('hashes passwords with unique random salts and verifies in constant time', () => {
    const pwd = 'StrongOwnerPassword#2026';
    const hash1 = hashPassword(pwd);
    const hash2 = hashPassword(pwd);

    // Two hashes of the same password must differ due to unique salts
    expect(hash1).not.toBe(hash2);

    expect(verifyPassword(pwd, hash1)).toBe(true);
    expect(verifyPassword(pwd, hash2)).toBe(true);
    expect(verifyPassword('WrongPassword', hash1)).toBe(false);
  });
});
