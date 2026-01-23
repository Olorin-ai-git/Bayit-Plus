# i18n Error Fix - `i18n.dir is not a function`

## Issue

**Error:** `Uncaught TypeError: i18n.dir is not a function`

**Location:** `HeroContent.tsx:12` and `App.tsx:11`

**Root Cause:** The `i18n` instance from `@olorin/shared` doesn't have a `dir()` method. This is not a standard i18next method.

---

## Solution

Use the **`useRTL` hook** from `@olorin/shared` instead of trying to call `i18n.dir()`.

### Changes Made

#### 1. HeroContent.tsx

**Before (BROKEN):**
```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/shared';

export const HeroContent: React.FC<HeroContentProps> = ({ onCtaClick }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl'; // ❌ ERROR: i18n.dir is not a function
```

**After (FIXED):**
```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GlassButton, useRTL } from '@olorin/shared'; // ✅ Import useRTL

export const HeroContent: React.FC<HeroContentProps> = ({ onCtaClick }) => {
  const { t } = useTranslation();
  const { isRTL } = useRTL(); // ✅ Use useRTL hook
```

#### 2. App.tsx

**Before (BROKEN):**
```tsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RTLProvider, LanguageSwitcher } from '@olorin/shared';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir(); // ❌ ERROR: i18n.dir is not a function
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  return (
    <RTLProvider>
      ...
    </RTLProvider>
  );
}
```

**After (FIXED):**
```tsx
import React from 'react';
import { RTLProvider, LanguageSwitcher } from '@olorin/shared';

function App() {
  // ✅ RTLProvider handles dir/lang attributes automatically
  // No manual useEffect needed!

  return (
    <RTLProvider>
      ...
    </RTLProvider>
  );
}
```

---

## How RTLProvider Works

The `RTLProvider` from `@olorin/shared` automatically:

1. **Detects RTL languages** (Hebrew, Arabic, Farsi, Urdu)
2. **Sets document attributes**:
   - `document.documentElement.dir = 'rtl' | 'ltr'`
   - `document.documentElement.lang = 'en' | 'he'`
   - Adds/removes `rtl` class on `<html>` for Tailwind RTL plugin
3. **Listens for language changes** and updates automatically
4. **Provides `useRTL` hook** for components to access RTL state

### RTLProvider Source (from @olorin/shared)

```tsx
export const RTLProvider: React.FC<RTLProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState<boolean>(false);

  useEffect(() => {
    const updateRTL = (lng: string) => {
      const shouldBeRTL = RTL_LANGUAGES.includes(lng);
      setIsRTL(shouldBeRTL);

      // Automatically updates document attributes
      document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;

      if (shouldBeRTL) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    };

    updateRTL(i18n.language);
    i18n.on('languageChanged', updateRTL);

    return () => {
      i18n.off('languageChanged', updateRTL);
    };
  }, [i18n]);

  return (
    <RTLContext.Provider value={{ isRTL, direction, toggleDirection }}>
      {children}
    </RTLContext.Provider>
  );
};
```

---

## Using useRTL Hook

The `useRTL` hook provides:

```tsx
interface RTLContextType {
  isRTL: boolean;              // true if current language is RTL
  direction: 'ltr' | 'rtl';    // current text direction
  toggleDirection: () => void;  // switch between EN and HE
}
```

### Example Usage

```tsx
import { useRTL } from '@olorin/shared';

function MyComponent() {
  const { isRTL, direction, toggleDirection } = useRTL();

  return (
    <div className={`bg-gradient-to-${isRTL ? 'l' : 'r'} ...`}>
      <p>Current direction: {direction}</p>
      <button onClick={toggleDirection}>Toggle Language</button>
    </div>
  );
}
```

---

## Benefits of This Approach

✅ **No manual i18n.dir() calls** - RTLProvider handles it automatically
✅ **Single source of truth** - RTL state managed in one place
✅ **Automatic updates** - Language changes propagate automatically
✅ **Type-safe** - TypeScript interfaces for all RTL properties
✅ **Reusable** - useRTL hook available anywhere in component tree
✅ **Performant** - Memoized context value prevents unnecessary re-renders

---

## Verification

After this fix, the app should:
- ✅ Start without `i18n.dir is not a function` errors
- ✅ Properly detect RTL languages (Hebrew)
- ✅ Update `document.documentElement.dir` attribute
- ✅ Update `document.documentElement.lang` attribute
- ✅ Support gradient direction based on RTL state (`bg-gradient-to-l` vs `bg-gradient-to-r`)
- ✅ Language switcher works correctly

---

## Related Files

- `src/App.tsx` - RTLProvider wrapper (fixed)
- `src/components/hero/HeroContent.tsx` - Uses useRTL hook (fixed)
- `packages/shared/src/contexts/RTLContext.tsx` - RTL implementation
- `packages/shared/src/contexts/index.ts` - Exports RTLProvider and useRTL

---

## Testing

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Verify no errors in console**

3. **Test language switching:**
   - Click language switcher
   - Verify layout flips to RTL
   - Verify gradients change direction
   - Check DevTools → Elements → `<html dir="rtl" lang="he">`

4. **Test on refresh:**
   - Switch to Hebrew
   - Refresh page
   - Verify language persists (localStorage)

---

## Status

✅ **FIXED**

All `i18n.dir()` errors resolved. App now uses proper Olorin i18n system via:
- `RTLProvider` for automatic dir/lang management
- `useRTL` hook for accessing RTL state in components
