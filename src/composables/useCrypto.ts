const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

function buf2hex(buf: Uint8Array<ArrayBuffer> | ArrayBuffer): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hex2buf(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const len = hex.length / 2;
  const bytes = new Uint8Array(len) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < len; i++) {
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
  const salt = new Uint8Array(SALT_BYTES) as Uint8Array<ArrayBuffer>;
  crypto.getRandomValues(salt);
  const iv = new Uint8Array(IV_BYTES) as Uint8Array<ArrayBuffer>;
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
  const salt = hex2buf(saltHex) as BufferSource;
  const iv = hex2buf(ivHex) as BufferSource;
  const ciphertext = hex2buf(dataHex) as BufferSource;
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

// ---- MD5 (pure JS, RFC 1321) ----

function md5cycle(x: number[], k: number[]) {
  let a = x[0]!, b = x[1]!, c = x[2]!, d = x[3]!;
  // round 1
  a = ff(a, b, c, d, k[0]!,  7, 0xd76aa478); d = ff(d, a, b, c, k[1]!, 12, 0xe8c7b756); c = ff(c, d, a, b, k[2]!, 17, 0x242070db); b = ff(b, c, d, a, k[3]!, 22, 0xc1bdceee);
  a = ff(a, b, c, d, k[4]!,  7, 0xf57c0faf); d = ff(d, a, b, c, k[5]!, 12, 0x4787c62a); c = ff(c, d, a, b, k[6]!, 17, 0xa8304613); b = ff(b, c, d, a, k[7]!, 22, 0xfd469501);
  a = ff(a, b, c, d, k[8]!,  7, 0x698098d8); d = ff(d, a, b, c, k[9]!, 12, 0x8b44f7af); c = ff(c, d, a, b, k[10]!,17, 0xffff5bb1); b = ff(b, c, d, a, k[11]!,22, 0x895cd7be);
  a = ff(a, b, c, d, k[12]!, 7, 0x6b901122); d = ff(d, a, b, c, k[13]!,12, 0xfd987193); c = ff(c, d, a, b, k[14]!,17, 0xa679438e); b = ff(b, c, d, a, k[15]!,22, 0x49b40821);
  // round 2
  a = gg(a, b, c, d, k[1]!,  5, 0xf61e2562); d = gg(d, a, b, c, k[6]!,  9, 0xc040b340); c = gg(c, d, a, b, k[11]!,14, 0x265e5a51); b = gg(b, c, d, a, k[0]!, 20, 0xe9b6c7aa);
  a = gg(a, b, c, d, k[5]!,  5, 0xd62f105d); d = gg(d, a, b, c, k[10]!, 9, 0x02441453); c = gg(c, d, a, b, k[15]!,14, 0xd8a1e681); b = gg(b, c, d, a, k[4]!, 20, 0xe7d3fbc8);
  a = gg(a, b, c, d, k[9]!,  5, 0x21e1cde6); d = gg(d, a, b, c, k[14]!, 9, 0xc33707d6); c = gg(c, d, a, b, k[3]!, 14, 0xf4d50d87); b = gg(b, c, d, a, k[8]!, 20, 0x455a14ed);
  a = gg(a, b, c, d, k[13]!, 5, 0xa9e3e905); d = gg(d, a, b, c, k[2]!,  9, 0xfcefa3f8); c = gg(c, d, a, b, k[7]!, 14, 0x676f02d9); b = gg(b, c, d, a, k[12]!,20, 0x8d2a4c8a);
  // round 3
  a = hh(a, b, c, d, k[5]!,  4, 0xfffa3942); d = hh(d, a, b, c, k[8]!, 11, 0x8771f681); c = hh(c, d, a, b, k[11]!,16, 0x6d9d6122); b = hh(b, c, d, a, k[14]!,23, 0xfde5380c);
  a = hh(a, b, c, d, k[1]!,  4, 0xa4beea44); d = hh(d, a, b, c, k[4]!, 11, 0x4bdecfa9); c = hh(c, d, a, b, k[7]!, 16, 0xf6bb4b60); b = hh(b, c, d, a, k[10]!,23, 0xbebfbc70);
  a = hh(a, b, c, d, k[13]!, 4, 0x289b7ec6); d = hh(d, a, b, c, k[0]!, 11, 0xeaa127fa); c = hh(c, d, a, b, k[3]!, 16, 0xd4ef3085); b = hh(b, c, d, a, k[6]!, 23, 0x04881d05);
  a = hh(a, b, c, d, k[9]!,  4, 0xd9d4d039); d = hh(d, a, b, c, k[12]!,11, 0xe6db99e5); c = hh(c, d, a, b, k[15]!,16, 0x1fa27cf8); b = hh(b, c, d, a, k[2]!, 23, 0xc4ac5665);
  // round 4
  a = ii(a, b, c, d, k[0]!,  6, 0xf4292244); d = ii(d, a, b, c, k[7]!, 10, 0x432aff97); c = ii(c, d, a, b, k[14]!,15, 0xab9423a7); b = ii(b, c, d, a, k[5]!, 21, 0xfc93a039);
  a = ii(a, b, c, d, k[12]!, 6, 0x655b59c3); d = ii(d, a, b, c, k[3]!, 10, 0x8f0ccc92); c = ii(c, d, a, b, k[10]!,15, 0xffeff47d); b = ii(b, c, d, a, k[1]!, 21, 0x85845dd1);
  a = ii(a, b, c, d, k[8]!,  6, 0x6fa87e4f); d = ii(d, a, b, c, k[15]!,10, 0xfe2ce6e0); c = ii(c, d, a, b, k[6]!, 15, 0xa3014314); b = ii(b, c, d, a, k[13]!,21, 0x4e0811a1);
  a = ii(a, b, c, d, k[4]!,  6, 0xf7537e82); d = ii(d, a, b, c, k[11]!,10, 0xbd3af235); c = ii(c, d, a, b, k[2]!, 15, 0x2ad7d2bb); b = ii(b, c, d, a, k[9]!, 21, 0xeb86d391);
  x[0] = (x[0]! + a) | 0; x[1] = (x[1]! + b) | 0; x[2] = (x[2]! + c) | 0; x[3] = (x[3]! + d) | 0;
}

function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
  const add = (x + t) | 0;
  return (((add << s) | (add >>> (32 - s))) + ((a + q) | 0)) | 0;
}
function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

