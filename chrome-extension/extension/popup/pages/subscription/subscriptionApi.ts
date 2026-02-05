import { CONFIG } from '../../../config/constants';

/**
 * Get auth token via service worker messaging (consistent with content script pattern)
 */
export async function getAuthToken(): Promise<string | null> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  return response?.token || null;
}

/**
 * Authenticated fetch helper to avoid duplicated auth header logic
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication token not available');
  }
  return fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}
