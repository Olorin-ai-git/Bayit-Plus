/**
 * Axios Type Extensions
 *
 * Extends Axios types with custom properties used throughout the application.
 * This file provides type-safe access to custom request configuration properties.
 *
 * Constitutional Compliance:
 * - Type-safe extensions
 * - No hardcoded values
 * - Proper TypeScript module augmentation
 */

import { InternalAxiosRequestConfig } from 'axios';

/**
 * Extended Axios Request Configuration
 * Adds custom properties for retry logic and metadata tracking
 */
export interface ExtendedAxiosRequestConfig<D = any> extends InternalAxiosRequestConfig<D> {
  /**
   * Number of retry attempts remaining for this request
   */
  retriesLeft?: number;

  /**
   * Custom metadata for request tracking and monitoring
   */
  metadata?: {
    requestId?: string;
    startTime?: number;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * Module augmentation to extend Axios types globally
 */
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    retriesLeft?: number;
    metadata?: {
      requestId?: string;
      startTime?: number;
      retryCount?: number;
      [key: string]: any;
    };
  }
}
