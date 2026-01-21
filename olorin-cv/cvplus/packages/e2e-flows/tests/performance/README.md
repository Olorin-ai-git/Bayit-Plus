# CVPlus E2E Flows - Performance Testing Suite

Comprehensive performance testing framework for validating the e2e-flows package performance under various load conditions and scenarios.

## 🎯 Performance Targets

### Core Requirements
- **20-minute max execution** for large test scenarios (150+ steps)
- **10K concurrent users** support capability
- **<3s response times** under normal load conditions
- **Memory efficiency** - under 500MB for typical workloads

### Service-Specific Targets

#### MockDataService
- Generate 10,000 mock data records in **<5 seconds**
- Handle 100 concurrent data generation requests in **<10 seconds**
- Memory usage stays **under 500MB** for typical workloads

#### APITestingService
- Execute 100 concurrent API tests in **<10 seconds**
- Handle 1000+ API test cases efficiently
- Maintain **<3s average response times** under load

#### E2EFlowsService
- Process large test scenarios (150+ steps) within **20-minute limit**
- Handle 1000+ concurrent test case executions
- Support 10+ concurrent scenario executions

## 🧪 Test Structure

### Performance Test Files

```
tests/performance/
├── MockDataService.performance.test.ts      # Data generation performance
├── APITestingService.performance.test.ts    # API testing performance
├── E2EFlowsService.performance.test.ts      # Scenario execution performance
├── integration.performance.test.ts          # End-to-end workflow performance
├── performance-utilities.ts                 # Testing utilities and helpers
├── performance-report-generator.ts          # Report generation
├── run-all-performance-tests.ts             # Master test runner
└── README.md                                # This file
```

### Test Categories

#### 1. Large Dataset Performance
- **MockDataService**: Generate 10K+ records in batch
- **Memory efficiency**: Monitor memory usage during bulk operations
- **Cache performance**: Test cache hit rates and memory management

#### 2. Concurrent Operation Performance
- **Parallel execution**: 100+ concurrent operations
- **Resource contention**: Test for deadlocks and race conditions
- **Memory stability**: Ensure no memory leaks during concurrent usage

#### 3. Response Time Performance
- **API latency**: Measure response times under various loads
- **Throughput**: Operations per second under different concurrency levels
- **Stress testing**: Performance degradation under extreme load

#### 4. Memory Management Performance
- **Memory usage patterns**: Track memory growth and cleanup
- **Garbage collection**: Monitor GC pressure and efficiency
- **Memory leaks**: Detect and prevent memory leaks during long-running tests

#### 5. Integration Performance
- **End-to-end workflows**: Complete user journey performance
- **Service interaction**: Cross-service performance validation
- **Resource efficiency**: Overall system resource utilization

## 🚀 Running Performance Tests

### Individual Test Suites

```bash
# Run specific service performance tests
npm run test:performance -- --testNamePattern="MockDataService"
npm run test:performance -- --testNamePattern="APITestingService"
npm run test:performance -- --testNamePattern="E2EFlowsService"
npm run test:performance -- --testNamePattern="integration"

# Run with longer timeout for comprehensive tests
npm run test:performance -- --testTimeout=3600000  # 1 hour timeout
```

### Complete Performance Test Suite

```bash
# Run all performance tests with comprehensive reporting
npm run test:performance

# Run performance tests with detailed output
npm run test:performance -- --verbose

# Run performance tests with coverage
npm run test:performance -- --coverage
```

### Automated Test Runner

```bash
# Use the dedicated performance test runner
npx ts-node tests/performance/run-all-performance-tests.ts

# Or via npm script (if added to package.json)
npm run test:performance:full
```

## 📊 Performance Metrics

### Core Metrics Tracked

#### Execution Metrics
- **Duration**: Total test execution time
- **Response Time**: Individual operation response times (avg, p95, p99)
- **Throughput**: Operations per second
- **Success Rate**: Percentage of successful operations

#### Resource Metrics
- **Memory Usage**: Heap usage during test execution
- **Peak Memory**: Maximum memory usage during test
- **Memory Growth**: Memory usage increase over time
- **CPU Usage**: CPU utilization during intensive operations

