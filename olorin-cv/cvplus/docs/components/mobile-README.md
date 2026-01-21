# Mobile-First Navigation System

A comprehensive mobile navigation system for the CVPlus platform that provides an excellent user experience across all device sizes.

## Features

### 🎯 Mobile-First Design
- Responsive breakpoints: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- Touch-friendly controls with minimum 44px touch targets
- Thumb-zone optimization for natural navigation
- Progressive enhancement from mobile to desktop

### 📱 Touch Interactions
- **Gesture Support**: Swipe left/right for step navigation
- **Pull-to-Refresh**: Natural refresh gesture on mobile
- **Touch Feedback**: Visual feedback for all interactive elements
- **Safe Area Support**: Proper handling of iOS notches and safe areas

### 🧭 Navigation Components
- **Enhanced Header**: Collapsible design with mobile optimization
- **Bottom Navigation**: Mobile-friendly bottom nav for key actions
- **Smart Breadcrumbs**: Mobile-first breadcrumb with step indicators
- **Progress Indicators**: Responsive step progress visualization

### ✨ Advanced Features
- **Smooth Animations**: 60fps transitions with reduced motion support
- **Accessibility**: ARIA labels, focus management, screen reader support
- **Performance Optimized**: Minimal layout shift and smooth scrolling
- **Dark Mode**: Full dark mode support across all components

## Components

### Core Navigation Components

#### `MobilePageLayout`
Primary layout component that wraps pages with mobile navigation features.

```tsx
import { MobilePageLayout } from '@/components/mobile';

<MobilePageLayout
  title="CV Preview"
  mobileTitle="Preview"
  currentStep="preview"
  onNext={handleNext}
  onPrevious={handlePrevious}
  onSave={handleSave}
  showStepIndicator={true}
  enableGestures={true}
>
  {/* Your page content */}
</MobilePageLayout>
```

#### `MobileBottomNav`
Bottom navigation bar for mobile devices with key actions.

```tsx
import { MobileBottomNav } from '@/components/mobile';

<MobileBottomNav
  currentStep="preview"
  onNext={handleNext}
  onPrevious={handlePrevious}
  onSave={handleSave}
  onShare={handleShare}
  showNavigation={true}
  showActions={true}
/>
```

#### `ResponsiveStepIndicator`
Step progress indicator that adapts to screen size.

```tsx
import { ResponsiveStepIndicator } from '@/components/mobile';

<ResponsiveStepIndicator
  currentStepId="preview"
  variant="default"
  size="normal"
  showLabels={true}
  showDescriptions={false}
  onStepClick={handleStepClick}
/>
```

#### `MobileFeatureSelection`
Touch-friendly feature selection interface.

```tsx
import { MobileFeatureSelection } from '@/components/mobile';

<MobileFeatureSelection
  selectedFeatures={selectedFeatures}
  onFeatureToggle={handleFeatureToggle}
  onSelectAll={handleSelectAll}
  onSelectNone={handleSelectNone}
  variant="default"
/>
```

### Layout Components

#### `CVPreviewPageLayout`
Specialized layout for CV preview pages.

```tsx
import { CVPreviewPageLayout } from '@/components/mobile';

<CVPreviewPageLayout
  jobId={jobId}
  onNext={handleNext}
  onPrevious={handlePrevious}
  onSave={handleSave}
  isLoading={isLoading}
>
  {/* CV preview content */}
</CVPreviewPageLayout>
```

#### `ProcessingPageLayout`
Layout optimized for processing/loading states.

```tsx
import { ProcessingPageLayout } from '@/components/mobile';

<ProcessingPageLayout
  jobId={jobId}
  onRefresh={handleRefresh}
  isLoading={true}
>
  {/* Processing content */}
</ProcessingPageLayout>
```

### Gesture Hooks

#### `useSwipeGestures`
Core gesture recognition hook.

```tsx
import { useSwipeGestures } from '@/components/mobile';

const { handlers, isGesturing } = useSwipeGestures({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  threshold: 50,
  disabled: false
});

return <div {...handlers}>Swipeable content</div>;
```

#### `useStepNavigation`
Specialized hook for step-based navigation.

```tsx
import { useStepNavigation } from '@/components/mobile';

const { handlers, isGesturing } = useStepNavigation({
  currentStep: 'preview',
  onNext: handleNext,
  onPrevious: handlePrevious,
  canGoNext: true,
  canGoPrevious: true
});
```

#### `usePullToRefresh`
Pull-to-refresh gesture support.