function md5(data: string): string {
  const msg = unescape(encodeURIComponent(data));
  const msgLen = msg.length;
  const padLen = (msgLen + 8) % 64;
  const totalLen = msgLen + (padLen < 56 ? 56 - padLen : 120 - padLen) + 8;
  const wordCount = totalLen / 4;

  const words: number[] = [];
  for (let i = 0; i < wordCount; i++) words.push(0);

  for (let i = 0; i < msgLen; i++) {
    words[i >> 2]! |= msg.charCodeAt(i) << ((i % 4) * 8);
  }
  words[msgLen >> 2]! |= 0x80 << ((msgLen % 4) * 8);
  // Append length in bits at the end
  const bitLen = msgLen * 8;
  const lenIdx = wordCount - 2;
  words[lenIdx] = bitLen;
  words[lenIdx + 1] = Math.floor(bitLen / 0x100000000);

  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let i = 0; i < words.length; i += 16) {
    md5cycle(state, words.slice(i, i + 16));
  }

  const hexOut: string[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      hexOut.push(((state[i]! >>> (j * 8)) & 0xff).toString(16).padStart(2, '0'));
    }
  }
  return hexOut.join('');
}

/**
 * Compute the double-MD5 hash of a passkey for verification purposes.
 * Returns MD5(MD5(passkey)) as a hex string.
 */
export function hashPasskey(passkey: string): string {
  return md5(md5(passkey));
}
