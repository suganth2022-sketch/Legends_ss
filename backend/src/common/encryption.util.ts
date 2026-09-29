import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('Missing required environment variable: ENCRYPTION_KEY');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return key;
}

// Stores as "iv:authTag:ciphertext", all hex-encoded, in one string column.
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted value');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

// Masking helpers — match the format already shown across the UI.
export function maskAadhaar(plain: string): string {
  const digits = plain.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export function maskPan(plain: string): string {
  // PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter)
  const last1 = plain.slice(-1);
  return `XXXXX${plain.slice(5, 9) || '9999'}${last1}`;
}

export function maskAccountNumber(plain: string): string {
  const last4 = plain.slice(-4);
  return `${'*'.repeat(Math.max(plain.length - 4, 8))}${last4}`;
}