#### Quality Metrics
- **Error Rate**: Percentage of failed operations
- **Timeout Rate**: Percentage of operations that timeout
- **Retry Rate**: Percentage of operations requiring retries

### Performance Thresholds

```typescript
const performanceThresholds = {
  maxDuration: 20 * 60 * 1000,        // 20 minutes
  maxMemoryUsage: 500 * 1024 * 1024,  // 500MB
  maxErrorRate: 5,                     // 5%
  minOperationsPerSecond: 1,           // 1 ops/sec minimum
  maxResponseTime: 3000                // 3 seconds
};
```

## 📈 Performance Reports

### Automated Report Generation

Performance tests automatically generate comprehensive reports:

#### 1. JSON Reports
- **File**: `/tmp/performance-reports/performance-report-YYYY-MM-DD.json`
- **Content**: Detailed metrics, system info, test results
- **Usage**: Programmatic analysis, CI/CD integration

#### 2. HTML Reports
- **File**: `/tmp/performance-reports/performance-report-YYYY-MM-DD.html`
- **Content**: Visual charts, test summaries, recommendations
- **Usage**: Human-readable analysis, stakeholder reporting

#### 3. Interactive Dashboard
- **File**: `/tmp/performance-reports/performance-dashboard-YYYY-MM-DD.html`
- **Content**: Real-time charts, service breakdowns, trends analysis
- **Usage**: Performance monitoring, trend analysis

### Report Contents

#### Performance Summary
- Overall test execution statistics
- Service-by-service performance breakdown
- Memory usage patterns and trends
- Response time distributions

#### Detailed Test Results
- Individual test execution details
- Performance violations and warnings
- Memory usage tracking over time
- Error analysis and categorization

#### Recommendations
- Performance optimization suggestions
- Memory usage recommendations
- Scalability improvement advice
- Resource allocation guidance

## 🔧 Performance Utilities

### PerformanceMonitor Class
Real-time performance monitoring during test execution:

```typescript
const monitor = new PerformanceMonitor(100); // 100ms sampling
monitor.start();

// ... perform operations ...
monitor.recordOperation(); // Record successful operation
monitor.recordError();     // Record error

const metrics = monitor.stop();
```

### PerformanceTestRunner Class
Structured performance test execution with automatic threshold checking:

```typescript
const runner = new PerformanceTestRunner();
const result = await runner.runTest(
  'Test Name',
  async (monitor) => {
    // Test implementation
    return testResults;
  },
  performanceThresholds
);
```

### PerformanceUtils Class
Utility functions for common performance testing scenarios:

```typescript
// Load testing
const loadResult = await PerformanceUtils.createLoadTest(
  operationFunction,
  concurrency: 50,
  duration: 30000
);

// Memory measurement
const memoryResult = await PerformanceUtils.measureMemoryUsage(
  async () => { /* operation */ }
);

// Benchmarking
const benchmark = await PerformanceUtils.benchmark(
  'Operation Name',
  operationFunction,
  iterations: 100
);
```

## 🎛️ Configuration

### Environment Variables

```bash
# Performance test configuration
PERFORMANCE_TEST_TIMEOUT=3600000        # 1 hour default timeout
PERFORMANCE_MEMORY_LIMIT=1073741824     # 1GB memory limit
PERFORMANCE_REPORT_DIR=/tmp/perf-reports # Report output directory
PERFORMANCE_SAMPLING_INTERVAL=100       # 100ms monitoring interval

# Service-specific configuration
MOCK_DATA_CACHE_SIZE=104857600          # 100MB cache size
API_TEST_CONCURRENCY_LIMIT=100          # Max concurrent API tests
E2E_SCENARIO_TIMEOUT=1200000            # 20 minutes scenario timeout
```

### Jest Configuration

Performance tests use extended Jest configuration for long-running tests:

```javascript
// jest.performance.config.js
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
  testTimeout: 3600000,  // 1 hour timeout
  maxWorkers: 1,         // Sequential execution for accurate metrics
  detectOpenHandles: true,
  forceExit: true
};
```

## 📋 Test Scenarios

