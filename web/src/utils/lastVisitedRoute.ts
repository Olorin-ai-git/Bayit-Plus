/**
 * Last Visited Route - localStorage tracking keyed by user ID.
 * Saves the most recent non-excluded route so users return to their
 * last location after login.
 */

const STORAGE_KEY_PREFIX = "bayit_last_visited";

/**
 * Routes (by prefix) that should never be saved as last-visited.
 * Auth flows, onboarding, payments, legal pages and admin routes
 * are excluded because they are transient destinations, not content pages.
 */
const EXCLUDED_PREFIXES: readonly string[] = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/profiles",
  "/onboarding",
  "/tv-login",
  "/payment/",
  "/privacy",
  "/terms",
  "/policy",
  "/admin",
];

const storageKey = (userId: string): string =>
  `${STORAGE_KEY_PREFIX}_${userId}`;

const isExcluded = (path: string): boolean =>
  path === "/" || EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));

/**
 * Persist the given path as the last visited route for the user.
 * No-ops if the path matches an excluded prefix or is the home route.
 */
export function saveLastVisited(path: string, userId: string): void {
  if (isExcluded(path)) return;
  try {
    localStorage.setItem(storageKey(userId), path);
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded etc.)
  }
}

/**
 * Retrieve the last visited route for the given user.
 * Returns null if nothing was saved or storage is unavailable.
 */
export function getLastVisited(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

/**
 * Remove the saved last-visited entry for the given user.
 * Call this after consuming the value on post-login redirect.
 */
export function clearLastVisited(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
