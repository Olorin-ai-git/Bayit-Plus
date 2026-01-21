/**
 * Circuit Breaker Service
 * 
 * Implements circuit breaker pattern for video generation providers
 * to prevent cascade failures and enable automatic recovery.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import * as admin from 'firebase-admin';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Provider blocked due to failures
  HALF_OPEN = 'half_open' // Testing provider recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures to open circuit
  timeoutThreshold: number;      // Response time threshold in ms
  recoveryTimeout: number;       // Time to wait before trying half-open in ms
  halfOpenMaxCalls: number;      // Max calls allowed in half-open state
  monitoringWindow: number;      // Time window for failure counting in ms
  successThreshold: number;      // Successes needed to close circuit from half-open
}

interface CircuitBreakerState {
  providerId: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date;
  lastSuccessTime: Date;
  nextAttemptTime: Date;
  halfOpenCalls: number;
  config: CircuitBreakerConfig;
  metrics: {
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
    averageResponseTime: number;
    lastResponseTime: number;
  };
}

interface HealthCheck {
  providerId: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Circuit Breaker Service Implementation
  */
export class CircuitBreakerService {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private db: admin.firestore.Firestore;
  private defaultConfig: CircuitBreakerConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    this.db = admin.firestore();
    this.defaultConfig = {
      failureThreshold: 5,
      timeoutThreshold: 60000, // 60 seconds
      recoveryTimeout: 60000,  // 60 seconds
      halfOpenMaxCalls: 3,
      monitoringWindow: 300000, // 5 minutes
      successThreshold: 3,
      ...defaultConfig
    };

