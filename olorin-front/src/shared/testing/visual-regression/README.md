# Visual Regression Testing

This directory contains the visual regression testing infrastructure for the Olorin frontend microservices application. Visual regression testing helps ensure UI consistency across code changes by capturing and comparing screenshots.

## Overview

The visual regression testing system provides:

- **Screenshot comparison** across all 8 microservices
- **Responsive design validation** across multiple viewports
- **Theme consistency testing** (light, dark, high-contrast)
- **Component state testing** (hover, focus, active states)
- **Cross-service design consistency** validation
- **Automated baseline generation** and test execution

## File Structure

```
visual-regression/
├── README.md                           # This documentation
├── visual-regression-engine.ts         # Core visual testing engine
├── baseline-generator.ts               # Baseline screenshot generator
├── microservices.visual.e2e.test.ts   # Microservice visual tests
├── components.visual.e2e.test.ts      # Component visual tests
└── /baselines/                         # Generated baseline screenshots
    ├── /responsive/                    # Responsive design baselines
    ├── /themes/                        # Theme variation baselines
    ├── /components/                    # Component baselines
    └── /interactions/                  # Interactive state baselines
```

## Quick Start

### 1. Generate Baseline Screenshots

Before running visual regression tests, you need to generate baseline screenshots:

```bash
# Generate all baselines (requires services to be running)
npm run visual:baseline

# Or start services and generate baselines automatically
npm run olorin &  # Start services in background
sleep 30          # Wait for services to start
npm run visual:baseline
```

### 2. Run Visual Regression Tests

```bash
# Run all visual regression tests
npm run visual:test

# Run complete workflow (baseline + tests)
npm run visual:all

# Run specific test suites
npm run e2e:microservices  # Test microservice pages
npm run e2e:components     # Test shared components
npm run e2e:visual         # All visual tests
```

### 3. Review Results

Visual regression test results are saved to `test-results/visual-regression/`:

- **HTML Report**: `test-results/visual-regression/visual-regression-report.html`
- **Playwright Report**: `test-results/visual-regression/playwright-report/index.html`
- **Screenshots**: `test-results/visual-regression/test-results/`

## Test Categories

### 1. Microservice Visual Tests (`microservices.visual.e2e.test.ts`)

Tests visual consistency across all 8 microservices:

- **Baseline capture** for each service
- **Responsive design** testing (mobile, tablet, desktop, large-desktop)
- **Theme consistency** (light, dark, high-contrast)
- **Interactive component states** (hover, focus, active)
- **Cross-service design consistency**
- **Error state visuals**

**Services tested:**
- Core UI (Shell application)
<<<<<<< HEAD
- Autonomous Investigation
=======
- Structured Investigation
>>>>>>> 001-modify-analyzer-method
- Manual Investigation
- Agent Analytics
- RAG Intelligence
- Visualization
- Reporting
- Design System

### 2. Component Visual Tests (`components.visual.e2e.test.ts`)

Tests visual consistency of shared components:

- **Button component** variants, sizes, and states
- **Card component** layouts and interactive states
- **Loading component** spinners, messages, and skeleton screens
- **Accessibility states** (focus rings, high contrast)
- **Dark theme variations**

## Responsive Breakpoints

Tests are run across these viewport sizes:

- **Mobile**: 375×667px (iPhone SE)
- **Tablet**: 768×1024px (iPad)
- **Desktop**: 1920×1080px (Standard desktop)
- **Large Desktop**: 2560×1440px (Large monitors)

## Theme Variations

Visual consistency is tested across:

- **Light theme** (default)
- **Dark theme**
- **High contrast theme** (accessibility)

## Configuration

### Visual Regression Engine

The `VisualRegressionEngine` class provides:

```typescript
export class VisualRegressionEngine {
  // Test all microservices
  async testMicroservicePages(page: Page): Promise<void>

  // Test responsive design
  async testResponsiveDesign(page: Page, serviceName: string): Promise<void>

  // Test theme variations
  async testThemeVariations(page: Page, serviceName: string): Promise<void>

  // Test component states
  async testComponentStates(page: Page, selector: string): Promise<void>

  // Generate comparison report
  async generateReport(results: TestResults): Promise<void>
}
```

