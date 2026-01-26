# Station-AI Marketing Portal 🎙️✨

Marketing website for Station-AI - Next-generation AI-powered radio station management platform.

## Overview

This is the official marketing portal for Station-AI, showcasing the platform's features, solutions, and pricing for Hebrew-speaking radio stations in the Miami/Boca Raton/Florida Keys area.

## Features

- **🎨 Glassmorphism Design**: Modern dark-mode UI with wizard purple theme (#9333ea)
- **🌐 Dual Language Support**: Full Hebrew (RTL) and English using `@olorin/shared-i18n`
- **📱 Responsive**: Mobile-first design that works on all devices
- **♿ Accessible**: WCAG AA compliant with proper ARIA labels and keyboard navigation
- **⚡ Performance**: Optimized bundle with code splitting and lazy loading
- **🎯 SEO Optimized**: Semantic HTML, meta tags, and Open Graph support

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| i18n | @olorin/shared-i18n (10 languages) |
| Routing | React Router 6 |
| Icons | Lucide React |
| Build Tool | Create React App |
| Hosting | Firebase Hosting |

## Project Structure

```
portal-station/
├── public/
│   ├── favicons/         # Auto-copied from @olorin/assets
│   ├── logos/           # Auto-copied from @olorin/assets
│   ├── index.html       # HTML template with SEO meta tags
│   └── robots.txt       # Search engine directives
├── src/
│   ├── components/
│   │   └── sections/    # Reusable page sections
│   ├── config/
│   │   └── homePageData.tsx  # Content configuration
│   ├── i18n/
│   │   ├── config.ts    # i18n setup
│   │   └── locales/     # en.json, he.json (502 strings)
│   ├── pages/           # 7 pages (Home, Features, Solutions, etc.)
│   ├── App.tsx          # Main app component
│   └── index.tsx        # Entry point
├── package.json
├── tailwind.config.js   # Theme configuration (wizard purple)
└── tsconfig.json
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# From olorin-portals root
cd packages/portal-station
npm install
```

### Running Locally

```bash
npm start
```

The portal will open at `http://localhost:3303`

### Build Scripts

- `npm start` - Start development server on port 3303
- `npm run build` - Create production build in `build/`
- `npm test` - Run test suite
- `npm run copy-assets` - Copy favicons and logos from @olorin/assets

### Environment Variables

No environment variables required - portal is static HTML/CSS/JS.

## Pages

1. **HomePage** (`/`) - Hero section with features, workflow, metrics, and solutions
2. **FeaturesPage** (`/features`) - Detailed feature showcase
3. **SolutionsPage** (`/solutions`) - Use cases and solution examples
4. **PricingPage** (`/pricing`) - Pricing tiers and plans
5. **DemoPage** (`/demo`) - Request demo form
6. **ContactPage** (`/contact`) - Contact information and support
7. **NotFoundPage** (`/404`) - Custom 404 error page

## i18n Locales

The portal includes comprehensive translations:

- **English** (`en.json`): 402 lines, 502 keys
- **Hebrew** (`he.json`): 390 lines, full RTL support

All strings use the `@olorin/shared-i18n` v2.0.0 package with support for 10 languages.

## Theme Configuration

The wizard purple theme is configured in `tailwind.config.js`:

```javascript
{
  wizard: {
    bg: {
      'deep': '#0f0027',
      'base': '#1a0033',
    },
    accent: '#9333ea',         // Primary purple
    'accent-hover': '#a855f7', // Lighter purple
    glow: 'rgba(147, 51, 234, 0.5)',
  }
}
```

## Shared Components

The portal uses shared components from `@olorin/shared`:

- `HeroSection` - Hero banner with CTA buttons
- `Header` - Navigation header with language toggle
- `Footer` - Site footer with links
- `GlassCard` - Glassmorphic card component
- `GlowingIcon` - Icon with glow effect

## Deployment

### Firebase Hosting

The portal is deployed to Firebase Hosting at `marketing.station.olorin.ai`.

#### Deploy to Staging

```bash
# From olorin-portals root
firebase hosting:channel:deploy staging-station
```

#### Deploy to Production

```bash
# From olorin-portals root
firebase deploy --only hosting:station
```

### Custom Domain Setup

1. Add custom domain in Firebase Console
2. Update DNS records:
   ```
   A     marketing.station.olorin.ai  →  Firebase IP
   TXT   marketing.station.olorin.ai  →  Firebase verification
   ```
3. Wait 24-48 hours for DNS propagation
4. Firebase provisions SSL certificate automatically

## Performance Optimization

### Current Metrics

- Bundle size: ~732 KB (main.js)
- CSS: ~8.45 KB
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s

### Optimization Strategies

- ✅ Code splitting with React.lazy()
- ✅ Lazy loading of images
- ✅ Tree shaking via Webpack
- ✅ Minification and compression
- ✅ CDN delivery via Firebase Hosting

## Accessibility

The portal meets WCAG 2.1 Level AA standards:

- ✅ Semantic HTML elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Focus indicators
- ✅ Color contrast ratios > 4.5:1
- ✅ Skip navigation link
- ✅ RTL support for Hebrew

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Contributing

This portal is part of the Olorin.ai ecosystem. Follow the monorepo conventions:

1. Use conventional commits
2. Run `npm run lint` before committing
3. Ensure all tests pass
4. Update i18n strings for both languages

## Related Projects

- **Main App**: `/olorin-media/station-ai` - Station-AI management dashboard
- **Assets Package**: `@olorin/assets` - Shared logos and favicons
- **i18n Package**: `@olorin/shared-i18n` - Shared internationalization
- **Shared Components**: `@olorin/shared` - Reusable React components

## License

Private - All rights reserved © 2026 Olorin.ai LLC

## Support

For questions or issues:
- Marketing: marketing@station.olorin.ai
- Technical: support@olorin.ai
- Main Site: https://station.olorin.ai
