// Harsh Apex Universal POS - Cryptographic Licensing & Profile Provisioning Service
import crypto from 'node:crypto';
import { getDb } from './db';
import { verifySignature, getHardwareFingerprint } from '../crypto/signer';
import { BusinessProfileConfig, BusinessProfileType, LicensePackage } from '../../shared/types';
import { DEFAULT_BUSINESS_PROFILES } from '../../shared/constants';

// Official Developer Public Verification Key (SPKI PEM)
// Embedded in client. The matching Private Key is kept ONLY in the Developer Console / CLI.
export const DEVELOPER_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA3WP+dzE30CroxXHK5L3dfgyIAvLb9IV2+XZ2+c74T8Q=
-----END PUBLIC KEY-----`;

export function getActiveLicense(): LicensePackage | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM licenses WHERE is_active = 1 LIMIT 1').get() as any;
  if (!row) return null;
  return {
    licenseId: row.id,
    businessName: row.business_name,
    profileType: row.profile_type as BusinessProfileType,
    edition: row.edition as any,
    hardwareFingerprint: row.hardware_fingerprint,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    enabledModules: [],
    signature: row.signature,
  };
}

export function getActiveProfileConfig(): BusinessProfileConfig {
  const db = getDb();
  const row = db.prepare('SELECT config_json FROM business_profile_config WHERE id = 1').get() as any;
  if (row && row.config_json) {
    try {
      return JSON.parse(row.config_json);
    } catch (e) {
      // Fallback
    }
  }
  // Default to General Retail if uninitialized
  return DEFAULT_BUSINESS_PROFILES.GENERAL_RETAIL;
}

export function importProvisioningPackage(
  pkg: LicensePackage,
  customPublicKeyPem?: string
): { success: boolean; message: string; profileConfig: BusinessProfileConfig } {
  const db = getDb();
  const keyToUse = customPublicKeyPem || DEVELOPER_PUBLIC_KEY_PEM;

  // 1. Verify payload signature
  const payloadToVerify = {
    licenseId: pkg.licenseId,
    businessName: pkg.businessName,
    profileType: pkg.profileType,
    edition: pkg.edition,
    hardwareFingerprint: pkg.hardwareFingerprint,
    issuedAt: pkg.issuedAt,
    expiresAt: pkg.expiresAt,
    enabledModules: pkg.enabledModules,
  };

  const isSigValid = verifySignature(payloadToVerify, pkg.signature, keyToUse);
  if (!isSigValid) {
    throw new Error('Cryptographic signature verification failed. This provisioning package is invalid or tampered with.');
  }

  // 2. Verify hardware fingerprint binding (if not universal/wildcard)
  const currentFp = getHardwareFingerprint();
  if (pkg.hardwareFingerprint !== '*' && pkg.hardwareFingerprint !== currentFp) {
    throw new Error(`Device mismatch: Package is bound to machine fingerprint '${pkg.hardwareFingerprint}', but current machine is '${currentFp}'.`);
  }

  // 3. Verify term
  if (pkg.expiresAt !== 'PERPETUAL') {
    const expiryTime = new Date(pkg.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      throw new Error(`License package expired on ${pkg.expiresAt}.`);
    }
  }

  // 4. Resolve default profile configuration for selected profile type
  const baseProfile = DEFAULT_BUSINESS_PROFILES[pkg.profileType];
  if (!baseProfile) {
    throw new Error(`Unsupported profile type: ${pkg.profileType}`);
  }

  // Deep clone and selectively override enabled modules from licensed package
  const activeConfig: BusinessProfileConfig = JSON.parse(JSON.stringify(baseProfile));
  if (pkg.enabledModules && pkg.enabledModules.length > 0) {
    for (const mod of pkg.enabledModules) {
      if (mod in activeConfig.enabledModules) {
        (activeConfig.enabledModules as any)[mod] = true;
      }
    }
  }

  // 5. Commit atomically to SQLite
  db.transaction(() => {
    // Deactivate previous licenses
    db.prepare('UPDATE licenses SET is_active = 0').run();

    // Insert new active license
    db.prepare(`
      INSERT INTO licenses (id, business_name, profile_type, edition, hardware_fingerprint, issued_at, expires_at, signature, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      pkg.licenseId,
      pkg.businessName,
      pkg.profileType,
      pkg.edition,
      pkg.hardwareFingerprint,
      pkg.issuedAt,
      pkg.expiresAt,
      pkg.signature
    );

    // Update active profile configuration
    db.prepare(`
      INSERT INTO business_profile_config (id, profile_type, config_json, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        profile_type = excluded.profile_type,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).run(pkg.profileType, JSON.stringify(activeConfig), new Date().toISOString());

    // Record audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, 'SYSTEM', 'PROVISION_LICENSE_IMPORTED', 'LICENSE', ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      new Date().toISOString(),
      pkg.licenseId,
      JSON.stringify({ businessName: pkg.businessName, profileType: pkg.profileType, edition: pkg.edition })
    );
  })();

  return {
    success: true,
    message: `Successfully provisioned ${pkg.businessName} for profile ${activeConfig.displayName}.`,
    profileConfig: activeConfig,
  };
}
