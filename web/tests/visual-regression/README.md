# Visual Regression Testing Suite

Comprehensive visual regression testing for Bayit+ Web Platform using Playwright.

## Overview

This testing suite validates the TailwindCSS migration by capturing and comparing screenshots across:

- **4 Browsers**: Chrome, Firefox, Safari (WebKit), Edge
- **9 Viewports**: 320px - 2560px (mobile to 2K desktop)
- **Key Pages**: Home, Player, Admin, Youngsters, Widgets
- **Performance**: FCP < 1.5s, LCP < 2.5s
- **Accessibility**: ARIA labels, keyboard navigation, WCAG AA
- **Console Errors**: Zero tolerance

## Quick Start

### Install Dependencies

```bash
npm install --legacy-peer-deps
npx playwright install
```

### Run All Tests

```bash
npm run test:visual:full
```

This will:
1. Start the dev server
2. Run tests across all browsers and viewports
3. Generate HTML report with screenshots
4. Display test summary

### Run Specific Browser

```bash
npm run test:visual:chrome    # Chrome only
npm run test:visual:firefox   # Firefox only
npm run test:visual:safari    # Safari only
npm run test:visual:edge      # Edge only
```

### View Report

```bash
npm run test:visual:report
```

Opens the HTML report in your browser with:
- Screenshot comparisons
- Test results by browser
- Performance metrics
- Failed test details

## Test Coverage

### Home Page (`TC-HOME-*`)

- ✅ Renders at all 9 viewports
- ✅ No console errors
- ✅ Core Web Vitals within thresholds
- ✅ Keyboard navigation works
- ✅ ARIA labels present

### Player Page (`TC-PLAYER-*`)

- ✅ Player controls render correctly
- ✅ Subtitle controls accessible
- ✅ Responsive layout across viewports
- ✅ Video player UI components

### Admin Dashboard (`TC-ADMIN-*`)

- ✅ Dashboard layout renders
- ✅ Responsive across viewports
- ✅ Sidebar navigation visible
- ✅ Authentication redirect handling

### Youngsters Page (`TC-YOUNGSTERS-*`)

- ✅ Page renders correctly
- ✅ Responsive design
- ✅ Child-friendly accessibility

### Widget Modals (`TC-WIDGETS-*`)

- ✅ Widget page renders
- ✅ Modal glassmorphism effects
- ✅ Overlay accessibility

### Cross-Browser (`TC-BROWSER-*`)

- ✅ Consistent rendering across all browsers
- ✅ No browser-specific layout issues

### Performance (`TC-PERF-*`)

- ✅ Bundle size < 1MB
- ✅ Time to Interactive < 5s
- ✅ FCP < 1.5s
- ✅ LCP < 2.5s

### RTL Layout (`TC-RTL-*`)

- ✅ Hebrew/Arabic RTL layout
- ✅ Navigation RTL alignment
- ✅ Text direction correct

## Viewport Configuration

```typescript
const VIEWPORTS = [
  { name: 'mobile-xs', width: 320, height: 568 },      // iPhone SE
  { name: 'mobile-sm', width: 375, height: 667 },      // iPhone 15
  { name: 'mobile-lg', width: 414, height: 896 },      // iPhone 15 Pro Max
  { name: 'tablet-sm', width: 768, height: 1024 },     // iPad
  { name: 'tablet-lg', width: 1024, height: 1366 },    // iPad Pro
  { name: 'desktop-sm', width: 1280, height: 720 },    // HD Desktop
  { name: 'desktop-md', width: 1440, height: 900 },    // MacBook Pro
  { name: 'desktop-lg', width: 1920, height: 1080 },   // Full HD
  { name: 'desktop-2k', width: 2560, height: 1440 },   // 2K Display
];
```

## Performance Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| FCP | < 1.5s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTI | < 5s | Time to Interactive |
| Bundle Size | < 1MB | Total JS bundle size |

## Test Results

### Screenshot Matrix

Screenshots are saved in `test-results/` with naming pattern:

```
{page}-{viewport}-{browser}.png
```

