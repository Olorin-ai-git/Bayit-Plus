# Performance Testing Framework

This directory contains a comprehensive performance testing framework for the Olorin frontend microservices application. The framework provides automated performance monitoring, Core Web Vitals tracking, Lighthouse audits, and bundle analysis.

## Overview

The performance testing framework includes:

- **Core Web Vitals monitoring** with real-time collection
- **Lighthouse audits** for comprehensive performance scoring
- **Bundle analysis** for optimization opportunities
- **Performance regression testing** with automated thresholds
- **Multi-device and network condition testing**
- **Automated reporting** with actionable recommendations

## File Structure

```
performance/
├── README.md                          # This documentation
├── performance-test-engine.ts         # Core performance testing engine
├── web-vitals-collector.ts           # Real-time Web Vitals collection
├── performance.e2e.test.ts           # Playwright performance tests
└── /reports/                         # Generated performance reports
```

## Quick Start

### 1. Run Performance Tests

```bash
# Run all performance tests
npm run perf:all

# Run individual test types
npm run perf:test        # Playwright performance tests
npm run perf:lighthouse  # Lighthouse audits
npm run perf:bundle     # Bundle analysis

# Test with Web Vitals collection
npm run perf:vitals
```

### 2. View Results

Performance test results are saved to `test-results/performance/`:

- **Playwright Report**: `test-results/performance/performance-report.html`
- **Lighthouse Report**: `test-results/lighthouse/lighthouse-report.html`
- **Bundle Analysis**: `test-results/bundle-analysis/bundle-analysis-report.html`

## Core Web Vitals Testing

### Web Vitals Collector (`web-vitals-collector.ts`)

Real-time collection of Core Web Vitals metrics:

```typescript
import { webVitalsCollector } from './web-vitals-collector';

// Start collection
webVitalsCollector.startCollection();

// Monitor metrics in real-time
const cleanup = webVitalsCollector.onMetricUpdate((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});

// Get current metrics
const metrics = webVitalsCollector.getAllMetrics();
const summary = webVitalsCollector.getMetricsSummary();

// Check performance budget
const budgetCheck = webVitalsCollector.checkPerformanceBudget({
  fcp: 1800,  // First Contentful Paint
  lcp: 2500,  // Largest Contentful Paint
  fid: 100,   // First Input Delay
  cls: 0.1    // Cumulative Layout Shift
});

// Export data
const report = webVitalsCollector.stopCollection();
```

### Supported Metrics

- **FCP** (First Contentful Paint): ≤1.8s good, ≤3.0s needs improvement
- **LCP** (Largest Contentful Paint): ≤2.5s good, ≤4.0s needs improvement
- **FID** (First Input Delay): ≤100ms good, ≤300ms needs improvement
- **CLS** (Cumulative Layout Shift): ≤0.1 good, ≤0.25 needs improvement
- **TTFB** (Time to First Byte): ≤800ms good, ≤1.8s needs improvement
- **INP** (Interaction to Next Paint): ≤200ms good, ≤500ms needs improvement

## Performance Test Engine

### Core Features (`performance-test-engine.ts`)

```typescript
import { PerformanceTestEngine } from './performance-test-engine';

const engine = new PerformanceTestEngine();
await engine.initialize(browser);

// Test single service
const result = await engine.testServicePerformance(
  'autonomous-investigation',
  'http://localhost:3001/autonomous-investigation',
  {
    networkCondition: 'slow',
    deviceType: 'mobile',
    includeBundle: true,
    includeLighthouse: true
  }
);

// Test multiple services
const results = await engine.testMultipleServices([
  { name: 'core-ui', url: 'http://localhost:3000/' },
  { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
], {
  networkConditions: ['fast', 'slow'],
  deviceTypes: ['mobile', 'desktop']
});

// Generate report
const reportHtml = engine.generatePerformanceReport(results);
```

### Performance Metrics Collected

