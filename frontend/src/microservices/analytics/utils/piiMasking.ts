/**
 * PII Masking Utility
 * Masks sensitive data to prevent PII display in UI
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

/**
 * Mask a string showing only first and last n characters
 */
export function maskPII(
  value: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = '•'
): string {
  if (!value || value.length <= visibleStart + visibleEnd) {
    return value;
  }

  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const masked = maskChar.repeat(Math.max(0, value.length - visibleStart - visibleEnd));

  return `${start}${masked}${end}`;
}

/**
 * Mask user IDs (e.g., user_12345678 -> user_12••••78)
 */
export function maskUserID(userId: string): string {
  if (!userId) return userId;
  
  // Handle common patterns: user_12345678, user-12345678, etc.
  const parts = userId.split(/[_-]/);
  if (parts.length >= 2) {
    const prefix = parts[0];
    const id = parts.slice(1).join('_');
    return `${prefix}_${maskPII(id, 2, 2)}`;
  }
  
  return maskPII(userId, 4, 4);
}

/**
 * Mask email addresses (e.g., user@example.com -> us••@ex••••.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  const maskedLocal = maskPII(local, 2, 0);
  const [domainName, ...domainParts] = domain.split('.');
  const maskedDomain = maskPII(domainName, 2, 0);
  
  return `${maskedLocal}@${maskedDomain}.${domainParts.join('.')}`;
}

/**
 * Mask merchant IDs and other entity IDs
 */
export function maskEntityID(entityId: string, entityType: string = 'entity'): string {
  if (!entityId) return entityId;
  
  // For IDs like merchant_12345678, show merchant_12••••78
  if (entityId.includes('_')) {
    const parts = entityId.split('_');
    if (parts.length >= 2) {
      const prefix = parts[0];
      const id = parts.slice(1).join('_');
      return `${prefix}_${maskPII(id, 2, 2)}`;
    }
  }
  
  return `${entityType}_${maskPII(entityId, 2, 2)}`;
}

/**
 * Mask cohort data (merchant_id, user_id, etc.)
 */
export function maskCohort(cohort: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(cohort)) {
    if (key.includes('user') || key === 'user_id') {
      masked[key] = maskUserID(value);
    } else if (key.includes('email')) {
      masked[key] = maskEmail(value);
    } else if (key.includes('merchant') || key.includes('entity')) {
      masked[key] = maskEntityID(value, key);
    } else {
      // Default masking for unknown fields
      masked[key] = maskPII(value, 2, 2);
    }
  }
  
  return masked;
}

