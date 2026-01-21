# @cvplus/i18n

Comprehensive internationalization module for CVPlus, providing enterprise-grade multi-language support with professional terminology management, RTL support, and advanced translation features.

## Features

- 🌍 **Multi-language Support**: 10+ languages including RTL support for Arabic
- 🔧 **Professional Terminology**: Industry-specific translations for CV/resume content
- ⚡ **Performance Optimized**: Smart caching, lazy loading, and bundle optimization
- 🎨 **React Integration**: Hooks, components, and providers for seamless React integration
- 📱 **RTL Support**: Complete right-to-left language support with automatic layout mirroring
- 🔤 **Advanced Formatting**: Locale-aware date, number, currency, and phone formatting
- 🎯 **Type Safety**: Full TypeScript support with auto-completion
- 🧪 **Developer Tools**: Key extraction, validation, and debugging utilities
- 📊 **Analytics Ready**: Translation usage tracking and performance metrics
- 🔍 **SEO Optimized**: Multi-language SEO support with hreflang management

## Supported Languages

| Language | Code | Direction | Status |
|----------|------|-----------|---------|
| English | `en` | LTR | ✅ Complete |
| Spanish | `es` | LTR | ✅ Complete |
| French | `fr` | LTR | ✅ Complete |
| German | `de` | LTR | ✅ Complete |
| Portuguese | `pt` | LTR | ✅ Complete |
| Japanese | `ja` | LTR | ✅ Complete |
| Chinese (Simplified) | `zh` | LTR | ✅ Complete |
| Arabic | `ar` | RTL | ✅ Complete |
| Russian | `ru` | LTR | ✅ Complete |
| Dutch | `nl` | LTR | ✅ Complete |

## Quick Start

### Installation

```bash
# Install the package
npm install @cvplus/i18n

# For React applications
npm install @cvplus/i18n react-i18next i18next
```

### Basic Setup

```tsx
// app.tsx
import React from 'react';
import { I18nProvider } from '@cvplus/i18n/react';

function App() {
  return (
    <I18nProvider>
      <YourApplication />
    </I18nProvider>
  );
}
```

### Using Translations

```tsx
// Component.tsx
import { useTranslation } from '@cvplus/i18n/react';

function MyComponent() {
  const { t, changeLanguage, currentLanguage, isRTL } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('cv.sections.experience')}</p>
      <button onClick={() => changeLanguage('es')}>
        Cambiar a Español
      </button>
    </div>
  );
}
```

## Advanced Usage

### Professional Translations

```tsx
import { useTranslation } from '@cvplus/i18n/react';

function CVSection() {
  const { professional } = useTranslation();
  
  return (
    <div>
      <h2>{professional.translateSection('experience')}</h2>
      <p>{professional.translateRole('software-engineer', 'technology')}</p>
      <span>{professional.translateSkill('javascript', 'technical')}</span>
    </div>
  );
}
```

### RTL Layout Support

```tsx
import { RTLWrapper, useRTL } from '@cvplus/i18n/react';

function ResponsiveLayout() {
  const { isRTL, transformClasses } = useRTL();
  
  return (
    <RTLWrapper>
      <div className={transformClasses('flex flex-row justify-start')}>
        <p>This content adapts to text direction automatically</p>
      </div>
    </RTLWrapper>
  );
}
```

### Form Translations

```tsx
import { useTranslation } from '@cvplus/i18n/react';

function ContactForm() {
  const { forms } = useTranslation();
  
  return (
    <form>
      <label>{forms.translateField('firstName', 'label')}</label>
      <input 
        placeholder={forms.translateField('firstName', 'placeholder')}
        required
      />
      <span className="error">
        {forms.translateError('required_field')}
      </span>
    </form>
  );
}
```

### Language Selector

```tsx
import { LanguageSelector } from '@cvplus/i18n/react';

function Header() {
  return (
    <header>
      <LanguageSelector 
        variant="dropdown"
        showFlags={true}
        showNames={true}
        onLanguageChange={(lang) => console.log('Changed to:', lang)}
      />
    </header>
  );
}
```