- **Core Web Vitals**: FCP, LCP, FID, CLS, INP
- **Loading Performance**: Time to Interactive, Speed Index, Total Blocking Time
- **Resource Metrics**: Bundle size, request count, resource breakdown
- **Memory Usage**: Heap size, memory efficiency
- **Network Metrics**: Request timing, failed requests

## Lighthouse Integration

### Automated Lighthouse Audits (`/scripts/performance/lighthouse-audit.js`)

Comprehensive audits across all microservices:

```bash
# Run Lighthouse audits
npm run perf:lighthouse
```

**Features:**
- Tests all 8 microservices on desktop and mobile
- Generates performance, accessibility, best practices, SEO, and PWA scores
- Identifies optimization opportunities
- Creates detailed HTML reports with recommendations

**Thresholds:**
- Performance: ≥80
- Accessibility: ≥90
- Best Practices: ≥85
- SEO: ≥80
- PWA: ≥70

### Configuration

```javascript
const config = {
  services: [
    { name: 'core-ui', url: 'http://localhost:3000/', critical: true },
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation', critical: true }
    // ... more services
  ],
  devices: ['desktop', 'mobile'],
  thresholds: {
    performance: 80,
    accessibility: 90,
    bestPractices: 85,
    seo: 80,
    pwa: 70
  }
};
```

## Bundle Analysis

### Webpack Bundle Optimization (`/scripts/performance/bundle-analyzer.js`)

Analyzes bundle composition and identifies optimization opportunities:

```bash
# Analyze bundle after build
npm run build
npm run perf:bundle
```

**Analysis includes:**
- Bundle size breakdown by chunk
- Module dependency analysis
- Duplicate module detection
- Tree shaking effectiveness
- Compression analysis
- Optimization recommendations

**Thresholds:**
- Total bundle size: ≤2MB
- Gzipped size: ≤800KB
- Individual chunk size: ≤1MB
- Maximum duplicate modules: ≤5

### Bundle Optimization Recommendations

The analyzer provides specific recommendations:

- **Code Splitting**: Break large chunks into smaller, loadable pieces
- **Tree Shaking**: Remove unused code and improve ES6 module usage
- **Dependency Optimization**: Replace large dependencies with smaller alternatives
- **Compression**: Improve gzip compression ratios
- **Duplicate Removal**: Eliminate duplicate modules across chunks

## E2E Performance Testing

### Playwright Performance Tests (`performance.e2e.test.ts`)

Comprehensive performance validation:

```typescript
test('should meet Core Web Vitals thresholds for all critical services', async () => {
  // Test critical services
  const criticalServices = [
    { name: 'core-ui', url: 'http://localhost:3000/' },
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
  ];

  for (const service of criticalServices) {
    const result = await performanceEngine.testServicePerformance(service.name, service.url);

    // Assert Core Web Vitals
    expect(result.metrics.firstContentfulPaint).toBeLessThan(1800);
    expect(result.metrics.largestContentfulPaint).toBeLessThan(2500);
    expect(result.metrics.firstInputDelay).toBeLessThan(100);
    expect(result.metrics.cumulativeLayoutShift).toBeLessThan(0.1);
  }
});
```

### Test Categories

1. **Core Web Vitals Testing**: Validates FCP, LCP, FID, CLS thresholds
2. **Mobile Performance**: Tests with slow network and mobile viewports
3. **Network Resilience**: Validates performance under slow network conditions
4. **Bundle Optimization**: Ensures efficient resource loading
5. **Memory Management**: Monitors heap usage and memory leaks
6. **Concurrent Load**: Tests performance under concurrent user scenarios
7. **Performance Budget**: Validates against predefined performance budgets
8. **Regression Detection**: Compares against baseline performance metrics

## Performance Budgets

### Service-Specific Budgets

```typescript
const performanceBudgets = {
  'core-ui': {
    fcp: 1500,    // 1.5s
    lcp: 2000,    // 2s
    fid: 80,      // 80ms
    cls: 0.08,    // 0.08
    totalSize: 1800000  // 1.8MB
  },
  'autonomous-investigation': {
    fcp: 1800,    // 1.8s
    lcp: 2500,    // 2.5s
    fid: 100,     // 100ms
    cls: 0.1,     // 0.1
    totalSize: 2000000  // 2MB
  }
};
```

