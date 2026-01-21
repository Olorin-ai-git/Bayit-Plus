import { CircuitBreaker, CircuitBreakerManager } from '../CircuitBreakerCore';

describe('CircuitBreakerCore', () => {
  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 1000, 5000); // 3 failures, 1s recovery, 5s window
    });

    describe('execute', () => {
      it('should execute successfully when circuit is closed', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        
        const result = await circuitBreaker.execute(mockFn);
        
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(circuitBreaker.getStatus().state).toBe('CLOSED');
      });

      it('should open circuit after failure threshold', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Service failed'));
        
        // Execute 3 times to hit threshold
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(mockFn);
          } catch {}
        }
        
        expect(circuitBreaker.getStatus().state).toBe('OPEN');
        expect(circuitBreaker.getStatus().failureCount).toBe(3);
      });

      it('should execute fallback when circuit is open', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Service failed'));
        const fallbackFn = jest.fn().mockResolvedValue('fallback result');
        
        // Open circuit
        circuitBreaker.forceOpen();
        
        const result = await circuitBreaker.execute(mockFn, fallbackFn);
        
        expect(result).toBe('fallback result');
        expect(mockFn).not.toHaveBeenCalled();
        expect(fallbackFn).toHaveBeenCalledTimes(1);
      });

      it('should transition to half-open after recovery timeout', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        
        // Open circuit
        circuitBreaker.forceOpen();
        expect(circuitBreaker.getStatus().state).toBe('OPEN');
        
        // Simulate time passing
        jest.advanceTimersByTime(2000);
        
        await circuitBreaker.execute(mockFn);
        
        expect(circuitBreaker.getStatus().state).toBe('CLOSED');
        expect(mockFn).toHaveBeenCalledTimes(1);
      });

      it('should handle fallback errors gracefully', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Primary failed'));
        const fallbackFn = jest.fn().mockRejectedValue(new Error('Fallback failed'));
        
        circuitBreaker.forceOpen();
        
        await expect(circuitBreaker.execute(mockFn, fallbackFn)).rejects.toThrow('Fallback failed');
      });
    });

    describe('getStatus', () => {
      it('should return correct status information', () => {
        const status = circuitBreaker.getStatus();
        
        expect(status).toHaveProperty('state');
        expect(status).toHaveProperty('failureCount');
        expect(status).toHaveProperty('lastFailureTime');
        expect(status).toHaveProperty('isHealthy');
        expect(status.state).toBe('CLOSED');
        expect(status.isHealthy).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset circuit breaker state', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
        
        // Trigger failures
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(mockFn);
          } catch {}
        }
        
        expect(circuitBreaker.getStatus().state).toBe('OPEN');
        
        circuitBreaker.reset();
        
        const status = circuitBreaker.getStatus();
        expect(status.state).toBe('CLOSED');
        expect(status.failureCount).toBe(0);
        expect(status.lastFailureTime).toBe(0);
      });
    });

    describe('isHealthy', () => {
      it('should return true when circuit is closed', () => {
        expect(circuitBreaker.isHealthy()).toBe(true);
      });

      it('should return false when circuit is open', () => {
        circuitBreaker.forceOpen();
        expect(circuitBreaker.isHealthy()).toBe(false);
      });
    });
  });

  describe('CircuitBreakerManager', () => {
    beforeEach(() => {
      CircuitBreakerManager.resetAll();
    });

    describe('getBreaker', () => {
      it('should create new circuit breaker if not exists', () => {
        const breaker = CircuitBreakerManager.getBreaker('test-service');
        
        expect(breaker).toBeInstanceOf(CircuitBreaker);
        expect(breaker.isHealthy()).toBe(true);
      });

      it('should return existing circuit breaker', () => {
        const breaker1 = CircuitBreakerManager.getBreaker('test-service');
        const breaker2 = CircuitBreakerManager.getBreaker('test-service');
        
        expect(breaker1).toBe(breaker2);
      });
    });

    describe('getAllStatus', () => {
      it('should return status of all circuit breakers', () => {
        const breaker1 = CircuitBreakerManager.getBreaker('service-1');
        const breaker2 = CircuitBreakerManager.getBreaker('service-2');
        
        breaker2.forceOpen();
        
        const status = CircuitBreakerManager.getAllStatus();
        
        expect(status).toHaveProperty('service-1');
        expect(status).toHaveProperty('service-2');
        expect(status['service-1'].isHealthy).toBe(true);
        expect(status['service-2'].isHealthy).toBe(false);
      });
    });

    describe('getHealthStatus', () => {
      it('should return health status of all services', () => {
        const breaker1 = CircuitBreakerManager.getBreaker('healthy-service');
        const breaker2 = CircuitBreakerManager.getBreaker('unhealthy-service');
        
        breaker2.forceOpen();
        
        const health = CircuitBreakerManager.getHealthStatus();
        
        expect(health['healthy-service']).toBe(true);
        expect(health['unhealthy-service']).toBe(false);
      });
    });

    describe('resetAll', () => {
      it('should reset all circuit breakers', () => {
        const breaker1 = CircuitBreakerManager.getBreaker('service-1');
        const breaker2 = CircuitBreakerManager.getBreaker('service-2');
        
        breaker1.forceOpen();
        breaker2.forceOpen();
        
        CircuitBreakerManager.resetAll();
        
        expect(breaker1.isHealthy()).toBe(true);
        expect(breaker2.isHealthy()).toBe(true);
      });
    });
  });
});

// Mock timers for testing
jest.useFakeTimers();