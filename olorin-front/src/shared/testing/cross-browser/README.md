# Cross-Browser Testing Framework

This directory contains a comprehensive cross-browser testing framework for the Olorin frontend microservices application. The framework provides automated compatibility testing across Chrome, Firefox, Safari, and Edge browsers, ensuring consistent functionality and user experience across all major browsers.

## Overview

The cross-browser testing framework includes:

- **Multi-browser compatibility testing** across Chrome, Firefox, Safari, and Edge
- **Feature detection and compatibility validation** for modern web APIs
- **Responsive design testing** across different browsers and viewports
- **Performance comparison** between browsers
- **JavaScript and CSS compatibility testing**
- **Automated browser-specific issue detection**
- **Comprehensive reporting** with browser-specific recommendations

## File Structure

```
cross-browser/
├── README.md                          # This documentation
├── cross-browser-test-engine.ts       # Core cross-browser testing engine
├── cross-browser.e2e.test.ts         # Playwright cross-browser tests
└── /reports/                         # Generated cross-browser reports
```

## Quick Start

### 1. Run Cross-Browser Tests

```bash
# Run all cross-browser tests
npm run browser:all

# Run individual browser tests
npm run browser:test        # Playwright cross-browser tests
npm run browser:chrome      # Chrome-specific tests
npm run browser:firefox     # Firefox-specific tests
npm run browser:safari      # Safari-specific tests

# Run compatibility audit
npm run browser:compatibility

# Test specific service across browsers
npm run browser:test -- --grep "core-ui"
```

### 2. View Results

Cross-browser test results are saved to `test-results/cross-browser/`:

- **Playwright Report**: `test-results/cross-browser/cross-browser-report.html`
- **Compatibility Report**: `test-results/cross-browser/compatibility-audit-report.html`
- **JSON Results**: `test-results/cross-browser/compatibility-audit-results.json`

## Cross-Browser Test Engine

### Core Features (`cross-browser-test-engine.ts`)

Comprehensive cross-browser testing with automated browser detection:

```typescript
import { CrossBrowserTestEngine } from './cross-browser-test-engine';

const engine = new CrossBrowserTestEngine();
await engine.initialize(browser);

// Test single service across all browsers
const result = await engine.testServiceCrossBrowser(
<<<<<<< HEAD
  'autonomous-investigation',
  'http://localhost:3001/autonomous-investigation',
=======
  'structured-investigation',
  'http://localhost:3001/structured-investigation',
>>>>>>> 001-modify-analyzer-method
  {
    browsers: ['chromium', 'firefox', 'webkit'],
    viewports: [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'mobile', width: 375, height: 667, isMobile: true }
    ],
    includePerformance: true,
    includeResponsive: true
  }
);

// Test multiple services
const results = await engine.testMultipleServices([
  { name: 'core-ui', url: 'http://localhost:3000/' },
<<<<<<< HEAD
  { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
=======
  { name: 'structured-investigation', url: 'http://localhost:3001/structured-investigation' }
>>>>>>> 001-modify-analyzer-method
]);

// Generate comprehensive report
const reportHtml = engine.generateCrossBrowserReport(results);
```

### Browser Support Matrix

#### Supported Browsers
- **Chrome/Chromium**: Latest stable version with Chrome DevTools Protocol
- **Firefox**: Latest stable version with Gecko engine
- **Safari/WebKit**: Latest stable version with WebKit engine
- **Edge**: Chromium-based Edge (supported via Chromium engine)

#### Test Coverage
- **Desktop**: 1920×1080, 1366×768 viewports
- **Tablet**: 768×1024 viewport with touch simulation
- **Mobile**: 375×667 viewport with mobile user agent
- **High DPI**: 2x and 3x device pixel ratio testing

## Feature Compatibility Testing

### Modern Web Features

The framework tests compatibility for essential web features:

#### JavaScript Features
- **ES6+ Support**: Classes, arrow functions, destructuring, template literals
- **Async Programming**: Promises, async/await, generators
- **Module System**: ES6 modules, dynamic imports
- **Modern APIs**: Fetch, IntersectionObserver, ResizeObserver

