# Station-AI Marketing Portal

**"The Phantom Conductor"** - AI-powered radio station management platform

## Overview

Station-AI is the rebranded Israeli Radio Manager, featuring a cyber-magical command center theme with wizard purple branding. This marketing portal showcases the platform's autonomous broadcasting capabilities.

## Theme & Design

**Brand Colors:**
- Deep Purple Background: `#0f0027`
- Base Purple: `#1a0033`
- Wizard Purple Accent: `#9333ea` (NOT coral red)
- Purple Glow: `rgba(147, 51, 234, 0.5)`

**Design System:**
- Glassmorphism effects with backdrop blur
- Dark mode by default
- Wizard purple theme (aligned with Olorin ecosystem)
- RTL support for Hebrew
- WCAG 2.1 AA accessibility compliant

## Development

```bash
# Start development server
npm run start

# Build for production
npm run build

# Run tests
npm test
```

## Features

- ✅ Dual language support (English + Hebrew with RTL)
- ✅ Glassmorphism UI with wizard purple theme
- ✅ Responsive design (320px - 2560px)
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Performance optimized (Core Web Vitals)
- ✅ SEO optimized
- ✅ Security headers (CSP, HSTS)

## i18n

Translations available in:
- English (`src/i18n/locales/en.json`)
- Hebrew (`src/i18n/locales/he.json`)

To add more languages, create a new file in `src/i18n/locales/` and update `src/i18n/config.ts`.

## Deployment

```bash
# Deploy to Firebase (production)
firebase deploy --only hosting:station

# Deploy to staging
firebase hosting:channel:deploy staging-station
```

## Environment Variables

Create `.env` file:
```bash
REACT_APP_API_URL=https://station.olorin.ai
REACT_APP_DEMO_URL=https://demo.station.olorin.ai
```

## The Phantom Conductor Narrative

*In the early days of broadcasting, the "Dead Air" was the enemy. A few seconds of silence could mean lost listeners, advertisers pulling out, and revenue dropping...*

The Phantom Conductor never sleeps. It doesn't take coffee breaks or sick days. It doesn't complain, doesn't forget, and doesn't play the wrong song at the wrong time. It simply... conducts.

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS (with Station-AI wizard theme)
- i18next (internationalization)
- React Router v6

## License

Private - All rights reserved

---

**Station-AI** - The DJ That Never Sleeps 🎙️
