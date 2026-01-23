# Bayit+ Accessibility Quick Reference Checklist

**Date:** 2026-01-22
**Use:** Daily development reference for accessibility compliance

---

## 🚀 Quick Start

### Before Every Code Review
- [ ] All text meets 4.5:1 contrast ratio
- [ ] All interactive elements keyboard accessible
- [ ] All images have alt text
- [ ] Focus indicators visible
- [ ] No keyboard traps

---

## 📝 Component Development Checklist

### When Creating a New Button
```tsx
✅ DO:
<GlassButton
  title="Click Me"
  onPress={handlePress}
  variant="primary"
  size="md"  // Minimum: md (48pt height)
  accessibilityLabel="Descriptive action"
  accessibilityHint="What happens when pressed"
  disabled={isLoading}
  loading={isLoading}
/>

❌ DON'T:
<TouchableOpacity onPress={handlePress}>
  <Text>Click</Text>  // No accessibility props
</TouchableOpacity>
```

**Checklist:**
- [ ] Uses GlassButton component
- [ ] Has `accessibilityLabel`
- [ ] Has `accessibilityHint`
- [ ] Size is `md` or `lg` (not `sm` for critical actions)
- [ ] Loading state shows spinner
- [ ] Disabled state communicated via `accessibilityState`

---

### When Creating a New Form Input
```tsx
✅ DO:
<GlassInput
  label="Email Address"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  autoComplete="email"
  inputMode="email"
  keyboardType="email-address"
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email to sign in"
/>

{emailError && (
  <div role="alert" aria-live="assertive">
    <Text className="text-red-500">{emailError}</Text>
  </div>
)}

❌ DON'T:
<TextInput
  placeholder="Email"
  value={email}
  onChange={setEmail}
/>
{emailError && <Text>{emailError}</Text>}
```

**Checklist:**
- [ ] Uses GlassInput component
- [ ] Has visible label (not just placeholder)
- [ ] Has `autoComplete` attribute
- [ ] Has `inputMode` and `keyboardType`
- [ ] Error message uses `role="alert"` and `aria-live="assertive"`
- [ ] Error message linked to input (visually and programmatically)

---

### When Creating a New Modal/Dialog
```tsx
✅ DO:
<GlassModal
  visible={isOpen}
  type="confirm"
  title="Delete Item"
  message="Are you sure? This cannot be undone."
  buttons={[
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: handleDelete },
  ]}
  onClose={handleClose}
  dismissable={true}
/>

// Focus management
useEffect(() => {
  if (isOpen) {
    // Trap focus in modal
    modalRef.current?.focus();
  }
}, [isOpen]);

❌ DON'T:
<Modal visible={isOpen}>
  <View>
    <Text>Delete?</Text>
    <Button onPress={handleDelete} title="Yes" />
  </View>
</Modal>
```

**Checklist:**
- [ ] Uses GlassModal component
- [ ] Has descriptive title
- [ ] Has clear message
- [ ] Buttons have clear labels (not "OK"/"Yes")
- [ ] Focus trapped within modal when open
- [ ] Escape key closes modal (web)
- [ ] Backdrop dismisses modal (if `dismissable={true}`)
- [ ] Focus returns to trigger element on close

---

### When Creating Navigation
```tsx
✅ DO:
<header role="banner">
  <nav role="navigation" aria-label="Main navigation">
    <a href="#main-content" className="sr-only focus:not-sr-only">
      Skip to main content
    </a>

    <NavLink to="/" aria-current={isActive ? 'page' : undefined}>
      Home
    </NavLink>
    <NavLink to="/about">About</NavLink>
  </nav>
</header>

<main id="main-content" role="main">
  {/* Page content */}
</main>

❌ DON'T:
<View>
  <NavLink to="/">Home</NavLink>
  <NavLink to="/about">About</NavLink>
</View>

<View>
  {/* Page content */}
</View>
```

**Checklist:**
- [ ] Has skip navigation link
- [ ] Uses semantic HTML (`<header>`, `<nav>`, `<main>`)
- [ ] Has ARIA landmark roles
- [ ] Active link marked with `aria-current="page"`
- [ ] Navigation has descriptive `aria-label`

---

## 🎨 Color & Contrast Checklist

### Text Color Combinations
```tsx
✅ PASS (4.5:1+ contrast):
- text-white on bg-black (21:1) ✅
- text-white/95 on glass.bg (7.1:1) ✅
- text-purple-400 on bg-black (6.2:1) ✅
- text-red-500 on bg-black (5.3:1) ✅

❌ FAIL (<4.5:1 contrast):
- text-white/70 on glass.bg (1.9:1) ❌
- text-white/80 on glass.bg (2.5:1) ❌
- text-gray-500 on glass.bg (2.2:1) ❌
```

### UI Component Color Combinations
```tsx
✅ PASS (3:1+ contrast for UI elements):
- border-purple-700/90 on bg-black (3.8:1) ✅
- border-white/30 on bg-black (3.2:1) ✅

❌ FAIL (<3:1 contrast):
- border-purple-700/60 on bg-black (2.1:1) ❌
- border-white/10 on bg-black (1.3:1) ❌
```