```tsx
import { usePullToRefresh } from '@/components/mobile';

const {
  handlers,
  isRefreshing,
  shouldShowRefreshIndicator,
  refreshProgress
} = usePullToRefresh({
  onRefresh: handleRefresh,
  threshold: 80,
  disabled: false
});
```

## Styling

### CSS Files
Include these CSS files in your application:

```css
/* Mobile animations */
@import '@/styles/mobile-animations.css';

/* Mobile utilities */
@import '@/styles/mobile-utilities.css';
```

### Tailwind Classes
The system uses custom Tailwind utility classes:

```css
/* Touch targets */
.touch-target         /* min-h-[44px] min-w-[44px] */
.touch-target-large   /* min-h-[48px] min-w-[48px] */

/* Mobile spacing */
.mobile-px           /* px-4 md:px-6 lg:px-8 */
.mobile-py           /* py-4 md:py-6 lg:py-8 */

/* Mobile buttons */
.mobile-button-primary    /* Primary button styles */
.mobile-button-secondary  /* Secondary button styles */

/* Safe areas */
.safe-top            /* padding-top: env(safe-area-inset-top) */
.safe-bottom         /* padding-bottom: env(safe-area-inset-bottom) */
```

## Integration Guide

### 1. Update Existing Pages

Replace your existing page wrapper with the mobile layout:

```tsx
// Before
export const MyPage = () => {
  return (
    <>
      <Header title="My Page" />
      <div className="container mx-auto px-4">
        {/* content */}
      </div>
    </>
  );
};

// After
import { MobilePageLayout } from '@/components/mobile';

export const MyPage = () => {
  return (
    <MobilePageLayout
      title="My Page"
      mobileTitle="Page"
      currentStep="myStep"
    >
      {/* content - no need for container wrapper */}
    </MobilePageLayout>
  );
};
```

### 2. Add Gesture Support

For step-based pages, add gesture navigation:

```tsx
const handleNext = () => navigate('/next-step');
const handlePrevious = () => navigate('/previous-step');

<MobilePageLayout
  currentStep="current"
  onNext={handleNext}
  onPrevious={handlePrevious}
  enableGestures={true}
>
```

### 3. Update Feature Selection

Replace existing feature selection with the mobile-optimized version:

```tsx
// Before
<FeatureSelectionPanel {...props} />

// After
<MobileFeatureSelection {...props} />
```

### 4. Add Bottom Navigation

For key user flows, enable bottom navigation:

```tsx
<MobilePageLayout
  showBottomNav={true}
  showNavigation={true}
  showActions={true}
  onSave={handleSave}
  onShare={handleShare}
>
```

## Browser Support

- **iOS Safari**: Full support including safe areas
- **Android Chrome**: Full gesture and touch support
- **Desktop Chrome/Firefox/Safari**: Enhanced responsive experience
- **Accessibility**: WCAG 2.1 AA compliant

## Performance

- **60fps animations** on modern mobile devices
- **Reduced motion** support for accessibility
- **Minimal layout shift** during navigation
- **Optimized bundle size** with tree-shaking support

## Migration Checklist

- [ ] Import mobile navigation CSS files
- [ ] Update page components to use `MobilePageLayout`
- [ ] Replace `FeatureSelectionPanel` with `MobileFeatureSelection`
- [ ] Add gesture handlers for step navigation
- [ ] Test on mobile devices and different screen sizes
- [ ] Verify accessibility with screen readers
- [ ] Test safe area handling on iOS devices

## Development

### Testing Mobile Features

```bash
# Test on mobile devices
npm run dev -- --host 0.0.0.0

# Test gestures with Chrome DevTools
# Enable touch simulation in DevTools
```

### Customization

Override component styles using Tailwind classes:

```tsx
<MobilePageLayout
  className="bg-custom-color"
  contentClassName="custom-content-styles"
  variant="dark"
>
```

## Troubleshooting

### Common Issues

1. **Gestures not working**: Ensure `enableGestures={true}` is set
2. **Safe area issues**: Check iOS Safari settings and viewport meta tag
3. **Animation performance**: Enable `prefer-reduced-motion` for testing
4. **Touch targets too small**: Use `touch-target` utility classes

### Debug Mode

Enable debug logging for gestures:

```tsx
const { handlers } = useSwipeGestures({
  onSwipeLeft: () => console.log('Debug: Swipe left'),
  // ... other options
});
```

## Support

For issues or questions about the mobile navigation system:

1. Check the component documentation
2. Review the example implementations
3. Test on actual devices, not just browser simulation
4. Ensure all required CSS files are imported