## Configuration

### Custom Configuration

```tsx
import { createConfig } from '@cvplus/i18n';

const customConfig = createConfig({
  supportedLanguages: ['en', 'es', 'fr'],
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  
  caching: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000,
  },
  
  loading: {
    strategy: 'lazy',
    preload: ['en'],
    backend: {
      loadPath: '/api/i18n/{{lng}}/{{ns}}',
    },
  },
});
```

### Environment Configurations

```tsx
import { getConfigForEnvironment } from '@cvplus/i18n';

// Automatic environment detection
const config = getConfigForEnvironment(); // Uses NODE_ENV

// Explicit environment
const prodConfig = getConfigForEnvironment('production');
const devConfig = getConfigForEnvironment('development');
```

## Components

### TranslatedText

```tsx
import { TranslatedText } from '@cvplus/i18n/react';

<TranslatedText 
  i18nKey="common.welcome"
  options={{ name: 'John' }}
  component="h1"
  className="title"
  fallback="Welcome"
/>
```

### Conditional Translation

```tsx
import { ConditionalTranslation } from '@cvplus/i18n/react';

<ConditionalTranslation
  condition={isPremium}
  i18nKey="premium.feature"
  fallbackKey="common.upgrade"
/>
```

### Plural Translation

```tsx
import { PluralTranslation } from '@cvplus/i18n/react';

<PluralTranslation
  i18nKey="cv.experience.years"
  count={yearsOfExperience}
/>
```

## Professional Features

### Industry-Specific Terms

```tsx
// Translate job titles by industry
professional.translateRole('software-engineer', 'technology', 'es');
// Returns: "Ingeniero de Software"

// Translate skills by category
professional.translateSkill('leadership', 'soft-skills', 'fr');
// Returns: "Leadership"
```

### CV Section Management

```tsx
// Translate CV sections
professional.translateSection('experience', 'de');
// Returns: "Berufserfahrung"

// Get all section translations
const sections = CV_SECTIONS.map(section => ({
  key: section,
  name: professional.translateSection(section)
}));
```

## Formatting

### Number and Currency

```tsx
const { formatNumber, formatCurrency } = useTranslation();

// Format numbers based on locale
formatNumber(1234.56); // "1,234.56" (en) or "1.234,56" (de)

// Format currency
formatCurrency(99.99, { currency: 'EUR' }); // "€99.99" or "99,99 €"
```

### Date and Time

```tsx
const { formatDate, formatRelativeTime } = useTranslation();

// Format dates
formatDate(new Date(), { format: 'long' });
// English: "January 15, 2024"
// German: "15. Januar 2024"

// Relative time
formatRelativeTime(yesterdayDate);
// English: "1 day ago"
// Spanish: "hace 1 día"
```

### Phone Numbers

```tsx
const { formatPhone } = useTranslation();

formatPhone('+1234567890', { format: 'international' });
// Returns: "+1 234 567 890"

formatPhone('1234567890', { format: 'national', country: 'US' });
// Returns: "(123) 456-7890"
```

## Development Tools

### Key Extraction

```bash
# Extract all translation keys from codebase
npm run extract:keys

# Output: extracted-keys.json with usage analysis
```

### Translation Validation

```bash
# Validate all translations for completeness
npm run validate:translations

# Check specific language
npm run validate:translations -- --lang es
```

### Type Generation

```bash
# Generate TypeScript types for translation keys
npm run generate:types
```

## RTL Support

### Automatic Layout Mirroring

```tsx
import { useRTL } from '@cvplus/i18n/react';

function Layout() {
  const { isRTL, transformClasses, transformStyles } = useRTL();
  
  // CSS classes are automatically transformed
  const classes = transformClasses('ml-4 text-left'); 
  // RTL: "mr-4 text-right"
  
  // Inline styles are transformed
  const styles = transformStyles({ marginLeft: 16, textAlign: 'left' });
  // RTL: { marginRight: 16, textAlign: 'right' }
  
  return <div className={classes} style={styles} />;
}
```