    this.startHealthCheckMonitoring();
  }

  /**
   * Register a provider with the circuit breaker
    */
  registerProvider(
    providerId: string, 
    config?: Partial<CircuitBreakerConfig>
  ): void {
    const providerConfig = { ...this.defaultConfig, ...config };
    
    const circuitState: CircuitBreakerState = {
      providerId,
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: new Date(0),
      lastSuccessTime: new Date(),
      nextAttemptTime: new Date(),
      halfOpenCalls: 0,
      config: providerConfig,
      metrics: {
        totalCalls: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        averageResponseTime: 0,
        lastResponseTime: 0
      }
    };

    this.circuits.set(providerId, circuitState);
  }

  /**
   * Check if circuit is open (provider blocked)
    */
  isOpen(providerId: string): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit) {
      // If provider not registered, assume healthy
      return false;
    }

    // Check if we should transition from open to half-open
    if (circuit.state === CircuitState.OPEN && Date.now() >= circuit.nextAttemptTime.getTime()) {
      this.transitionToHalfOpen(providerId);
      return false; // Allow the call to proceed
    }

    return circuit.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is half-open and if call should be allowed
    */
  shouldAllowCall(providerId: string): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return true;

    if (circuit.state === CircuitState.HALF_OPEN) {
      return circuit.halfOpenCalls < circuit.config.halfOpenMaxCalls;
    }

    return circuit.state === CircuitState.CLOSED;
  }

  /**
   * Record a successful operation
    */
  recordSuccess(providerId: string, responseTime: number = 0): void {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return;

    const now = new Date();
    circuit.lastSuccessTime = now;
    circuit.metrics.totalCalls++;
    circuit.metrics.totalSuccesses++;
    circuit.metrics.lastResponseTime = responseTime;
    circuit.metrics.averageResponseTime = this.updateAverageResponseTime(
      circuit.metrics.averageResponseTime,
      responseTime,
      circuit.metrics.totalCalls
    );

    switch (circuit.state) {
      case CircuitState.CLOSED:
        // Reset failure count on success
        circuit.failureCount = 0;
        break;

      case CircuitState.HALF_OPEN:
        circuit.successCount++;
        circuit.halfOpenCalls++;
        
        // Close circuit if we have enough successes
        if (circuit.successCount >= circuit.config.successThreshold) {
          this.transitionToClosed(providerId);
        }
        break;

      case CircuitState.OPEN:
        // This shouldn't happen, but reset if it does
        this.transitionToClosed(providerId);
        break;
    }

    this.persistCircuitState(circuit);
  }

  /**
   * Record a failed operation
    */
  recordFailure(providerId: string, responseTime: number = 0, _error?: string): void {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return;

    const now = new Date();
    circuit.lastFailureTime = now;
    circuit.metrics.totalCalls++;
    circuit.metrics.totalFailures++;
    circuit.metrics.lastResponseTime = responseTime;
    circuit.metrics.averageResponseTime = this.updateAverageResponseTime(
      circuit.metrics.averageResponseTime,
      responseTime,
      circuit.metrics.totalCalls
    );

    switch (circuit.state) {
      case CircuitState.CLOSED:
        circuit.failureCount++;
        
        // Open circuit if failure threshold reached
        if (circuit.failureCount >= circuit.config.failureThreshold) {
          this.transitionToOpen(providerId);
        }
        break;

      case CircuitState.HALF_OPEN:
        circuit.halfOpenCalls++;
        // Any failure in half-open state returns to open
        this.transitionToOpen(providerId);
        break;

      case CircuitState.OPEN:
        // Already open, just update metrics
        break;
    }

    this.persistCircuitState(circuit);
  }

  /**
   * Record a timeout
    */
  recordTimeout(providerId: string, responseTime: number): void {
    const circuit = this.circuits.get(providerId);
    if (circuit && responseTime >= circuit.config.timeoutThreshold) {
      this.recordFailure(providerId, responseTime, 'Timeout');
    } else if (circuit) {
      this.recordSuccess(providerId, responseTime);
    }
  }

  /**
   * Get current circuit state
    */
  getCircuitState(providerId: string): CircuitBreakerState | null {
    return this.circuits.get(providerId) || null;
  }

  /**
   * Get all circuit states
    */
  getAllCircuitStates(): CircuitBreakerState[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Manually open a circuit (for maintenance, etc.)
    */
  openCircuit(providerId: string, _reason: string = 'Manual'): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return false;

    this.transitionToOpen(providerId);
    return true;
  }

  /**
   * Manually close a circuit (force recovery)
    */
  closeCircuit(providerId: string, _reason: string = 'Manual'): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return false;

    this.transitionToClosed(providerId);
    return true;
  }

  /**
   * Reset circuit state
    */
  resetCircuit(providerId: string): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return false;

    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.halfOpenCalls = 0;
    circuit.metrics.totalCalls = 0;
    circuit.metrics.totalFailures = 0;
    circuit.metrics.totalSuccesses = 0;
    
    this.transitionToClosed(providerId);
    return true;
  }

  /**
   * Get health check results
    */
  async performHealthCheck(providerId: string): Promise<HealthCheck> {
    const circuit = this.circuits.get(providerId);
    if (!circuit) {
      return {
        providerId,
        timestamp: new Date(),
        success: false,
        responseTime: 0,
        error: 'Provider not registered'
      };
    }

    // For video providers, we can check a simple endpoint or use the provider's health status method
    try {
      const startTime = Date.now();
      
      // This would be implemented to call provider's health endpoint
      // For now, we'll simulate based on current circuit state
      const isHealthy = circuit.state !== CircuitState.OPEN;
      const responseTime = Date.now() - startTime;

      const healthCheck: HealthCheck = {
        providerId,
        timestamp: new Date(),
        success: isHealthy,
        responseTime,
        error: isHealthy ? undefined : 'Circuit is open'
      };

      // Record the health check result
      if (healthCheck.success) {
        this.recordSuccess(providerId, responseTime);
      } else {
        this.recordFailure(providerId, responseTime, healthCheck.error);
      }

      return healthCheck;

    } catch (error: any) {
      const healthCheck: HealthCheck = {
        providerId,
        timestamp: new Date(),
        success: false,
        responseTime: 0,
        error: error.message
      };

      this.recordFailure(providerId, 0, error.message);
      return healthCheck;
    }
  }

  /**
   * Get circuit breaker statistics
    */
  getStatistics(providerId?: string): any {
    if (providerId) {
      const circuit = this.circuits.get(providerId);
      if (!circuit) return null;

      return {
        providerId: circuit.providerId,
        state: circuit.state,
        failureRate: circuit.metrics.totalCalls > 0 ? 
          (circuit.metrics.totalFailures / circuit.metrics.totalCalls * 100).toFixed(2) : 0,
        successRate: circuit.metrics.totalCalls > 0 ? 
          (circuit.metrics.totalSuccesses / circuit.metrics.totalCalls * 100).toFixed(2) : 0,
        averageResponseTime: Math.round(circuit.metrics.averageResponseTime),
        lastResponseTime: circuit.metrics.lastResponseTime,
        failureCount: circuit.failureCount,
        totalCalls: circuit.metrics.totalCalls,
        lastFailureTime: circuit.lastFailureTime,
        lastSuccessTime: circuit.lastSuccessTime
      };
    }

    // Return statistics for all circuits
    const circuits = Array.from(this.circuits.values());
    return {
      totalProviders: circuits.length,
      openCircuits: circuits.filter(c => c.state === CircuitState.OPEN).length,
      halfOpenCircuits: circuits.filter(c => c.state === CircuitState.HALF_OPEN).length,
      closedCircuits: circuits.filter(c => c.state === CircuitState.CLOSED).length,
      providers: circuits.map(circuit => ({
        providerId: circuit.providerId,
        state: circuit.state,
        failureRate: circuit.metrics.totalCalls > 0 ? 
          (circuit.metrics.totalFailures / circuit.metrics.totalCalls * 100).toFixed(2) : 0,
        averageResponseTime: Math.round(circuit.metrics.averageResponseTime)
      }))
    };
  }

  private transitionToClosed(providerId: string): void {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return;

    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.halfOpenCalls = 0;
    circuit.nextAttemptTime = new Date();
    
    this.persistCircuitState(circuit);
  }

  private transitionToOpen(providerId: string): void {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return;

    circuit.state = CircuitState.OPEN;
    circuit.successCount = 0;
    circuit.halfOpenCalls = 0;
    circuit.nextAttemptTime = new Date(Date.now() + circuit.config.recoveryTimeout);
    
    this.persistCircuitState(circuit);
  }

  private transitionToHalfOpen(providerId: string): void {
    const circuit = this.circuits.get(providerId);
    if (!circuit) return;

    circuit.state = CircuitState.HALF_OPEN;
    circuit.successCount = 0;
    circuit.halfOpenCalls = 0;
    
    this.persistCircuitState(circuit);
  }

  private updateAverageResponseTime(
    currentAverage: number, 
    newResponseTime: number, 
    totalCalls: number
  ): number {
    if (totalCalls === 1) return newResponseTime;
    return ((currentAverage * (totalCalls - 1)) + newResponseTime) / totalCalls;
  }

  private async persistCircuitState(circuit: CircuitBreakerState): Promise<void> {
    try {
      await this.db.collection('circuit_breaker_states').doc(circuit.providerId).set({
        providerId: circuit.providerId,
        state: circuit.state,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount,
        lastFailureTime: circuit.lastFailureTime,
        lastSuccessTime: circuit.lastSuccessTime,
        nextAttemptTime: circuit.nextAttemptTime,
        metrics: circuit.metrics,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      // Non-critical error, don't throw
    }
  }

  private startHealthCheckMonitoring(): void {
    // Perform health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const providers = Array.from(this.circuits.keys());
      
      for (const providerId of providers) {
        try {
          await this.performHealthCheck(providerId);
        } catch (error) {
        }
      }
    }, 30000);
  }

  /**
   * Cleanup method for proper service shutdown
    */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const circuitBreakerService = new CircuitBreakerService();