#### CSS Features
- **Layout Systems**: Flexbox, CSS Grid, custom properties
- **Visual Effects**: Transforms, animations, filters, masks
- **Responsive Design**: Media queries, viewport units, container queries
- **Modern Selectors**: :has(), :is(), :where(), custom properties

#### Browser APIs
- **Storage**: localStorage, sessionStorage, IndexedDB
- **Communication**: WebSockets, WebRTC, Server-Sent Events
- **Graphics**: WebGL, Canvas 2D, SVG animations
- **Progressive Web App**: Service Workers, Web App Manifest, Push API
- **Device APIs**: Geolocation, Device Orientation, Battery API

### Feature Detection Example

```typescript
const features = await engine.testBrowserFeatures(page);

// Check critical features
expect(features.localStorage).toBe(true);
expect(features.webSockets).toBe(true);
expect(features.css.flexbox).toBe(true);
expect(features.javascript.promises).toBe(true);

// Optional features (graceful degradation)
if (!features.webGL) {
  console.warn('WebGL not supported - fallback to Canvas 2D');
}

if (!features.serviceWorkers) {
  console.warn('Service Workers not supported - offline features disabled');
}
```

## Performance Testing Across Browsers

### Browser Performance Comparison

The framework measures and compares performance across browsers:

```typescript
// Performance metrics collected per browser
interface PerformanceMetrics {
  loadTime: number;                    // Total page load time
  domContentLoaded: number;            // DOM ready time
  firstContentfulPaint: number;        // First visual content
  largestContentfulPaint: number;      // Largest element painted
  renderingTime: number;               // Layout and paint time
  memoryUsage?: number;                // Heap memory usage
}

// Performance comparison
const performanceResults = await engine.testMultipleServices(services, {
  includePerformance: true
});

// Analyze performance differences
performanceResults.forEach(result => {
  const chromeResult = result.browsers.find(b => b.browserName === 'chromium');
  const firefoxResult = result.browsers.find(b => b.browserName === 'firefox');

  const loadTimeDiff = Math.abs(chromeResult.performance.loadTime - firefoxResult.performance.loadTime);
  const performanceVariance = (loadTimeDiff / chromeResult.performance.loadTime) * 100;

  if (performanceVariance > 50) {
    console.warn(`Significant performance difference between browsers: ${performanceVariance}%`);
  }
});
```

### Performance Thresholds

```typescript
const performanceThresholds = {
  desktop: {
    loadTime: 3000,              // 3 seconds maximum load time
    firstContentfulPaint: 1500,  // 1.5 seconds for first paint
    largestContentfulPaint: 2500, // 2.5 seconds for LCP
    memoryUsage: 50 * 1024 * 1024 // 50MB heap limit
  },
  mobile: {
    loadTime: 5000,              // 5 seconds on mobile
    firstContentfulPaint: 2000,  // 2 seconds for first paint
    largestContentfulPaint: 3500, // 3.5 seconds for LCP
    memoryUsage: 30 * 1024 * 1024 // 30MB heap limit on mobile
  }
};
```

## Responsive Design Testing

### Multi-Viewport Testing

Automated responsive design validation across browsers:

```typescript
const viewports = [
  { name: 'desktop', width: 1920, height: 1080, priority: 'high' },
  { name: 'laptop', width: 1366, height: 768, priority: 'high' },
  { name: 'tablet', width: 768, height: 1024, priority: 'medium' },
  { name: 'mobile', width: 375, height: 667, priority: 'high', isMobile: true }
];

// Test responsive behavior
const responsiveTest = await engine.testServiceCrossBrowser(serviceName, url, {
  viewports,
  includeResponsive: true
});

// Validate responsive design
responsiveTest.browsers.forEach(browserResult => {
  // Check for horizontal overflow
  const renderingErrors = browserResult.errors.filter(e => e.type === 'rendering');
  expect(renderingErrors.length).toBeLessThanOrEqual(1);

  // Verify touch targets on mobile
  if (browserResult.viewport?.isMobile) {
    const mobileWarnings = browserResult.warnings.filter(w => w.type === 'mobile');
    expect(mobileWarnings.length).toBeLessThanOrEqual(2);
  }
});
```

### Responsive Design Validation

