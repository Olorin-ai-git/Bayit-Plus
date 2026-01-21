/**
 * Type Guard Utilities
 * 
 * Type guard functions for runtime type checking and validation.
 * Provides type safety for dynamic data and API responses.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { Job, CVTemplate, ProcessingStatus, JobStatus } from '../types';

// ============================================================================
// PRIMITIVE TYPE GUARDS
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// ============================================================================
// COMPLEX TYPE GUARDS
// ============================================================================

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return isArray(value) && value.length > 0;
}

export function isArrayOfStrings(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

export function isArrayOfNumbers(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

// ============================================================================
// EMAIL AND URL TYPE GUARDS
// ============================================================================

export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isHttpUrl(value: unknown): value is string {
  if (!isValidUrl(value)) return false;
  const url = new URL(value);
  return url.protocol === 'http:' || url.protocol === 'https:';
}

// ============================================================================
// DATE AND TIME TYPE GUARDS
// ============================================================================

export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

export function isValidDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isFutureDate(value: unknown): value is Date | string {
  let date: Date;
  
  if (isDate(value)) {
    date = value;
  } else if (isValidDateString(value)) {
    date = new Date(value);
  } else {
    return false;
  }
  
  return date.getTime() > Date.now();
}

export function isPastDate(value: unknown): value is Date | string {
  let date: Date;
  
  if (isDate(value)) {
    date = value;
  } else if (isValidDateString(value)) {
    date = new Date(value);
  } else {
    return false;
  }
  
  return date.getTime() < Date.now();
}

// ============================================================================
// DOMAIN-SPECIFIC TYPE GUARDS
// ============================================================================

export function isJobStatus(value: unknown): value is JobStatus {
  const validStatuses = [
    'pending',
    'processing',
    'analyzed',
    'generating',
    'completed',
    'failed'
  ] as const;
  return isString(value) && (validStatuses as readonly string[]).includes(value);
}

export function isProcessingStatus(value: unknown): value is ProcessingStatus {
  const validStatuses = [
    'pending',
    'queued',
    'initializing',
    'processing',
    'analyzing',
    'generating',
    'validating',
    'finalizing',
    'completed',
    'failed',
    'cancelled',
    'timeout'
  ] as const;
  return isString(value) && (validStatuses as readonly string[]).includes(value);
}

export function isJob(value: unknown): value is Job {
  if (!isObject(value)) return false;
  
  const job = value as Record<string, unknown>;
  
  return (
    isNonEmptyString(job.id) &&
    isNonEmptyString(job.userId) &&
    isJobStatus(job.status) &&
    (isUndefined(job.fileUrl) || isNonEmptyString(job.fileUrl)) &&
    (isUndefined(job.mimeType) || isNonEmptyString(job.mimeType)) &&
    (isUndefined(job.isUrl) || isBoolean(job.isUrl)) &&
    (isUndefined(job.selectedTemplate) || isNonEmptyString(job.selectedTemplate)) &&
    (isUndefined(job.selectedFeatures) || isArrayOfStrings(job.selectedFeatures)) &&
    (isUndefined(job.error) || isString(job.error))
  );
}

export function isCVTemplate(value: unknown): value is CVTemplate {
  if (!isObject(value)) return false;
  
  const template = value as Record<string, unknown>;
  
  return (
    isNonEmptyString(template.id) &&
    isNonEmptyString(template.name) &&
    isNonEmptyString(template.description) &&
    isNonEmptyString(template.thumbnail) &&
    isNonEmptyString(template.category) &&
    isBoolean(template.isPremium) &&
    isObject(template.config)
  );
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function hasRequiredFields<T extends Record<string, unknown>>(
  obj: unknown,
  requiredFields: string[]
): obj is T {
  if (!isObject(obj)) return false;
  
  return requiredFields.every(field => 
    field in obj && !isNullish(obj[field])
  );
}

export function isValidId(value: unknown): value is string {
  return isNonEmptyString(value) && value.length >= 3;
}

export function isValidTimestamp(value: unknown): value is number {
  return isNumber(value) && value > 0 && value <= Date.now() + 86400000; // Not more than 1 day in future
}

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isErrorWithMessage(value: unknown): value is Error & { message: string } {
  return isError(value) && isNonEmptyString(value.message);
}

// ============================================================================
// FIREBASE TYPE GUARDS
// ============================================================================

export function isFirebaseTimestamp(value: unknown): value is { seconds: number; nanoseconds: number } {
  return (
    isObject(value) &&
    isNumber((value as any).seconds) &&
    isNumber((value as any).nanoseconds)
  );
}

// ============================================================================
// GENERIC TYPE GUARD HELPERS
// ============================================================================

export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  allowedValues: T
): value is T[number] {
  return allowedValues.includes(value);
}

export function satisfies<T>(
  value: unknown,
  predicate: (value: unknown) => value is T
): value is T {
  return predicate(value);
}

export function isRecordOf<T>(
  value: unknown,
  valueGuard: (value: unknown) => value is T
): value is Record<string, T> {
  if (!isObject(value)) return false;
  
  return Object.values(value).every(valueGuard);
}

export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(itemGuard);
}