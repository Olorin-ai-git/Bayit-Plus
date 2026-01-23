/**
 * Chat Message Sanitizer
 * Sanitizes user input to prevent XSS and other security issues
 */

/**
 * Sanitizes chat message content
 * - Removes potentially dangerous characters
 * - Limits message length
 * - Escapes special characters
 */
export function sanitizeChatMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return ''
  }

  // Trim whitespace
  let sanitized = message.trim()

  // Limit length (500 characters max)
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500)
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape HTML entities as precaution for web platform
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return sanitized
}

/**
 * Validates that a message is safe to display
 */
export function isValidChatMessage(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false
  }

  const trimmed = message.trim()

  // Check length
  if (trimmed.length === 0 || trimmed.length > 500) {
    return false
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers like onclick=
    /data:text\/html/i,
  ]

  return !suspiciousPatterns.some((pattern) => pattern.test(message))
}

/**
 * Sanitizes username for display
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return 'Anonymous'
  }

  let sanitized = username.trim()

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50)
  }

  // Remove special characters
  sanitized = sanitized.replace(/[<>'"&]/g, '')

  // If empty after sanitization, return default
  return sanitized || 'Anonymous'
}