- **Layout Overflow**: Detects content that overflows viewport boundaries
- **Touch Targets**: Validates minimum 44px touch targets on mobile
- **Media Queries**: Checks for responsive CSS implementation
- **Flexible Layouts**: Tests flexbox and grid layout adaptation
- **Font Scaling**: Validates text readability across screen sizes

## E2E Cross-Browser Testing

### Comprehensive Test Suite (`cross-browser.e2e.test.ts`)

```typescript
test('should maintain consistent functionality across all browsers for critical services', async () => {
  const criticalServices = [
    { name: 'core-ui', url: 'http://localhost:3000/' },
<<<<<<< HEAD
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
=======
    { name: 'structured-investigation', url: 'http://localhost:3001/structured-investigation' }
>>>>>>> 001-modify-analyzer-method
  ];

  for (const service of criticalServices) {
    const result = await crossBrowserEngine.testServiceCrossBrowser(
      service.name,
      service.url,
      { includePerformance: true, includeResponsive: true }
    );

    // Assert compatibility score
    expect(result.compatibilityScore).toBeGreaterThanOrEqual(80);

    // Assert no critical errors
    const criticalErrors = result.browsers.reduce((sum, browser) =>
      sum + browser.errors.filter(e => e.severity === 'critical').length, 0
    );
    expect(criticalErrors).toBe(0);

    // Assert all browsers passed
    const failedBrowsers = result.browsers.filter(b => !b.passed);
    expect(failedBrowsers.length).toBe(0);
  }
});
```

### Test Categories

1. **Functional Consistency**: Core features work identically across browsers
2. **Visual Consistency**: Layout and styling render consistently
3. **Performance Parity**: Acceptable performance across all browsers
4. **Feature Support**: Modern web features are supported or gracefully degraded
5. **Responsive Behavior**: Adaptive design works across browsers and viewports
6. **Accessibility**: Keyboard navigation and screen reader compatibility
7. **Error Handling**: Graceful error handling across different browser engines
8. **Network Resilience**: Consistent behavior under various network conditions

## Browser-Specific Considerations

### Chrome/Chromium
- **Advantages**: Best DevTools integration, latest web standards support
- **Testing Focus**: Performance optimization, modern API usage
- **Common Issues**: Memory usage, extension conflicts

### Firefox
- **Advantages**: Strong privacy features, excellent developer tools
- **Testing Focus**: Standards compliance, performance differences
- **Common Issues**: CSS Grid differences, WebGL compatibility

### Safari/WebKit
- **Advantages**: Optimized for Apple ecosystem, strong security model
- **Testing Focus**: iOS compatibility, webkit-specific features
- **Common Issues**: Limited feature support, different rendering behavior

### Edge (Chromium)
- **Advantages**: Windows integration, Chromium engine compatibility
- **Testing Focus**: Enterprise features, legacy Windows compatibility
- **Common Issues**: Group Policy restrictions, security zone configurations

## Compatibility Budgets

### Service-Specific Compatibility Budgets

```typescript
const compatibilityBudgets = {
  'core-ui': {
    compatibilityScore: 85,    // 85% minimum compatibility
    criticalErrors: 0,         // No critical errors allowed
    majorErrors: 1,            // Maximum 1 major error per browser
    performanceVariance: 30    // Max 30% performance difference
  },
<<<<<<< HEAD
  'autonomous-investigation': {
=======
  'structured-investigation': {
>>>>>>> 001-modify-analyzer-method
    compatibilityScore: 80,    // 80% minimum compatibility
    criticalErrors: 0,         // No critical errors allowed
    majorErrors: 2,            // Maximum 2 major errors per browser
    performanceVariance: 50    // Max 50% performance difference
  }
};
```

### Budget Enforcement

Compatibility budgets are enforced in:
- E2E test assertions with browser-specific thresholds
- CI/CD pipeline validation across all browsers
- Automated reporting with compatibility violations
- Performance regression detection across browsers

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Cross-Browser Tests

on: [push, pull_request]

