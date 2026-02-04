/**
 * API Client re-export for tvOS
 *
 * Re-exports httpClient as the default API client.
 * Screens and services should import from this module.
 */

export { httpClient as default, httpClient } from './httpClient';
