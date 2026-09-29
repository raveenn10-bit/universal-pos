#!/usr/bin/env node
// Harsh Apex Universal POS - Standalone Developer Provisioning Tool
// IMPORTANT: This tool and private signing keys must NEVER be packaged into client distributions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateEd25519KeyPair, signPayload } from '../../src/main/crypto/signer';
import { BusinessProfileType, LicensePackage } from '../../src/shared/types';
import { DEFAULT_BUSINESS_PROFILES } from '../../src/shared/constants';

const KEY_DIR = path.resolve(__dirname, '../../developer_keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'apex_developer_private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'apex_developer_public.pem');

export function ensureDeveloperKeys(): { privateKey: string; publicKey: string } {
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'),
    };
  }

  console.log('[Dev-CLI] Generating fresh Ed25519 Developer Key Pair...');
  const { publicKeyPem, privateKeyPem } = generateEd25519KeyPair();
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKeyPem, { mode: 0o644 });
  console.log(`[Dev-CLI] Keys generated successfully at:\n  ${PRIVATE_KEY_PATH}\n  ${PUBLIC_KEY_PATH}`);

  return { privateKey: privateKeyPem, publicKey: publicKeyPem };
}

export function createProvisioningPackage(options: {
  businessName: string;
  profileType: BusinessProfileType;
  edition?: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  hardwareFingerprint?: string;
  expiresAt?: string;
  enabledModules?: string[];
  outputPath?: string;
}): LicensePackage {
  const { privateKey } = ensureDeveloperKeys();
  const licenseId = `lic_${crypto.randomUUID()}`;
  const issuedAt = new Date().toISOString();

  const payload = {
    licenseId,
    businessName: options.businessName.trim(),
    profileType: options.profileType,
    edition: options.edition || 'PROFESSIONAL',
    hardwareFingerprint: options.hardwareFingerprint || '*',
    issuedAt,
    expiresAt: options.expiresAt || 'PERPETUAL',
    enabledModules: options.enabledModules || Object.keys(DEFAULT_BUSINESS_PROFILES[options.profileType].enabledModules),
  };

  const signature = signPayload(payload, privateKey);

  const fullPackage: LicensePackage = {
    ...payload,
    signature,
  };

  const outPath = options.outputPath || path.resolve(process.cwd(), `${options.businessName.replace(/\s+/g, '_')}.apexlicense`);
  fs.writeFileSync(outPath, JSON.stringify(fullPackage, null, 2), 'utf8');
  console.log(`[Dev-CLI] Signed Provisioning Package generated:\n  File: ${outPath}`);

  return fullPackage;
}

// CLI Execution handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'keygen': {
      ensureDeveloperKeys();
      break;
    }
    case 'provision': {
      const name = args[1] || 'Demo Supermarket';
      const profile = (args[2] as BusinessProfileType) || 'SUPERMARKET';
      createProvisioningPackage({ businessName: name, profileType: profile });
      break;
    }
    default:
      console.log(`
Harsh Apex Universal POS - Developer Provisioning Console
Usage:
  node tools/dev-cli/index.js keygen
  node tools/dev-cli/index.js provision "<Business Name>" <PROFILE_TYPE>

Available Profiles:
  GENERAL_RETAIL, SUPERMARKET, MOBILE_PHONES, MOBILE_ACCESSORIES,
  ELECTRONICS, SHOES, BAGS_FASHION
      `);
      break;
  }
}
