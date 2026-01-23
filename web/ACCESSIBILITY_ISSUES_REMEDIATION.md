# Accessibility Issues & Remediation Guide
**Bayit+ Web Platform**

**Date:** 2026-01-22
**Priority:** CRITICAL → MODERATE → MINOR

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### Issue #1: Color Contrast Failures on Glassmorphic Backgrounds
**WCAG Criterion:** 1.4.3 Contrast (Minimum) - Level AA
**Severity:** CRITICAL
**Impact:** Users with low vision cannot read text; affects ~15% of users

#### Current State
```tsx
// ❌ FAILING - GlassInput.tsx line 53
<Text className="text-sm font-medium text-white/70 mb-1">
  {label}
</Text>
// Contrast ratio: ~1.9:1 (needs 4.5:1)

// ❌ FAILING - Multiple components
className="text-white/80"
// Contrast ratio: ~2.5:1 (needs 4.5:1)

// ❌ FAILING - GlassButton borders
borderColor: 'rgba(126, 34, 206, 0.6)'
// Contrast ratio: ~2.1:1 (needs 3:1 for UI components)
```

#### Solution
```tsx
// ✅ FIXED - Increase opacity
<Text className="text-sm font-medium text-white/95 mb-1">
  {label}
</Text>
// New contrast ratio: ~7.1:1 ✅

// ✅ FIXED - Update all text opacity
className="text-white/95"  // or just "text-white"

// ✅ FIXED - Increase border opacity
borderColor: 'rgba(126, 34, 206, 0.9)'
// New contrast ratio: ~3.8:1 ✅

// ✅ ALTERNATIVE - Add solid background for critical text
<View className="bg-black/80 backdrop-blur-xl">
  <Text className="text-white">
    {label}
  </Text>
</View>
```

#### Files to Update
- `/shared/components/ui/GlassInput.tsx` (lines 53, 70, 91)
- `/shared/components/ui/GlassButton.tsx` (lines 69, 77, 83, 92, 100, 109, etc.)
- `/shared/components/ui/GlassModal.tsx` (lines 107, 167)
- `/web/src/components/layout/GlassSidebar.tsx` (all text elements)
- `/shared/theme/index.ts` (update color definitions)

#### Testing
```bash
# After fix, verify with:
# 1. WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
# 2. axe DevTools browser extension
# 3. Manual visual inspection in dim lighting
```

---

### Issue #2: Missing Skip Navigation Link
**WCAG Criterion:** 2.4.1 Bypass Blocks - Level A
**Severity:** CRITICAL
**Impact:** Keyboard-only users must tab through entire header on every page

#### Current State
```tsx
// ❌ No skip link present in main.tsx or App.tsx
<BrowserRouter>
  <App />
</BrowserRouter>
```

#### Solution
```tsx
// ✅ Add to App.tsx (or main layout component)
export default function App() {
  return (
    <>
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999] focus:px-6 focus:py-4 focus:bg-purple-600 focus:text-white focus:font-semibold focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-400"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" role="main" className="...">
        {/* Page content */}
      </main>

      <Footer />
    </>
  );
}

// Add sr-only utility to Tailwind config if not present
// tailwind.config.cjs
module.exports = {
  theme: {
    extend: {
      // ... existing config
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
      });
    },
  ],
};
```

#### Files to Update
- `/web/src/App.tsx` - Add skip link
- `/web/src/pages/*.tsx` - Add `id="main-content"` to main content area
- `/web/tailwind.config.cjs` - Add sr-only utilities (if missing)

#### Testing
```bash
# 1. Tab from address bar - skip link should be first focusable element
# 2. Press Enter on skip link - focus should jump to main content
# 3. Screen reader should announce "Skip to main content" link
```

---

### Issue #3: Missing ARIA Landmark Roles
**WCAG Criterion:** 1.3.1 Info and Relationships - Level A
**Severity:** CRITICAL
**Impact:** Screen reader users cannot navigate by landmarks

#### Current State
```tsx
// ❌ No landmark roles in Header.tsx
export default function Header() {
  return (
    <GlassView className="sticky top-[3px] z-[100]">
      {/* Navigation without role */}
      <View className="flex-row items-center">
        <HeaderNav />
        <HeaderActions />
      </View>
    </GlassView>
  );
}
```

