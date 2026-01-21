/**
 * Credentials Validator
 * Username and password validation with security considerations
 * Feature: Client-side security controls
 */

import type {
  UsernameValidationResult,
  PasswordValidationResult,
  PasswordStrength,
} from '../types/security-types';

/**
 * Reserved usernames that cannot be used
 * Loaded from environment variable
 */
function getReservedUsernames(): string[] {
  const reservedString = process.env.REACT_APP_SECURITY_RESERVED_USERNAMES || '';
  const reserved = reservedString
    .split(',')
    .map(username => username.trim().toLowerCase())
    .filter(username => username.length > 0);

  // Fallback to minimal list if not configured
  if (reserved.length === 0) {
    return ['admin', 'root', 'system'];
  }

  return reserved;
}

/**
 * Validate username with security considerations
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  const minLength = parseInt(process.env.REACT_APP_SECURITY_USERNAME_MIN_LENGTH || '3', 10);
  const maxLength = parseInt(process.env.REACT_APP_SECURITY_USERNAME_MAX_LENGTH || '50', 10);

  if (username.length < minLength) {
    return { valid: false, error: `Username must be at least ${minLength} characters` };
  }

  if (username.length > maxLength) {
    return { valid: false, error: `Username must not exceed ${maxLength} characters` };
  }

  // Allow alphanumeric and limited special characters
  const validUsernameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!validUsernameRegex.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscore, period, and hyphen',
    };
  }

  // Check for reserved usernames
  const reservedUsernames = getReservedUsernames();
  if (reservedUsernames.includes(username.toLowerCase())) {
    return { valid: false, error: 'Username is reserved' };
  }

  return { valid: true };
}

/**
 * Common passwords to check against
 * Loaded from environment variable
 */
function getCommonPasswords(): string[] {
  const commonString = process.env.REACT_APP_SECURITY_COMMON_PASSWORDS || '';
  const common = commonString
    .split(',')
    .map(password => password.trim().toLowerCase())
    .filter(password => password.length > 0);

  // Fallback to minimal list if not configured
  if (common.length === 0) {
    return ['password', '123456', 'qwerty', 'admin', 'login'];
  }

  return common;
}

/**
 * Validate password strength with comprehensive checks
 */
export function validatePassword(password: string): PasswordValidationResult {
  const suggestions: string[] = [];
  let score = 0;

  if (!password) {
    return {
      valid: false,
      error: 'Password is required',
      strength: 'weak',
      suggestions: ['Password is required'],
    };
  }

  const minLength = parseInt(process.env.REACT_APP_SECURITY_PASSWORD_MIN_LENGTH || '8', 10);

  // Length checks
  if (password.length < minLength) {
    suggestions.push(`Use at least ${minLength} characters`);
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Include lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Include uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Include numbers');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 2;
  } else {
    suggestions.push('Include special characters');
  }

  // Common password checks
  const commonPasswords = getCommonPasswords();
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score -= 3;
    suggestions.push('Avoid common passwords');
  }

  // Determine strength
  let strength: PasswordStrength;
  if (score < 3) {
    strength = 'weak';
  } else if (score < 5) {
    strength = 'medium';
  } else if (score < 7) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  // Minimum requirements for validity
  const valid =
    password.length >= minLength &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password);

  if (valid) {
    return {
      valid,
      strength,
      suggestions: suggestions.slice(0, 3), // Limit suggestions
    };
  } else {
    return {
      valid,
      error: 'Password does not meet minimum requirements',
      strength,
      suggestions: suggestions.slice(0, 3), // Limit suggestions
    };
  }
}

/**
 * Check if password is strong enough
 */
export function isPasswordStrong(password: string): boolean {
  const result = validatePassword(password);
  return result.valid && (result.strength === 'strong' || result.strength === 'very-strong');
}

/**
 * Generate password strength score (0-100)
 */
export function calculatePasswordScore(password: string): number {
  const result = validatePassword(password);
  const strengthScores: Record<PasswordStrength, number> = {
    weak: 25,
    medium: 50,
    strong: 75,
    'very-strong': 100,
  };
  return strengthScores[result.strength];
}
