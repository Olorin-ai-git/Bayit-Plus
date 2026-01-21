/**
 * Performance Optimization Utilities
 *
 * Constitutional Compliance:
 * - Configuration-driven optimization settings
 * - Type-safe optimization helpers
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { debounce, throttle, memoize } from '@api/performance/optimization';
 */

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= limitMs) {
      fn.apply(this, args);
      lastRun = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastRun = Date.now();
      }, limitMs - timeSinceLastRun);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn.apply(this, args);
    cache.set(key, result);

    return result;
  } as T;
}

/**
 * Memoize with expiration
 */
export function memoizeWithExpiration<T extends (...args: any[]) => any>(
  fn: T,
  ttlMs: number,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { value: ReturnType<T>; expiresAt: number }>();

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const now = Date.now();

    const cached = cache.get(key);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    const result = fn.apply(this, args);
    cache.set(key, {
      value: result,
      expiresAt: now + ttlMs
    });

    return result;
  } as T;
}

/**
 * Batch function calls
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  batchSize: number,
  delayMs: number = 0
): (item: T) => Promise<R> {
  let queue: { item: T; resolve: (value: R) => void; reject: (error: any) => void }[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (queue.length === 0) return;

    const batch = queue.splice(0, batchSize);
    const items = batch.map((q) => q.item);

    try {
      const results = await fn(items);

      batch.forEach((q, index) => {
        q.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((q) => {
        q.reject(error);
      });
    }
  };

  return (item: T) => {
    return new Promise<R>((resolve, reject) => {
      queue.push({ item, resolve, reject });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (queue.length >= batchSize) {
        flush();
      } else {
        timeoutId = setTimeout(flush, delayMs);
      }
    });
  };
}

/**
 * Lazy initialization
 */
export function lazy<T>(initializer: () => T): () => T {
  let value: T | undefined;
  let initialized = false;

  return () => {
    if (!initialized) {
      value = initializer();
      initialized = true;
    }
    return value!;
  };
}

/**
 * Request deduplication
 */
export function deduplicate<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const pending = new Map<string, Promise<ReturnType<T>>>();

  return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (pending.has(key)) {
      return pending.get(key)!;
    }

    const promise = fn.apply(this, args);
    pending.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      pending.delete(key);
    }
  } as T;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 30000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Parallel execution with concurrency limit
 */
export async function parallelWithLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  const executeNext = async (): Promise<void> => {
    const currentIndex = index++;
    if (currentIndex >= items.length) return;

    const result = await fn(items[currentIndex]);
    results[currentIndex] = result;

    await executeNext();
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => executeNext())
  );

  return results;
}