### Scenario 1: CVPlus Workflow Simulation
Complete end-to-end CVPlus workflow performance validation:

1. **Data Generation**: Generate 100 CV records
2. **API Testing**: Create and execute 50 API test cases
3. **Scenario Execution**: Run complete E2E scenario
4. **Performance Validation**: Verify all performance targets met

### Scenario 2: High Concurrency Load Testing
Validate system performance under high concurrent load:

1. **Concurrent Data Generation**: 100 parallel data generation requests
2. **Parallel API Testing**: 1000 concurrent API tests
3. **Multiple Scenario Execution**: 10 scenarios running simultaneously
4. **Resource Monitoring**: Track memory and CPU usage throughout

### Scenario 3: Memory Stability Testing
Long-running test to validate memory stability:

1. **Extended Operation**: Run for 1+ hours continuously
2. **Memory Tracking**: Monitor memory usage patterns
3. **Leak Detection**: Identify any memory leaks
4. **Cleanup Validation**: Verify proper resource cleanup

### Scenario 4: Stress Testing
Push system to limits to identify breaking points:

1. **Escalating Load**: Gradually increase concurrency and data volume
2. **Resource Exhaustion**: Test behavior under resource constraints
3. **Recovery Testing**: Validate system recovery after stress
4. **Failure Analysis**: Analyze failure modes and error handling

## 🔍 Performance Monitoring

### Real-time Monitoring
- Memory usage sampling every 100ms
- Response time tracking for all operations
- Error rate monitoring and alerting
- Resource utilization tracking

### Performance Budgets
- Automated threshold checking
- Performance regression detection
- CI/CD integration for continuous monitoring
- Alert generation for threshold violations

### Trend Analysis
- Historical performance comparison
- Performance regression identification
- Capacity planning insights
- Optimization opportunity identification

## 🚨 Troubleshooting

### Common Performance Issues

#### High Memory Usage
```bash
# Check for memory leaks
node --expose-gc --inspect tests/performance/run-all-performance-tests.ts

# Monitor memory usage
top -p $(pgrep node)
```

#### Slow Test Execution
```bash
# Profile CPU usage
node --prof tests/performance/run-all-performance-tests.ts
node --prof-process isolate-*.log

# Enable detailed logging
DEBUG=* npm run test:performance
```

#### Test Timeouts
```bash
# Increase timeout for specific tests
npm run test:performance -- --testTimeout=7200000  # 2 hours

# Run tests individually for debugging
npm run test:performance -- --testNamePattern="Large Dataset"
```

### Performance Analysis

#### Memory Analysis
1. Check memory growth patterns in reports
2. Identify potential memory leaks
3. Validate garbage collection effectiveness
4. Monitor heap snapshots during execution

#### CPU Analysis
1. Profile CPU-intensive operations
2. Identify performance bottlenecks
3. Optimize algorithmic complexity
4. Balance CPU vs. memory trade-offs

#### I/O Analysis
1. Monitor file system operations
2. Analyze network request patterns
3. Optimize database query performance
4. Cache frequently accessed data

## 🎯 Performance Best Practices

### Test Design
- Use realistic data volumes and patterns
- Test under various concurrency scenarios
- Include both positive and negative test cases
- Validate performance across different environments

### Resource Management
- Implement proper cleanup in tests
- Monitor and prevent memory leaks
- Use connection pooling for external services
- Implement circuit breakers for failure scenarios

### Monitoring and Alerting
- Set up automated performance monitoring
- Define clear performance budgets
- Implement regression detection
- Generate actionable performance reports

### Continuous Improvement
- Regular performance baseline updates
- Automated performance trend analysis
- Performance optimization feedback loops
- Capacity planning and scaling strategies

---

## 📞 Support

For performance testing questions or issues:

1. **Documentation**: Review this README and inline code documentation
2. **Reports**: Check generated performance reports for insights
3. **Debugging**: Use provided troubleshooting guides
4. **Performance Analysis**: Utilize built-in monitoring and reporting tools

Performance testing is critical for ensuring CVPlus E2E flows can handle production workloads efficiently and reliably. Regular execution of these tests helps maintain high performance standards and identifies optimization opportunities.