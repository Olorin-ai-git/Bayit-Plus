/// <reference types="node" />

/**
 * TypeScript Type Declarations for Environment Variables
 * Feature: 005-polling-and-persistence & 006-hybrid-graph-integration
 *
 * Extends NodeJS.ProcessEnv interface to include all Olorin environment variables.
 * This enables TypeScript type checking for process.env access.
 */

declare global {
  namespace NodeJS {
  interface ProcessEnv {
    // Node Environment
    readonly NODE_ENV: 'development' | 'production' | 'test';

    // Olorin Environment
    readonly REACT_APP_ENV: 'production' | 'staging' | 'development';

    // API Configuration
    readonly REACT_APP_API_BASE_URL: string;
    readonly REACT_APP_FRONTEND_PORT?: string;
    readonly REACT_APP_REQUEST_TIMEOUT_MS?: string;

    // Polling Configuration
    readonly REACT_APP_POLLING_BASE_INTERVAL_MS?: string;
    readonly REACT_APP_POLLING_FAST_INTERVAL_MS?: string;
    readonly REACT_APP_POLLING_SLOW_INTERVAL_MS?: string;
    readonly REACT_APP_POLLING_MAX_RETRIES?: string;
    readonly REACT_APP_POLLING_BACKOFF_MULTIPLIER?: string;
    readonly REACT_APP_POLLING_MAX_BACKOFF_MS?: string;

    // Feature Flags
    readonly REACT_APP_FEATURE_ENABLE_RAG?: string;
    readonly REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES?: string;
    readonly REACT_APP_FEATURE_ENABLE_MICROSERVICES?: string;
    readonly REACT_APP_FEATURE_ENABLE_WIZARD?: string;
    readonly REACT_APP_FEATURE_ENABLE_TEMPLATES?: string;
    readonly REACT_APP_FEATURE_ENABLE_MULTI_ENTITY?: string;
    readonly REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS?: string;
    readonly REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH?: string;
    readonly REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE?: string;
    readonly REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING?: string;
    readonly REACT_APP_FEATURE_ENABLE_AUDIT_LOG?: string;
    readonly REACT_APP_FEATURE_ENABLE_POLLING?: string;

    // UI Configuration
    readonly REACT_APP_PAGINATION_SIZE?: string;
    readonly REACT_APP_MAX_ENTITIES?: string;
    readonly REACT_APP_MAX_TOOLS?: string;

    // Wizard Configuration
    readonly REACT_APP_DEFAULT_RISK_THRESHOLD?: string;
    readonly REACT_APP_DEFAULT_CORRELATION_MODE?: string;
    readonly REACT_APP_DEFAULT_EXECUTION_MODE?: string;
    readonly REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS?: string;
    readonly REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS?: string;
    readonly REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS?: string;

    // WebSocket Configuration (deprecated per spec 005, kept for backwards compatibility)
    readonly REACT_APP_WS_URL?: string;
    readonly REACT_APP_WS_BASE_URL?: string;

    // External API URLs
    readonly REACT_APP_OLORIN_API_URL?: string;

    // Authentication (secrets)
    readonly REACT_APP_AUTH_TOKEN?: string;
  }
  }
}

export {};