#### Solution
```tsx
// ✅ Add semantic HTML and ARIA roles
export default function Header() {
  return (
    <header role="banner">
      <GlassView className="sticky top-[3px] z-[100]">
        <nav role="navigation" aria-label="Main navigation">
          <View className="flex-row items-center">
            <HeaderNav />
            <HeaderActions />
          </View>
        </nav>
      </GlassView>
    </header>
  );
}

// ✅ Add main landmark
export default function App() {
  return (
    <>
      <Header />
      <main id="main-content" role="main" aria-label="Main content">
        <Routes>
          {/* Routes */}
        </Routes>
      </main>
      <Footer />
    </>
  );
}

// ✅ Add footer landmark
export default function Footer() {
  return (
    <footer role="contentinfo">
      {/* Footer content */}
    </footer>
  );
}

// ✅ Add complementary landmarks for sidebars
export function GlassSidebar() {
  return (
    <aside role="complementary" aria-label="Navigation sidebar">
      {/* Sidebar content */}
    </aside>
  );
}
```

#### Files to Update
- `/web/src/components/layout/Header.tsx` - Add `<header role="banner">`
- `/web/src/components/layout/header/HeaderNav.tsx` - Add `<nav role="navigation">`
- `/web/src/components/layout/GlassSidebar.tsx` - Add `<aside role="complementary">`
- `/web/src/App.tsx` - Add `<main role="main">`
- `/web/src/components/layout/Footer.tsx` - Add `<footer role="contentinfo">`

#### Testing
```bash
# Screen reader landmark navigation:
# 1. NVDA: Insert+F7 (Elements List) → Landmarks
# 2. JAWS: Insert+Ctrl+; (landmark navigation)
# 3. VoiceOver: VO+U → Landmarks
# Should show: banner, navigation, main, complementary, contentinfo
```

---

### Issue #4: No Live Regions for Dynamic Content
**WCAG Criterion:** 4.1.3 Status Messages - Level AA
**Severity:** CRITICAL
**Impact:** Screen reader users miss loading states, errors, and status updates

#### Current State
```tsx
// ❌ Loading state not announced
{loading && <ActivityIndicator />}

// ❌ Error state not announced
{error && <Text className="text-red-500">{error}</Text>}
```

#### Solution
```tsx
// ✅ Add live region for loading states
{loading && (
  <div role="status" aria-live="polite" aria-atomic="true">
    <ActivityIndicator />
    <span className="sr-only">Loading content, please wait...</span>
  </div>
)}

// ✅ Add live region for error messages
{error && (
  <div role="alert" aria-live="assertive" aria-atomic="true">
    <Text className="text-red-500">{error}</Text>
  </div>
)}

// ✅ Add live region for success messages
{success && (
  <div role="status" aria-live="polite" aria-atomic="true">
    <Text className="text-green-500">{success}</Text>
  </div>
)}

// ✅ Custom hook for accessible status messages
export function useAccessibleStatus() {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'polite' | 'assertive'>('polite');

  const announce = (msg: string, priority: 'polite' | 'assertive' = 'polite') => {
    setMessage(msg);
    setType(priority);
    // Clear after announcement
    setTimeout(() => setMessage(null), 1000);
  };

  return {
    announce,
    StatusAnnouncer: () => message ? (
      <div
        role={type === 'assertive' ? 'alert' : 'status'}
        aria-live={type}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    ) : null,
  };
}

// Usage:
const { announce, StatusAnnouncer } = useAccessibleStatus();

// When data loads
announce('Content loaded successfully');

// When error occurs
announce('Error loading content. Please try again.', 'assertive');
```

#### Files to Update
- `/shared/components/ui/GlassButton.tsx` - Add live region for loading state
- `/shared/components/ui/GlassInput.tsx` - Add live region for error messages
- `/shared/components/ui/GlassModal.tsx` - Add live region for modal state
- `/web/src/hooks/useAccessibleStatus.ts` - Create new hook
- `/web/src/components/player/VideoPlayer.tsx` - Announce playback state changes

#### Testing
```bash
# With screen reader active:
# 1. NVDA: Should hear announcements automatically
# 2. JAWS: Should hear announcements automatically
# 3. VoiceOver: Should hear announcements automatically
# Test: Trigger loading state - should announce "Loading content"
```

---

## 🟡 MODERATE ISSUES (Should Fix Soon)

### Issue #5: Insufficient Focus Indicator Contrast
**WCAG Criterion:** 2.4.7 Focus Visible - Level AA
**Severity:** MODERATE
**Impact:** Keyboard users may not see where focus is