### Budget Enforcement

Performance budgets are enforced in:
- E2E test assertions
- CI/CD pipeline validation
- Automated reporting with violations
- Performance regression detection

## Network Conditions and Device Testing

### Supported Network Conditions

- **Fast**: 10Mbps download, 5Mbps upload, 20ms latency
- **Slow**: 500Kbps download, 250Kbps upload, 500ms latency (3G simulation)
- **Offline**: No network connection

### Device Types

- **Desktop**: 1920×1080 viewport, fast CPU
- **Tablet**: 768×1024 viewport, medium CPU throttling
- **Mobile**: 375×667 viewport, 4x CPU throttling

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          npx playwright install chromium

      - name: Build application
        run: npm run build

      - name: Start services
        run: npm run olorin &

      - name: Wait for services
        run: sleep 60

      - name: Run performance tests
        run: npm run perf:all

      - name: Upload performance reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-reports
          path: test-results/
```

### Performance Gates

Fail CI/CD pipeline if:
- Core Web Vitals thresholds exceeded
- Bundle size exceeds limits
- Lighthouse scores below thresholds
- Performance regression detected

## Monitoring and Alerting

### Real-time Monitoring Integration

```typescript
// Send metrics to monitoring service
webVitalsCollector.onMetricUpdate((metric) => {
  // Send to DataDog, New Relic, etc.
  monitoringService.sendMetric({
    name: `web_vitals.${metric.name.toLowerCase()}`,
    value: metric.value,
    tags: {
      service: 'olorin-frontend',
      rating: metric.rating,
      navigation: metric.navigationType
    }
  });
});

// Google Analytics integration
webVitalsCollector.sendToAnalytics({
  measurementId: 'GA_MEASUREMENT_ID',
  customDimensions: {
    app_version: '1.0.0',
    user_type: 'authenticated'
  }
});
```

## Troubleshooting

### Common Issues

1. **Services not running**:
   ```bash
   # Check and start services
   npm run olorin status
   npm run olorin
   ```

2. **Lighthouse audit failures**:
   - Ensure all services are accessible
   - Check for JavaScript errors in browser console
   - Verify network connectivity

3. **Bundle analysis errors**:
   ```bash
   # Build application first
   npm run build
   npm run perf:bundle
   ```

4. **Performance test timeouts**:
   - Increase timeout in playwright.config.ts
   - Check service response times
   - Verify system resources

### Debug Mode

```bash
# Run tests with debug output
DEBUG=pw:api npm run perf:test

# Run Lighthouse with verbose logging
npx lighthouse http://localhost:3000 --verbose

# Analyze bundle with detailed output
npm run build:analyze
```

## Best Practices

### 1. Performance Testing

- **Run on consistent hardware** for reproducible results
- **Test multiple network conditions** to simulate real users
- **Include mobile testing** for comprehensive coverage
- **Monitor trends over time** rather than single measurements

### 2. Budget Management

- **Set realistic budgets** based on user expectations
- **Review budgets regularly** as application evolves
- **Prioritize critical user paths** for strictest budgets
- **Allow budget headroom** for unexpected changes

### 3. Optimization

- **Profile before optimizing** to identify real bottlenecks
- **Measure impact** of optimization changes
- **Consider user experience** over pure metrics
- **Balance performance with features** appropriately

## Contributing

When adding new performance tests:

1. **Follow naming conventions**: `*.performance.e2e.test.ts`
2. **Use data-testid attributes** for reliable element selection
3. **Include proper timeouts** for performance operations
4. **Document new metrics** and thresholds
5. **Update budgets** if application scope changes

## Related Documentation

- [Visual Regression Testing](../visual-regression/README.md)
- [E2E Testing Setup](../e2e/README.md)
- [Component Testing](../jest/README.md)
- [Microservices Architecture](../../../docs/architecture/microservices.md)