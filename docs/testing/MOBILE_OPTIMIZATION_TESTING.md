# Mobile Optimization Testing Guide

Comprehensive testing guide for Phase 5: Testing & Polish of the mobile optimization project.

## Table of Contents

1. [Automated Tests](#automated-tests)
2. [Real Device Testing](#real-device-testing)
3. [Performance Testing](#performance-testing)
4. [Accessibility Testing](#accessibility-testing)
5. [Test Checklist](#test-checklist)

---

## Automated Tests

### Running Mobile Optimization Tests

```bash
cd web

# Run all mobile optimization tests
npm run test:mobile

# Or run specific test suites
npx playwright test tests/mobile-optimization.spec.ts

# Run with UI mode for debugging
npx playwright test tests/mobile-optimization.spec.ts --ui

# Run only touch target tests
npx playwright test tests/mobile-optimization.spec.ts -g "Touch Targets"

# Run only form input tests
npx playwright test tests/mobile-optimization.spec.ts -g "Form Inputs"
```

### Test Coverage

The automated test suite verifies:

✅ **Touch Targets** (WCAG AA compliance)
- All interactive elements ≥ 48px
- Mobile elements ≥ 56px
- Large buttons ≥ 64px

✅ **Form Inputs**
- Input height ≥ 56px on mobile
- Font size ≥ 16px (prevents iOS zoom)
- Select/dropdown height ≥ 56px

✅ **Buttons**
- Small: 44px on mobile
- Medium: 56px on mobile
- Large: 64px on mobile

✅ **Player Controls**
- Control bar: 80px height on mobile
- Control buttons: 56px minimum

✅ **Responsive Grids**
- 2 columns on phone (< 640px)
- 3 columns on large phone (640-767px)
- 4+ columns on desktop (≥ 768px)

✅ **Accessibility**
- Accessible labels on all buttons
- Focus indicators visible
- RTL support for Hebrew

---

## Real Device Testing

### Required Test Devices

#### iPhone (iOS Safari)
- **iPhone SE** (375x667) - Small screen baseline
- **iPhone 13** (390x844) - Standard size
- **iPhone 14 Pro Max** (430x932) - Large screen
- **iPad Mini** (744x1133) - Tablet baseline

#### Android (Chrome)
- **Pixel 5** (393x851) - Google baseline
- **Samsung Galaxy S21** (360x800) - Samsung baseline
- **Android Tablet** (7-10 inch) - Tablet baseline

### Test Cases

#### 1. Navigation & Layout

**Test**: Sidebar and Bottom Navigation
- [ ] Sidebar hidden by default on mobile
- [ ] Hamburger menu opens sidebar as drawer
- [ ] Backdrop dismisses drawer when clicked
- [ ] Bottom navigation visible and functional (5 tabs)
- [ ] Safe area insets respected (notch, home indicator)
- [ ] No layout shifts when toggling sidebar

**Test**: Content Pages
- [ ] HomePage renders correctly
- [ ] VODPage shows 2 columns on phone
- [ ] LivePage grid responsive
- [ ] RadioPage grid responsive
- [ ] PodcastsPage grid responsive
- [ ] All content cards have adequate touch targets

#### 2. Forms & Inputs

**Test**: Login/Register Forms
- [ ] Email input: 56px height, 16px font
- [ ] Password input: 56px height, 16px font
- [ ] No iOS zoom when focusing inputs
- [ ] Eye icon (show/hide password) ≥ 48px touch target
- [ ] Submit button: 56-64px height
- [ ] Keyboard doesn't obscure inputs
- [ ] Form validation messages visible

**Test**: Search Forms
- [ ] Search input: 56px height, 16px font
- [ ] Clear button (X icon) ≥ 48px touch target
- [ ] Filter buttons ≥ 48px touch targets
- [ ] Dropdown selects: 56px height

**Test**: Settings Forms
- [ ] Toggle switches ≥ 48px touch targets
- [ ] Navigation rows ≥ 56px height
- [ ] Dropdowns open full-screen on mobile
- [ ] Save buttons: 64px height

#### 3. Video Player

**Test**: Player Controls
- [ ] Control bar: 80px height on mobile
- [ ] Play/Pause button: 56px minimum
- [ ] Skip buttons: 56px minimum
- [ ] Volume button: 56px minimum
- [ ] Fullscreen button: 56px minimum
- [ ] Settings button: 56px minimum
- [ ] Icons: 28px size (clearly visible)
- [ ] Touch scrubbing works smoothly
- [ ] No accidental touches on crowded controls

**Test**: Player Interactions
- [ ] Tap to show/hide controls
- [ ] Pinch to zoom (if supported)
- [ ] Landscape orientation works
- [ ] Fullscreen enters/exits correctly
- [ ] Volume slider usable

#### 4. Profile & Avatar

**Test**: Profile Page
- [ ] Avatar upload: 120px size on mobile
- [ ] Camera button: 40px touch target
- [ ] Stats cards readable and tappable
- [ ] Save buttons: 64px height
- [ ] Form inputs: 56px height, 16px font

**Test**: Avatar Upload Flow
- [ ] Tap avatar to open file picker
- [ ] Camera button visible and tappable
- [ ] Upload progress visible
- [ ] Success/error messages displayed
- [ ] Updated avatar appears immediately

#### 5. Content Cards

**Test**: Card Interactions
- [ ] Play button: 64px on mobile (centered overlay)
- [ ] Action buttons (star, bookmark): 56px minimum
- [ ] Card tap opens detail view
- [ ] Button tap doesn't trigger card tap
- [ ] Touch targets have adequate spacing (8px min)

#### 6. Mobile Subdomain Redirect

**Test**: Redirect Logic
- [ ] Browsing bayit.tv on phone redirects to m.bayit.tv
- [ ] Tablets (iPad) stay on bayit.tv (not redirected)
- [ ] Path and query parameters preserved in redirect
- [ ] "View Desktop Site" link works (m.bayit.tv → bayit.tv)
- [ ] Desktop preference remembered in session
- [ ] No redirect loops

#### 7. Orientation Changes

**Test**: Portrait ↔ Landscape
- [ ] Layout adapts smoothly
- [ ] No content cutoff in landscape
- [ ] Player goes fullscreen in landscape (optional)
- [ ] Touch targets remain adequate
- [ ] No JavaScript errors on rotation

#### 8. RTL Support (Hebrew)

**Test**: Hebrew Language
- [ ] Layout flips to right-to-left
- [ ] Text alignment correct
- [ ] Icons positioned correctly
- [ ] Navigation flows right-to-left
- [ ] Touch targets remain adequate
- [ ] No overlapping text

---

## Performance Testing

### Lighthouse Mobile Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run mobile audit
lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility \
  --emulated-form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --output html \
  --output-path=./lighthouse-report.html
```

### Performance Targets

**Core Web Vitals (Mobile)**:
- **First Contentful Paint (FCP)**: < 1.5s ✅
- **Largest Contentful Paint (LCP)**: < 2.5s ✅
- **Cumulative Layout Shift (CLS)**: < 0.1 ✅
- **First Input Delay (FID)**: < 100ms ✅
- **Time to Interactive (TTI)**: < 3.5s ✅

**Additional Metrics**:
- **Total Blocking Time (TBT)**: < 300ms
- **Speed Index**: < 3.0s
- **Lighthouse Score**: ≥ 90

### WebPageTest

Test on real mobile network conditions:

```
URL: https://bayitplus.com
Location: Dulles, Virginia - Moto G4 - 3G
Runs: 3
```

### Performance Checklist

- [ ] FCP < 1.5s on 3G
- [ ] LCP < 2.5s on 3G
- [ ] CLS < 0.1 (no layout shifts)
- [ ] FID < 100ms (interactive quickly)
- [ ] No render-blocking resources
- [ ] Images lazy-loaded
- [ ] Critical CSS inlined
- [ ] JavaScript code-split

---

## Accessibility Testing

### WCAG AA Compliance

#### Automated Accessibility Testing

```bash
# Run with Playwright accessibility checks
npx playwright test tests/mobile-optimization.spec.ts -g "Accessibility"

# Run axe-core accessibility audit
npm run test:a11y
```

#### Manual Accessibility Testing

**Keyboard Navigation**:
- [ ] All interactive elements focusable via Tab
- [ ] Focus order logical (top → bottom, left → right)
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps
- [ ] Escape key closes modals/drawers
- [ ] Enter/Space activates buttons

**Screen Reader Testing**:

**iOS VoiceOver**:
1. Enable: Settings → Accessibility → VoiceOver
2. Gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate
   - Two-finger swipe up: Read all
3. Test checklist:
   - [ ] All buttons have clear labels
   - [ ] Form inputs have labels
   - [ ] Images have alt text
   - [ ] Landmarks identified (header, nav, main)
   - [ ] State changes announced (loading, error)

**Android TalkBack**:
1. Enable: Settings → Accessibility → TalkBack
2. Similar gestures and tests as VoiceOver

**Color Contrast**:
- [ ] Text contrast ≥ 4.5:1 (normal text)
- [ ] Large text contrast ≥ 3:1
- [ ] UI components contrast ≥ 3:1
- [ ] No information conveyed by color alone

**Touch Target Sizes**:
- [ ] All interactive elements ≥ 48x48px (WCAG AA)
- [ ] Mobile elements ≥ 56x56px (comfortable)
- [ ] Adequate spacing between targets (8px min)

---

## Test Checklist

### Pre-Deployment Checklist

#### Phase 4.1: Video Player Controls
- [ ] Control buttons: 56px on mobile (44px desktop)
- [ ] Icons: 28px on mobile (20px desktop)
- [ ] Control bar: 80px height on mobile (64px desktop)
- [ ] Skip buttons: 64px width on mobile
- [ ] All player controls tested on real devices

#### Phase 4.2: Settings Forms
- [ ] GlassInput: 56px height, 16px font
- [ ] GlassSelect: 56px height, 16px font
- [ ] No iOS zoom on input focus
- [ ] All forms tested on real devices

#### Phase 4.3: Profile Page
- [ ] GlassButton (lg): 64px height on mobile
- [ ] Avatar: 120px on mobile (100px desktop)
- [ ] Camera button: 40px on mobile (32px desktop)
- [ ] All profile interactions tested

#### Automated Tests
- [ ] All Playwright tests passing
- [ ] Touch target tests: 100% pass
- [ ] Form input tests: 100% pass
- [ ] Button height tests: 100% pass
- [ ] Responsive grid tests: 100% pass
- [ ] Accessibility tests: 100% pass

#### Real Device Tests
- [ ] iPhone SE: All test cases pass
- [ ] iPhone 13: All test cases pass
- [ ] iPhone 14 Pro Max: All test cases pass
- [ ] iPad Mini: All test cases pass
- [ ] Pixel 5: All test cases pass
- [ ] Samsung Galaxy S21: All test cases pass

#### Performance
- [ ] Lighthouse Mobile: Score ≥ 90
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] FID < 100ms

#### Accessibility
- [ ] WCAG AA compliance verified
- [ ] Keyboard navigation: 100% functional
- [ ] Screen reader: All content accessible
- [ ] Color contrast: All pass
- [ ] Touch targets: All ≥ 48px

#### Cross-Browser
- [ ] iOS Safari: Fully functional
- [ ] Android Chrome: Fully functional
- [ ] Android Firefox: Fully functional
- [ ] Android Samsung Internet: Fully functional

#### RTL Support
- [ ] Hebrew layout: Correct RTL rendering
- [ ] All touch targets: Adequate in RTL
- [ ] No layout breaks in RTL mode

---

## Running the Complete Test Suite

### Quick Test (5 minutes)

```bash
# Run automated tests only
cd web
npm run test:mobile
```

### Full Test (2 hours)

```bash
# 1. Automated tests
npm run test:mobile

# 2. Lighthouse audit
lighthouse http://localhost:3000 --emulated-form-factor=mobile

# 3. Real device testing (manual)
# - Test on 3 iPhones, 1 iPad, 2 Android devices
# - Follow test cases in this document

# 4. Accessibility audit
npm run test:a11y
```

---

## Troubleshooting

### Common Issues

**Issue**: Touch targets appear too small on real device
**Solution**: Check viewport meta tag, ensure useResponsive hook is used

**Issue**: iOS zoom when focusing inputs
**Solution**: Verify font-size ≥ 16px on mobile

**Issue**: Layout shifts on mobile
**Solution**: Check CLS score, ensure images have dimensions

**Issue**: Buttons not clickable
**Solution**: Check z-index, ensure no overlapping elements

**Issue**: Sidebar doesn't open on mobile
**Solution**: Check mobile drawer mode, verify hamburger button works

---

## Success Metrics

### Usability
- ✅ 100% of interactive elements ≥ 48px
- ✅ ≥ 95% of screen width for content on mobile
- ✅ Grid card width ≥ 150px
- ✅ All forms have 16px font (no iOS zoom)

### Performance
- ✅ FCP < 1.5s
- ✅ LCP < 2.5s
- ✅ CLS < 0.1
- ✅ FID < 100ms

### Business
- ✅ Mobile bounce rate < 40%
- ✅ Mobile conversion within 80% of desktop
- ✅ Video completion rate > 70%

---

## Next Steps After Testing

1. **Document Issues**: Log all bugs found during testing
2. **Prioritize Fixes**: Critical → High → Medium → Low
3. **Re-test**: After fixes, run full test suite again
4. **Deploy**: Once all tests pass, deploy to production
5. **Monitor**: Track mobile metrics post-deployment

---

## Resources

- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Mobile Web Best Practices](https://www.w3.org/TR/mobile-bp/)
- [iOS Safari Testing](https://developer.apple.com/safari/resources/)
- [Android Chrome Testing](https://developer.chrome.com/docs/devtools/device-mode/)
