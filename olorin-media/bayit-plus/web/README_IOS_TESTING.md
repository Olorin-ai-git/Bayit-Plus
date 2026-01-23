# iOS Visual Regression Testing - Quick Start

## Overview

Automated iOS testing infrastructure for the Bayit+ Web Platform using Playwright with WebKit (Safari rendering engine).

## Quick Commands

```bash
# Run all iOS tests
./scripts/run-ios-tests.sh

# Run specific device
npx playwright test tests/migration/ios-layout-regression.spec.ts --project=iphone-15

# Run with browser visible
./scripts/run-ios-tests.sh --headed

# Update baseline screenshots
./scripts/run-ios-tests.sh --update

# View test report
npx playwright show-report
```

## Device Coverage

- ✅ iPhone SE (320×568)
- ✅ iPhone 15 (375×667)
- ✅ iPhone 15 Pro Max (430×932)
- ✅ iPad (768×1024)
- ✅ iPad Pro (1024×1366)

## Test Results (Latest Run)

**Date:** January 22, 2026
**Pass Rate:** 90% (27/30 tests passed)

### Status

✅ **Passing:**
- Layout detection (all devices)
- Responsive behavior (no horizontal scroll)
- Accessibility (labels, keyboard nav)
- Performance (1.6s load time)
- Glass effects (39 elements)

⚠️ **Attention Required:**
- Touch target validation (needs authenticated pages)
- TailwindCSS detection (needs content pages)

## Documentation

- **Full Testing Report:** [docs/IOS_TESTING_REPORT.md](/Users/olorin/Documents/olorin/olorin-media/bayit-plus/web/docs/IOS_TESTING_REPORT.md)
- **Testing Guide:** [docs/IOS_VISUAL_REGRESSION_TESTING.md](/Users/olorin/Documents/olorin/olorin-media/bayit-plus/web/docs/IOS_VISUAL_REGRESSION_TESTING.md)
- **Screenshots:** `test-results/screenshots/ios/`

## Test Files

1. `tests/migration/ios-visual-regression.spec.ts` - Comprehensive suite
2. `tests/migration/ios-layout-regression.spec.ts` - Practical tests
3. `scripts/run-ios-tests.sh` - Automated test runner
4. `playwright.config.ts` - Device configurations

## Next Steps

1. Add authentication to tests for full page access
2. Test Player, Admin, Youngsters pages
3. Validate touch targets on interactive elements
4. Verify TailwindCSS usage on content-rich pages

## Support

See [docs/IOS_VISUAL_REGRESSION_TESTING.md](/Users/olorin/Documents/olorin/olorin-media/bayit-plus/web/docs/IOS_VISUAL_REGRESSION_TESTING.md) for detailed troubleshooting and best practices.
