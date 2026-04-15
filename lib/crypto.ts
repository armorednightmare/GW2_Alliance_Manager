import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string using the BACKUP_ENCRYPTION_KEY.
 */
export function encrypt(text: string): string {
  const keyStr = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyStr) throw new Error("BACKUP_ENCRYPTION_KEY is missing in environment.");
  
  // Ensure key is 32 bytes (256 bits)
  const key = crypto.createHash('sha256').update(keyStr).digest();
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return IV:AuthTag:EncryptedContent
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string using the BACKUP_ENCRYPTION_KEY.
 */
export function decrypt(encryptedText: string): string {
  const keyStr = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyStr) throw new Error("BACKUP_ENCRYPTION_KEY is missing in environment.");
  
  const key = crypto.createHash('sha256').update(keyStr).digest();
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error("Invalid encrypted text format.");
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const content = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
