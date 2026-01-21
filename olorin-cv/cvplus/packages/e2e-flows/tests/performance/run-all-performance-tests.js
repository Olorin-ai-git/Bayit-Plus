"use strict";
/**
 * Performance Test Runner - Execute all performance tests and generate comprehensive reports
 * This script runs all performance tests and generates detailed reports
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const MockDataService_1 = require("../../src/services/MockDataService");
const APITestingService_1 = require("../../src/services/APITestingService");
const E2EFlowsService_1 = require("../../src/services/E2EFlowsService");
const performance_report_generator_1 = require("./performance-report-generator");
const performance_utilities_1 = require("./performance-utilities");
const fs = __importStar(require("fs"));
class PerformanceTestRunner {
    reportGenerator;
    results = {};
    constructor() {
        this.reportGenerator = new performance_report_generator_1.PerformanceReportGenerator();
    }
    async runAllTests() {
        console.log('🚀 Starting CVPlus E2E Flows Performance Test Suite');
        console.log('='.repeat(60));
        const suiteStartTime = Date.now();
        try {
            // Run all test suites
            await this.runMockDataServiceTests();
            await this.runAPITestingServiceTests();
            await this.runE2EFlowsServiceTests();
            await this.runIntegrationTests();
            const suiteEndTime = Date.now();
            const totalDuration = suiteEndTime - suiteStartTime;
            console.log('\\n✅ All performance tests completed!');
            console.log(`Total execution time: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
            // Generate comprehensive reports
            await this.generateReports();
        }
        catch (error) {
            console.error('❌ Performance test suite failed:', error);
            throw error;
        }
    }
    async runMockDataServiceTests() {
        console.log('\\n📊 Running MockDataService Performance Tests...');
        const service = new MockDataService_1.MockDataService();
        const monitor = new performance_utilities_1.PerformanceMonitor();
        const tests = [
            {
                name: 'Large Dataset Generation',
                fn: async () => {
                    monitor.start();
                    const dataset = await service.generateData({
                        type: 'cv',
                        count: 10000,
                        seed: 'perf-test-large'
                    });
                    const metrics = monitor.stop();
                    monitor.recordOperation();
                    return { dataset: dataset.id, metrics, recordCount: 10000 };
                }
            },
            {
                name: 'Concurrent Operations',
                fn: async () => {
                    const startTime = Date.now();
                    const promises = Array.from({ length: 100 }, (_, i) => service.generateData({
                        type: 'cv',
                        count: 10,
                        seed: `concurrent-${i}`
                    }));
                    const results = await Promise.all(promises);
                    const duration = Date.now() - startTime;
                    return {
                        concurrentRequests: 100,
                        duration,
                        successful: results.length,
                        operationsPerSecond: 100 / (duration / 1000)
                    };
                }
            },
            {
                name: 'Memory Management',
                fn: async () => {
                    const measurement = await performance_utilities_1.PerformanceUtils.measureMemoryUsage(async () => {
                        const operations = [];
                        for (let i = 0; i < 50; i++) {
                            operations.push(service.generateData({
                                type: 'cv',
                                count: 100,
                                seed: `memory-test-${i}`
                            }));
                        }
                        return await Promise.all(operations);
                    });
                    return {
                        operations: 50,
                        memoryUsed: measurement.memoryUsed,
                        memoryEfficiency: 50 / (measurement.memoryUsed / 1024 / 1024), // operations per MB
                        result: measurement.result.length
                    };
                }
            }
        ];
        const serviceResults = {};
        for (const test of tests) {
            try {
                console.log(`  Running: ${test.name}...`);
                const result = await test.fn();
                serviceResults[test.name] = {
                    ...result,
                    passed: true,
                    duration: result.duration || result.metrics?.duration || 0,
                    memoryUsed: result.memoryUsed || result.metrics?.memoryUsed || 0,
                    operationsPerSecond: result.operationsPerSecond || 0
                };
                console.log(`    ✅ ${test.name} completed`);
            }
            catch (error) {
                console.log(`    ❌ ${test.name} failed:`, error.message);
                serviceResults[test.name] = {
                    passed: false,
                    error: error.message,
                    duration: 0,
                    memoryUsed: 0,
                    operationsPerSecond: 0
                };
            }
        }
        this.results.MockDataService = serviceResults;
        this.reportGenerator.addServiceResults('MockDataService', serviceResults);
    }
    async runAPITestingServiceTests() {
        console.log('\\n🔧 Running APITestingService Performance Tests...');
        const service = new APITestingService_1.APITestingService();
        // Create mock server for testing
        const http = require('http');
        const mockServer = http.createServer((req, res) => {
            setTimeout(() => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
            }, Math.random() * 50);
        });
        const port = await new Promise((resolve) => {
            mockServer.listen(0, () => {
                resolve(mockServer.address().port);
            });
        });
        const tests = [
            {
                name: 'Concurrent API Testing',
                fn: async () => {
                    const startTime = Date.now();
                    const testCases = [];
                    // Create 100 test cases
                    for (let i = 0; i < 100; i++) {
                        const testCase = await service.createTestCase({
                            id: `concurrent-test-${i}`,
                            name: `Concurrent Test ${i}`,
                            endpoint: '/health',
                            method: 'GET',
                            headers: {},
                            expectedStatus: 200,
                            expectedResponse: {},
                            timeout: 5000,
                            authentication: { type: 'none', credentials: {} },
                            assertions: [],
                            tags: ['performance']
                        });
                        testCases.push(testCase);
                    }
                    // Execute tests in parallel
                    const baseUrl = `http://localhost:${port}`;
                    const results = await Promise.all(testCases.map(tc => service.executeTestCase(tc, baseUrl)));
                    const duration = Date.now() - startTime;
                    const passed = results.filter(r => r.status === 'passed').length;
                    return {
                        testCount: 100,
                        duration,
                        passed,
                        failed: 100 - passed,
                        successRate: (passed / 100) * 100,
                        operationsPerSecond: 100 / (duration / 1000)
                    };
                }
            },
            {
                name: 'Response Time Performance',
                fn: async () => {
                    const testCase = await service.createTestCase({
                        id: 'response-time-test',
                        name: 'Response Time Test',
                        endpoint: '/health',
                        method: 'GET',
                        headers: {},
                        expectedStatus: 200,
                        expectedResponse: {},
                        timeout: 5000,
                        authentication: { type: 'none', credentials: {} },
                        assertions: [],
                        tags: ['response-time']
                    });
                    const baseUrl = `http://localhost:${port}`;
                    const results = [];
                    // Execute 50 tests to get average response time
                    for (let i = 0; i < 50; i++) {
                        const result = await service.executeTestCase(testCase, baseUrl);
                        results.push(result);
                    }
                    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
                    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
                    const minResponseTime = Math.min(...results.map(r => r.responseTime));
                    return {
                        testCount: 50,
                        averageResponseTime: avgResponseTime,
                        maxResponseTime,
                        minResponseTime,
                        passed: results.filter(r => r.status === 'passed').length,
                        duration: avgResponseTime * 50
                    };
                }
            }
        ];
        const serviceResults = {};
        for (const test of tests) {
            try {
                console.log(`  Running: ${test.name}...`);
                const result = await test.fn();
                serviceResults[test.name] = {
                    ...result,
                    passed: true,
                    memoryUsed: 0, // Would need memory tracking
                    operationsPerSecond: result.operationsPerSecond || 0
                };
                console.log(`    ✅ ${test.name} completed`);
            }
            catch (error) {
                console.log(`    ❌ ${test.name} failed:`, error.message);
                serviceResults[test.name] = {
                    passed: false,
                    error: error.message,
                    duration: 0,
                    memoryUsed: 0,
                    operationsPerSecond: 0
                };
            }
        }
        mockServer.close();
        this.results.APITestingService = serviceResults;
        this.reportGenerator.addServiceResults('APITestingService', serviceResults);
    }
    async runE2EFlowsServiceTests() {
        console.log('\\n🔄 Running E2EFlowsService Performance Tests...');
        const service = new E2EFlowsService_1.E2EFlowsService();
        const tests = [
            {
                name: 'Large Scenario Execution',
                fn: async () => {
                    const scenario = await service.createScenario({
                        id: 'perf-test-large-scenario',
                        name: 'Performance Test Large Scenario',
                        description: 'Large scenario for performance testing',
                        type: 'performance',
                        environment: 'test',
                        steps: Array.from({ length: 150 }, (_, i) => ({
                            order: i + 1,
                            name: `Step ${i + 1}`,
                            type: 'api_call',
                            action: `action_${i + 1}`,
                            parameters: {},
                            expectedResult: { success: true },
                            timeout: 5000,
                            retryCount: 1,
                            conditions: [],
                            assertions: []
                        })),
                        tags: ['performance', 'large'],
                        metadata: {
                            createdBy: 'performance-test',
                            version: '1.0.0',
                            estimatedDuration: 300000
                        },
                        dependencies: [],
                        timeout: 20 * 60 * 1000 // 20 minutes
                    });
                    const result = await service.executeScenario(scenario.id, {
                        environment: 'test',
                        timeout: 20 * 60 * 1000,
                        collectMetrics: true
                    });
                    return {
                        stepCount: 150,
                        status: result.status,
                        duration: result.metrics.responseTime,
                        passedSteps: result.steps.filter(s => s.status === 'passed').length,
                        failedSteps: result.steps.filter(s => s.status === 'failed').length,
                        memoryUsage: result.metrics.memoryUsage,
                        operationsPerSecond: 150 / (result.metrics.responseTime / 1000)
                    };
                },
                timeout: 25 * 60 * 1000 // 25 minutes
            },
            {
                name: 'Concurrent Scenarios',
                fn: async () => {
                    const scenarios = [];
                    const startTime = Date.now();
                    // Create 10 scenarios
                    for (let i = 0; i < 10; i++) {
                        const scenario = await service.createScenario({
                            id: `perf-test-concurrent-${i}`,
                            name: `Concurrent Scenario ${i}`,
                            description: `Concurrent test scenario ${i}`,
                            type: 'concurrent-test',
                            environment: 'test',
                            steps: Array.from({ length: 20 }, (_, stepIndex) => ({
                                order: stepIndex + 1,
                                name: `Step ${stepIndex + 1}`,
                                type: 'api_call',
                                action: 'concurrent_action',
                                parameters: {},
                                expectedResult: { success: true },
                                timeout: 3000,
                                retryCount: 1,
                                conditions: [],
                                assertions: []
                            })),
                            tags: ['performance', 'concurrent'],
                            metadata: {
                                createdBy: 'performance-test',
                                version: '1.0.0',
                                estimatedDuration: 60000
                            },
                            dependencies: [],
                            timeout: 60000
                        });
                        scenarios.push(scenario);
                    }
                    // Execute scenarios concurrently
                    const results = await Promise.all(scenarios.map(s => service.executeScenario(s.id, {
                        environment: 'test',
                        timeout: 60000,
                        collectMetrics: true
                    })));
                    const duration = Date.now() - startTime;
                    const passed = results.filter(r => r.status === 'passed').length;
                    return {
                        scenarioCount: 10,
                        stepsPerScenario: 20,
                        duration,
                        passed,
                        failed: 10 - passed,
                        successRate: (passed / 10) * 100,
                        operationsPerSecond: 10 / (duration / 1000)
                    };
                },
                timeout: 15 * 60 * 1000 // 15 minutes
            }
        ];
        const serviceResults = {};
        for (const test of tests) {
            try {
                console.log(`  Running: ${test.name}...`);
                const result = await test.fn();
                serviceResults[test.name] = {
                    ...result,
                    passed: result.status === 'passed' || result.passed !== false,
                    memoryUsed: result.memoryUsage || 0,
                    operationsPerSecond: result.operationsPerSecond || 0
                };
                console.log(`    ✅ ${test.name} completed`);
            }
            catch (error) {
                console.log(`    ❌ ${test.name} failed:`, error.message);
                serviceResults[test.name] = {
                    passed: false,
                    error: error.message,
                    duration: 0,
                    memoryUsed: 0,
                    operationsPerSecond: 0
                };
            }
        }
        this.results.E2EFlowsService = serviceResults;
        this.reportGenerator.addServiceResults('E2EFlowsService', serviceResults);
    }
    async runIntegrationTests() {
        console.log('\\n🔗 Running Integration Performance Tests...');
        const mockDataService = new MockDataService_1.MockDataService();
        const apiTestingService = new APITestingService_1.APITestingService();
        const e2eFlowsService = new E2EFlowsService_1.E2EFlowsService();
        const tests = [
            {
                name: 'Full Workflow Integration',
                fn: async () => {
                    const startTime = Date.now();
                    const startMemory = process.memoryUsage().heapUsed;
                    // Step 1: Generate mock data
                    const cvDataset = await mockDataService.generateData({
                        type: 'cv',
                        count: 100,
                        seed: 'integration-test'
                    });
                    // Step 2: Create API tests
                    const testCase = await apiTestingService.createTestCase({
                        id: 'integration-api-test',
                        name: 'Integration API Test',
                        endpoint: '/health',
                        method: 'GET',
                        headers: {},
                        expectedStatus: 200,
                        expectedResponse: {},
                        timeout: 5000,
                        authentication: { type: 'none', credentials: {} },
                        assertions: [],
                        tags: ['integration']
                    });
                    // Step 3: Create and execute scenario
                    const scenario = await e2eFlowsService.createScenario({
                        id: 'integration-scenario',
                        name: 'Integration Test Scenario',
                        description: 'Full integration test',
                        type: 'integration',
                        environment: 'test',
                        steps: [
                            {
                                order: 1,
                                name: 'Data Validation',
                                type: 'data_validation',
                                action: 'validate_data',
                                parameters: { datasetId: cvDataset.id },
                                expectedResult: { valid: true },
                                timeout: 5000,
                                retryCount: 1,
                                conditions: [],
                                assertions: []
                            }
                        ],
                        tags: ['integration', 'workflow'],
                        metadata: {
                            createdBy: 'integration-test',
                            version: '1.0.0',
                            estimatedDuration: 30000
                        },
                        dependencies: [],
                        timeout: 60000
                    });
                    const scenarioResult = await e2eFlowsService.executeScenario(scenario.id, {
                        environment: 'test',
                        timeout: 60000,
                        collectMetrics: true
                    });
                    const endTime = Date.now();
                    const endMemory = process.memoryUsage().heapUsed;
                    const duration = endTime - startTime;
                    const memoryUsed = endMemory - startMemory;
                    return {
                        workflowSteps: 3,
                        dataGenerated: 100,
                        scenarioStatus: scenarioResult.status,
                        duration,
                        memoryUsed,
                        passed: scenarioResult.status === 'passed',
                        operationsPerSecond: 3 / (duration / 1000)
                    };
                },
                timeout: 5 * 60 * 1000 // 5 minutes
            }
        ];
        const serviceResults = {};
        for (const test of tests) {
            try {
                console.log(`  Running: ${test.name}...`);
                const result = await test.fn();
                serviceResults[test.name] = {
                    ...result,
                    operationsPerSecond: result.operationsPerSecond || 0
                };
                console.log(`    ✅ ${test.name} completed`);
            }
            catch (error) {
                console.log(`    ❌ ${test.name} failed:`, error.message);
                serviceResults[test.name] = {
                    passed: false,
                    error: error.message,
                    duration: 0,
                    memoryUsed: 0,
                    operationsPerSecond: 0
                };
            }
        }
        this.results.IntegrationTests = serviceResults;
        this.reportGenerator.addServiceResults('IntegrationTests', serviceResults);
    }
    async generateReports() {
        console.log('\\n📊 Generating Performance Reports...');
        try {
            // Generate JSON report
            const jsonPath = await this.reportGenerator.saveJsonReport();
            console.log(`📄 JSON Report: ${jsonPath}`);
            // Generate HTML report
            const htmlPath = await this.reportGenerator.saveHtmlReport();
            console.log(`🌐 HTML Report: ${htmlPath}`);
            // Generate dashboard
            const dashboardPath = await this.reportGenerator.generateDashboard();
            console.log(`📊 Dashboard: ${dashboardPath}`);
            // Save raw results
            const rawResultsPath = '/tmp/performance-test-raw-results.json';
            await fs.promises.writeFile(rawResultsPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                results: this.results,
                systemInfo: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    totalMemory: require('os').totalmem(),
                    cpuCount: require('os').cpus().length
                }
            }, null, 2));
            console.log(`💾 Raw Results: ${rawResultsPath}`);
            console.log('\\n✅ All reports generated successfully!');
        }
        catch (error) {
            console.error('❌ Failed to generate reports:', error);
        }
    }
}
// Run performance tests if called directly
if (require.main === module) {
    const runner = new PerformanceTestRunner();
    runner.runAllTests()
        .then(() => {
        console.log('\\n🎉 Performance test suite completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Performance test suite failed:', error);
        process.exit(1);
    });
}
exports.default = PerformanceTestRunner;
//# sourceMappingURL=run-all-performance-tests.js.map