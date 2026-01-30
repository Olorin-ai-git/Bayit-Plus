# Internationalization (i18n) Complete Guide

**Library:** `@olorin/shared-i18n`
**Supported Languages:** 10 (Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese)
**Last Updated:** 2026-01-30

## Overview

Bayit+ supports 10 languages with full internationalization across all platforms (Web, iOS, Android, tvOS). The system uses `i18next` with platform-specific adapters for storage and configuration.

### Supported Languages

| Language | Code | Direction | Status |
|----------|------|-----------|--------|
| **Hebrew** | `he` | RTL | Primary ✅ |
| **English** | `en` | LTR | Primary ✅ |
| **Spanish** | `es` | LTR | Complete ✅ |
| **Chinese (Simplified)** | `zh` | LTR | Complete ✅ |
| **French** | `fr` | LTR | Complete ✅ |
| **Italian** | `it` | LTR | Complete ✅ |
| **Hindi** | `hi` | LTR | Complete ✅ |
| **Tamil** | `ta` | LTR | Complete ✅ |
| **Bengali** | `bn` | LTR | Complete ✅ |
| **Japanese** | `ja` | LTR | Complete ✅ |

---

## Architecture

### Package Structure

```
olorin-core/packages/shared-i18n/
├── src/
│   ├── index.ts          # Main export
│   ├── web.ts            # Web platform config
│   ├── native.ts         # React Native config
│   └── config.ts         # Shared configuration
├── locales/              # Translation files
│   ├── en/
│   │   └── translation.json
│   ├── he/
│   │   └── translation.json
│   ├── es/
│   │   └── translation.json
│   └── ... (10 languages)
└── package.json
```

### Platform Variants

**Web (React):**
- Uses `localStorage` for persistence
- Browser language detection
- `react-i18next` integration

**Mobile (React Native iOS/Android):**
- Uses `AsyncStorage` for persistence
- Device language detection
- Platform-specific date/time formatting

**tvOS (React Native for TV):**
- Same as Mobile
- TV-optimized language selection UI

---

## Installation & Setup

### Web Platform

```typescript
// app/main.tsx
import i18n from '@olorin/shared-i18n';
import { initWebI18n } from '@olorin/shared-i18n/web';

// Initialize i18n
initWebI18n();

// Use with React
import { I18nextProvider } from 'react-i18next';

<I18nextProvider i18n={i18n}>
  <App />
</I18nextProvider>
```

### Mobile Platform (iOS/Android)

```typescript
// app/index.tsx
import i18n from '@olorin/shared-i18n';
import { initNativeI18n } from '@olorin/shared-i18n/native';

// Initialize i18n
await initNativeI18n();

// Use with React Native
<App />
```

### tvOS Platform

```typescript
// Same as Mobile
import { initNativeI18n } from '@olorin/shared-i18n/native';

await initNativeI18n();
```

---

## Usage

### Basic Translation

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
}
```

### Translation with Variables

```typescript
const { t } = useTranslation();

// Translation file: "greeting": "Hello, {{name}}!"
<Text>{t('common.greeting', { name: 'John' })}</Text>
// Output: "Hello, John!"
```

### Pluralization

```typescript
const { t } = useTranslation();

// Translation file:
// "items": "{{count}} item",
// "items_plural": "{{count}} items"

<Text>{t('common.items', { count: 1 })}</Text>
// Output: "1 item"

<Text>{t('common.items', { count: 5 })}</Text>
// Output: "5 items"
```

### Date/Time Formatting

```typescript
import { formatDate, formatTime } from '@olorin/shared-i18n';

const date = new Date('2026-01-30T12:30:00Z');

// Format date according to current language
const formattedDate = formatDate(date);
// en: "January 30, 2026"
// he: "30 בינואר 2026"
// es: "30 de enero de 2026"

// Format time
const formattedTime = formatTime(date);
// en: "12:30 PM"
// he: "12:30"
// es: "12:30"
```

### Number Formatting

```typescript
import { formatNumber, formatCurrency } from '@olorin/shared-i18n';

// Format number with locale
formatNumber(1234567.89);
// en: "1,234,567.89"
// fr: "1 234 567,89"

// Format currency
formatCurrency(99.99, 'USD');
// en: "$99.99"
// es: "99,99 US$"
```

---

## Language Switching

### Programmatic Language Change

```typescript
import i18n from '@olorin/shared-i18n';

