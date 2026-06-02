const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

function buf2hex(buf: Uint8Array | ArrayBuffer): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hex2buf(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKey(passkey: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passkey),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt `data` with the given passkey.
 * Returns a string in the format: hex(salt):hex(iv):hex(ciphertext)
 */
export async function encrypt(data: string, passkey: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);
  const key = await deriveKey(passkey, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(data),
  );
  return `${buf2hex(salt)}:${buf2hex(iv)}:${buf2hex(ciphertext)}`;
}

/**
 * Decrypt data previously encrypted with `encrypt()`.
 * Expects the format: hex(salt):hex(iv):hex(ciphertext)
 * Returns the original plaintext string.
 */
export async function decrypt(encrypted: string, passkey: string): Promise<string> {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const [saltHex, ivHex, dataHex] = parts as [string, string, string];
  const salt = hex2buf(saltHex);
  const iv = hex2buf(ivHex);
  const ciphertext = hex2buf(dataHex);
  const key = await deriveKey(passkey, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Try to detect if a string looks like our encrypted format:
 * three colon-separated hex sections.
 */
export function looksEncrypted(data: string): boolean {
  const parts = data.split(':');
  if (parts.length !== 3) return false;
  const hexRegex = /^[0-9a-fA-F]+$/;
  return parts.every(p => hexRegex.test(p) && p.length >= 2);
}
