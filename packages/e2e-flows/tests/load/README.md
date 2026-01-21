# Load Testing for CVPlus E2E Flows

## Overview

This directory contains comprehensive load testing capabilities for the CVPlus E2E Flows package, designed to validate system performance under high concurrent user loads up to 10,000 simultaneous users.

## 🎯 Load Testing Goals

- **Primary Target**: Validate 10K concurrent users with <3s response times
- **Performance Validation**: Ensure error rates stay below 5%
- **Scalability Assessment**: Identify system breaking points and bottlenecks
- **Capacity Planning**: Provide insights for infrastructure scaling decisions

## 📁 File Structure

```
tests/load/
├── README.md                           # This documentation
├── load-testing-framework.ts           # Core load testing framework
├── load-test-scenarios.ts              # Predefined test scenarios
├── load-test-utilities.ts              # Helper utilities and monitoring
├── concurrent-load.test.ts             # Jest-based load tests
├── run-load-tests.ts                   # Standalone test runner
└── reports/                            # Generated test reports
    ├── load-test-report-*.md           # Markdown reports
    └── load-test-report-*.json         # JSON reports
```

## 🚀 Quick Start

### Run Primary 10K User Load Test

```bash
# Run the primary stress test (10K users)
npm run test:load:stress

# Or use Jest for integrated testing
npm run test:load:jest
```

### Run All Load Test Scenarios

```bash
# Complete load test suite (2-3 hours)
npm run test:load:complete

# Or run individual scenarios
npm run test:load:baseline    # 100 users
npm run test:load:medium      # 1,000 users
npm run test:load:high        # 5,000 users
npm run test:load:stress      # 10,000 users
npm run test:load:breakpoint  # 15,000+ users
npm run test:load:recovery    # Recovery test
```

## 📊 Load Test Scenarios

### 1. Baseline Load Test (100 users)
- **Purpose**: Establish performance baseline
- **Duration**: 5 minutes sustained load
- **Expected**: <1% error rate, <500ms response time
- **Usage**: `npm run test:load:baseline`

### 2. Medium Load Test (1,000 users)
- **Purpose**: Test typical production load
- **Duration**: 10 minutes sustained load
- **Expected**: <2% error rate, <1000ms response time
- **Usage**: `npm run test:load:medium`

### 3. High Load Test (5,000 users)
- **Purpose**: Test peak hours capacity
- **Duration**: 10 minutes sustained load
- **Expected**: <3% error rate, <2000ms response time
- **Usage**: `npm run test:load:high`

### 4. Stress Load Test (10,000 users) ⭐ PRIMARY TARGET
- **Purpose**: Validate maximum target capacity
- **Duration**: 10 minutes sustained load
- **Expected**: <5% error rate, <3000ms response time
- **Usage**: `npm run test:load:stress`

### 5. Break Point Test (15,000+ users)
- **Purpose**: Find system breaking point
- **Duration**: 5 minutes sustained load
- **Expected**: Higher error rates acceptable, focus on graceful degradation
- **Usage**: `npm run test:load:breakpoint`

### 6. Recovery Test (500 users)
- **Purpose**: Validate system recovery after stress
- **Duration**: 5 minutes sustained load
- **Expected**: Return to baseline performance
- **Usage**: `npm run test:load:recovery`

## 🛠️ Advanced Usage

### Custom Load Tests

```bash
# Custom user count and duration
npm run test:load -- --scenario=custom --users=7500 --duration=600

# Skip system validation
npm run test:load -- --skip-validation --users=15000
```

### Jest Integration

```bash
# Run specific Jest load test
npx jest tests/load/concurrent-load.test.ts --testNamePattern="stress load"

# Run with coverage
npx jest tests/load/concurrent-load.test.ts --coverage
```

### Report Generation

```bash
# Generate reports in specific directory
npm run test:load:stress -- --output=./custom-reports

# Verbose output with detailed logging
npm run test:load:stress -- --verbose
```

## 📈 Understanding Load Test Results

### Key Metrics

- **Concurrent Users Achieved**: Number of simultaneous users actually executed
- **Error Rate**: Percentage of failed requests (target: <5% for 10K users)
- **Average Response Time**: Mean response time across all requests
- **P95 Response Time**: 95th percentile response time (target: <8s for 10K users)
- **Sustained Throughput**: Average requests per second over test duration
- **Peak Throughput**: Maximum requests per second achieved

### Performance Grades

- **A (90-100)**: Excellent performance, ready for production
- **B (80-89)**: Good performance, minor optimizations recommended
- **C (70-79)**: Fair performance, optimization required
- **D (60-69)**: Poor performance, significant improvements needed
- **F (0-59)**: Failing performance, major architectural changes required

