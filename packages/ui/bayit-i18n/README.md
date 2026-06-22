# @bayit/i18n

**Bayit+ Platform-Specific Internationalization**

This package contains 8 Bayit+-exclusive translation namespaces that complement the 74 core namespaces from `@olorin/shared-i18n`.

## Architecture

```
@olorin/shared-i18n (74 keys)  +  @bayit/i18n (8 keys)
        ↓                                ↓
    Core translations           Platform translations
        ↓                                ↓
        └────────────┬───────────────────┘
                     ↓
            Runtime merge at initialization
                     ↓
         Single i18n instance (82 keys total)
```

## Bayit+-Specific Keys

| Namespace | Description | Example Keys |
|-----------|-------------|--------------|
| `auth` | Authentication flows | login, logout, signup, verify |
| `channelChat` | Live TV channel chat | send, users, typing |
| `email` | Email templates | welcome, verify, reset |
| `greeting` | Time-based greetings | morning, afternoon, evening |
| `location` | Geographic content | cities, regions, timezone |
| `payment` | Payment flows | checkout, billing, invoice |
| `portal` | Partner portal B2B | dashboard, analytics, reports |
| `uploads` | Content uploads | select, progress, complete |

## Installation

```bash
npm install @bayit/i18n @olorin/shared-i18n i18next react-i18next
```

## Usage

### Web Platform

```typescript
import { initBayitI18nWeb } from '@bayit/i18n/web';

// Initialize at app startup
const i18n = await initBayitI18nWeb();

// Use in components
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Core translation from @olorin/shared-i18n */}
      <h1>{t('common.welcome')}</h1>

      {/* Platform translation from @bayit/i18n */}
      <button>{t('auth.login')}</button>
    </div>
  );
}
```

### React Native (iOS/Android/tvOS)

```typescript
import { initBayitI18nNative } from '@bayit/i18n/native';

// Initialize at app startup
const i18n = await initBayitI18nNative();

// Use in components
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <View>
      {/* Core translation */}
      <Text>{t('common.welcome')}</Text>

      {/* Platform translation */}
      <Button title={t('auth.login')} />
    </View>
  );
}
```

## Language Support

10 languages supported:
- English (en)
- Hebrew (he) - RTL
- Spanish (es)
- Chinese (zh)
- French (fr)
- Italian (it)
- Hindi (hi)
- Tamil (ta)
- Bengali (bn)
- Japanese (ja)

## API Reference

### Core Exports

```typescript
import {
  getBayitTranslations,  // Get translations for a language
  bayitResources,        // i18next-formatted resources
  supportedLanguages,    // Array of BayitLanguage
  languageNames,         // Language metadata
} from '@bayit/i18n';
```

### Web Platform

```typescript
import {
  initBayitI18nWeb,      // Initialize merged i18n
  saveLanguageWeb,       // Persist language to localStorage
  loadLanguageWeb,       // Load language from localStorage
} from '@bayit/i18n/web';
```

### React Native Platform

```typescript
import {
  initBayitI18nNative,   // Initialize merged i18n
  saveLanguageNative,    // Persist language to AsyncStorage
  loadLanguageNative,    // Load language from AsyncStorage
} from '@bayit/i18n/native';
```

## Design Principles

1. **Domain Separation**: Core vs platform translations
2. **Runtime Merging**: Single i18n instance, no component changes
3. **Namespace Isolation**: No key conflicts possible
4. **Lazy Loading**: Import only needed platforms
5. **Persistence**: localStorage (web) / AsyncStorage (native)

## Migration Guide

### From Legacy `shared/i18n`

```diff
- import i18n from '../shared/i18n';
+ import { initBayitI18nWeb } from '@bayit/i18n/web';
+ const i18n = await initBayitI18nWeb();
```

### From Direct `@olorin/shared-i18n`

```diff
- import i18n from '@olorin/shared-i18n';
+ import { initBayitI18nWeb } from '@bayit/i18n/web';
+ const i18n = await initBayitI18nWeb();
```

Components using `useTranslation()` require no changes.

## Development

```bash
# Build package
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Clean
npm run clean
```

## Version History

- **1.0.0**: Initial release with 8 platform-specific namespaces
