# Accessibility Testing Framework

This directory contains a comprehensive accessibility testing framework for the Olorin frontend microservices application. The framework provides automated WCAG 2.1 AA compliance testing, keyboard navigation validation, screen reader simulation, and accessibility regression testing.

## Overview

The accessibility testing framework includes:

- **WCAG 2.1 AA compliance testing** with axe-core integration
- **Keyboard navigation testing** with tab order validation
- **Screen reader simulation** and ARIA attribute testing
- **Color contrast validation** and visual accessibility checks
- **Focus management testing** for dynamic content
- **Automated reporting** with actionable accessibility recommendations
- **Accessibility regression testing** to prevent compliance degradation

## File Structure

```
accessibility/
├── README.md                          # This documentation
├── accessibility-test-engine.ts       # Core accessibility testing engine
├── accessibility.e2e.test.ts         # Playwright accessibility tests
└── /reports/                         # Generated accessibility reports
```

## Quick Start

### 1. Run Accessibility Tests

```bash
# Run all accessibility tests
npm run a11y:all

# Run individual test types
npm run a11y:test        # Playwright accessibility tests
npm run a11y:audit       # Axe-core audits for all services
npm run a11y:keyboard    # Keyboard navigation testing

# Test specific service
<<<<<<< HEAD
npm run a11y:service autonomous-investigation
=======
npm run a11y:service structured-investigation
>>>>>>> 001-modify-analyzer-method
```

### 2. View Results

Accessibility test results are saved to `test-results/accessibility/`:

- **Playwright Report**: `test-results/accessibility/accessibility-report.html`
- **Axe Audit Report**: `test-results/accessibility/axe-audit-report.html`
- **WCAG Compliance Report**: `test-results/accessibility/wcag-compliance-report.html`

## WCAG 2.1 AA Compliance Testing

### Accessibility Test Engine (`accessibility-test-engine.ts`)

Comprehensive accessibility validation with axe-core integration:

```typescript
import { AccessibilityTestEngine } from './accessibility-test-engine';

const engine = new AccessibilityTestEngine();
await engine.initialize(browser);

// Test single service accessibility
const result = await engine.runAccessibilityAudit(
<<<<<<< HEAD
  'autonomous-investigation',
  'http://localhost:3001/autonomous-investigation',
=======
  'structured-investigation',
  'http://localhost:3001/structured-investigation',
>>>>>>> 001-modify-analyzer-method
  {
    includeKeyboard: true,
    includeScreenReader: true,
    includeColorContrast: true
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

// Generate accessibility report
const reportHtml = engine.generateAccessibilityReport(results);
```

### Supported WCAG Guidelines

#### Level A Compliance
- **1.1.1** Non-text Content: Alt text for images
- **1.3.1** Info and Relationships: Proper heading structure
- **1.4.1** Use of Color: Information not conveyed by color alone
- **2.1.1** Keyboard: All functionality accessible via keyboard
- **2.4.1** Bypass Blocks: Skip links for navigation
- **3.1.1** Language of Page: Page language specified
- **4.1.1** Parsing: Valid HTML markup
- **4.1.2** Name, Role, Value: Accessible names for controls

#### Level AA Compliance
- **1.2.4** Captions (Live): Live captions for audio content
- **1.4.3** Contrast (Minimum): 4.5:1 contrast ratio for normal text
- **1.4.4** Resize text: Text scalable to 200% without assistive technology
- **1.4.5** Images of Text: Avoid text in images where possible
- **2.4.6** Headings and Labels: Descriptive headings and labels
- **2.4.7** Focus Visible: Visible focus indicators
- **3.1.2** Language of Parts: Language changes identified
- **3.2.3** Consistent Navigation: Navigation consistent across pages
- **3.2.4** Consistent Identification: Consistent component identification

## Accessibility Test Engine Features

### Core Features (`accessibility-test-engine.ts`)