### Baseline Generator

The `BaselineGenerator` class handles:

```typescript
export class BaselineGenerator {
  // Generate service baselines
  async generateServiceBaselines(): Promise<void>

  // Generate responsive baselines
  async generateResponsiveBaselines(): Promise<void>

  // Generate theme baselines
  async generateThemeBaselines(): Promise<void>

  // Generate component baselines
  async generateComponentBaselines(): Promise<void>

  // Generate interaction baselines
  async generateInteractionBaselines(): Promise<void>
}
```

## Scripts

### `/scripts/visual-regression/generate-baselines.js`

Automated baseline generation script:

- Checks if services are running
- Starts services if needed
- Generates all baseline categories
- Creates HTML summary report

### `/scripts/visual-regression/run-visual-tests.js`

Test execution script:

- Validates baseline existence
- Ensures services are available
- Runs Playwright visual tests
- Generates comparison reports

## Playwright Configuration

Visual regression tests use the `visual-regression` project in `playwright.config.ts`:

```typescript
{
  name: 'visual-regression',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 }
  },
  testMatch: '**/*visual*.e2e.test.ts'
}
```

## Best Practices

### 1. Baseline Management

- **Regenerate baselines** when UI changes are intentional
- **Review baselines** before committing to repository
- **Version control** baseline screenshots for team consistency

### 2. Test Stability

- Tests **disable animations** and transitions
- **Wait for network idle** before capturing screenshots
- **Use consistent viewport sizes** across test runs

### 3. Threshold Configuration

Visual comparison uses a **98% similarity threshold**:

```typescript
expect(page).toHaveScreenshot({
  threshold: 0.98,
  animations: 'disabled'
});
```

### 4. Service Dependencies

Tests require **all microservices to be running**:

```bash
# Start all services
npm run olorin

# Verify services are running
curl http://localhost:3000  # Core UI
<<<<<<< HEAD
curl http://localhost:3001  # Autonomous Investigation
=======
curl http://localhost:3001  # Structured Investigation
>>>>>>> 001-modify-analyzer-method
curl http://localhost:3002  # Manual Investigation
curl http://localhost:3003  # Agent Analytics
```

## Troubleshooting

### Common Issues

1. **Services not running**:
   ```bash
   # Check service status
   npm run olorin status

   # Start services
   npm run olorin
   ```

2. **Missing baselines**:
   ```bash
   # Generate baselines first
   npm run visual:baseline
   ```

3. **Test failures due to timing**:
   - Increase wait times in test files
   - Ensure services are fully loaded
   - Check for JavaScript errors in browser console

4. **Screenshot differences**:
   - Review actual vs expected screenshots
   - Check if changes are intentional
   - Update baselines if UI changes are correct

### Debug Mode

Run tests with debug options:

```bash
# Run with Playwright UI
npm run e2e:ui

# Run with headed browser
npx playwright test --headed src/shared/testing/visual-regression/

# Generate trace files
npx playwright test --trace on src/shared/testing/visual-regression/
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
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

      - name: Start services
        run: npm run olorin &

      - name: Wait for services
        run: sleep 30

      - name: Run visual regression tests
        run: npm run visual:test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: visual-test-results
          path: test-results/
```

## Contributing

When adding new visual tests:

1. **Follow naming conventions**: `*.visual.e2e.test.ts`
2. **Use data-testid attributes** for reliable element selection
3. **Add appropriate waits** for dynamic content
4. **Document new test categories** in this README
5. **Update baseline generation** if new test types are added

## Related Documentation

- [E2E Testing Setup](../e2e/README.md)
- [Playwright Configuration](../../../playwright.config.ts)
- [Component Testing](../jest/README.md)
- [Microservices Architecture](../../../docs/architecture/microservices.md)