# Olorin Web Portal - Multi-Subdomain Deployment Guide

## Architecture Overview

The Olorin web portal uses a **monorepo architecture with npm workspaces** to manage four separate marketing portals:

- **olorin.ai** (portal-main) - Parent marketing site showcasing all solutions
- **fraud.olorin.ai** (portal-fraud) - Fraud detection subdomain
- **streaming.olorin.ai** (portal-streaming) - Media streaming subdomain
- **radio.olorin.ai** (portal-radio) - Radio management subdomain

Each portal is independently deployable to Firebase Hosting with its own subdomain.

## Project Structure

```
olorin-web-portal/
├── packages/
│   ├── shared/              # Shared component library
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   │   ├── ui/      # GlassCard, GlassButton, HeroSection
│   │   │   │   ├── branding/# WizardLogo, GlowingIcon
│   │   │   │   └── layout/  # Header, Footer
│   │   │   └── styles/      # Wizard theme CSS
│   │   └── tailwind.config.base.js
│   ├── portal-main/         # olorin.ai (port 3000)
│   ├── portal-fraud/        # fraud.olorin.ai (port 3001)
│   ├── portal-streaming/    # streaming.olorin.ai (port 3002)
│   └── portal-radio/        # radio.olorin.ai (port 3003)
├── firebase.json            # Multi-site Firebase config
├── .github/workflows/       # CI/CD automation
└── package.json             # Workspace configuration
```

## Prerequisites

- Node.js 18+
- npm 8+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with 4 hosting sites configured

## Local Development

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This installs dependencies for the shared package and all four portals.

### 2. Run Individual Portals

Each portal runs on a different port to avoid conflicts:

```bash
# Main portal (port 3000)
npm run dev:main

# Fraud portal (port 3001)
npm run dev:fraud

# Streaming portal (port 3002)
npm run dev:streaming

# Radio portal (port 3003)
npm run dev:radio
```

### 3. Build Portals

```bash
# Build all portals
npm run build:all

# Build individual portal
npm run build:main
npm run build:fraud
npm run build:streaming
npm run build:radio
```

## Environment Configuration

Each portal requires environment variables. Copy the `.env.example` file to `.env` in each package:

```bash
# For each portal
cd packages/portal-main && cp .env.example .env
cd packages/portal-fraud && cp .env.example .env
cd packages/portal-streaming && cp .env.example .env
cd packages/portal-radio && cp .env.example .env
```

### Environment Variables

**Main Portal (.env)**:
```
REACT_APP_SITE_NAME=Olorin.AI
REACT_APP_DOMAIN=olorin.ai
REACT_APP_FRAUD_URL=https://fraud.olorin.ai
REACT_APP_STREAMING_URL=https://streaming.olorin.ai
REACT_APP_RADIO_URL=https://radio.olorin.ai
REACT_APP_API_URL=https://api.olorin.ai
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

**Fraud Portal (.env)**:
```
REACT_APP_SITE_NAME=Olorin.AI Fraud Detection
REACT_APP_DOMAIN=fraud.olorin.ai
REACT_APP_MAIN_URL=https://olorin.ai
REACT_APP_API_URL=https://api.olorin.ai
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

Similar configuration for streaming and radio portals.

## Firebase Hosting Setup

### 1. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize project (already configured in firebase.json)
firebase init hosting
```

### 2. Configure Firebase Hosting Sites

In your Firebase console, create 4 hosting sites:
- `olorin-main` → olorin.ai
- `olorin-fraud` → fraud.olorin.ai
- `olorin-streaming` → streaming.olorin.ai
- `olorin-radio` → radio.olorin.ai

### 3. DNS Configuration

Add these DNS records in your domain registrar:

```
Type    Host              Value
A       @                 Firebase hosting IP
CNAME   fraud             olorin-fraud.web.app
CNAME   streaming         olorin-streaming.web.app
CNAME   radio             olorin-radio.web.app
```

Get Firebase hosting IPs:
```bash
firebase hosting:sites:list
```

## Manual Deployment

### Deploy All Portals

```bash
# Build all portals
npm run build:all

# Deploy all sites
firebase deploy --only hosting
```

### Deploy Individual Portal

```bash
# Build specific portal
npm run build:main

# Deploy specific site
firebase deploy --only hosting:olorin-main
firebase deploy --only hosting:olorin-fraud
firebase deploy --only hosting:olorin-streaming
firebase deploy --only hosting:olorin-radio
```

## CI/CD Automation

### GitHub Actions Setup

The project includes a GitHub Actions workflow (`.github/workflows/deploy-portals.yml`) that automatically deploys all portals when code is pushed to the `main` branch.

### Required GitHub Secrets

Add these secrets to your GitHub repository:

1. **FIREBASE_SERVICE_ACCOUNT**
   ```bash
   # Generate service account key
   firebase login:ci
   ```
   Copy the token and add it to GitHub Secrets.

2. **GITHUB_TOKEN** (automatically provided by GitHub Actions)

### Workflow Triggers

- **Automatic**: Push to `main` branch
- **Manual**: Workflow dispatch in GitHub Actions UI

## Development Workflow

### Adding New Pages

1. Create page component in `packages/portal-{name}/src/pages/`
2. Add route in `packages/portal-{name}/src/App.tsx`
3. Add translations in `packages/portal-{name}/src/i18n/locales/en.json`

Example:
```typescript
// packages/portal-fraud/src/pages/PricingPage.tsx
import React from 'react';