#### Current State
```tsx
// ⚠️ Focus indicator may not meet 3:1 contrast on glassmorphic backgrounds
const focusStyle = {
  borderColor: colors.primary,  // rgba(126, 34, 206, ...)
  borderWidth: 2,
};
```

#### Solution
```tsx
// ✅ High-contrast focus indicator
const focusStyle = {
  outline: '3px solid #c084fc',  // Purple-400 (high contrast)
  outlineOffset: '2px',
  borderRadius: '8px',
  // Additional shadow for visibility
  boxShadow: '0 0 0 4px rgba(192, 132, 252, 0.3)',
};

// ✅ TailwindCSS utility
className="focus:outline-purple-400 focus:outline-[3px] focus:outline-offset-2 focus:ring-4 focus:ring-purple-400/30"

// ✅ Update useTVFocus hook
export function useTVFocus() {
  const focusStyle = isFocused ? {
    borderWidth: 3,
    borderColor: '#c084fc',  // High-contrast purple
    shadowColor: '#c084fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  } : {};

  return { focusStyle };
}
```

#### Files to Update
- `/shared/hooks/useTVFocus.ts` - Update focus styles
- `/shared/components/ui/GlassButton.tsx` - Apply new focus styles
- `/shared/components/ui/GlassInput.tsx` - Apply new focus styles
- `/web/tailwind.config.cjs` - Add focus ring utilities

#### Testing
```bash
# 1. Tab through all interactive elements
# 2. Verify visible focus ring on all elements
# 3. Test against glassmorphic backgrounds
# 4. Check contrast ratio with Color Contrast Analyzer
```

---

### Issue #6: Missing HTML Lang Attribute Sync
**WCAG Criterion:** 3.1.1 Language of Page - Level A
**Severity:** MODERATE
**Impact:** Screen readers may use wrong pronunciation

#### Current State
```tsx
// ❌ HTML lang attribute not synced with i18next
<!DOCTYPE html>
<html lang="en">  <!-- Static, doesn't change -->
```

#### Solution
```tsx
// ✅ Add to App.tsx or main component
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { i18n } = useTranslation();

  // Sync HTML lang attribute with i18next
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir(); // LTR/RTL
  }, [i18n.language]);

  return (
    <BrowserRouter>
      {/* App content */}
    </BrowserRouter>
  );
}

// ✅ Ensure i18next config includes direction
// i18n/index.ts
i18n.use(initReactI18next).init({
  resources: {
    en: { dir: 'ltr' },
    he: { dir: 'rtl' },
    ar: { dir: 'rtl' },
  },
});
```

#### Files to Update
- `/web/src/App.tsx` - Add lang/dir sync effect
- `/web/index.html` - Set initial `lang="en"` (will be updated dynamically)

#### Testing
```bash
# 1. Open DevTools → Elements
# 2. Inspect <html> tag
# 3. Switch language to Hebrew → should see lang="he" dir="rtl"
# 4. Switch language to English → should see lang="en" dir="ltr"
```

---

### Issue #7: Small Button Touch Targets
**WCAG Criterion:** 2.5.5 Target Size - Level AAA
**Severity:** MODERATE (AAA criterion, not required but recommended)
**Impact:** Users with motor impairments struggle with small buttons

#### Current State
```tsx
// ⚠️ Small buttons below 44pt minimum
const sizeStyles = {
  sm: { paddingVertical: 8, paddingHorizontal: 16 },  // ~32pt height
};
```

#### Solution
```tsx
// ✅ Increase minimum button size
const sizeStyles = {
  sm: { paddingVertical: 12, paddingHorizontal: 20 },  // ~48pt height ✅
  md: { paddingVertical: 14, paddingHorizontal: 28 },  // ~56pt height ✅
  lg: { paddingVertical: 18, paddingHorizontal: 36 },  // ~72pt height ✅
};

// ✅ Add touch target padding for icon-only buttons
<TouchableOpacity
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}  // Expand hit area
  className="p-3"  // Minimum 48pt touch target
>
  <Icon size={24} />
</TouchableOpacity>
```

#### Files to Update
- `/shared/components/ui/GlassButton.tsx` - Update size styles
- All icon-only buttons - Add `hitSlop` prop

#### Testing
```bash
# 1. Test on mobile device (not simulator)
# 2. Verify all buttons can be easily tapped
# 3. Measure touch target sizes with DevTools
```

---

### Issue #8: No Reduced Motion Support
**WCAG Criterion:** 2.3.3 Animation from Interactions - Level AAA
**Severity:** MODERATE (AAA criterion, but important for accessibility)
**Impact:** Users with vestibular disorders may experience nausea/dizziness

