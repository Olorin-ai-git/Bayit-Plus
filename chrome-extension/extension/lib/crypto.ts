const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PROFILE_SALT = 'bayit-extension-token-v1';

function encodeBase64(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function encryptToken(token: string, key: CryptoKey): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    return encodeBase64(result);
  } catch (error) {
    void error;
    throw new Error('Token encryption failed');
  }
}

export async function decryptToken(encryptedToken: string, key: CryptoKey): Promise<string> {
  try {
    const payload = decodeBase64(encryptedToken);
    const iv = payload.slice(0, IV_LENGTH);
    const encrypted = payload.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    void error;
    throw new Error('Token decryption failed');
  }
}

export async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    const getProfileUserInfo = chrome.identity.getProfileUserInfo as unknown as () => Promise<{ id?: string }>;
    const profile = await getProfileUserInfo();
    if (!profile.id) throw new Error('Chrome profile ID unavailable');
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(profile.id),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode(PROFILE_SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    void error;
    throw new Error('Encryption key generation failed');
  }
}

export function isValidJWTFormat(token: string): boolean {
  return token.split('.').length === 3 && token.split('.').every((part) => part.length > 0);
}

export function parseJWTPayload(token: string): Record<string, unknown> | null {
  try {
    if (!isValidJWTFormat(token)) return null;
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(encoded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJWTPayload(token);
  return typeof payload?.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000);
}
