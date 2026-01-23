# iOS Visual Regression Testing Guide

## Overview

This document describes the comprehensive iOS visual regression testing strategy for the Bayit+ Web Platform after the 100% TailwindCSS migration.

**Testing Framework:** Playwright with WebKit (Safari rendering engine)

**Test Coverage:** HomePage, Video Player, Admin Dashboard, YoungstersPage, Widget Containers, and Accessibility

## Device Matrix

| Device | Viewport | Use Case |
|--------|----------|----------|
| **iPhone SE** | 320x568px | Smallest iOS device - Tests minimum viable layout |
| **iPhone 15** | 375x667px | Standard iPhone - Most common iOS device size |
| **iPhone 15 Pro Max** | 430x932px | Largest iPhone - Tests maximum content density |
| **iPad** | 768x1024px | Standard iPad - Tablet layout validation |
| **iPad Pro** | 1024x1366px | Large tablet - Desktop-like experience |

## iOS Version Coverage

Tests run on WebKit (Safari rendering engine) which covers iOS 16, 17, and 18 behavior.

## Test Categories

### 1. Visual Regression Tests

**Goal:** Ensure pixel-perfect rendering across all device sizes

**Covered Pages:**
- HomePage (hero, navigation, carousels)
- Video Player (controls, settings, subtitles)
- Admin Dashboard (sidebar, tables, forms)
- YoungstersPage (filters, content grid)
- Widget Containers (dynamic widgets)

**Test Approach:**
- Capture baseline screenshots for each viewport
- Compare against current implementation
- Allow small pixel differences (50-200px threshold)
- Flag major layout shifts or broken UI

### 2. Interaction Tests

**Goal:** Verify all touch interactions work correctly

**Tests:**
- Button taps
- Swipe gestures on carousels
- Form input focus
- Modal open/close
- Navigation transitions

### 3. Touch Target Tests

**Goal:** Ensure all interactive elements meet iOS minimum size (44x44pt)

**Validated Elements:**
- Navigation buttons
- Player controls
- Form inputs
- CTA buttons
- Social buttons

**Pass Criteria:**
- Width >= 44px
- Height >= 44px

### 4. Accessibility Tests

**Goal:** Ensure iOS accessibility features work correctly

**Tests:**

#### a) Dynamic Type Support
- Text scales correctly with user font size preferences
- Layout adapts without breaking

#### b) VoiceOver Navigation
- All buttons have `aria-label` or text content
- All images have `alt` text
- Semantic HTML structure for screen readers

#### c) RTL Layout (Hebrew/Arabic)
- Text alignment switches to right
- Layout mirrors correctly
- Icons flip appropriately

#### d) Safe Area Handling
- Content doesn't overlap notch area
- Header respects safe area insets
- Footer doesn't get cut off

#### e) Keyboard Navigation
- Tab order is logical
- Focus visible on all interactive elements
- Can navigate entire page with keyboard

### 5. Performance Tests

**Goal:** Meet Core Web Vitals thresholds

**Metrics:**
- **FCP (First Contentful Paint):** < 1.5s
- **LCP (Largest Contentful Paint):** < 2.5s
- **No console errors** on page load

### 6. Style Guide Compliance Tests

**Goal:** Verify TailwindCSS migration completeness

**Checks:**
- TailwindCSS classes present on elements
- Minimal inline styles (< 20 instances)
- Glass components have `backdrop-blur` and transparency
- No StyleSheet.create() usage (manual code check)

## Running Tests

### Basic Usage

```bash
# Run all iOS tests
./scripts/run-ios-tests.sh

# Run with browser visible (headed mode)
./scripts/run-ios-tests.sh --headed

# Run in debug mode (pause on failures)
./scripts/run-ios-tests.sh --debug

# Update baseline screenshots
./scripts/run-ios-tests.sh --update
```

### Alternative: Direct Playwright Commands

```bash
# Run only WebKit projects (iOS Safari)
npx playwright test tests/migration/ios-visual-regression.spec.ts --project=webkit-desktop --project=iphone-se --project=iphone-15 --project=iphone-15-pro-max --project=ipad --project=ipad-pro

# Run specific test suite
npx playwright test tests/migration/ios-visual-regression.spec.ts -g "HomePage"

# Run single viewport
npx playwright test tests/migration/ios-visual-regression.spec.ts --project=iphone-15

# Update screenshots for specific test
npx playwright test tests/migration/ios-visual-regression.spec.ts -g "HomePage renders correctly" --update-snapshots
```

## Test Results

### Output Locations

- **Screenshots:** `test-results/screenshots/ios/`
- **HTML Report:** `playwright-report/index.html`
- **JSON Results:** `test-results/results.json`

### Screenshot Naming Convention

```
homepage-iphoneSE.png                  # Full page screenshots
homepage-hero-iphone15.png             # Component screenshots
player-controls-iphone15ProMax.png     # Player components
admin-sidebar-ipad.png                 # Admin sections
youngsters-grid-ipadPro.png            # Youngsters sections
```

### Viewing Results

```bash
# Open HTML report in browser
npx playwright show-report

# View specific screenshot
open test-results/screenshots/ios/homepage-iphone15.png
```

