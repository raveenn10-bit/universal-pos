import fs from 'node:fs';
import path from 'node:path';
import { createProvisioningPackage } from './dev-cli/index';
import { BusinessProfileType } from '../src/shared/types';

const profiles: { id: BusinessProfileType; name: string }[] = [
  { id: 'GENERAL_RETAIL', name: 'Harsh Apex General Retail' },
  { id: 'SUPERMARKET', name: 'Harsh Apex Supermarket & Grocery' },
  { id: 'MOBILE_PHONES', name: 'Harsh Apex Mobile Phone Shop' },
  { id: 'MOBILE_ACCESSORIES', name: 'Harsh Apex Mobile Accessories' },
  { id: 'ELECTRONICS', name: 'Harsh Apex Electronics & Gadgets' },
  { id: 'SHOES', name: 'Harsh Apex Shoes & Footwear' },
  { id: 'BAGS_FASHION', name: 'Harsh Apex Bags & Fashion' },
];

const licensesDir = path.resolve('dist/developer_signed_licenses');
fs.mkdirSync(licensesDir, { recursive: true });

for (const p of profiles) {
  const fileName = p.id.toLowerCase() + '_harshapex.apexlicense';
  const outPath = path.join(licensesDir, fileName);
  createProvisioningPackage({
    businessName: p.name,
    profileType: p.id,
    edition: 'ENTERPRISE',
    hardwareFingerprint: '*',
    expiresAt: 'PERPETUAL',
    outputPath: outPath,
  });
  console.log('Successfully generated developer-signed package:', outPath);
}
