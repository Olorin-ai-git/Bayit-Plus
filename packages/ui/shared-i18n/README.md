# @olorin/i18n - Unified Internationalization Library

Unified internationalization library for all Olorin.ai ecosystem platforms.

## Overview

@olorin/i18n provides:
- **10 Languages**: Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
- **Platform Support**: Web (React/Next.js), React Native (Mobile/TV/tvOS), Backend (Python)
- **Type-Safe**: TypeScript types with full type safety
- **RTL Support**: Built-in right-to-left language detection
- **Unified API**: Single source of truth for all translations

## Usage by Platform

### Web Applications (React/Next.js)

```typescript
import { initWebI18n, saveLanguageWeb } from '@olorin/i18n/web';
import { useTranslation } from 'react-i18next';

// In your App.tsx or main.tsx
useEffect(() => {
  initWebI18n();
}, []);

// In your components
function Component() {
  const { t } = useTranslation();
  return <div>{t('common.loading')}</div>; // "טוען..." in Hebrew
}
```

### React Native Applications (Mobile/TV/tvOS)

```typescript
import { initNativeI18n, saveLanguageNative } from '@olorin/i18n/native';
import { useTranslation } from 'react-i18next';

// In App.tsx
useEffect(() => {
  initNativeI18n();
}, []);

// In your components
function Component() {
  const { t } = useTranslation();
  return <Text>{t('common.loading')}</Text>;
}
```

### Backend (Python)

```python
from olorin_i18n import I18nService, I18nConfig
from app.core.config import settings

i18n = I18nService(config=settings.i18n)
text = i18n.get_translation("common.loading", "he")
```

## Migration from @bayit/shared-i18n

### Breaking Changes

- **Package Name**: `@bayit/shared-i18n` → `@olorin/i18n`
- **Storage Key**: `@bayit_language` → `@olorin_language`
- **Platform-specific Imports**: Use `/web` or `/native` subpaths

### Migration Steps

1. **Update package.json**:
   ```json
   {
     "dependencies": {
       "@olorin/i18n": "^1.0.0"
     }
   }
   ```

2. **Update imports**:
   ```typescript
   // Before
   import i18n, { saveLanguage, loadSavedLanguage } from '@bayit/shared-i18n';

   // After
   import i18n from '@olorin/i18n';
   import { initWebI18n, saveLanguageWeb } from '@olorin/i18n/web'; // for web
   import { initNativeI18n, saveLanguageNative } from '@olorin/i18n/native'; // for RN
   ```

3. **Update initialization**:
   ```typescript
   // Web
   import { setupWebDirectionListener } from '@olorin/i18n/web';

   useEffect(() => {
     initWebI18n();
     setupWebDirectionListener();
   }, []);

   // React Native
   import { initNativeI18n } from '@olorin/i18n/native';

   useEffect(() => {
     initNativeI18n();
   }, []);
   ```

## File Structure

```
shared/i18n/
├── package.json              # Updated to @olorin/i18n
├── index.ts                  # Core platform-agnostic i18n
├── types.ts                  # Type definitions (LanguageCode, LanguageInfo, etc.)
├── protocols.ts              # Protocol interfaces
├── web.ts                    # Web-specific utilities (localStorage)
├── native.ts                 # React Native utilities (AsyncStorage, I18nManager)
├── locales/                  # Translation files (10 languages)
├── README.md                 # This file
└── MIGRATION.md              # Detailed migration guide
```

## Supported Languages

| Code | Name | Native | RTL | Notes |
|------|------|--------|-----|-------|
| `he` | Hebrew | עברית | ✓ | 100% coverage |
| `en` | English | English | ✗ | 100% coverage |
| `es` | Spanish | Español | ✗ | 97% coverage |
| `zh` | Chinese | 中文 | ✗ | 55% coverage |
| `fr` | French | Français | ✗ | 27% coverage |
| `it` | Italian | Italiano | ✗ | 23% coverage |
| `hi` | Hindi | हिन्दी | ✗ | 19% coverage |
| `ta` | Tamil | தமிழ् | ✗ | 15% coverage |
| `bn` | Bengali | বাংলা | ✗ | 15% coverage |
| `ja` | Japanese | 日本語 | ✗ | 47% coverage |

## Type Safety

All language codes are type-safe using TypeScript:

```typescript
import type { LanguageCode } from '@olorin/i18n/types';
import { SUPPORTED_LANGUAGES } from '@olorin/i18n/types';

const lang: LanguageCode = 'he'; // ✓ OK
const invalid: LanguageCode = 'xx'; // ✗ Type error
```

## RTL Support

Automatic RTL handling:

```typescript
import { isRTL } from '@olorin/i18n';

if (isRTL()) {
  // Apply RTL styles
  document.dir = 'rtl';
} else {
  document.dir = 'ltr';
}
```

## Protocols

@olorin/i18n implements well-defined protocols for extensibility:

```typescript
interface TranslationProvider {
  getTranslation(key: string, defaultValue?: string): string;
  getLanguages(): LanguageInfo[];
  isRTL(): boolean;
}

interface LanguageSelector {
  getCurrentLanguage(): LanguageCode;
  changeLanguage(langCode: LanguageCode): Promise<void>;
  loadSavedLanguage(): Promise<void>;
  saveLanguage(langCode: LanguageCode): Promise<void>;
}
```

## Documentation

- **Web**: See `web.ts` JSDoc for web-specific utilities
- **React Native**: See `native.ts` JSDoc for React Native utilities
- **Backend**: See `/packages/python/olorin-i18n/README.md` for Python usage
- **Locales**: Translation files located in `locales/` directory

## Related Packages

- **Backend**: `olorin-i18n` (Python) - `/packages/python/olorin-i18n/`
- **Config**: `olorin-config` (Pydantic settings)
- **Shared Utils**: `shared/utils/contentLocalization.ts` - Content-specific localization

## Contributing

When adding new translations:
1. Update all 10 locale JSON files in `locales/`
2. Run type generation to update TypeScript types
3. Update coverage percentage in language metadata
4. Test on all platforms

## Version History

- **1.0.0** (2026-01-20): Unified i18n library for Olorin ecosystem
  - Renamed from @bayit/shared-i18n to @olorin/i18n
  - Added Python backend package (olorin-i18n)
  - Added platform-specific exports (/web, /native)
  - Added TypeScript types and protocols
  - Support for 10 languages across all platforms