jobs:
  cross-browser:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          npx playwright install ${{ matrix.browser }}

      - name: Build application
        run: npm run build

      - name: Start services
        run: npm run olorin &

      - name: Wait for services
        run: sleep 60

      - name: Run cross-browser tests
        run: npm run browser:${{ matrix.browser }}

      - name: Upload browser reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cross-browser-reports-${{ matrix.browser }}
          path: test-results/cross-browser/
```

### Compatibility Gates

Fail CI/CD pipeline if:
- Critical compatibility issues detected in any browser
- Compatibility score below minimum threshold (75%)
- Performance variance exceeds acceptable limits (50%)
- Core functionality fails in any supported browser
- Responsive design breaks on mobile browsers

## Browser Feature Polyfills

### Recommended Polyfills

For services requiring broad browser support:

```javascript
// Essential polyfills for older browsers
import 'core-js/stable';           // ES6+ features
import 'regenerator-runtime/runtime'; // async/await support
import 'whatwg-fetch';             // Fetch API
import 'intersection-observer';     // IntersectionObserver
import 'resize-observer-polyfill'; // ResizeObserver

// CSS polyfills
import 'css-has-pseudo/browser';   // :has() selector
import 'intersection-observer';     // CSS :focus-visible

// Conditional polyfills
if (!window.IntersectionObserver) {
  await import('intersection-observer');
}

if (!CSS.supports('display', 'grid')) {
  await import('css-grid-polyfill');
}
```

### Feature Detection Pattern

```typescript
// Progressive enhancement pattern
function initializeFeature() {
  if ('serviceWorker' in navigator) {
    // Enable offline functionality
    registerServiceWorker();
  }

  if ('IntersectionObserver' in window) {
    // Enable lazy loading
    setupLazyLoading();
  } else {
    // Fallback to immediate loading
    loadAllImages();
  }

  if (CSS.supports('display', 'grid')) {
    // Use CSS Grid layout
    document.body.classList.add('supports-grid');
  } else {
    // Fallback to flexbox
    document.body.classList.add('fallback-flexbox');
  }
}
```

## Troubleshooting

### Common Issues

1. **Browser not launching**:
   ```bash
   # Install browser dependencies
   npx playwright install-deps
   npx playwright install chromium firefox webkit
   ```

2. **Tests timing out**:
   - Increase timeout in playwright.config.ts
   - Check service startup times
   - Verify network connectivity

3. **Feature detection failures**:
   ```bash
   # Debug feature support
   npm run browser:test -- --debug
   ```

4. **Performance variance**:
   - Run tests multiple times for average
   - Check system resource usage
   - Disable other applications during testing

### Debug Mode

```bash
# Run with detailed debugging
DEBUG=pw:api npm run browser:test

# Test specific browser with debugging
npm run browser:chrome -- --debug

# Generate verbose compatibility report
npm run browser:compatibility -- --verbose

# Test single service across browsers
npm run browser:test -- --grep "core-ui" --debug
```

## Best Practices

### 1. Cross-Browser Development

- **Test early and often** throughout development cycle
- **Use progressive enhancement** rather than graceful degradation
- **Implement feature detection** before using modern APIs
- **Validate across real devices** when possible, not just emulation

### 2. Performance Optimization

- **Optimize for the slowest browser** in your support matrix
- **Use browser-specific optimizations** when appropriate
- **Monitor performance regressions** across browser updates
- **Consider browser market share** when prioritizing optimizations

### 3. Compatibility Management

- **Maintain compatibility matrices** for features and browsers
- **Document browser-specific workarounds** and their reasons
- **Set realistic compatibility targets** based on user analytics
- **Plan for browser deprecation** and migration strategies

## Contributing

When adding new cross-browser tests:

1. **Follow naming conventions**: `*.cross-browser.e2e.test.ts`
2. **Test across all supported browsers** not just Chrome
3. **Include performance validation** for critical user paths
4. **Document browser-specific behaviors** and workarounds
5. **Update compatibility budgets** when adding new features

## Related Documentation

- [Performance Testing](../performance/README.md)
- [Accessibility Testing](../accessibility/README.md)
- [Visual Regression Testing](../visual-regression/README.md)
- [E2E Testing Setup](../e2e/README.md)
- [Browser Compatibility Guide](https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile)
- [Playwright Browser Support](https://playwright.dev/docs/browsers)