#### Current State
```tsx
// ❌ Animations always play regardless of user preference
<Animated.View
  style={{
    transform: [{ scale: scaleAnim }]
  }}
/>
```

#### Solution
```tsx
// ✅ Add to global CSS
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

// ✅ Respect preference in React Native animations
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotion
    );

    return () => subscription.remove();
  }, []);

  return isReducedMotion;
}

// Usage:
const isReducedMotion = useReducedMotion();
const animationDuration = isReducedMotion ? 1 : 300;

Animated.timing(scaleAnim, {
  toValue: 1,
  duration: animationDuration,
  useNativeDriver: true,
}).start();
```

#### Files to Update
- `/shared/styles/globals.css` - Add `@media (prefers-reduced-motion)`
- `/shared/hooks/useReducedMotion.ts` - Create new hook
- All components with animations - Use `useReducedMotion` hook

#### Testing
```bash
# macOS: System Preferences → Accessibility → Display → Reduce motion
# Windows: Settings → Ease of Access → Display → Show animations
# iOS: Settings → Accessibility → Motion → Reduce Motion
# Android: Settings → Accessibility → Remove animations

# After enabling, animations should be instant (no transitions)
```

---

## 🟢 MINOR ISSUES (Nice to Have)

### Issue #9: Form Input Autocomplete Attributes
**WCAG Criterion:** 1.3.5 Identify Input Purpose - Level AA
**Severity:** MINOR
**Impact:** Browser autofill may not work correctly

#### Solution
```tsx
// ✅ Add autocomplete attributes
<GlassInput
  label="Email"
  autoComplete="email"
  inputMode="email"
  type="email"
/>

<GlassInput
  label="Password"
  autoComplete="current-password"
  secureTextEntry
/>

<GlassInput
  label="First Name"
  autoComplete="given-name"
/>

<GlassInput
  label="Last Name"
  autoComplete="family-name"
/>
```

---

### Issue #10: Missing Error Prevention for Critical Actions
**WCAG Criterion:** 3.3.4 Error Prevention - Level AA
**Severity:** MINOR
**Impact:** Users may accidentally trigger destructive actions

#### Solution
```tsx
// ✅ Add confirmation dialog for critical actions
const handleDelete = async () => {
  const confirmed = await showConfirmDialog({
    type: 'confirm',
    title: 'Delete Item?',
    message: 'This action cannot be undone.',
    buttons: [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => performDelete() },
    ],
  });
};

// ✅ Add undo mechanism for reversible actions
const handleArchive = async (item) => {
  await archiveItem(item);

  showToast({
    message: 'Item archived',
    action: {
      text: 'Undo',
      onPress: () => unarchiveItem(item),
    },
  });
};
```

---

## 📋 Quick Reference Checklist

### Before Deployment
- [ ] All text has 4.5:1 contrast ratio (7:1 for large text)
- [ ] All UI components have 3:1 contrast ratio
- [ ] Skip navigation link present and functional
- [ ] All pages have landmark roles (banner, main, navigation, contentinfo)
- [ ] All dynamic content uses `aria-live` regions
- [ ] Focus indicators visible on all interactive elements
- [ ] HTML lang attribute syncs with i18next
- [ ] Touch targets minimum 44x44pt (iOS) / 48x48dp (Android)
- [ ] `prefers-reduced-motion` supported
- [ ] All form inputs have labels
- [ ] Error messages are descriptive and linked to inputs
- [ ] Keyboard navigation works without mouse
- [ ] Screen reader testing completed (NVDA/JAWS/VoiceOver)
- [ ] RTL testing completed (Hebrew/Arabic)
- [ ] Mobile accessibility testing completed

### Automated Testing Commands
```bash
# Install testing tools
npm install --save-dev @axe-core/react pa11y lighthouse

# Run automated tests
npm run test:a11y

# Generate accessibility report
npm run lighthouse -- --only-categories=accessibility
```

---

## 📚 Resources

### Contrast Checking
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Color Contrast Analyzer: https://www.tpgi.com/color-contrast-checker/

### Screen Readers
- NVDA (Free): https://www.nvaccess.org/download/
- JAWS (Paid): https://www.freedomscientific.com/products/software/jaws/
- VoiceOver: Built into macOS/iOS

### Testing Tools
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
- Lighthouse: Built into Chrome DevTools

### Guidelines
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

---

**End of Remediation Guide**
