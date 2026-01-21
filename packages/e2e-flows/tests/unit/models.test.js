"use strict";
/**
 * Basic model validation tests
 * Test the core entity models for proper instantiation and validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../src/models");
describe('Core Entity Models', () => {
    describe('TestScenarioModel', () => {
        it('should create a valid test scenario', () => {
            const scenario = new models_1.TestScenarioModel({
                id: 'test-scenario-1',
                name: 'Basic CV Upload Test',
                description: 'Test CV upload functionality',
                type: 'e2e',
                environment: 'test',
                steps: [
                    {
                        order: 1,
                        name: 'Upload CV',
                        action: 'upload-file',
                        parameters: { file: 'test-cv.pdf' },
                        expectedResult: { status: 'uploaded' },
                        timeout: 5000
                    }
                ],
                expectedOutcomes: [
                    {
                        type: 'assertion',
                        condition: 'upload-success',
                        expectedValue: true
                    }
                ],
                tags: ['cv', 'upload'],
                timeout: 60000,
                dependencies: [],
                retryConfig: {
                    maxAttempts: 3,
                    delayMs: 1000,
                    exponentialBackoff: true,
                    retryableStatuses: ['FAILED', 'TIMEOUT']
                }
            });
            expect(scenario.id).toBe('test-scenario-1');
            expect(scenario.name).toBe('Basic CV Upload Test');
            expect(scenario.status).toBe('CREATED');
            expect(scenario.steps).toHaveLength(1);
            expect(scenario.expectedOutcomes).toHaveLength(1);
        });
        it('should validate required fields', () => {
            expect(() => {
                new models_1.TestScenarioModel({
                    id: 'test-scenario-2',
                    name: '',
                    description: 'Test',
                    type: 'e2e',
                    environment: 'test',
                    steps: [],
                    expectedOutcomes: [],
                    tags: [],
                    timeout: 60000,
                    dependencies: [],
                    retryConfig: {
                        maxAttempts: 3,
                        delayMs: 1000,
                        exponentialBackoff: true,
                        retryableStatuses: ['FAILED']
                    }
                });
            }).toThrow('TestScenario name is required');
        });
    });
    describe('MockDataSetModel', () => {
        it('should create a valid mock data set', () => {
            const mockData = new models_1.MockDataSetModel({
                id: 'mock-data-1',
                name: 'Test CV Data',
                description: 'Mock CV for testing',
                type: 'cv',
                category: 'technology',
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    title: 'Software Engineer'
                },
                schema: {
                    type: 'object',
                    properties: {
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        title: { type: 'string' }
                    },
                    required: ['firstName', 'lastName']
                },
                expiresAt: new Date(Date.now() + 86400000), // 24 hours
                metadata: {
                    generatedBy: 'test-suite',
                    generatedAt: new Date(),
                    usageCount: 0,
                    source: 'generated',
                    tags: ['test']
                }
            });
            expect(mockData.id).toBe('mock-data-1');
            expect(mockData.type).toBe('cv');
            expect(mockData.size).toBeGreaterThan(0);
            expect(mockData.checksum).toBeTruthy();
        });
    });
    describe('FlowResultModel', () => {
        it('should create a valid flow result', () => {
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 5000);
            const flowResult = new models_1.FlowResultModel({
                id: 'flow-result-1',
                scenarioId: 'test-scenario-1',
                runId: 'test-run-1',
                status: 'passed',
                startTime,
                endTime,
                steps: [],
                metrics: {
                    responseTime: 100,
                    throughput: 10,
                    errorRate: 0,
                    memoryUsage: 1024,
                    cpuUsage: 50,
                    networkIO: {
                        bytesSent: 500,
                        bytesReceived: 1000,
                        requestCount: 1,
                        connectionTime: 50
                    }
                },
                errors: [],
                artifacts: [],
                environment: 'test',
                buildInfo: {
                    version: '1.0.0',
                    commit: 'abc123',
                    branch: 'main',
                    buildDate: new Date(),
                    environment: 'test'
                }
            });
            expect(flowResult.id).toBe('flow-result-1');
            expect(flowResult.duration).toBe(5000);
            expect(flowResult.status).toBe('passed');
        });
    });
});
//# sourceMappingURL=models.test.js.map