```typescript
// Comprehensive accessibility audit
const auditResult = await engine.runAccessibilityAudit(serviceName, url, {
  includeKeyboard: true,           // Test keyboard navigation
  includeScreenReader: true,       // Test screen reader compatibility
  includeColorContrast: true,      // Validate color contrast ratios
  includeFocusManagement: true,    // Test focus order and visibility
  includeFormValidation: true,     // Test form accessibility
  includeARIACompliance: true      // Validate ARIA implementation
});

// Keyboard navigation testing
const keyboardResult = await engine.testKeyboardNavigation(url, {
  testTabOrder: true,              // Validate logical tab order
  testFocusTrapping: true,         // Test modal focus trapping
  testSkipLinks: true,             // Validate skip navigation links
  testInteractiveElements: true    // Test all interactive elements
});

// Screen reader simulation
const screenReaderResult = await engine.testScreenReaderAccessibility(url, {
  testLandmarks: true,             // Validate ARIA landmarks
  testHeadingStructure: true,      // Test heading hierarchy
  testFormLabels: true,            // Test form label associations
  testImageAltText: true,          // Validate image alt attributes
  testLiveRegions: true            // Test dynamic content announcements
});

// Color contrast validation
const contrastResult = await engine.testColorContrast(url, {
  minimumRatio: 4.5,               // WCAG AA standard for normal text
  largeTextRatio: 3.0,             // WCAG AA standard for large text
  testAllElements: true,           // Test all text elements
  generateReport: true             // Include detailed contrast report
});
```

### Accessibility Metrics Collected

- **WCAG Compliance**: Percentage compliance with WCAG 2.1 AA guidelines
- **Axe Violations**: Critical, serious, moderate, and minor violations
- **Keyboard Navigation**: Tab order, focus management, keyboard shortcuts
- **Screen Reader Compatibility**: ARIA implementation, semantic structure
- **Color Contrast**: Text/background contrast ratios for all elements
- **Focus Management**: Focus visibility, focus trapping, focus restoration
- **Form Accessibility**: Label associations, error messaging, validation
- **Dynamic Content**: Live regions, state changes, loading announcements

## Axe-Core Integration

### Automated Axe Audits (`/scripts/accessibility/axe-audit.js`)

Comprehensive axe-core audits across all microservices:

```bash
# Run axe audits
npm run a11y:audit
```

**Features:**
- Tests all 8 microservices for WCAG 2.1 AA compliance
- Generates detailed violation reports with remediation guidance
- Creates accessible HTML reports with screen reader compatibility
- Identifies critical accessibility blockers and priority fixes

**Violation Categories:**
- **Critical**: Failures that completely block access for users with disabilities
- **Serious**: Major accessibility barriers that significantly impact usability
- **Moderate**: Issues that create difficulties but don't completely block access
- **Minor**: Best practice violations that may impact some users

### Configuration

```javascript
const axeConfig = {
  services: [
    { name: 'core-ui', url: 'http://localhost:3000/', critical: true },
<<<<<<< HEAD
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation', critical: true }
=======
    { name: 'structured-investigation', url: 'http://localhost:3001/structured-investigation', critical: true }
>>>>>>> 001-modify-analyzer-method
    // ... more services
  ],
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-implementation': { enabled: true },
    'semantic-structure': { enabled: true }
  },
  thresholds: {
    critical: 0,      // No critical violations allowed
    serious: 2,       // Maximum 2 serious violations
    moderate: 10,     // Maximum 10 moderate violations
    minor: 25         // Maximum 25 minor violations
  }
};
```

## Keyboard Navigation Testing

### Comprehensive Keyboard Testing (`testKeyboardNavigation`)

Validates keyboard accessibility across all interactive elements:

```bash
# Test keyboard navigation
npm run a11y:keyboard
```

**Testing includes:**
- **Tab Order Validation**: Logical and predictable tab sequence
- **Focus Management**: Visible focus indicators and proper focus restoration
- **Skip Links**: Functional bypass mechanisms for navigation
- **Modal Interactions**: Focus trapping and keyboard escape mechanisms
- **Form Navigation**: Keyboard access to all form controls and validation
- **Interactive Elements**: Keyboard alternatives for mouse interactions

**Keyboard Test Scenarios:**
1. **Navigation Flow**: Tab through entire page in logical order
2. **Skip Links**: Test bypass links for main content and navigation
3. **Modal Dialogs**: Focus trapping and keyboard dismissal
4. **Form Controls**: Access all inputs, buttons, and interactive elements
5. **Dynamic Content**: Keyboard access to dynamically loaded content
6. **Custom Controls**: Proper ARIA and keyboard event handling

