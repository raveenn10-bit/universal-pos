# Harsh Apex Universal POS - Developer Provisioning & Licensing Guide

## 1. Overview
The **Developer Console & Provisioning CLI** (`tools/dev-cli`) gives the product developer exclusive authority to:
- Issue cryptographically signed installation provisioning packages (`.apexlicense`).
- Select and configure industry business profiles (General Retail, Supermarket, Mobile Phones, Accessories, Electronics, Shoes, Bags & Fashion).
- Unlock licensed business modules.
- Bind licenses to target Windows hardware fingerprints.
- Issue approved profile conversion packages for existing installations.

---

## 2. Cryptographic Security Model
- **Algorithm**: Ed25519 asymmetric cryptography.
- **Key Storage**:
  - `apex_developer_private.pem`: Stored strictly on the developer machine in `developer_keys/`. NEVER packaged or shipped to clients.
  - `apex_developer_public.pem`: Embedded in the client POS binary (`licenseService.ts`).
- **Signature Integrity**: The POS client verifies all provisioning packages against the embedded public key. If a shop owner edits the configuration or changes profile settings in an unsigned file, signature validation fails and the profile will not load.

---

## 3. CLI Commands

### 3.1 Generate Developer Key Pair
```bash
npm run keygen
```
Generates `apex_developer_private.pem` (mode 0600) and `apex_developer_public.pem`.

### 3.2 Provision a New Client Package
```bash
node dist-electron/tools/dev-cli/index.js provision "<Client Business Name>" <PROFILE_TYPE>
```
Example:
```bash
node dist-electron/tools/dev-cli/index.js provision "Apex City Supermarket" SUPERMARKET
```
This produces `Apex_City_Supermarket.apexlicense`, containing canonical JSON and an Ed25519 base64 signature.

---

## 4. Business Conversion Workflow
To convert an existing client installation (e.g. from General Retail to Mobile Phones):
1. Launch Developer CLI with target profile.
2. Deliver the signed `.apexlicense` package to the client.
3. In the client POS Settings screen, the owner pastes the signed JSON package.
4. The system:
   - Validates the cryptographic signature.
   - Verifies the hardware fingerprint binding.
   - Creates an automated pre-conversion SQLite backup.
   - Activates new profile modules (e.g. IMEI tracking, warranty slips).
   - Preserves all historical sales, customers, and invoice records.