### RTL-Aware Components

```tsx
import { RTLWrapper } from '@cvplus/i18n/react';

<RTLWrapper options={{ mirrorLayout: true, adjustSpacing: true }}>
  <YourContent />
</RTLWrapper>
```

## Performance Optimization

### Lazy Loading

```tsx
// Translations are loaded on-demand
const { preloadLanguage } = useTranslation();

// Preload language for better UX
useEffect(() => {
  preloadLanguage('es');
}, []);
```

### Bundle Splitting

```tsx
// Load only required namespaces
const { t } = useTranslation('cv'); // Only loads CV translations
```

### Caching

```tsx
// Configure caching for optimal performance
const config = createConfig({
  caching: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 2000, // Max cached translations
  },
});
```

## SEO Integration

### Multi-language SEO

```tsx
import { SEOTranslation } from '@cvplus/i18n';

const seoData = {
  title: { en: 'CV Builder', es: 'Creador de CV' },
  description: { en: 'Build professional CVs', es: 'Crea CVs profesionales' },
  keywords: { en: ['cv', 'resume'], es: ['cv', 'curriculum'] },
};

// Generate hreflang tags
<SEOHead 
  translations={seoData}
  currentLanguage={currentLanguage}
  availableLanguages={availableLanguages}
/>
```

## Testing

### Test Configuration

```tsx
// test-setup.ts
import { testConfig } from '@cvplus/i18n';

export const i18nTestConfig = testConfig;
```

### Component Testing

```tsx
// Component.test.tsx
import { render } from '@testing-library/react';
import { I18nProvider } from '@cvplus/i18n/react';

function renderWithI18n(component, options = {}) {
  return render(
    <I18nProvider config={testConfig} {...options}>
      {component}
    </I18nProvider>
  );
}
```

## API Reference

### Hooks

- `useTranslation(namespace?)` - Main translation hook
- `useRTL()` - RTL layout utilities
- `useI18nContext()` - Access i18n context
- `useI18nReady()` - Check if i18n is loaded

### Components

- `<I18nProvider>` - Context provider
- `<LanguageSelector>` - Language selection UI
- `<TranslatedText>` - Declarative text translation
- `<RTLWrapper>` - RTL layout wrapper
- `<PluralTranslation>` - Pluralized text
- `<GenderAwareTranslation>` - Gender-specific text

### Services

- `TranslationService` - Core translation engine
- `RTLService` - RTL support service
- `FormatService` - Locale-aware formatting

### Utilities

- `formatPhoneNumber()` - Phone formatting
- `formatAddress()` - Address formatting
- `formatName()` - Name formatting
- `formatFileSize()` - File size formatting
- `formatDuration()` - Time duration formatting

## Migration Guide

### From react-i18next

```tsx
// Before
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();

// After
import { useTranslation } from '@cvplus/i18n/react';
const { t, i18n, formatDate, formatCurrency } = useTranslation();
```

### From custom i18n

```tsx
// Before
const text = translate('key', lang);

// After
const { t } = useTranslation();
const text = t('key');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add translations in `/locales/{lang}/`
4. Add tests for new features
5. Run validation: `npm run validate:translations`
6. Submit a pull request

### Adding New Languages

1. Create locale directory: `/locales/{lang}/`
2. Add all namespace files with translations
3. Update `SUPPORTED_LANGUAGES` in constants
4. Add language config in `LANGUAGE_CONFIG`
5. Test with `npm run test`

### Translation Guidelines

- Use clear, concise translations
- Maintain consistent terminology
- Consider cultural context
- Test with native speakers
- Follow professional standards for CV/resume content

## License

Proprietary - © CVPlus. All rights reserved.

## Support

- Documentation: [docs.cvplus.com/i18n](https://docs.cvplus.com/i18n)
- Issues: [GitHub Issues](https://github.com/cvplus/cvplus/issues)
- Email: support@cvplus.com