### Keyboard Navigation Standards

- **Tab Order**: Sequential and logical navigation flow
- **Focus Indicators**: Clearly visible focus outlines (minimum 2px, high contrast)
- **Skip Links**: Bypass repetitive content with skip navigation
- **Escape Mechanisms**: ESC key closes modals and cancels operations
- **Arrow Key Navigation**: Arrow keys for menu and list navigation
- **Enter/Space Activation**: Standard key activation for interactive elements

## Screen Reader Testing

### Screen Reader Simulation (`testScreenReaderAccessibility`)

Validates screen reader compatibility and ARIA implementation:

```bash
# Test screen reader accessibility
npm run a11y:screen-reader
```

**Testing includes:**
- **ARIA Landmarks**: Proper page structure with navigation landmarks
- **Heading Structure**: Logical heading hierarchy (h1 → h2 → h3)
- **Form Labels**: Proper label associations and accessible names
- **Image Alt Text**: Descriptive alternative text for images
- **Live Regions**: Dynamic content announcements
- **State Announcements**: Interactive element state changes

**Screen Reader Test Categories:**

1. **Semantic Structure**: HTML5 semantic elements and ARIA landmarks
2. **Heading Hierarchy**: Logical heading structure for content navigation
3. **Form Accessibility**: Label associations, fieldsets, and error messaging
4. **Image Descriptions**: Alt text and long descriptions for complex images
5. **Dynamic Content**: Live regions for real-time updates
6. **Interactive States**: ARIA states and properties for custom controls

### ARIA Implementation Standards

```html
<!-- Landmark Examples -->
<nav aria-label="Main navigation">...</nav>
<main aria-label="Main content">...</main>
<aside aria-label="Investigation filters">...</aside>

<!-- Interactive Element Examples -->
<button aria-expanded="false" aria-controls="menu-items">Menu</button>
<input aria-describedby="password-help" aria-invalid="false">
<div role="alert" aria-live="assertive">Error message</div>

<!-- Form Examples -->
<label for="investigation-name">Investigation Name</label>
<input id="investigation-name" aria-required="true">
<div id="name-error" role="alert">Name is required</div>
```

## Color Contrast Testing

### Comprehensive Contrast Validation (`testColorContrast`)

Validates WCAG AA color contrast requirements:

```bash
# Test color contrast
npm run a11y:contrast
```

**Standards:**
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3.0:1 contrast ratio (18pt+ or 14pt+ bold)
- **Interactive Elements**: Minimum 3.0:1 contrast ratio for focus states
- **Graphical Elements**: Minimum 3.0:1 contrast ratio for UI components

**Contrast Testing includes:**
- Text content against background colors
- Interactive element states (hover, focus, active)
- Icon and graphical element visibility
- Link text differentiation from surrounding text
- Error and success message visibility

## E2E Accessibility Testing

### Playwright Accessibility Tests (`accessibility.e2e.test.ts`)

Comprehensive accessibility validation in real browser environments:

```typescript
test('should meet WCAG 2.1 AA compliance for all critical services', async () => {
  const criticalServices = [
    { name: 'core-ui', url: 'http://localhost:3000/' },
<<<<<<< HEAD
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
=======
    { name: 'structured-investigation', url: 'http://localhost:3001/structured-investigation' }
>>>>>>> 001-modify-analyzer-method
  ];

  for (const service of criticalServices) {
    const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);

    // Assert WCAG compliance
    expect(result.complianceScore).toBeGreaterThanOrEqual(80);
    expect(result.criticalIssues).toBe(0);
    expect(result.seriousIssues).toBeLessThanOrEqual(2);
    expect(result.colorContrastScore).toBeGreaterThanOrEqual(4.5);
  }
});
```

### Test Categories

1. **WCAG Compliance**: Validates adherence to WCAG 2.1 AA guidelines
2. **Keyboard Navigation**: Tests keyboard-only navigation workflows
3. **Screen Reader Compatibility**: Validates screen reader accessibility
4. **Color Contrast**: Ensures sufficient contrast ratios
5. **Focus Management**: Tests focus order and visibility
6. **Form Accessibility**: Validates accessible form implementations
7. **Dynamic Content**: Tests accessibility of dynamic updates
8. **Error Handling**: Validates accessible error messaging
9. **Mobile Accessibility**: Tests accessibility on mobile devices
10. **Cross-Browser Compatibility**: Ensures consistent accessibility across browsers