## Expected Results

### Pass Criteria

A test suite passes if:
- **Visual regression:** Screenshots match baseline within threshold
- **Touch targets:** All buttons >= 44x44px
- **Accessibility:** All elements have ARIA labels, RTL works
- **Performance:** FCP < 1.5s, LCP < 2.5s
- **No console errors** during page load

### Common Failures

| Issue | Cause | Fix |
|-------|-------|-----|
| **Layout shift** | Responsive breakpoints not configured | Update Tailwind config with correct breakpoints |
| **Touch target too small** | Button padding insufficient | Add `p-3` or `p-4` Tailwind classes |
| **Missing ARIA label** | Button has no accessible name | Add `aria-label` prop |
| **RTL layout broken** | Hardcoded left/right positioning | Use logical properties (`start`/`end`) |
| **Glass effect not rendering** | Missing `backdrop-blur` class | Add `backdrop-blur-xl` Tailwind class |
| **Slow performance** | Unoptimized images or bundles | Lazy load images, code split bundles |

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: iOS Visual Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ios-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps webkit
      - run: ./scripts/run-ios-tests.sh
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Baseline Management

### Creating Initial Baselines

```bash
# Capture baseline screenshots for all viewports
./scripts/run-ios-tests.sh --update
```

### Updating Baselines After Changes

```bash
# Review visual changes
./scripts/run-ios-tests.sh --headed

# If changes are intentional, update baselines
./scripts/run-ios-tests.sh --update
```

### Version Control

- **Commit baselines** to git for consistent cross-team testing
- Store in `tests/migration/__screenshots__/`
- Review baseline changes in PRs carefully

## Troubleshooting

### Dev Server Not Starting

**Problem:** Tests fail because dev server isn't running

**Solution:**
```bash
# Start dev server manually
npm run dev

# In another terminal, run tests
npx playwright test tests/migration/ios-visual-regression.spec.ts
```

### Screenshot Mismatches

**Problem:** Tests fail with "Screenshot comparison failed"

**Causes:**
1. Font rendering differences across environments
2. Animations captured mid-transition
3. Lazy-loaded content not fully loaded

**Solutions:**
```typescript
// Increase wait time for animations
await page.waitForTimeout(500);

// Wait for specific element
await page.waitForSelector('[data-testid="hero"]', { state: 'visible' });

// Disable animations for consistent screenshots
await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
```

### Touch Target Failures

**Problem:** Buttons fail 44x44px minimum size test

**Solution:**
```tsx
// Before (fails)
<button className="p-1">Click</button>

// After (passes)
<button className="p-3 min-h-[44px] min-w-[44px]">Click</button>
```

### RTL Layout Issues

**Problem:** RTL layout doesn't mirror correctly

**Solution:**
```tsx
// Before (broken in RTL)
<div className="ml-4">Content</div>

// After (works in RTL)
<div className="ms-4">Content</div>  // margin-inline-start
```

## Best Practices

### Writing New Tests

1. **Use data-testid attributes** for stable selectors
2. **Wait for page ready** before capturing screenshots
3. **Test all viewports** for responsive behavior
4. **Verify glass effects** on all components
5. **Check touch targets** for all interactive elements

### Screenshot Best Practices

1. **Wait for animations** to complete before capturing
2. **Wait for network idle** to ensure all content loaded
3. **Set consistent viewport** for comparable screenshots
4. **Use full page screenshots** for layout validation
5. **Use component screenshots** for detailed comparison

### Performance Best Practices

1. **Run tests in parallel** (Playwright default)
2. **Use WebKit only** for iOS-specific tests
3. **Cache node_modules** in CI
4. **Run critical tests first** (smoke tests)

## Reporting Issues

When reporting test failures, include:

1. **Test name** (e.g., "HomePage renders correctly on iPhone 15")
2. **Viewport size** (e.g., 375x667)
3. **Screenshot comparison** (before/after)
4. **Console errors** (if any)
5. **Expected behavior** vs **actual behavior**

Example Issue:

```
Title: HomePage hero overlaps navigation on iPhone SE

Description:
On iPhone SE (320x568), the hero section overlaps the navigation bar by 20px.

Viewport: 320x568 (iPhone SE)
Test: HomePage hero section on iPhone SE
Screenshot: test-results/screenshots/ios/homepage-hero-iphoneSE.png

Expected: Hero should be below navigation with 0px overlap
Actual: Hero overlaps navigation by 20px

Console errors: None

Steps to reproduce:
1. Run: npx playwright test -g "HomePage hero" --project=iphone-se
2. View screenshot: test-results/screenshots/ios/homepage-hero-iphoneSE.png
3. Observe overlap at top of hero section
```

## Maintenance Schedule

- **Weekly:** Run full test suite and review failures
- **Before each release:** Update baselines if UI changed
- **After major Tailwind updates:** Re-run all tests
- **Quarterly:** Review and update test coverage

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [WebKit Rendering Engine](https://webkit.org/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## Support

For questions or issues:
1. Check this documentation first
2. Review Playwright logs and screenshots
3. Check the HTML report for detailed failure information
4. Ask team for help with reproduction steps