### Quick Contrast Rules
- [ ] Body text: **4.5:1** minimum (7:1 ideal)
- [ ] Large text (18pt+): **3:1** minimum
- [ ] UI components (borders, icons): **3:1** minimum
- [ ] Focus indicators: **3:1** minimum
- [ ] Never use text opacity below **90%** on glass backgrounds

### Tools
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Color Contrast Analyzer: https://www.tpgi.com/color-contrast-checker/

---

## ⌨️ Keyboard Navigation Checklist

### Essential Keyboard Support
```tsx
✅ Keyboard-accessible:
- Tab: Navigate forward
- Shift+Tab: Navigate backward
- Enter/Space: Activate button
- Escape: Close modal/dropdown
- Arrow keys: Navigate within component

❌ Keyboard traps:
- Modal that can't be closed with Escape
- Focus stuck in infinite loop
- No way to navigate out of component
```

### Focus Management
```tsx
✅ DO:
// Trap focus in modal
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector('button');
    firstFocusable?.focus();
  }
}, [isOpen]);

// Return focus on close
const handleClose = () => {
  setIsOpen(false);
  triggerButtonRef.current?.focus();
};

❌ DON'T:
// Let focus escape modal
<Modal visible={isOpen}>
  <View>...</View>
</Modal>
```

**Checklist:**
- [ ] All interactive elements focusable (Tab key)
- [ ] Focus order follows visual order
- [ ] Focus visible on all elements (3:1 contrast)
- [ ] No keyboard traps
- [ ] Modals trap focus
- [ ] Focus returns to trigger on modal close
- [ ] Skip links work (jump to main content)

---

## 📱 Mobile Accessibility Checklist

### Touch Targets
```tsx
✅ DO:
<TouchableOpacity
  className="p-3"  // 48pt minimum
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  onPress={handlePress}
  accessibilityLabel="Delete item"
  accessibilityHint="Removes this item from your list"
>
  <Icon name="trash" size={24} />
</TouchableOpacity>

❌ DON'T:
<TouchableOpacity
  className="p-1"  // Too small (32pt)
  onPress={handlePress}
>
  <Icon name="trash" size={16} />
</TouchableOpacity>
```

**Checklist:**
- [ ] Minimum touch target: **44x44pt** (iOS) / **48x48dp** (Android)
- [ ] Use `hitSlop` to expand hit area for small icons
- [ ] Spacing between targets: **8pt minimum**
- [ ] Pinch-to-zoom **not disabled**
- [ ] Orientation support (portrait/landscape)

---

## 🔊 Screen Reader Checklist

### Accessibility Props
```tsx
✅ DO:
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Play video"
  accessibilityHint="Starts playback of the selected video"
  accessibilityState={{ disabled: isLoading }}
  accessible={true}
  onPress={handlePlay}
>
  <Icon name="play" />
</TouchableOpacity>

❌ DON'T:
<TouchableOpacity onPress={handlePlay}>
  <Icon name="play" />
</TouchableOpacity>
```

**Checklist:**
- [ ] All interactive elements have `accessibilityLabel`
- [ ] Complex actions have `accessibilityHint`
- [ ] Correct `accessibilityRole` set
- [ ] State changes communicated via `accessibilityState`
- [ ] Images have `accessibilityLabel` (or `aria-label` on web)
- [ ] Decorative images marked with `accessibilityElementsHidden={true}`

### Live Regions
```tsx
✅ DO:
{loading && (
  <div role="status" aria-live="polite" aria-atomic="true">
    <ActivityIndicator />
    <span className="sr-only">Loading content...</span>
  </div>
)}

{error && (
  <div role="alert" aria-live="assertive" aria-atomic="true">
    <Text>{error}</Text>
  </div>
)}

❌ DON'T:
{loading && <ActivityIndicator />}
{error && <Text>{error}</Text>}
```

**Checklist:**
- [ ] Loading states use `role="status"` and `aria-live="polite"`
- [ ] Error states use `role="alert"` and `aria-live="assertive"`
- [ ] Success messages use `role="status"` and `aria-live="polite"`
- [ ] Live regions have `aria-atomic="true"`

---

## 🌐 RTL (Right-to-Left) Checklist

### RTL Support
```tsx
✅ DO:
const { i18n } = useTranslation();
const isRTL = i18n.language === 'he' || i18n.language === 'ar';

<View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
  <Icon name="chevron-right" className={isRTL ? 'rotate-180' : ''} />
  <Text className={isRTL ? 'text-right' : 'text-left'}>
    {t('common.next')}
  </Text>
</View>

// Sync HTML lang and dir
useEffect(() => {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = i18n.dir();
}, [i18n.language]);

❌ DON'T:
<View className="flex-row">
  <Icon name="chevron-right" />
  <Text>Next</Text>
</View>
```

**Checklist:**
- [ ] Text alignment changes based on direction
- [ ] Flexbox direction reverses for RTL
- [ ] Icons mirror for RTL (chevrons, arrows)
- [ ] Margins/padding flip for RTL
- [ ] HTML `lang` and `dir` attributes set correctly

