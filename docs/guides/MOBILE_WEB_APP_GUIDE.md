# Mobile Web App Guide (m.bayit.tv)

**Stack:** React 18 + TypeScript + Vite + Zustand + TailwindCSS + Glass UI
**Last Updated:** 2026-02-04

## Overview

The Bayit+ Mobile Web App is a mobile-optimized Progressive Web App (PWA) served at **m.bayit.tv**. It shares the same codebase as the desktop web app (`bayit.tv`) but is deployed to a separate Firebase Hosting site optimized for mobile browsers.

### Hosting Architecture

| Site ID | Domain | Description |
|---------|--------|-------------|
| `bayit-plus` | bayit.tv | Desktop web application |
| `mobile-bayit` | m.bayit.tv | Mobile web application |
| `docs-bayit-plus` | docs.bayit.tv | Documentation portal |

All three sites are deployed simultaneously from the same build output (`web/dist/`).

---

## Key Differences from Desktop

### Responsive Design

The mobile web app uses the same React codebase but renders differently via responsive TailwindCSS breakpoints:

| Breakpoint | Width | Target |
|------------|-------|--------|
| Default | 0-639px | Mobile phones (portrait) |
| `sm:` | 640-767px | Mobile phones (landscape) |
| `md:` | 768-1023px | Tablets |
| `lg:` | 1024px+ | Desktop (bayit.tv) |

### Mobile-Specific Behaviors

- **Splash Screen**: Video uses `object-fit: contain` in portrait orientation to display the full 16:9 intro without cropping
- **Touch Interactions**: Tap targets meet 44x44px minimum for accessibility
- **Video Autoplay**: Starts muted (required by mobile browsers), with audio prompt for user activation
- **Navigation**: Bottom tab bar instead of side navigation
- **RTL Support**: Full right-to-left layout for Hebrew (i18next direction detection)

---

## Firebase Hosting Configuration

The mobile site is configured in the root `firebase.json`:

```json
{
  "hosting": [
    {
      "target": "mobile-bayit",
      "public": "web/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    }
  ]
}
```

### Deployment

All three hosting sites must be deployed together:

```bash
cd /path/to/bayit-plus

# Build the web app
cd web && npm run build && cd ..

# Deploy all three sites
npx firebase deploy --only hosting:bayit-plus,hosting:docs-bayit-plus,hosting:mobile-bayit
```

Deploying to only one site is a violation of the deployment policy.

---

## Development

### Local Development

The mobile web app uses the same dev server as the desktop app:

```bash
cd web
npm install
npm start
# Opens http://localhost:3200
```

To test mobile layout locally, use Chrome DevTools device toolbar (Ctrl+Shift+M / Cmd+Shift+M) and select a mobile device preset.

### Vite Proxy

API requests are proxied to the backend:

```
http://localhost:3200/api/* -> http://localhost:8000/api/*
```

---

## Mobile Web Optimizations

### Splash Screen

The splash screen in `web/public/index.html` handles mobile specifically:

- **Autoplay**: Video element includes `muted` and `playsinline` attributes for guaranteed autoplay on iOS Safari and Chrome Mobile
- **Portrait Mode**: CSS media query `@media (orientation: portrait)` switches video from `object-fit: cover` to `object-fit: contain`
- **Audio Prompt**: Tap-to-enable audio overlay appears since mobile browsers require user gesture for unmuting
- **Dark Background**: `#0d0d1a` fills letterbox bars above/below the 16:9 video in portrait

### Performance

- Code splitting via Vite `manualChunks` for smaller initial bundles
- Lazy-loaded routes for non-critical pages
- Image optimization with responsive `srcSet` attributes
- Service worker for offline-capable static assets (PWA)

### Touch & Gesture Support

- All Glass UI components support touch events natively
- Swipe gestures for content carousels
- Pull-to-refresh on content lists
- Long-press for context menus

---

## PWA Features

The mobile web app is installable as a Progressive Web App:

- **Manifest**: `/manifest.json` with app name, icons, and theme color
- **Service Worker**: Caches static assets for offline access
- **Add to Home Screen**: Supported on iOS Safari and Chrome for Android
- **Standalone Mode**: Runs without browser chrome when installed

---

## Testing Mobile Web

### Chrome DevTools

1. Open `http://localhost:3200`
2. Open DevTools (F12)
3. Toggle Device Toolbar (Ctrl+Shift+M)
4. Select device: iPhone 14 Pro, Pixel 7, iPad, etc.
5. Test both portrait and landscape orientations

### Real Device Testing

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from mobile device on same network
# http://<your-ip>:3200
```

### Playwright Mobile Tests

```bash
cd web
npm run test:e2e -- --project=mobile-chrome
```

---

## Accessibility

- **WCAG AA**: All text meets 4.5:1 contrast ratio against dark backgrounds
- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Dynamic Type**: Respects system font size preferences via `rem` units
- **Screen Readers**: VoiceOver (iOS) and TalkBack (Android) tested
- **RTL**: Full bidirectional layout support for Hebrew

---

## Common Issues

### Video Not Playing on Mobile

Mobile browsers block autoplay of unmuted video. The splash screen starts muted and shows a tap prompt. If the video still doesn't play:

1. Check the video source URL is accessible: `/assets/video/intro/Bayit_Intro_English.mp4`
2. Verify `playsinline` and `muted` attributes are present on the video element
3. Check browser console for autoplay policy errors

### Layout Issues in Portrait

If content appears cropped or misaligned in portrait mode:

1. Verify the `@media (orientation: portrait)` CSS rules are loading
2. Check that `viewport` meta tag is set: `width=device-width, initial-scale=1`
3. Test with Chrome DevTools device toolbar for consistent reproduction

### Slow Initial Load

1. Check network tab for large unbundled assets
2. Verify code splitting is working (multiple `.js` chunks in network tab)
3. Ensure images use appropriate sizes for mobile (not desktop-sized images)

---

## Related Documents

- [Web Development Guide](WEB_DEVELOPMENT_GUIDE.md)
- [Mobile Development Guide (Native)](MOBILE_DEVELOPMENT_GUIDE.md)
- [i18n Complete Guide](I18N_COMPLETE_GUIDE.md)
- [Firebase Deployment](../deployment/FIREBASE_DEPLOYMENT.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Frontend Team
**Next Review:** 2026-05-04
