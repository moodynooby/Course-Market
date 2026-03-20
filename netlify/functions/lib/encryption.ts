import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function getEncryptionKey(): Buffer {
  const key = process.env.LLM_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('LLM_ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`LLM_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters)`);
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  encrypted += authTag.toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

export function decrypt(encryptedData: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(encryptedData.slice(-AUTH_TAG_LENGTH * 2), 'hex');
  const encrypted = encryptedData.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
