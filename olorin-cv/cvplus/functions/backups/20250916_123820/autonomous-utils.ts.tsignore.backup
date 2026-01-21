// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Autonomous Utility Functions
 * Replaces @cvplus/core/utils for autonomous operation
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CVData, CVParsedData } from '../types/autonomous-cv.types';

// Styling utilities (replaces @cvplus/core/utils cn function)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type guards and validation utilities
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (isString(value) || isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

// CV validation utilities
export function validateCV(data: unknown): data is CVData {
  if (!isObject(data)) return false;
  
  const cv = data as unknown as CVData;
  return !!(
    cv.id &&
    cv.personalInfo &&
    isObject(cv.personalInfo) &&
    cv.personalInfo.name &&
    isArray(cv.experience) &&
    isArray(cv.education) &&
    isArray(cv.skills) &&
    cv.metadata &&
    isObject(cv.metadata)
  );
}

export function validateParsedCV(data: unknown): data is CVParsedData {
  if (!validateCV(data)) return false;
  
  const parsedCV = data as CVParsedData;
  return !!(
    parsedCV.parsedAt &&
    parsedCV.parsingVersion &&
    typeof parsedCV.confidence === 'number'
  );
}

// Input sanitization utilities
export function sanitizeInput(input: string): string {
  if (!isString(input)) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  if (!isString(email)) return '';
  
  return email
    .trim()
    .toLowerCase()
    .substring(0, 254); // Email max length
}

export function sanitizeUrl(url: string): string {
  if (!isString(url)) return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    return urlObj.toString();
  } catch {
    return '';
  }
}

// Date utilities
export function parseDate(dateInput: unknown): Date | null {
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  if (isString(dateInput) || isNumber(dateInput)) {
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = isString(date) ? parseDate(date) : date;
  if (!dateObj) return '';
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'iso':
      return dateObj.toISOString();
    default:
      return dateObj.toLocaleDateString();
  }
}

// Error handling utilities
export class CVProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CVProcessingError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Async utilities
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await delay(delayMs * attempt); // Exponential backoff
    }
  }
  
  throw lastError!;
}

// Data transformation utilities
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  
  return obj;
}

export function mergeDeep<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key] as any, source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return mergeDeep(target, ...sources);
}

// Text processing utilities
export function extractKeywords(text: string, minLength: number = 3): string[] {
  if (!isString(text)) return [];
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength)
    .filter(word => !commonStopWords.has(word));
  
  return [...new Set(words)];
}

export function calculateTextSimilarity(text1: string, text2: string): number {
  const keywords1 = new Set(extractKeywords(text1));
  const keywords2 = new Set(extractKeywords(text2));
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Common stop words for text processing
const commonStopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to',
  'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what',
  'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'up', 'out',
  'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make',
  'like', 'into', 'him', 'time', 'has', 'two', 'more', 'go', 'no', 'way',
  'could', 'my', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit', 'now',
  'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'
]);

// Performance monitoring utilities
export function measureTime<T>(operation: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;
  return { result, duration };
}

export async function measureTimeAsync<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
}