// Change language
await i18n.changeLanguage('es');

// Get current language
const currentLang = i18n.language; // 'es'
```

### Language Selector Component

```typescript
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/glass';

function LanguageSelector() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  return (
    <div className="language-selector">
      {languages.map(lang => (
        <GlassButton
          key={lang.code}
          variant={i18n.language === lang.code ? 'primary' : 'secondary'}
          onPress={() => i18n.changeLanguage(lang.code)}
        >
          {lang.flag} {lang.name}
        </GlassButton>
      ))}
    </div>
  );
}
```

---

## Translation File Structure

### Namespace Organization

```json
{
  "common": {
    "welcome": "Welcome",
    "description": "Stream Israeli content",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "navigation": {
    "home": "Home",
    "movies": "Movies",
    "series": "Series",
    "podcasts": "Podcasts"
  },
  "auth": {
    "login": "Log In",
    "signup": "Sign Up",
    "logout": "Log Out",
    "forgotPassword": "Forgot Password?"
  },
  "content": {
    "play": "Play",
    "pause": "Pause",
    "addToWatchlist": "Add to Watchlist",
    "remove": "Remove"
  }
}
```

### Nested Keys

```json
{
  "settings": {
    "profile": {
      "title": "Profile Settings",
      "name": "Name",
      "email": "Email",
      "save": "Save Changes"
    },
    "notifications": {
      "title": "Notification Settings",
      "email": "Email Notifications",
      "push": "Push Notifications"
    }
  }
}
```

**Usage:**
```typescript
t('settings.profile.title') // "Profile Settings"
t('settings.notifications.email') // "Email Notifications"
```

---

## RTL (Right-to-Left) Support

### Detecting RTL

```typescript
import { isRTL } from '@olorin/shared-i18n';

const rtl = isRTL(i18n.language);
// true for Hebrew ('he'), Arabic ('ar')
// false for English ('en'), Spanish ('es')
```

### Applying RTL Styles

**Web:**
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  const direction = i18n.dir(); // 'ltr' or 'rtl'

  return (
    <div dir={direction}>
      <h1>{t('common.title')}</h1>
    </div>
  );
}
```

**React Native:**
```typescript
import { I18nManager } from 'react-native';

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Restart required after changing RTL
```

### RTL-Aware Styling

```typescript
// Tailwind CSS (Web)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Content
</div>

// StyleSheet (Mobile)
const styles = StyleSheet.create({
  container: {
    marginLeft: I18nManager.isRTL ? 0 : 16,
    marginRight: I18nManager.isRTL ? 16 : 0,
  },
});
```

---

## Adding New Languages

### Step 1: Add Translation Files

Create translation file:
```bash
mkdir -p locales/new-lang
touch locales/new-lang/translation.json
```

**Example: `locales/ar/translation.json` (Arabic)**
```json
{
  "common": {
    "welcome": "مرحبا",
    "description": "بث المحتوى الإسرائيلي"
  }
}
```

### Step 2: Update Configuration

```typescript
// shared-i18n/src/config.ts
export const SUPPORTED_LANGUAGES = [
  'he', 'en', 'es', 'zh', 'fr', 'it',
  'hi', 'ta', 'bn', 'ja',
  'ar'  // Add new language
];

export const RTL_LANGUAGES = ['he', 'ar'];
```

### Step 3: Add Language Metadata

```typescript
// Add to language selector
const languages = [
  // ...existing
  { code: 'ar', name: 'العربية', flag: '🇸🇦', direction: 'rtl' }
];
```

### Step 4: Test Translation

```bash
# Run i18n tests
npm test -- i18n

# Manual testing
i18n.changeLanguage('ar');
```

---

## Translation Management

### Translation Keys Naming Convention

**Format:** `namespace.category.key`

**Examples:**
```
common.button.save
common.button.cancel
auth.login.title
auth.login.emailPlaceholder
content.movie.play
content.series.addToWatchlist
```

**Guidelines:**
- Use camelCase for keys
- Keep keys descriptive but concise
- Group related keys under common namespace
- Avoid deep nesting (max 3 levels)

### Missing Translations

**Fallback Behavior:**

1. Use English (en) as fallback
2. Show translation key if no fallback
3. Log warning in development

```typescript
// With fallback
t('missing.key') // Falls back to English

// Development warning:
// "Translation key 'missing.key' not found for language 'es'"
```

**Detecting Missing Keys:**

```typescript
// Enable missing key handler (development only)
i18n.on('missingKey', (lngs, namespace, key) => {
  console.warn(`Missing translation: ${namespace}:${key} for ${lngs}`);
});
```

---

## Best Practices

### DO ✅

- **Externalize all user-facing text** - No hardcoded strings
- **Use descriptive keys** - `common.button.save` not `btn1`
- **Include context** - Helps translators understand usage
- **Test all languages** - Verify translations display correctly
- **Support RTL** - Test with Hebrew to verify RTL support
- **Use pluralization** - Handle singular/plural correctly
- **Format dates/numbers** - Use locale-aware formatting
- **Keep translations synced** - All languages complete

### DON'T ❌

- **Don't hardcode text** - Always use `t()` function
- **Don't concatenate translations** - Use variables instead
- **Don't assume text length** - Translations vary in length
- **Don't use images with text** - Doesn't translate
- **Don't skip RTL testing** - Hebrew users need RTL
- **Don't use machine translation only** - Review by native speakers
- **Don't forget accessibility** - ARIA labels need translation

---

## Common Issues

### Issue: Translations Not Loading

**Solution:**
```typescript
// Check i18n initialization
console.log('i18n initialized:', i18n.isInitialized);
console.log('Current language:', i18n.language);
console.log('Available languages:', i18n.languages);

// Manually load translations
import translation from './locales/en/translation.json';
i18n.addResourceBundle('en', 'translation', translation);
```

### Issue: RTL Not Working

**Solution:**
```typescript
// Verify RTL detection
console.log('Direction:', i18n.dir());
console.log('Is RTL:', I18nManager.isRTL); // React Native

// Force RTL (React Native)
I18nManager.forceRTL(true);
RNRestart.Restart(); // Requires app restart
```

### Issue: Date Formatting Incorrect

**Solution:**
```typescript
// Use locale-aware date formatting
import { format } from 'date-fns';
import { he, enUS, es } from 'date-fns/locale';

const locales = { he, en: enUS, es };

format(date, 'PPP', { locale: locales[i18n.language] });
```

---

## Testing

### Unit Testing Translations

```typescript
import i18n from '@olorin/shared-i18n';

describe('i18n', () => {
  beforeAll(async () => {
    await i18n.init();
  });

  it('translates common keys', () => {
    expect(i18n.t('common.welcome')).toBe('Welcome');
  });

  it('handles pluralization', () => {
    expect(i18n.t('common.items', { count: 1 })).toBe('1 item');
    expect(i18n.t('common.items', { count: 5 })).toBe('5 items');
  });

  it('supports RTL languages', () => {
    i18n.changeLanguage('he');
    expect(i18n.dir()).toBe('rtl');

    i18n.changeLanguage('en');
    expect(i18n.dir()).toBe('ltr');
  });
});
```

### E2E Testing

```typescript
// Playwright (Web)
test('switches language to Spanish', async ({ page }) => {
  await page.goto('/');

  // Open language selector
  await page.click('[data-testid="language-button"]');

  // Select Spanish
  await page.click('[data-testid="lang-es"]');

  // Verify translation
  await expect(page.locator('h1')).toHaveText('Bienvenido');
});

// Detox (Mobile)
it('should switch language to Hebrew', async () => {
  // Open settings
  await element(by.id('settings-button')).tap();

  // Select language
  await element(by.id('language-selector')).tap();
  await element(by.id('lang-he')).tap();

  // Verify RTL
  await expect(element(by.id('home-screen'))).toHaveValue('rtl');
});
```

---

## Related Documents

- [Web Development Guide](WEB_DEVELOPMENT_GUIDE.md)
- [Mobile Development Guide](MOBILE_DEVELOPMENT_GUIDE.md)
- [tvOS Development Guide](TVOS_DEVELOPMENT_GUIDE.md)
- [Accessibility Guide](ACCESSIBILITY_GUIDE.md)
- [Shared Components Reference](../technical/SHARED_COMPONENTS_REFERENCE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Localization Team
**Next Review:** 2026-04-30