## Accessibility Budgets

### Service-Specific Accessibility Budgets

```typescript
const accessibilityBudgets = {
  'core-ui': {
    complianceScore: 85,    // 85% WCAG compliance
    criticalIssues: 0,      // No critical violations
    seriousIssues: 1,       // Maximum 1 serious violation
    contrastRatio: 4.5      // AA contrast requirement
  },
<<<<<<< HEAD
  'autonomous-investigation': {
=======
  'structured-investigation': {
>>>>>>> 001-modify-analyzer-method
    complianceScore: 80,    // 80% WCAG compliance
    criticalIssues: 0,      // No critical violations
    seriousIssues: 2,       // Maximum 2 serious violations
    contrastRatio: 4.5      // AA contrast requirement
  }
};
```

### Budget Enforcement

Accessibility budgets are enforced in:
- E2E test assertions
- CI/CD pipeline validation
- Automated reporting with violations
- Accessibility regression detection

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  accessibility:
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

      - name: Run accessibility tests
        run: npm run a11y:all

      - name: Upload accessibility reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: accessibility-reports
          path: test-results/accessibility/
```

### Accessibility Gates

Fail CI/CD pipeline if:
- Critical accessibility violations detected
- WCAG compliance score below threshold
- Color contrast ratios below WCAG AA standards
- Keyboard navigation failures
- Screen reader compatibility issues

## Monitoring and Alerting

### Real-time Accessibility Monitoring

```typescript
// Accessibility monitoring integration
accessibilityEngine.onViolationDetected((violation) => {
  // Send to monitoring service
  monitoringService.sendAccessibilityAlert({
    type: violation.impact,
    rule: violation.id,
    description: violation.description,
    help: violation.help,
    service: violation.serviceName,
    severity: violation.impact
  });
});

// Analytics integration for accessibility metrics
accessibilityEngine.sendToAnalytics({
  complianceScore: result.complianceScore,
  violationCount: result.violations.length,
  service: serviceName,
  timestamp: Date.now()
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

2. **Axe audit failures**:
   - Ensure all services are accessible
   - Check for JavaScript errors affecting accessibility
   - Verify ARIA implementation is correct

3. **Keyboard navigation issues**:
   - Check tab order with browser developer tools
   - Verify focus indicators are visible
   - Test with actual keyboard navigation

4. **Color contrast failures**:
   ```bash
   # Test specific contrast ratios
   npm run a11y:contrast -- --service core-ui
   ```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=pw:api npm run a11y:test

# Run axe audits with verbose logging
npm run a11y:audit -- --verbose

# Test specific accessibility rule
npm run a11y:test -- --rule color-contrast
```

## Best Practices

### 1. Accessibility Testing

- **Test early and often** throughout development process
- **Include users with disabilities** in testing when possible
- **Use automated testing** as a baseline, not a complete solution
- **Test with real assistive technologies** for comprehensive validation

### 2. Budget Management

- **Set realistic budgets** based on user needs and WCAG requirements
- **Review budgets regularly** as application complexity evolves
- **Prioritize critical user paths** for strictest accessibility requirements
- **Allow budget headroom** for unexpected accessibility challenges

### 3. Implementation

- **Design with accessibility first** rather than retrofitting
- **Use semantic HTML** as the foundation for accessibility
- **Implement ARIA carefully** and only when semantic HTML is insufficient
- **Test accessibility at component level** before integration

## Contributing

When adding new accessibility tests:

1. **Follow naming conventions**: `*.accessibility.e2e.test.ts`
2. **Use data-testid attributes** for reliable element selection
3. **Include proper timeouts** for accessibility operations
4. **Document new test scenarios** and expected outcomes
5. **Update budgets** if application scope changes

## Related Documentation

- [Performance Testing](../performance/README.md)
- [Visual Regression Testing](../visual-regression/README.md)
- [E2E Testing Setup](../e2e/README.md)
- [Component Testing](../jest/README.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)