Examples:
- `home-mobile-xs-chrome.png`
- `home-desktop-lg-safari.png`
- `player-tablet-sm-firefox.png`

### HTML Report

Generated at `playwright-report/index.html` with:

- Test results by browser
- Screenshot comparisons (baseline vs current)
- Performance metrics charts
- Console error logs
- Accessibility audit results
- Failed test details with traces

### JSON Report

Generated at `test-results/results.json` for programmatic analysis.

### Markdown Report

Generated at `test-results/visual-regression-report.md` with:

- Executive summary
- Browser coverage
- Test results by category
- Performance metrics table
- Issues found (categorized by severity)
- Screenshot matrix
- Pass/Fail determination
- Next steps

## Advanced Usage

### Debug Mode

Run tests with visible browser and debug logs:

```bash
npm run test:visual:headed
```

Or:

```bash
./scripts/run-visual-regression.sh --headed --debug
```

### Update Baselines

After intentional visual changes, update baseline screenshots:

```bash
npx playwright test tests/visual-regression/ --update-snapshots
```

### Specific Test

Run a single test case:

```bash
npx playwright test tests/visual-regression/ --grep "TC-HOME-1"
```

### CI/CD Integration

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install --legacy-peer-deps
      - run: npx playwright install --with-deps
      - run: npm run test:visual
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Browsers Not Installed

```bash
npx playwright install
```

### Tests Timing Out

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  actionTimeout: 30000, // 30 seconds
}
```

### Screenshot Differences

1. Check if changes are intentional
2. Review screenshot diffs in HTML report
3. Update baselines if changes are correct:

```bash
npx playwright test --update-snapshots
```

### Console Errors

Filter acceptable warnings in test:

```typescript
const criticalErrors = errors.filter(error =>
  !error.includes('favicon') &&
  !error.includes('third-party')
);
```

## Test Structure

```
tests/visual-regression/
├── README.md                              # This file
└── visual-regression-full.spec.ts         # Main test suite

scripts/
├── run-visual-regression.sh               # Test runner script
└── generate-test-report.ts                # Report generator

playwright.config.ts                       # Playwright configuration

test-results/
├── results.json                           # Raw test results
├── visual-regression-report.md            # Markdown report
└── *.png                                  # Screenshot artifacts

playwright-report/
└── index.html                             # Interactive HTML report
```

## Best Practices

### Writing Tests

1. **Wait for Page Load**: Always use `waitForPageLoad()` helper
2. **Unique Selectors**: Use `data-testid` for test-specific selectors
3. **Tolerance**: Set `maxDiffPixels` based on expected variance
4. **Categories**: Prefix test names with category (TC-HOME-, TC-PLAYER-, etc.)

### Screenshot Management

1. **Baseline**: Commit baseline screenshots to git
2. **Updates**: Review all changes before updating baselines
3. **Artifacts**: Upload screenshots in CI for failed tests
4. **Cleanup**: Periodically clean old screenshots

### Performance Testing

1. **Consistent Environment**: Run on same machine/network
2. **Multiple Runs**: Average metrics across 3+ runs
3. **Network Throttling**: Consider throttling for realistic tests
4. **Cache**: Clear cache between tests for consistency

## Contributing

### Adding New Tests

1. Add test to `visual-regression-full.spec.ts`
2. Follow naming convention: `TC-{CATEGORY}-{NUMBER}`
3. Add to appropriate `test.describe()` block
4. Document in this README

### Updating Thresholds

Edit thresholds in test file:

```typescript
const PERFORMANCE_THRESHOLDS = {
  FCP: 1500,  // Adjust as needed
  LCP: 2500,
};
```

### New Viewports

Add to `VIEWPORTS` array:

```typescript
{ name: 'custom', width: 1680, height: 1050 }
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Regression Testing Guide](https://playwright.dev/docs/test-snapshots)
- [Core Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Support

For issues or questions:

1. Check this README
2. Review test output and HTML report
3. Check Playwright documentation
4. Ask in team Slack channel

---

**Last Updated**: 2026-01-22
**Version**: 1.0.0
**Maintainer**: Bayit+ Development Team