### Success Criteria for 10K Users

✅ **PASSING CRITERIA**:
- Concurrent Users: ≥9,000 (90% achievement rate)
- Error Rate: <5.0%
- Average Response Time: <3,000ms
- P95 Response Time: <8,000ms
- Sustained Throughput: >2,500 req/s

## 🔧 System Requirements

### Minimum System Specifications

- **CPU**: 8+ cores recommended for 10K user testing
- **Memory**: 16GB+ RAM (estimate: 2MB per concurrent user)
- **Network**: High-bandwidth connection for realistic testing
- **File Descriptors**: Ensure ulimit -n is set to 65536+

### Docker Environment (Recommended)

```dockerfile
# Example Docker configuration for load testing
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Increase file descriptor limits
RUN echo "* soft nofile 65536" >> /etc/security/limits.conf
RUN echo "* hard nofile 65536" >> /etc/security/limits.conf

COPY . .
CMD ["npm", "run", "test:load:stress"]
```

## 📊 Monitoring and Analysis

### Real-time Monitoring

The load testing framework provides real-time monitoring with:

- **Live Dashboard**: Console-based real-time metrics display
- **System Resource Monitoring**: CPU, memory, and network usage
- **Performance Alerts**: Automatic warnings for degradation
- **Bottleneck Detection**: Identification of system constraints

### Report Analysis

Generated reports include:

1. **Executive Summary**: High-level performance overview
2. **Detailed Metrics**: Request-level performance data
3. **System Resource Usage**: Infrastructure utilization charts
4. **Bottleneck Analysis**: Identification of performance constraints
5. **Recommendations**: Specific optimization suggestions
6. **Capacity Planning**: Scaling recommendations

## 🚨 Troubleshooting

### Common Issues

#### 1. High Memory Usage
```bash
# Check memory before testing
free -h

# Monitor during test
watch -n 1 'ps aux --sort=-%mem | head -10'
```

#### 2. File Descriptor Limits
```bash
# Check current limits
ulimit -n

# Increase limits (temporary)
ulimit -n 65536

# Permanent fix (add to /etc/security/limits.conf)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

#### 3. Network Connection Issues
```bash
# Check network connections
ss -tuln | wc -l

# Monitor connection states
watch -n 1 'ss -s'
```

#### 4. CPU Overload
```bash
# Monitor CPU usage
htop

# Check load average
uptime
```

### Performance Optimization Tips

1. **Before Testing**:
   - Close unnecessary applications
   - Ensure adequate system resources
   - Configure system limits appropriately

2. **During Testing**:
   - Monitor system resources continuously
   - Watch for memory leaks or CPU spikes
   - Observe network connection limits

3. **After Testing**:
   - Analyze bottlenecks from reports
   - Implement recommended optimizations
   - Re-test to validate improvements

## 🔗 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Testing
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly load tests
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd packages/e2e-flows
          npm ci

      - name: Run baseline load test
        run: |
          cd packages/e2e-flows
          npm run test:load:baseline

      - name: Run stress load test
        run: |
          cd packages/e2e-flows
          npm run test:load:stress

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: load-test-reports
          path: packages/e2e-flows/tests/load/reports/
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                sh 'cd packages/e2e-flows && npm ci'
            }
        }

        stage('Baseline Load Test') {
            steps {
                sh 'cd packages/e2e-flows && npm run test:load:baseline'
            }
        }

        stage('Stress Load Test') {
            steps {
                sh 'cd packages/e2e-flows && npm run test:load:stress'
            }
        }

        stage('Archive Reports') {
            steps {
                archiveArtifacts 'packages/e2e-flows/tests/load/reports/*'
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'packages/e2e-flows/tests/load/reports',
                reportFiles: '*.html',
                reportName: 'Load Test Report'
            ])
        }
    }
}
```

## 📚 Additional Resources

### Related Documentation
- [Performance Testing Best Practices](../performance/README.md)
- [CVPlus Architecture Overview](../../../../docs/architecture/)
- [System Monitoring Guidelines](../../../../docs/monitoring/)

### External Resources
- [Load Testing with Node.js](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Worker Threads Documentation](https://nodejs.org/api/worker_threads.html)
- [System Performance Monitoring](https://nodejs.org/api/perf_hooks.html)

## 🤝 Contributing

When adding new load test scenarios:

1. Follow the existing pattern in `load-test-scenarios.ts`
2. Add appropriate Jest test cases in `concurrent-load.test.ts`
3. Update this README with new scenario documentation
4. Ensure proper error handling and resource cleanup
5. Add relevant package.json scripts for easy execution

## 📄 License

This load testing framework is part of the CVPlus E2E Flows package and follows the same MIT license terms.