const PricingPage: React.FC = () => {
  return <div>Pricing content</div>;
};

export default PricingPage;

// packages/portal-fraud/src/App.tsx
<Route path="/pricing" element={<PricingPage />} />
```

### Creating Shared Components

1. Create component in `packages/shared/src/components/`
2. Export from `packages/shared/src/index.ts`
3. Import in portal: `import { Component } from '@olorin/shared'`

Example:
```typescript
// packages/shared/src/components/ui/NewComponent.tsx
export const NewComponent: React.FC = () => {
  return <div className="glass-card-wizard">Content</div>;
};

// packages/shared/src/index.ts
export { NewComponent } from './components/ui/NewComponent';

// packages/portal-main/src/pages/HomePage.tsx
import { NewComponent } from '@olorin/shared';
```

## Wizard Theme System

All portals use a consistent glassmorphic dark purple/black theme with neon accents.

### Key Colors

```css
--wizard-bg-deep: #0f0027        /* Near-black purple */
--wizard-bg-primary: #1a0033     /* Deep purple primary */
--wizard-bg-secondary: #2d1b4e   /* Dark purple secondary */
--wizard-accent-purple: #a855f7  /* Neon purple */
--wizard-accent-pink: #d946ef    /* Neon pink */
--wizard-accent-cyan: #22d3ee    /* Cyan highlight */
```

### Key Components

- **GlassCard**: Glassmorphic card with blur effect
- **GlowingIcon**: Icon wrapper with neon glow
- **WizardLogo**: Domain-specific wizard logo
- **Header**: Shared navigation header
- **Footer**: Shared footer component
- **HeroSection**: Reusable hero template

### Tailwind Utilities

```html
<!-- Glassmorphic card -->
<div class="glass-card-wizard p-6">...</div>

<!-- Wizard gradient text -->
<h1 class="wizard-text">AI-Powered Solutions</h1>

<!-- Neon glow -->
<div class="shadow-glow-purple">...</div>

<!-- Responsive grid -->
<div class="wizard-grid-3">...</div>
<div class="wizard-grid-4">...</div>
```

## Internationalization (i18n)

All portals support 5 languages:
- English (en) - Primary
- French (fr)
- Spanish (es)
- Italian (it)
- Chinese (zh)

### Adding Translations

1. Add keys to `src/i18n/locales/en.json`
2. Use in components: `const { t } = useTranslation();`
3. Render: `<h1>{t('hero.title')}</h1>`

Example:
```json
{
  "hero": {
    "title": "AI-POWERED",
    "titleHighlight": "FRAUD PREVENTION"
  }
}
```

```typescript
const { t } = useTranslation();
<h1>{t('hero.title')} <span>{t('hero.titleHighlight')}</span></h1>
```

## Testing

```bash
# Run tests for all portals
npm test

# Run tests for specific portal
npm test -w packages/portal-main
```

## Troubleshooting

### Port Already in Use

If a portal fails to start due to port conflict:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
npm install

# Clear build cache
rm -rf packages/*/build
npm run build:all
```

### Firebase Deployment Errors

```bash
# Verify you're logged in
firebase login

# List projects
firebase projects:list

# Use correct project
firebase use olorin-main

# Check hosting sites
firebase hosting:sites:list
```

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] DNS records pointing to Firebase
- [ ] Firebase hosting sites created
- [ ] SSL certificates active
- [ ] EmailJS configured for contact forms
- [ ] Analytics tracking IDs set
- [ ] All translations complete
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Lighthouse scores > 90
- [ ] GitHub Actions secrets configured
- [ ] Backup DNS records documented

## Performance Optimization

### Recommended Settings

1. **Enable caching**: Already configured in `firebase.json`
2. **Compress images**: Use WebP format with fallbacks
3. **Code splitting**: React.lazy() for heavy components
4. **CDN**: Firebase Hosting includes global CDN
5. **Lighthouse audit**: Run before each deployment

### Firebase Hosting Features

- Global CDN with edge caching
- HTTP/2 and automatic compression
- Automatic SSL certificates
- Custom domain support
- Rollback capability

## Monitoring

### Firebase Hosting Analytics

View deployment metrics:
```bash
firebase hosting:channel:list
```

### Web Vitals

Monitor Core Web Vitals in production:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

## Support

For deployment issues:
1. Check Firebase Hosting docs: https://firebase.google.com/docs/hosting
2. Review GitHub Actions logs
3. Verify DNS propagation: https://dnschecker.org
4. Test SSL: https://www.ssllabs.com/ssltest

## Version History

- **v1.0.0** - Initial multi-subdomain architecture
  - 4 independent portals with shared component library
  - Glassmorphic wizard theme implementation
  - Firebase multi-site hosting configuration
  - CI/CD automation with GitHub Actions