---

## 🎬 Animation Checklist

### Reduced Motion
```tsx
✅ DO:
const isReducedMotion = useReducedMotion();
const animationDuration = isReducedMotion ? 1 : 300;

Animated.timing(scaleAnim, {
  toValue: 1,
  duration: animationDuration,
  useNativeDriver: true,
}).start();

// CSS
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

❌ DON'T:
Animated.timing(scaleAnim, {
  toValue: 1,
  duration: 300,  // Always animates
  useNativeDriver: true,
}).start();
```

**Checklist:**
- [ ] Respect `prefers-reduced-motion` user preference
- [ ] No content flashes more than 3 times per second
- [ ] Parallax effects disabled for reduced motion
- [ ] Auto-playing videos have pause control

---

## 🧪 Testing Checklist

### Before Committing Code
- [ ] Run automated tests: `npm run test:a11y`
- [ ] Check with axe DevTools (0 violations)
- [ ] Tab through component (keyboard only)
- [ ] Test with screen reader (announce correctly?)
- [ ] Check color contrast (4.5:1 for text, 3:1 for UI)

### Before Deploying
- [ ] Full keyboard navigation test
- [ ] Screen reader test (NVDA/JAWS/VoiceOver)
- [ ] RTL test (Hebrew/Arabic)
- [ ] Mobile test (iOS VoiceOver, Android TalkBack)
- [ ] Color contrast verification (all states)
- [ ] Lighthouse accessibility score: 100

---

## 📚 Quick Reference Links

### Tools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/

### Guidelines
- **WCAG 2.1 Quick Ref:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Practices:** https://www.w3.org/WAI/ARIA/apg/

### Screen Readers
- **NVDA (Free):** https://www.nvaccess.org/download/
- **VoiceOver:** Built into macOS/iOS
- **TalkBack:** Built into Android

---

## ✅ Component Approval Checklist

### Before Merging PR
- [ ] All text meets 4.5:1 contrast
- [ ] All UI components meet 3:1 contrast
- [ ] All interactive elements keyboard accessible
- [ ] All images/icons have alt text or labels
- [ ] Focus indicators visible (3:1 contrast)
- [ ] Forms have labels and error handling
- [ ] Modals trap focus and dismiss correctly
- [ ] No keyboard traps
- [ ] Screen reader tested
- [ ] RTL tested (if multilingual)
- [ ] axe DevTools reports 0 violations
- [ ] Lighthouse accessibility score: 95+

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T DO THIS:
```tsx
// 1. Placeholder-only labels
<TextInput placeholder="Email" />

// 2. Click-only handlers
<div onClick={handleClick}>Click me</div>

// 3. Poor contrast
<Text className="text-white/50">Important text</Text>

// 4. Missing alt text
<Image src={url} />

// 5. Keyboard traps
<Modal visible={true} onRequestClose={() => {}}>

// 6. No focus management
<TouchableOpacity onPress={handlePress}>

// 7. Invisible focus indicators
className="outline-none focus:outline-none"

// 8. Auto-playing without control
<video autoPlay />
```

### ✅ DO THIS INSTEAD:
```tsx
// 1. Visible labels
<GlassInput label="Email Address" placeholder="you@example.com" />

// 2. Keyboard-accessible handlers
<TouchableOpacity onPress={handleClick} accessibilityLabel="Click me">

// 3. High contrast
<Text className="text-white/95">Important text</Text>

// 4. Descriptive alt text
<Image src={url} accessibilityLabel="User profile photo" />

// 5. Dismissable modals
<GlassModal visible={true} onClose={handleClose} dismissable={true}>

// 6. Focus management
<TouchableOpacity
  onPress={handlePress}
  onFocus={handleFocus}
  accessibilityLabel="..."
>

// 7. Visible focus indicators
className="focus:ring-4 focus:ring-purple-400 focus:outline-purple-400"

// 8. User-controlled playback
<video controls />
```

---

## 💡 Pro Tips

1. **Always use Glass components** instead of native elements
2. **Test with keyboard first** before using mouse
3. **Turn on screen reader** while developing
4. **Check contrast** before choosing colors
5. **Add skip links** to every page
6. **Use semantic HTML** whenever possible
7. **Test RTL** if app supports multiple languages
8. **Respect user preferences** (reduced motion, dark mode)
9. **Focus management** is critical for modals
10. **Automated tests catch ~30%** - manual testing is essential

---

## 🎯 Quick Wins

### 5-Minute Fixes
1. Add `accessibilityLabel` to all buttons
2. Increase text opacity from 70% to 95%
3. Add `role="alert"` to error messages
4. Add skip navigation link
5. Set HTML `lang` attribute

### 30-Minute Fixes
1. Add ARIA landmark roles to all pages
2. Implement focus trap in modals
3. Add live regions for status updates
4. Test keyboard navigation
5. Run axe DevTools and fix violations

---

**Last Updated:** 2026-01-22
**Maintained By:** UX Designer Agent
**Questions?** Check full audit report: `ACCESSIBILITY_AUDIT_REPORT.md`
