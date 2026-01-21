# Accessibility Implementation Guide

**Phase 9 - UX/Design Accessibility & Glass Architecture**

---

## Table of Contents

1. [Overview](#overview)
2. [Accessibility Standards](#accessibility-standards)
3. [Implementation Checklist](#implementation-checklist)
4. [Glass Component Accessibility](#glass-component-accessibility)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Screen Reader Support](#screen-reader-support)
7. [Color Contrast](#color-contrast)
8. [Testing Procedures](#testing-procedures)
9. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

BayitPlus aims for **WCAG 2.1 Level AA** compliance, ensuring accessibility for users with disabilities including:

- Vision impairments (blindness, color blindness, low vision)
- Hearing impairments (deafness, hard of hearing)
- Motor disabilities (limited dexterity, tremors)
- Cognitive disabilities (dyslexia, ADHD)
- Temporary disabilities (broken arm, eye surgery recovery)

### Target Platforms

- **iOS Mobile App**: VoiceOver screen reader, Dynamic Type
- **Web Interfaces**: JAWS, NVDA screen readers, keyboard-only navigation
- **TV App**: Siri remote keyboard mode, directional controls

---

## Accessibility Standards

### WCAG 2.1 Level AA Requirements

| Criterion | Priority | Status |
|-----------|----------|--------|
| 1.4.3 Contrast (Minimum) | A | ⏳ In Progress |
| 2.1.1 Keyboard | A | ⏳ In Progress |
| 2.1.2 No Keyboard Trap | A | ⏳ In Progress |
| 2.4.3 Focus Order | A | ⏳ In Progress |
| 2.4.7 Focus Visible | AA | ⏳ In Progress |
| 3.2.1 On Focus | A | ✅ Complete |
| 4.1.2 Name, Role, Value | A | ⏳ In Progress |
| 4.1.3 Status Messages | AA | ⏳ In Progress |

### Target Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **Contrast Ratio** | 4.5:1 (normal text) | ⏳ Review |
| **Keyboard Accessible** | 100% of interactive elements | ⏳ Implement |
| **Focus Indicators** | Visible on all interactive elements | ⏳ Implement |
| **Screen Reader Compatible** | 90% of UI elements | ⏳ Implement |
| **ARIA Labels** | All interactive elements | ⏳ Implement |

---

## Implementation Checklist

### Phase 9A: Accessibility Enhancements (iOS Mobile App)

#### Core Accessibility (5 hours)

- [ ] **Add ARIA Labels to All Interactive Elements**
  - [ ] VoiceCommandButton
  - [ ] VoiceSearchModal
  - [ ] VoiceStatusIndicator
  - [ ] VoiceResponseDisplay
  - [ ] VoiceSettings
  - [ ] VoiceCommandHistory
  - [ ] All navigation buttons
  - [ ] All form inputs

- [ ] **Add Accessibility Hints**
  - [ ] Describe action on button press
  - [ ] Explain purpose of each input field
  - [ ] Clarify error messages
  - [ ] Provide help text for complex features

- [ ] **Enable Dynamic Type Support**
  - [ ] Test with maximum text size (200%)
  - [ ] Ensure layouts adapt
  - [ ] Verify no text overflow
  - [ ] Check readability

- [ ] **Add Focus Indicators**
  - [ ] Visible outline on focused elements
  - [ ] Minimum 3px indicator width
  - [ ] High contrast focus color
  - [ ] Not just color-dependent

#### Voice Features Accessibility (3 hours)

- [ ] **VoiceCommandButton Accessibility**
  - [ ] Clear button label: "Start voice command"
  - [ ] Hint: "Double tap to start listening"
  - [ ] State changes announced: "Listening for command"
  - [ ] Status updates announced: "Command processed"
  - [ ] Error messages announced: "Microphone access denied"

- [ ] **VoiceSearchModal Accessibility**
  - [ ] Modal announcement: "Voice search dialog opened"
  - [ ] State indicators announced in real-time
  - [ ] Transcription updates announced
  - [ ] Suggestions read as list items
  - [ ] Response text clearly announced
  - [ ] Close button always accessible

- [ ] **Voice Status Indicator Accessibility**
  - [ ] Label: "Voice service status"
  - [ ] Status announced: "Ready", "Listening", "Processing"
  - [ ] Not relying on color alone
  - [ ] Text label always present

#### Performance & Memory (2 hours)

- [ ] **Optimize for Assistive Technology**
  - [ ] Reduce DOM complexity for screen readers
  - [ ] Minimize announcements per action
  - [ ] Cache accessibility attributes
  - [ ] Test with various screen readers

#### Glass Component Audit (3 hours)

- [ ] **Review Glass Component Accessibility**
  - [ ] [ ] GlassCard - interactive vs semantic
  - [ ] [ ] GlassButton - proper button semantics
  - [ ] [ ] GlassModal - focus trap and restoration
  - [ ] [ ] GlassInput - label associations
  - [ ] [ ] GlassAlert - role="alert" for announcements
  - [ ] [ ] GlassCheckbox - proper state handling
  - [ ] [ ] GlassRadio - group labeling
  - [ ] [ ] GlassSelect - keyboard support

### Phase 9B: Testing & Validation (2 hours)

- [ ] **VoiceOver Testing (iOS)**
  - [ ] Enable Settings → Accessibility → VoiceOver
  - [ ] Test navigation with swipe gestures
  - [ ] Verify all content announced
  - [ ] Check action labels clear
  - [ ] Test with common gestures
  - [ ] Verify reading order logical

- [ ] **Keyboard Navigation Testing**
  - [ ] Test Tab/Shift+Tab navigation
  - [ ] Verify focus order logical
  - [ ] Check no keyboard traps
  - [ ] Test Space/Enter on buttons
  - [ ] Verify form submission with keyboard
  - [ ] Test escape to close modals

- [ ] **Screen Reader Testing**
  - [ ] JAWS (Windows)
  - [ ] NVDA (Windows)
  - [ ] VoiceOver (Mac)
  - [ ] TalkBack (Android, if applicable)
  - [ ] Narrator (Windows)

- [ ] **Color Contrast Verification**
  - [ ] Use WebAIM Contrast Checker
  - [ ] Test all text on backgrounds
  - [ ] Check focus indicators
  - [ ] Verify error/success colors
  - [ ] Test colorblind simulation

### Phase 9C: Documentation (1 hour)

- [ ] **Create Accessibility Testing Guide**
- [ ] **Document Accessibility Patterns**
- [ ] **Create Component Accessibility Checklist**
- [ ] **Document Known Limitations**

---

## Glass Component Accessibility

### Current Status

Glass Components use Tailwind CSS and are built with accessibility in mind.

### Recommended Enhancements

#### GlassButton

**Current**:
```tsx
<GlassButton>
  Click me
</GlassButton>
```

**Enhanced**:
```tsx
<GlassButton
  aria-label="Open voice command modal"
  aria-describedby="voice-button-hint"
  accessible
  accessibilityHint="Double tap to start listening for voice commands"
  onPress={handleOpenVoice}
>
  <Microphone size={20} />
</GlassButton>
<Text id="voice-button-hint" hidden>
  Use voice to search and control playback
</Text>
```

#### GlassModal

**Ensure**:
- Modal announced as dialog
- Focus trapped inside modal
- Escape key closes modal
- Focus restored on close
- Title associated with modal

```tsx
<GlassModal
  accessible
  accessibilityRole="dialog"
  accessibilityLabel="Voice Search Dialog"
  isVisible={isOpen}
>
  <Text accessibilityRole="header">Voice Search</Text>
  {/* Content */}
</GlassModal>
```

#### GlassInput

**Ensure**:
- Label associated with input
- Placeholder not substitute for label
- Error messages announced
- Input type correct (email, password, etc.)

```tsx
<Text accessibilityLabel="Search query">Search</Text>
<GlassInput
  aria-label="Search query"
  aria-describedby="search-error"
  placeholder="What do you want to watch?"
  value={query}
  onChangeText={setQuery}
/>
{error && (
  <Text id="search-error" role="alert" style={{color: 'red'}}>
    {error}
  </Text>
)}
```

#### GlassCard

**Ensure**:
- If interactive, use Button component
- Provide semantic role
- Add appropriate ARIA labels

```tsx
<GlassCard
  accessible
  accessibilityRole={onPress ? 'button' : 'article'}
  accessibilityLabel="Featured movie: Fauda"
  onPress={handlePress}
>
  {/* Content */}
</GlassCard>
```

---

## Keyboard Navigation

### Tab Order Strategy

**Priority Order**:
1. Skip to main content link
2. Navigation elements (menu, search)
3. Main content interactive elements
4. Footer links
5. Secondary controls

### Implementation

```tsx
// Define tabIndex explicitly
<button tabIndex={0}>Primary Action</button>
<button tabIndex={1}>Secondary Action</button>

// For React Native, use accessible prop
<TouchableOpacity accessible={true}>
  {/* Content */}
</TouchableOpacity>

// For complex modals, manage focus
useEffect(() => {
  firstButtonRef.current?.focus();
}, [isModalOpen]);
```

### Testing Checklist

- [ ] Tab moves forward through elements
- [ ] Shift+Tab moves backward
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No keyboard traps (easy to exit from any element)
- [ ] Skip links work (if applicable)
- [ ] Focus always visible
- [ ] Modal focus trapped while open

---

## Screen Reader Support

### Minimum Required Attributes

Every interactive element needs:

1. **Accessible Name** (what is it?)
   ```
   aria-label="Start voice command"
   // or
   <label>Start Voice Command</label>
   ```

2. **Role** (what type of element?)
   ```
   role="button" // or native <button>
   role="alert" // for status messages
   role="search" // for search areas
   ```

3. **State** (what state is it in?)
   ```
   aria-pressed="true" // toggle button state
   aria-expanded="false" // collapsible state
   aria-checked="true" // checkbox state
   ```

4. **Description** (additional context?)
   ```
   aria-describedby="help-text"
   ```

### Common Announcements

Screen readers will announce these automatically:

| Element | Announcement |
|---------|--------------|
| `<button>` | "Button. [Label]. Double-tap to activate" |
| `<input>` | "[Label]. Editable text field" |
| `<select>` | "[Label]. Popup button" |
| `role="alert"` | "[Message]" (immediately announced) |
| Modal | "Dialog opened. [Title]" |

### Testing with Screen Readers

**iOS VoiceOver**:
```
1. Go to Settings → Accessibility → VoiceOver → On
2. Swipe right → Next element
3. Swipe left → Previous element
4. Swipe up/down → Read entire screen
5. Double-tap → Activate
6. Two-finger triple-tap → Read all
```

**Windows NVDA**:
```
Tab → Next element
Shift+Tab → Previous element
Arrow keys → Navigate within element
Enter/Space → Activate button
Alt+F4 → Close window
Insert+H → Help (while in NVDA)
```

---

## Color Contrast

### Requirements

| Text Type | Minimum Ratio | AA Standard |
|-----------|---------------|-------------|
| **Normal text** | 4.5:1 | 4.5:1 |
| **Large text** (18pt+) | 3:1 | 3:1 |
| **UI components** | 3:1 | 3:1 |
| **Focus indicator** | 3:1 | 3:1 |

### BayitPlus Dark Theme Colors

**Approved Combinations**:

| Background | Text | Ratio | Status |
|-----------|------|-------|--------|
| #0F172A (dark) | #F1F5F9 (light) | 14.5:1 | ✅ Excellent |
| #1E293B (gray) | #F1F5F9 (light) | 10.8:1 | ✅ Excellent |
| #334155 (gray) | #E2E8F0 (lighter) | 7.2:1 | ✅ Good |
| #3B82F6 (blue) | #FFFFFF (white) | 5.6:1 | ✅ Good |
| #10B981 (green) | #FFFFFF (white) | 4.5:1 | ✅ Minimum |

### Colors to Avoid

❌ Dark gray (#475569) on dark background (#1E293B) = 2.1:1 (FAILS)
❌ Light gray (#CBD5E1) on light gray (#E2E8F0) = 1.5:1 (FAILS)

### Testing Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colorbind](https://github.com/skechan/colorbind) - Simulate colorblindness
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

---

## Testing Procedures

### Phase 9 Testing Timeline

#### 1. Automated Testing (30 min)

```bash
# Install accessibility linter
npm install --save-dev eslint-plugin-jsx-a11y

# Run checks
npm run lint -- --ext .tsx --plugin jsx-a11y
```

#### 2. Manual Testing with VoiceOver (60 min)

**Test Script**:
1. Enable VoiceOver
2. Navigate home screen entirely using swipes
3. Activate voice search
4. Say a command
5. Hear response
6. Disable voice feature
7. Verify all elements still accessible

#### 3. Color Contrast Verification (30 min)

```bash
# Use WebAIM contrast checker for each color pair
# Test in both light and dark modes
# Verify colorblind simulator
```

#### 4. Keyboard Navigation Testing (30 min)

Test all of:
- Home Screen Tab navigation
- Search Screen Tab + Enter flow
- Voice Search Modal Tab order
- Settings Dialog Tab trap test
- Video Player Controls keyboard
- Settings form keyboard submission

#### 5. Screen Reader Testing (60 min)

Test with:
- VoiceOver (iOS) - 30 min
- JAWS (Windows, if available) - 15 min
- NVDA (Windows, if available) - 15 min

---

## Common Issues & Solutions

### Issue 1: Text Not Announced by Screen Reader

**Cause**: Element not properly labeled
**Solution**:
```tsx
// ❌ Bad - No label
<button>🎤</button>

// ✅ Good - Explicit label
<button aria-label="Start voice command">🎤</button>

// ✅ Also good - Text label
<button>
  <Icon /> Start Voice
</button>
```

### Issue 2: Keyboard Focus Not Visible

**Cause**: CSS removes focus outline
**Solution**:
```tsx
// ❌ Bad
button {
  outline: none; /* DON'T DO THIS */
}

// ✅ Good
button:focus-visible {
  outline: 3px solid #3B82F6;
  outline-offset: 2px;
}
```

### Issue 3: Modal Focus Escapes Modal

**Cause**: Focus not properly trapped
**Solution**:
```tsx
useEffect(() => {
  if (isModalOpen) {
    // Store previous focus
    const previousFocus = document.activeElement;

    // Move focus to modal
    firstButtonRef.current?.focus();

    return () => {
      // Restore focus when modal closes
      (previousFocus as HTMLElement).focus();
    };
  }
}, [isModalOpen]);
```

### Issue 4: Color Combinations Fail Contrast Check

**Cause**: Insufficient color contrast
**Solution**: Use approved color combinations above, or:
```tsx
// ❌ Bad - 2.1:1 ratio
<Text style={{ color: '#475569', backgroundColor: '#1E293B' }}>
  Insufficient contrast
</Text>

// ✅ Good - 10.8:1 ratio
<Text style={{ color: '#F1F5F9', backgroundColor: '#1E293B' }}>
  Proper contrast
</Text>
```

### Issue 5: Dynamic Content Not Announced

**Cause**: Screen reader doesn't know content changed
**Solution**:
```tsx
// Use role="alert" for important updates
<Text
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  Command processed successfully
</Text>

// For status indicators
<Text aria-live="polite" aria-label="Voice service status">
  {stage === 'listening' ? 'Listening...' : 'Ready'}
</Text>
```

---

## Glass Library Architecture Decision

### Current Status

The project uses `@bayit/shared-components` for Glass UI components.

### Option A: Rename to `@bayit/glass` (Recommended)

**Pros**:
- Clear branding as "Glass" design system
- Better market positioning
- Short, memorable npm package name
- Aligns with glassmorphism aesthetic

**Cons**:
- Minor refactoring effort (3-4 hours)
- All imports need updating
- Package rename on npm

**Implementation** (estimated 3-4 hours):
```bash
# 1. Rename npm package
npm unpublish @bayit/shared-components
npm publish as @bayit/glass

# 2. Update all imports
# Search/replace across codebase:
# @bayit/shared-components → @bayit/glass

# 3. Update documentation
# package.json in all packages
# README and setup guides
```

### Option B: Keep Current Name + Migrate to Tailwind

**Pros**:
- More flexible styling
- Broader appeal to developers
- More customization options

**Cons**:
- Very large refactoring (1-2 weeks)
- Removes established component library
- More onboarding complexity
- Delays production launch

**Not Recommended**: Given production deadline, this option would delay launch significantly.

### Recommendation

**→ Option A: Rename to `@bayit/glass`**

Glass is already glassmorphic in design. Renaming to `@bayit/glass` makes this clear and creates strong branding. This can be done quickly (3-4 hours) and doesn't impact functionality.

---

## Accessibility Checklist Summary

### Before Production Launch

- [ ] All interactive elements have accessible names
- [ ] Keyboard navigation works completely
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible on all elements
- [ ] Screen reader tested on iOS VoiceOver
- [ ] No keyboard traps
- [ ] Modal focus properly managed
- [ ] Status messages announced
- [ ] Error messages announced and clear
- [ ] Dynamic content announcements work
- [ ] Voice features fully accessible
- [ ] Settings accessible to all users
- [ ] No reliance on color alone for information

### Sign-Off Criteria

✅ WCAG 2.1 Level AA compliance verified
✅ VoiceOver testing successful
✅ Keyboard navigation complete
✅ Color contrast verified
✅ No accessibility blockers

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Accessibility by Google](https://www.udacity.com/course/web-accessibility--ud891)
- [A11y Guidelines](https://www.a11y-101.com)
- [React Accessibility](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

---

**Phase 9 Status**: Accessibility Guide Complete ✅
**Next**: Phase 10 - Documentation

---

*Last Updated*: January 21, 2026
*Version*: 1.0
*Status*: Ready for Implementation
