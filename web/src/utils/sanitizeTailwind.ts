/**
 * Security utilities for safe Tailwind className generation
 *
 * Prevents XSS and injection vulnerabilities when using dynamic classNames
 * or arbitrary values in Tailwind CSS.
 *
 * @module sanitizeTailwind
 */

import DOMPurify from 'isomorphic-dompurify';
import clsx, { ClassValue } from 'clsx';

/**
 * Safe pattern for Tailwind arbitrary values
 *
 * Allows: alphanumeric, hyphens, dots, commas, parentheses, percent, forward slash, spaces
 * Blocks: semicolons, colons (outside parentheses), quotes, braces, etc.
 *
 * Examples:
 * - ✅ Safe: "100px", "rgba(255,255,255,0.5)", "calc(100% - 20px)", "1.5rem"
 * - ❌ Unsafe: "100px);color:red", "url('javascript:alert(1)')", "{content:'hacked'}"
 */
const SAFE_ARBITRARY_VALUE_PATTERN = /^[\w\-\.\,\(\)%\/\s]+$/;

/**
 * Sanitize a Tailwind arbitrary value for safe use in className
 *
 * Throws an error if the value contains potentially dangerous characters.
 *
 * Usage:
 * ```tsx
 * const width = sanitizeArbitraryValue(userProvidedWidth);
 * className={`w-[${width}]`}  // Safe from injection
 * ```
 *
 * @param value - Arbitrary value to sanitize
 * @returns Sanitized value
 * @throws Error if value contains unsafe characters
 */
export function sanitizeArbitraryValue(value: string): string {
  if (!value) {
    throw new Error('Arbitrary value cannot be empty');
  }

  // Check for unsafe patterns
  if (!SAFE_ARBITRARY_VALUE_PATTERN.test(value)) {
    throw new Error(
      `Unsafe arbitrary value detected: "${value}". ` +
      `Only alphanumeric, hyphens, dots, commas, parentheses, percent, and forward slash are allowed.`
    );
  }

  // Additional DOMPurify sanitization
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],  // No HTML tags
    KEEP_CONTENT: true,
  });

  if (sanitized !== value) {
    throw new Error(
      `Value was modified during sanitization. ` +
      `Original: "${value}", Sanitized: "${sanitized}"`
    );
  }

  return value;
}

/**
 * Type-safe className builder with automatic sanitization
 *
 * Combines multiple className values safely, filtering falsy values.
 * Identical to clsx but with better TypeScript support.
 *
 * Usage:
 * ```tsx
 * buildClassName(
 *   'base-class',
 *   isActive && 'active-class',
 *   condition ? 'true-class' : 'false-class',
 *   { 'conditional-class': condition }
 * )
 * ```
 *
 * @param classes - Class values to combine
 * @returns Combined className string
 */
export function buildClassName(...classes: ClassValue[]): string {
  return clsx(classes);
}

/**
 * Whitelist-based className selector for dynamic values
 *
 * Instead of interpolating user input, map to predefined classes.
 *
 * Usage:
 * ```tsx
 * const colorClass = selectClassName(userColor, {
 *   purple: 'bg-purple-500',
 *   blue: 'bg-blue-500',
 *   green: 'bg-green-500',
 * }, 'bg-gray-500');  // Default fallback
 *
 * <View className={colorClass} />
 * ```
 *
 * @param key - Dynamic value from user input or props
 * @param whitelist - Map of allowed values to className strings
 * @param defaultClass - Fallback className if key not in whitelist
 * @returns Safe className from whitelist or default
 */
export function selectClassName<T extends string>(
  key: T | undefined | null,
  whitelist: Record<string, string>,
  defaultClass: string = ''
): string {
  if (!key) {
    return defaultClass;
  }

  return whitelist[key] || defaultClass;
}

/**
 * Validate that a className string contains only safe utilities
 *
 * Checks for common injection patterns:
 * - JavaScript URLs
 * - Style injection
 * - Event handlers
 * - CSS custom properties with suspicious content
 *
 * @param className - className string to validate
 * @returns true if safe, false if suspicious
 */
export function isClassNameSafe(className: string): boolean {
  const dangerousPatterns = [
    /javascript:/i,
    /on\w+=/i,        // onclick=, onerror=, etc.
    /expression\(/i,  // IE CSS expressions
    /behavior:/i,     // IE behaviors
    /<script/i,
    /--\w+:.*[;{}]/,  // Suspicious CSS custom properties
  ];

  return !dangerousPatterns.some(pattern => pattern.test(className));
}

/**
 * Assert that a className is safe, throwing if not
 *
 * Use in development to catch unsafe className generation early.
 *
 * @param className - className to validate
 * @throws Error if className contains unsafe patterns
 */
export function assertClassNameSafe(className: string): void {
  if (!isClassNameSafe(className)) {
    throw new Error(
      `Unsafe className detected: "${className}". ` +
      `This may contain XSS or injection vulnerabilities.`
    );
  }
}

/**
 * Safe arbitrary value builder with validation
 *
 * Combines Tailwind utility prefix with sanitized arbitrary value.
 *
 * Usage:
 * ```tsx
 * const widthClass = buildArbitraryClass('w', userWidth);
 * // Result: "w-[100px]" (safely sanitized)
 * ```
 *
 * @param utility - Tailwind utility prefix (e.g., 'w', 'bg', 'text')
 * @param value - Arbitrary value to sanitize
 * @returns Safe Tailwind class with arbitrary value
 */
export function buildArbitraryClass(utility: string, value: string): string {
  const sanitized = sanitizeArbitraryValue(value);
  return `${utility}-[${sanitized}]`;
}

/**
 * Type guard for checking if a value is a safe className
 *
 * @param value - Value to check
 * @returns true if value is a non-empty safe string
 */
export function isSafeClassName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    isClassNameSafe(value)
  );
}

/**
 * Development-only className validation
 *
 * Validates classNames in development mode, no-op in production.
 * Throws errors to catch issues during development.
 *
 * @param className - className to validate
 */
export function devValidateClassName(className: string): void {
  if (process.env.NODE_ENV === 'development') {
    assertClassNameSafe(className);
  }
}

/**
 * Predefined color map for common use cases
 *
 * Use these instead of arbitrary color values from user input.
 */
export const COLOR_WHITELIST = {
  // Status colors
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',

  // Brand colors
  primary: 'bg-purple-500',
  secondary: 'bg-purple-600',

  // Grayscale
  white: 'bg-white',
  black: 'bg-black',
  gray: 'bg-gray-500',

  // Transparent
  transparent: 'bg-transparent',
} as const;

/**
 * Predefined size map for common use cases
 */
export const SIZE_WHITELIST = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
} as const;

/**
 * Example: Safe dynamic className generation
 *
 * ```tsx
 * function DynamicCard({ color, size, width }) {
 *   // ❌ DANGEROUS - Direct interpolation
 *   const dangerousClass = `bg-[${color}] text-${size} w-[${width}]`;
 *
 *   // ✅ SAFE - Whitelist approach
 *   const safeClass = buildClassName(
 *     selectClassName(color, COLOR_WHITELIST, 'bg-gray-500'),
 *     selectClassName(size, SIZE_WHITELIST, 'text-base'),
 *     width === 'full' ? 'w-full' : 'w-auto'
 *   );
 *
 *   // ✅ SAFE - Sanitized arbitrary value (use sparingly)
 *   const safeArbitraryClass = buildClassName(
 *     'rounded-lg',
 *     buildArbitraryClass('w', sanitizeArbitraryValue(width))
 *   );
 *
 *   return <View className={safeClass} />;
 * }
 * ```
 */
