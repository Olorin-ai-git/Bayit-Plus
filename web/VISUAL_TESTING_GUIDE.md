# Bayit+ Web - Visual Regression Testing Quick Start

## What is This?

This testing suite validates that the TailwindCSS migration maintains visual consistency across:
- ✅ 4 browsers (Chrome, Firefox, Safari, Edge)
- ✅ 9 viewports (320px mobile → 2560px desktop)
- ✅ Performance targets (FCP < 1.5s, LCP < 2.5s)
- ✅ Accessibility standards (WCAG 2.1 AA)

## Quick Commands

```bash
# Install (first time only)
npm install --legacy-peer-deps
npx playwright install

# Run all tests
npm run test:visual:full

# Run specific browser
npm run test:visual:chrome
npm run test:visual:firefox
npm run test:visual:safari
npm run test:visual:edge

# View report
npm run test:visual:report

# Debug mode (visible browser)
npm run test:visual:headed
```

## What Gets Tested

### Pages
- Home page (/)
- Player page with controls
- Admin dashboard
- Youngsters page
- Widget modals

### Checks
- Visual appearance matches baseline
- No console errors
- Keyboard navigation works (Tab, Enter, Escape)
- ARIA labels present
- Performance metrics met
- Responsive layout correct

## Understanding Results

### ✅ Pass
All tests passed! Visual consistency confirmed across all browsers and viewports.

### ❌ Fail
Some tests failed. Check the HTML report for:
- Screenshot differences (red highlights)
- Console error logs
- Performance metric failures
- Accessibility issues

## Common Workflows

### After Making UI Changes

1. Run tests:
   ```bash
   npm run test:visual:full
   ```

2. Review HTML report (opens automatically)

3. If changes are intentional:
   ```bash
   npx playwright test tests/visual-regression/ --update-snapshots
   ```

4. If issues found, fix and re-run

### Before Deploying

```bash
# Full test suite
npm run test:visual:full

# Must pass before deployment
```

### Debugging a Failed Test

```bash
# Run in headed mode to see what's happening
npm run test:visual:headed

# Or run specific test
npx playwright test tests/visual-regression/ --grep "TC-HOME-1" --headed
```

## Test Output Location

```
test-results/
├── results.json                    # Raw test data
├── visual-regression-report.md     # Markdown summary
└── *.png                          # Screenshots

playwright-report/
└── index.html                     # Interactive report (open in browser)
```

## Performance Metrics

Tests verify:
- **FCP** (First Contentful Paint) < 1.5s
- **LCP** (Largest Contentful Paint) < 2.5s
- **Bundle Size** < 1MB
- **No Console Errors**

## Screenshot Matrix

Each test captures screenshots at:

| Viewport | Width | Device Example |
|----------|-------|----------------|
| mobile-xs | 320px | iPhone SE |
| mobile-sm | 375px | iPhone 15 |
| mobile-lg | 414px | iPhone Pro Max |
| tablet-sm | 768px | iPad |
| tablet-lg | 1024px | iPad Pro |
| desktop-sm | 1280px | HD Display |
| desktop-md | 1440px | MacBook Pro |
| desktop-lg | 1920px | Full HD |
| desktop-2k | 2560px | 2K Display |

Across:
- Chrome (Chromium)
- Firefox
- Safari (WebKit)
- Edge (Chromium)

## Troubleshooting

### "Port 3000 in use"
```bash
lsof -ti:3000 | xargs kill -9
npm run test:visual:full
```

### "Browsers not installed"
```bash
npx playwright install
```

### "Tests timing out"
- Check if dev server started
- Increase timeout if needed
- Run in headed mode to debug

### "Screenshot differences"
1. Open HTML report
2. Compare baseline vs current
3. If intentional, update baselines
4. If bug, fix code and re-run

## Need Help?

1. Check `tests/visual-regression/README.md` (detailed docs)
2. Run with `--debug` flag
3. View HTML report for detailed traces
4. Ask in team Slack

## CI/CD Integration

Tests run automatically on:
- Pull requests to main
- Pre-deployment checks

Local testing required before pushing.

---

**Quick Reference**: `npm run test:visual:full` → Check report → Fix issues → Re-run → Deploy ✅
