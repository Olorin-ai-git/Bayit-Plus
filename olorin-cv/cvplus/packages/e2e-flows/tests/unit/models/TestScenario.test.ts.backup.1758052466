/**
 * Comprehensive unit tests for TestScenario model
 * Tests all functionality including validation, state transitions, and edge cases
 */

import { TestScenarioModel, TestStep, TestOutcome, RetryConfig, TestScenarioType, TestScenarioStatus } from '../../../src/models/TestScenario';

describe('TestScenarioModel', () => {
  const validTestScenarioData = {
    id: 'scenario-001',
    name: 'User Registration Flow',
    description: 'Test complete user registration process',
    type: 'e2e' as TestScenarioType,
    environment: 'test',
    steps: [
      {
        order: 1,
        name: 'Navigate to registration page',
        action: 'navigate',
        parameters: { url: '/register' },
        expectedResult: { status: 'success' },
        timeout: 5000
      },
      {
        order: 2,
        name: 'Fill registration form',
        action: 'fill-form',
        parameters: { email: 'test@example.com', password: 'Test123!' },
        expectedResult: { status: 'filled' },
        timeout: 3000
      }
    ] as TestStep[],
    expectedOutcomes: [
      {
        type: 'assertion',
        condition: 'user-created',
        expectedValue: true
      }
    ] as TestOutcome[],
    tags: ['registration', 'auth', 'e2e'],
    timeout: 60000,
    dependencies: [],
    retryConfig: {
      maxAttempts: 3,
      delayMs: 1000,
      exponentialBackoff: true,
      retryableStatuses: ['FAILED', 'TIMEOUT']
    } as RetryConfig
  };

  describe('Construction and Initialization', () => {
    it('should create a valid TestScenario with all properties', () => {
      const scenario = new TestScenarioModel(validTestScenarioData);

      expect(scenario.id).toBe('scenario-001');
      expect(scenario.name).toBe('User Registration Flow');
      expect(scenario.type).toBe('e2e');
      expect(scenario.environment).toBe('test');
      expect(scenario.steps).toHaveLength(2);
      expect(scenario.expectedOutcomes).toHaveLength(1);
      expect(scenario.tags).toEqual(['registration', 'auth', 'e2e']);
      expect(scenario.timeout).toBe(60000);
      expect(scenario.status).toBe('CREATED');
      expect(scenario.createdAt).toBeInstanceOf(Date);
      expect(scenario.updatedAt).toBeInstanceOf(Date);
    });

    it('should set default status to CREATED', () => {
      const scenario = new TestScenarioModel(validTestScenarioData);
      expect(scenario.status).toBe('CREATED');
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const before = new Date();
      const scenario = new TestScenarioModel(validTestScenarioData);
      const after = new Date();

      expect(scenario.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(scenario.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(scenario.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(scenario.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Validation', () => {
    it('should throw error for empty name', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          name: ''
        });
      }).toThrow('TestScenario name is required');

      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          name: '   '
        });
      }).toThrow('TestScenario name is required');
    });

    it('should throw error for invalid timeout values', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 500 // Less than 1 second
        });
      }).toThrow('Timeout must be between 1 second and 20 minutes');

      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 1300000 // More than 20 minutes
        });
      }).toThrow('Timeout must be between 1 second and 20 minutes');
    });

    it('should allow valid timeout values', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 1000 // 1 second
        });
      }).not.toThrow();

      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 1200000 // 20 minutes
        });
      }).not.toThrow();
    });

    it('should throw error for empty expected outcomes', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          expectedOutcomes: []
        });
      }).toThrow('At least one expected outcome is required');
    });

    it('should throw error for empty steps', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          steps: []
        });
      }).toThrow('At least one test step is required');
    });

    it('should throw error for steps not in logical order', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          steps: [
            {
              order: 2,
              name: 'Second step',
              action: 'action',
              parameters: {},
              expectedResult: {},
              timeout: 1000
            },
            {
              order: 1,
              name: 'First step',
              action: 'action',
              parameters: {},
              expectedResult: {},
              timeout: 1000
            }
          ]
        });
      }).toThrow('Steps must be in logical execution order');
    });

    it('should throw error for duplicate step orders', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          steps: [
            {
              order: 1,
              name: 'First step',
              action: 'action',
              parameters: {},
              expectedResult: {},
              timeout: 1000
            },
            {
              order: 1,
              name: 'Another first step',
              action: 'action',
              parameters: {},
              expectedResult: {},
              timeout: 1000
            }
          ]
        });
      }).toThrow('Step orders must be unique');
    });
  });

  describe('Status Management', () => {
    let scenario: TestScenarioModel;

    beforeEach(() => {
      scenario = new TestScenarioModel(validTestScenarioData);
    });

    it('should allow valid status transitions', () => {
      expect(scenario.status).toBe('CREATED');

      scenario.updateStatus('PENDING');
      expect(scenario.status).toBe('PENDING');

      scenario.updateStatus('RUNNING');
      expect(scenario.status).toBe('RUNNING');

      scenario.updateStatus('PASSED');
      expect(scenario.status).toBe('PASSED');
    });

    it('should allow failure to retry transition', () => {
      scenario.updateStatus('PENDING');
      scenario.updateStatus('RUNNING');
      scenario.updateStatus('FAILED');
      expect(scenario.status).toBe('FAILED');

      scenario.updateStatus('RETRYING');
      expect(scenario.status).toBe('RETRYING');

      scenario.updateStatus('RUNNING');
      expect(scenario.status).toBe('RUNNING');
    });

    it('should allow timeout to retry transition', () => {
      scenario.updateStatus('PENDING');
      scenario.updateStatus('RUNNING');
      scenario.updateStatus('TIMEOUT');
      expect(scenario.status).toBe('TIMEOUT');

      scenario.updateStatus('RETRYING');
      expect(scenario.status).toBe('RETRYING');
    });

    it('should throw error for invalid status transitions', () => {
      expect(() => {
        scenario.updateStatus('RUNNING'); // Can't go directly from CREATED to RUNNING
      }).toThrow('Invalid status transition from CREATED to RUNNING');

      expect(() => {
        scenario.updateStatus('PENDING');
        scenario.updateStatus('PASSED'); // Can't go directly from PENDING to PASSED
      }).toThrow('Invalid status transition from PENDING to PASSED');
    });

    it('should not allow transitions from terminal states', () => {
      scenario.updateStatus('PENDING');
      scenario.updateStatus('RUNNING');
      scenario.updateStatus('PASSED');

      expect(() => {
        scenario.updateStatus('RUNNING'); // Can't transition from PASSED
      }).toThrow('Invalid status transition from PASSED to RUNNING');
    });

    it('should update updatedAt timestamp on status change', () => {
      const originalUpdatedAt = scenario.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        scenario.updateStatus('PENDING');
        expect(scenario.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('Step Management', () => {
    let scenario: TestScenarioModel;

    beforeEach(() => {
      scenario = new TestScenarioModel({
        ...validTestScenarioData,
        steps: [
          {
            order: 1,
            name: 'First step',
            action: 'action1',
            parameters: {},
            expectedResult: {},
            timeout: 1000
          }
        ]
      });
    });

    it('should add a new step with correct order', () => {
      const newStep = {
        name: 'Second step',
        action: 'action2',
        parameters: { param: 'value' },
        expectedResult: { result: 'expected' },
        timeout: 2000
      };

      scenario.addStep(newStep);

      expect(scenario.steps).toHaveLength(2);
      expect(scenario.steps[1].order).toBe(2);
      expect(scenario.steps[1].name).toBe('Second step');
      expect(scenario.steps[1].action).toBe('action2');
    });

    it('should add step with correct order even when existing steps have gaps', () => {
      scenario.steps = [
        {
          order: 1,
          name: 'First step',
          action: 'action1',
          parameters: {},
          expectedResult: {},
          timeout: 1000
        },
        {
          order: 5,
          name: 'Fifth step',
          action: 'action5',
          parameters: {},
          expectedResult: {},
          timeout: 1000
        }
      ];

      scenario.addStep({
        name: 'New step',
        action: 'new-action',
        parameters: {},
        expectedResult: {},
        timeout: 1000
      });

      expect(scenario.steps).toHaveLength(3);
      expect(scenario.steps[2].order).toBe(6); // Should be max + 1
    });

    it('should remove a step by order', () => {
      scenario.addStep({
        name: 'Second step',
        action: 'action2',
        parameters: {},
        expectedResult: {},
        timeout: 1000
      });

      expect(scenario.steps).toHaveLength(2);

      scenario.removeStep(1);
      expect(scenario.steps).toHaveLength(1);
      expect(scenario.steps[0].order).toBe(2);
      expect(scenario.steps[0].name).toBe('Second step');
    });

    it('should update updatedAt when adding or removing steps', () => {
      const originalUpdatedAt = scenario.updatedAt;

      setTimeout(() => {
        scenario.addStep({
          name: 'New step',
          action: 'action',
          parameters: {},
          expectedResult: {},
          timeout: 1000
        });

        expect(scenario.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should validate after adding steps', () => {
      // This should work fine
      scenario.addStep({
        name: 'Valid step',
        action: 'action',
        parameters: {},
        expectedResult: {},
        timeout: 1000
      });

      // Clear expected outcomes to trigger validation error
      scenario.expectedOutcomes = [];

      expect(() => {
        scenario.addStep({
          name: 'Another step',
          action: 'action',
          parameters: {},
          expectedResult: {},
          timeout: 1000
        });
      }).toThrow('At least one expected outcome is required');
    });
  });

  describe('Expected Outcomes Management', () => {
    let scenario: TestScenarioModel;

    beforeEach(() => {
      scenario = new TestScenarioModel(validTestScenarioData);
    });

    it('should add expected outcomes', () => {
      const newOutcome: TestOutcome = {
        type: 'performance',
        condition: 'response-time',
        expectedValue: 2000,
        tolerance: 500
      };

      scenario.addExpectedOutcome(newOutcome);

      expect(scenario.expectedOutcomes).toHaveLength(2);
      expect(scenario.expectedOutcomes[1]).toEqual(newOutcome);
    });

    it('should update updatedAt when adding expected outcomes', () => {
      const originalUpdatedAt = scenario.updatedAt;

      setTimeout(() => {
        scenario.addExpectedOutcome({
          type: 'functional',
          condition: 'feature-enabled',
          expectedValue: true
        });

        expect(scenario.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('Serialization', () => {
    let scenario: TestScenarioModel;

    beforeEach(() => {
      scenario = new TestScenarioModel(validTestScenarioData);
    });

    it('should serialize to JSON correctly', () => {
      const json = scenario.toJSON();

      expect(json.id).toBe(scenario.id);
      expect(json.name).toBe(scenario.name);
      expect(json.type).toBe(scenario.type);
      expect(json.environment).toBe(scenario.environment);
      expect(json.steps).toEqual(scenario.steps);
      expect(json.expectedOutcomes).toEqual(scenario.expectedOutcomes);
      expect(json.tags).toEqual(scenario.tags);
      expect(json.timeout).toBe(scenario.timeout);
      expect(json.dependencies).toEqual(scenario.dependencies);
      expect(json.retryConfig).toEqual(scenario.retryConfig);
      expect(json.status).toBe(scenario.status);
      expect(json.createdAt).toEqual(scenario.createdAt);
      expect(json.updatedAt).toEqual(scenario.updatedAt);
    });

    it('should deserialize from JSON correctly', () => {
      const json = scenario.toJSON();
      const deserialized = TestScenarioModel.fromJSON(json);

      expect(deserialized.id).toBe(scenario.id);
      expect(deserialized.name).toBe(scenario.name);
      expect(deserialized.type).toBe(scenario.type);
      expect(deserialized.environment).toBe(scenario.environment);
      expect(deserialized.steps).toEqual(scenario.steps);
      expect(deserialized.expectedOutcomes).toEqual(scenario.expectedOutcomes);
      expect(deserialized.tags).toEqual(scenario.tags);
      expect(deserialized.timeout).toBe(scenario.timeout);
      expect(deserialized.dependencies).toEqual(scenario.dependencies);
      expect(deserialized.retryConfig).toEqual(scenario.retryConfig);
      expect(deserialized.status).toBe(scenario.status);
      expect(deserialized.createdAt).toEqual(scenario.createdAt);
      expect(deserialized.updatedAt).toEqual(scenario.updatedAt);
    });

    it('should handle round-trip serialization/deserialization', () => {
      scenario.updateStatus('PENDING');
      scenario.addStep({
        name: 'Additional step',
        action: 'test-action',
        parameters: { test: true },
        expectedResult: { success: true },
        timeout: 5000
      });

      const json = JSON.stringify(scenario.toJSON());
      const parsed = JSON.parse(json);
      const deserialized = TestScenarioModel.fromJSON(parsed);

      expect(deserialized.status).toBe('PENDING');
      expect(deserialized.steps).toHaveLength(3);
      expect(deserialized.steps[2].name).toBe('Additional step');
    });
  });

  describe('Edge Cases', () => {
    it('should handle scenarios with many steps', () => {
      const manySteps: TestStep[] = [];
      for (let i = 1; i <= 100; i++) {
        manySteps.push({
          order: i,
          name: `Step ${i}`,
          action: `action-${i}`,
          parameters: { step: i },
          expectedResult: { step: i },
          timeout: 1000
        });
      }

      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          steps: manySteps
        });
      }).not.toThrow();
    });

    it('should handle scenarios with complex nested parameters', () => {
      const complexStep: TestStep = {
        order: 1,
        name: 'Complex step',
        action: 'complex-action',
        parameters: {
          nested: {
            deeply: {
              complex: {
                data: ['array', 'of', 'values'],
                numbers: [1, 2, 3, 4, 5],
                boolean: true,
                null: null,
                undefined: undefined
              }
            }
          }
        },
        expectedResult: {
          complex: {
            response: {
              status: 'success',
              data: {
                id: 123,
                name: 'test'
              }
            }
          }
        },
        timeout: 10000
      };

      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          steps: [complexStep]
        });
      }).not.toThrow();
    });

    it('should handle empty dependencies and tags arrays', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          dependencies: [],
          tags: []
        });
      }).not.toThrow();
    });

    it('should handle different scenario types', () => {
      const types: TestScenarioType[] = ['e2e', 'integration', 'api', 'load', 'regression'];

      types.forEach(type => {
        expect(() => {
          new TestScenarioModel({
            ...validTestScenarioData,
            type
          });
        }).not.toThrow();
      });
    });

    it('should handle maximum timeout value', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 1200000 // 20 minutes exactly
        });
      }).not.toThrow();
    });

    it('should handle minimum timeout value', () => {
      expect(() => {
        new TestScenarioModel({
          ...validTestScenarioData,
          timeout: 1000 // 1 second exactly
        });
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large step arrays efficiently', () => {
      const start = performance.now();

      const largeSteps: TestStep[] = [];
      for (let i = 1; i <= 1000; i++) {
        largeSteps.push({
          order: i,
          name: `Performance step ${i}`,
          action: `perf-action-${i}`,
          parameters: { iteration: i },
          expectedResult: { completed: true },
          timeout: 1000 + i
        });
      }

      const scenario = new TestScenarioModel({
        ...validTestScenarioData,
        steps: largeSteps
      });

      const end = performance.now();
      const duration = end - start;

      expect(scenario.steps).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should validate large scenarios quickly', () => {
      const start = performance.now();

      const scenario = new TestScenarioModel(validTestScenarioData);

      // Add many steps and outcomes
      for (let i = 0; i < 100; i++) {
        scenario.addStep({
          name: `Step ${i}`,
          action: 'action',
          parameters: {},
          expectedResult: {},
          timeout: 1000
        });

        scenario.addExpectedOutcome({
          type: 'assertion',
          condition: `condition-${i}`,
          expectedValue: i
        });
      }

      const end = performance.now();
      const duration = end - start;

      expect(scenario.steps).toHaveLength(102); // 2 original + 100 added
      expect(scenario.expectedOutcomes).toHaveLength(101); // 1 original + 100 added
      expect(duration).toBeLessThan(50); // Should complete quickly
    });
  });
});