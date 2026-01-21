import { logger } from 'firebase-functions';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  monitoringPeriod?: number;
  volumeThreshold?: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  lastStateChange: Date;
  totalRequests: number;
  rejectedRequests: number;
  errorRate: number;
}

/**
 * Circuit breaker state tracking
 */
interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  lastStateChange: Date;
  totalRequests: number;
  rejectedRequests: number;
  nextAttemptTime?: Date;
}

/**
 * Service implementing circuit breaker pattern for fault tolerance
 */
export class CircuitBreakerService {
  private static instance: CircuitBreakerService;
  private db: Firestore | null = null;
  private app: App | null = null;
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private defaultConfig: Required<CircuitBreakerConfig> = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    monitoringPeriod: 10000,
    volumeThreshold: 10,
  };

  private constructor() {
    // Lazy initialization
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService();
    }
    return CircuitBreakerService.instance;
  }

  /**
   * Initialize Firestore connection
   */
  private initializeFirestore(): void {
    if (this.db) return;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp();
      } else {
        this.app = getApps()[0] || null;
      }
      if (this.app) {
        this.db = getFirestore(this.app);
      }
      logger.info('[CircuitBreakerService] Firestore initialized');
    } catch (error) {
      logger.error('[CircuitBreakerService] Failed to initialize Firestore:', error);
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  public async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
    config: CircuitBreakerConfig = {}
  ): Promise<T> {
    const circuitConfig = { ...this.defaultConfig, ...config };
    const circuit = this.getOrCreateCircuit(circuitName);

    // Check circuit state
    const state = this.getCircuitState(circuitName, circuitConfig);

    if (state === CircuitState.OPEN) {
      circuit.rejectedRequests++;
      await this.logCircuitEvent(circuitName, 'request_rejected', { state });

      if (fallback) {
        logger.info(`[CircuitBreaker] Circuit ${circuitName} is OPEN, using fallback`);
        return fallback();
      }

      throw new Error(`Circuit breaker ${circuitName} is OPEN`);
    }

    circuit.totalRequests++;

    try {
      const result = await fn();
      await this.recordSuccess(circuitName);
      return result;
    } catch (error) {
      await this.recordFailure(circuitName, error as Error);

      // If circuit just opened and fallback available, use it
      const newState = this.getCircuitState(circuitName, circuitConfig);
      if (newState === CircuitState.OPEN && fallback) {
        logger.info(`[CircuitBreaker] Circuit ${circuitName} opened, using fallback`);
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Record successful call
   */
  public async recordSuccess(circuitName: string): Promise<void> {
    const circuit = this.getOrCreateCircuit(circuitName);

    circuit.successes++;
    circuit.consecutiveSuccesses++;
    circuit.consecutiveFailures = 0;
    circuit.lastSuccessTime = new Date();

    // Transition from HALF_OPEN to CLOSED if threshold met
    if (
      circuit.state === CircuitState.HALF_OPEN &&
      circuit.consecutiveSuccesses >= this.defaultConfig.successThreshold
    ) {
      await this.transitionState(circuitName, CircuitState.CLOSED);
    }

    await this.persistCircuitState(circuitName);
    logger.info(
      `[CircuitBreaker] ${circuitName} - Success recorded. Consecutive: ${circuit.consecutiveSuccesses}`
    );
  }

  /**
   * Record failed call
   */
  public async recordFailure(circuitName: string, error: Error): Promise<void> {
    const circuit = this.getOrCreateCircuit(circuitName);

    circuit.failures++;
    circuit.consecutiveFailures++;
    circuit.consecutiveSuccesses = 0;
    circuit.lastFailureTime = new Date();

    logger.info(
      `[CircuitBreaker] ${circuitName} - Failure recorded. Consecutive: ${circuit.consecutiveFailures}`
    );

    // Transition to OPEN if threshold exceeded
    if (circuit.consecutiveFailures >= this.defaultConfig.failureThreshold) {
      await this.transitionState(circuitName, CircuitState.OPEN);
      circuit.nextAttemptTime = new Date(Date.now() + this.defaultConfig.timeout);
    }

    await this.persistCircuitState(circuitName);
    await this.logCircuitEvent(circuitName, 'failure', {
      error: error.message,
      consecutiveFailures: circuit.consecutiveFailures,
    });
  }

  /**
   * Get current circuit state
   */
  public getCircuitState(circuitName: string, _config: CircuitBreakerConfig = {}): CircuitState {
    const circuit = this.getOrCreateCircuit(circuitName);

    // If circuit is OPEN, check if timeout has elapsed
    if (circuit.state === CircuitState.OPEN) {
      if (circuit.nextAttemptTime && new Date() >= circuit.nextAttemptTime) {
        this.transitionState(circuitName, CircuitState.HALF_OPEN);
        return CircuitState.HALF_OPEN;
      }
      return CircuitState.OPEN;
    }

    return circuit.state;
  }

  /**
   * Reset circuit to initial state
   */
  public async resetCircuit(circuitName: string): Promise<void> {
    const circuit = this.getOrCreateCircuit(circuitName);

    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.consecutiveFailures = 0;
    circuit.consecutiveSuccesses = 0;
    circuit.lastStateChange = new Date();
    circuit.totalRequests = 0;
    circuit.rejectedRequests = 0;
    delete circuit.nextAttemptTime;
    delete circuit.lastFailureTime;
    delete circuit.lastSuccessTime;

    await this.persistCircuitState(circuitName);
    await this.logCircuitEvent(circuitName, 'reset', {});

    logger.info(`[CircuitBreaker] ${circuitName} - Circuit reset`);
  }

  /**
   * Configure circuit breaker thresholds
   */
  public configureThresholds(config: CircuitBreakerConfig): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    logger.info('[CircuitBreaker] Thresholds configured:', this.defaultConfig);
  }

  /**
   * Get circuit metrics
   */
  public getCircuitMetrics(circuitName: string): CircuitMetrics {
    const circuit = this.getOrCreateCircuit(circuitName);
    const totalAttempts = circuit.successes + circuit.failures;
    const errorRate = totalAttempts > 0 ? circuit.failures / totalAttempts : 0;

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      consecutiveFailures: circuit.consecutiveFailures,
      consecutiveSuccesses: circuit.consecutiveSuccesses,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      lastStateChange: circuit.lastStateChange,
      totalRequests: circuit.totalRequests,
      rejectedRequests: circuit.rejectedRequests,
      errorRate,
    };
  }

  /**
   * Get all circuit metrics
   */
  public getAllCircuitMetrics(): Map<string, CircuitMetrics> {
    const metrics = new Map<string, CircuitMetrics>();
    this.circuits.forEach((_, circuitName) => {
      metrics.set(circuitName, this.getCircuitMetrics(circuitName));
    });
    return metrics;
  }

  /**
   * Force circuit state transition
   */
  public async forceState(circuitName: string, state: CircuitState): Promise<void> {
    await this.transitionState(circuitName, state);
    logger.info(`[CircuitBreaker] ${circuitName} - Forced to ${state}`);
  }

  /**
   * Get or create circuit state
   */
  private getOrCreateCircuit(circuitName: string): CircuitBreakerState {
    if (!this.circuits.has(circuitName)) {
      this.circuits.set(circuitName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastStateChange: new Date(),
        totalRequests: 0,
        rejectedRequests: 0,
      });
    }
    return this.circuits.get(circuitName)!;
  }

  /**
   * Transition circuit state
   */
  private async transitionState(circuitName: string, newState: CircuitState): Promise<void> {
    const circuit = this.getOrCreateCircuit(circuitName);
    const oldState = circuit.state;

    if (oldState !== newState) {
      circuit.state = newState;
      circuit.lastStateChange = new Date();

      // Reset consecutive counters on state change
      if (newState === CircuitState.CLOSED) {
        circuit.consecutiveFailures = 0;
        circuit.consecutiveSuccesses = 0;
      } else if (newState === CircuitState.HALF_OPEN) {
        circuit.consecutiveSuccesses = 0;
      }

      await this.logCircuitEvent(circuitName, 'state_transition', {
        oldState,
        newState,
      });

      logger.info(`[CircuitBreaker] ${circuitName} - State transition: ${oldState} -> ${newState}`);
    }
  }

  /**
   * Persist circuit state to Firestore
   */
  private async persistCircuitState(circuitName: string): Promise<void> {
    try {
      this.initializeFirestore();

      if (!this.db) return;

      const circuit = this.circuits.get(circuitName);
      if (!circuit) return;

      await this.db.collection('circuit_breaker_states').doc(circuitName).set(
        {
          state: circuit.state,
          failures: circuit.failures,
          successes: circuit.successes,
          consecutiveFailures: circuit.consecutiveFailures,
          consecutiveSuccesses: circuit.consecutiveSuccesses,
          lastFailureTime: circuit.lastFailureTime || null,
          lastSuccessTime: circuit.lastSuccessTime || null,
          lastStateChange: circuit.lastStateChange,
          totalRequests: circuit.totalRequests,
          rejectedRequests: circuit.rejectedRequests,
          nextAttemptTime: circuit.nextAttemptTime || null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`[CircuitBreaker] Failed to persist state for ${circuitName}:`, error);
    }
  }

  /**
   * Log circuit event to Firestore
   */
  private async logCircuitEvent(
    circuitName: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      this.initializeFirestore();

      if (!this.db) return;

      await this.db.collection('circuit_breaker_events').add({
        circuitName,
        eventType,
        metadata,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`[CircuitBreaker] Failed to log event for ${circuitName}:`, error);
    }
  }

  /**
   * Load circuit state from Firestore
   */
  public async loadCircuitState(circuitName: string): Promise<void> {
    try {
      this.initializeFirestore();

      if (!this.db) return;

      const doc = await this.db.collection('circuit_breaker_states').doc(circuitName).get();

      if (doc.exists) {
        const data = doc.data();
        if (data) {
          this.circuits.set(circuitName, {
            state: data.state as CircuitState,
            failures: data.failures || 0,
            successes: data.successes || 0,
            consecutiveFailures: data.consecutiveFailures || 0,
            consecutiveSuccesses: data.consecutiveSuccesses || 0,
            lastFailureTime: data.lastFailureTime?.toDate(),
            lastSuccessTime: data.lastSuccessTime?.toDate(),
            lastStateChange: data.lastStateChange?.toDate() || new Date(),
            totalRequests: data.totalRequests || 0,
            rejectedRequests: data.rejectedRequests || 0,
            nextAttemptTime: data.nextAttemptTime?.toDate(),
          });
          logger.info(`[CircuitBreaker] Loaded state for ${circuitName}`);
        }
      }
    } catch (error) {
      logger.error(`[CircuitBreaker] Failed to load state for ${circuitName}:`, error);
    }
  }

  /**
   * Clear all circuit states
   */
  public clearAllCircuits(): void {
    this.circuits.clear();
    logger.info('[CircuitBreaker] Cleared all circuit states');
  }
}

// Export singleton instance
export const circuitBreakerService = CircuitBreakerService.getInstance();
