/**
 * Graceful Remote Module Loader
 * Feature: 002-visualization-microservice
 *
 * Provides graceful degradation for Module Federation remote loading.
 * Handles service failures without breaking the entire application.
 *
 * @module shared/utils/remoteLoader
 */

const REMOTE_TIMEOUT_MS = parseInt(process.env.REACT_APP_REMOTE_TIMEOUT_MS || '5000', 10);

export interface RemoteServiceConfig {
  name: string;
  url: string;
  scope: string;
  module: string;
}

export interface LoadRemoteResult<T = any> {
  success: boolean;
  module: T | null;
  error: Error | null;
  serviceName: string;
}

/**
 * Load a remote module with timeout and error handling
 */
export async function loadRemoteModule<T = any>(
  config: RemoteServiceConfig
): Promise<LoadRemoteResult<T>> {
  const { name, url, scope, module } = config;

  try {
    console.log(`[RemoteLoader] Loading ${name} from ${url}...`);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Remote module ${name} timed out after ${REMOTE_TIMEOUT_MS}ms`)),
        REMOTE_TIMEOUT_MS
      );
    });

    // Load remote with timeout
    const loadPromise = loadRemoteWithFallback<T>(url, scope, module);

    const loadedModule = await Promise.race([loadPromise, timeoutPromise]);

    console.log(`[RemoteLoader] Successfully loaded ${name}`);

    return {
      success: true,
      module: loadedModule,
      error: null,
      serviceName: name
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error(`[RemoteLoader] Failed to load ${name}:`, errorObj);

    // Publish error event
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('remote:load-failed', {
        service: name,
        error: errorObj.message,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: false,
      module: null,
      error: errorObj,
      serviceName: name
    };
  }
}

/**
 * Load remote module with fallback logic
 */
async function loadRemoteWithFallback<T>(
  url: string,
  scope: string,
  module: string
): Promise<T> {
  // @ts-ignore - Module Federation runtime
  await __webpack_init_sharing__('default');

  // @ts-ignore - Module Federation container
  const container = window[scope];

  if (!container) {
    throw new Error(`Remote container ${scope} not found`);
  }

  // @ts-ignore
  await container.init(__webpack_share_scopes__.default);

  // @ts-ignore
  const factory = await container.get(module);

  if (!factory) {
    throw new Error(`Module ${module} not found in ${scope}`);
  }

  const loadedModule = factory();
  return loadedModule as T;
}

/**
 * Load multiple remote modules in parallel
 */
export async function loadRemoteModules(
  configs: RemoteServiceConfig[]
): Promise<Map<string, LoadRemoteResult>> {
  const results = await Promise.allSettled(
    configs.map(config => loadRemoteModule(config))
  );

  const resultMap = new Map<string, LoadRemoteResult>();

  results.forEach((result, index) => {
    const config = configs[index];

    if (result.status === 'fulfilled') {
      resultMap.set(config.name, result.value);
    } else {
      resultMap.set(config.name, {
        success: false,
        module: null,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        serviceName: config.name
      });
    }
  });

  return resultMap;
}

/**
 * Health check for a remote service
 */
export async function checkServiceHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
      method: 'GET'
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    console.warn(`[RemoteLoader] Health check failed for ${baseUrl}:`, error);
    return false;
  }
}

/**
 * Health check for multiple services
 */
export async function checkServicesHealth(
  services: Record<string, string>
): Promise<Map<string, boolean>> {
  const results = await Promise.allSettled(
    Object.entries(services).map(([name, url]) =>
      checkServiceHealth(url).then(healthy => ({ name, healthy }))
    )
  );

  const healthMap = new Map<string, boolean>();

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      healthMap.set(result.value.name, result.value.healthy);
    } else {
      // If health check itself fails, mark as unhealthy
      healthMap.set('unknown', false);
    }
  });

  return healthMap;
}
