/**
 * Crypto Utilities
 * 
 * Common cryptographic and security helper functions.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

export function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function obfuscateEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  const obfuscatedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local;
    
  return `${obfuscatedLocal}@${domain}`;
}

export function maskString(str: string, visibleChars = 4): string {
  if (str.length <= visibleChars) return str;
  const visible = Math.floor(visibleChars / 2);
  const start = str.slice(0, visible);
  const end = str.slice(-visible);
  const masked = '*'.repeat(str.length - visibleChars);
  return start + masked + end;
}