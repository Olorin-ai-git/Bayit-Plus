# Components API Reference

Complete reference for all React components in the CVPlus Multimedia Module.

## Table of Contents

- [Core Components](core/README.md) - Essential components for multimedia functionality
- [Display Components](display/README.md) - Components for displaying multimedia content
- [Interactive Components](interactive/README.md) - Interactive multimedia components
- [Utilities Components](utilities/README.md) - Utility and helper components
- [Advanced Components](advanced/README.md) - Advanced features and analytics

## Component Categories

### Core Components

Essential components that provide the foundation for multimedia functionality.

| Component | Description | Props | Example |
|-----------|-------------|-------|---------|
| [`<MultimediaProvider>`](core/multimedia-provider.md) | Root provider for multimedia context | `config`, `children` | Required wrapper |
| [`<ErrorBoundary>`](core/error-boundary.md) | Error handling for multimedia components | `fallback`, `onError` | Error isolation |
| [`<FeatureWrapper>`](core/feature-wrapper.md) | Feature flag wrapper for conditional rendering | `feature`, `enabled` | Feature gating |

### Display Components

Components for displaying multimedia content with rich interactions.

| Component | Description | Props | Example |
|-----------|-------------|-------|---------|
| [`<PortfolioGallery>`](display/portfolio-gallery.md) | Interactive portfolio gallery | `items`, `layout`, `filters` | Portfolio showcase |
| [`<TestimonialsCarousel>`](display/testimonials-carousel.md) | Testimonials carousel with controls | `testimonials`, `autoPlay` | Client feedback |
| [`<PodcastPlayer>`](display/podcast-player.md) | Advanced audio player | `src`, `title`, `waveform` | Audio playback |
| [`<VideoPlayer>`](display/video-player.md) | Professional video player | `src`, `controls`, `quality` | Video playback |

### Interactive Components

Components that provide interactive multimedia experiences.

| Component | Description | Props | Example |
|-----------|-------------|-------|---------|
| [`<VideoIntroduction>`](interactive/video-introduction.md) | AI-powered video generation | `script`, `style`, `provider` | Personal intros |
| [`<EnhancedQRCode>`](interactive/enhanced-qr-code.md) | Customizable QR code generator | `value`, `logo`, `style` | Contact sharing |
| [`<QRCodeEditor>`](interactive/qr-code-editor.md) | Interactive QR code customization | `initialValue`, `onSave` | QR customization |
| [`<SocialMediaLinks>`](interactive/social-media-links.md) | Social media integration | `profiles`, `style` | Social sharing |

### Utilities Components

Helper components for file management and processing.

| Component | Description | Props | Example |
|-----------|-------------|-------|---------|
| [`<FileUpload>`](utilities/file-upload.md) | Multi-format file upload | `accept`, `multiple`, `onUpload` | File management |
| [`<ImageCropper>`](utilities/image-cropper.md) | Interactive image cropping | `src`, `aspect`, `onCrop` | Image editing |
| [`<MediaUploadManager>`](utilities/media-upload-manager.md) | Comprehensive upload management | `types`, `limits`, `storage` | Batch uploads |
| [`<UploadProgress>`](utilities/upload-progress.md) | Upload progress visualization | `progress`, `status`, `onComplete` | Progress tracking |

### Advanced Components

Advanced features for analytics and optimization.

| Component | Description | Props | Example |
|-----------|-------------|-------|---------|
| [`<MultimediaAnalyticsDashboard>`](advanced/analytics-dashboard.md) | Comprehensive analytics | `data`, `timeRange`, `metrics` | Usage insights |
| [`<VideoAnalyticsDashboard>`](advanced/video-analytics-dashboard.md) | Video-specific analytics | `videoId`, `metrics`, `realTime` | Video performance |
| [`<ContentOptimizer>`](advanced/content-optimizer.md) | AI-powered optimization | `content`, `suggestions`, `onOptimize` | Content improvement |

## Common Patterns

### Provider Pattern

All components should be wrapped in the `MultimediaProvider`:

```typescript
import { MultimediaProvider } from '@cvplus/multimedia'

function App() {
  return (
    <MultimediaProvider config={multimediaConfig}>
      {/* Your multimedia components */}
    </MultimediaProvider>
  )
}
```

### Error Handling

Use error boundaries to handle component errors gracefully:

```typescript
import { ErrorBoundary } from '@cvplus/multimedia'

function MyComponent() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <VideoIntroduction script="Hello world" />
    </ErrorBoundary>
  )
}
```

### Feature Flags

Control feature availability with feature wrappers:

```typescript
import { FeatureWrapper } from '@cvplus/multimedia'

function ConditionalFeature() {
  return (
    <FeatureWrapper feature="videoGeneration" enabled={true}>
      <VideoIntroduction script="Feature enabled!" />
    </FeatureWrapper>
  )
}
```

## Props Conventions

### Common Props

All components support these common props:

```typescript
interface CommonProps {
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}
```

### Event Handlers

Event handlers follow consistent naming:

```typescript
interface EventHandlers {
  onComplete?: (result: any) => void
  onError?: (error: Error) => void
  onProgress?: (progress: number) => void
  onCancel?: () => void
}
```

### Configuration Props

Configuration props are typically objects:

```typescript
interface ConfigProps {
  config?: {
    // Feature-specific configuration
    apiEndpoint?: string
    timeout?: number
    retries?: number
  }
}
```

## Styling

### CSS Classes

All components provide consistent CSS classes for styling:

```css
/* Component root */
.multimedia-component {
  /* Base styles */
}

/* Component variants */
.multimedia-component--variant {
  /* Variant-specific styles */
}

/* Component states */
.multimedia-component--loading {
  /* Loading state styles */
}

.multimedia-component--error {
  /* Error state styles */
}
```

### Theme Integration

Components integrate with theme providers:

```typescript
import { ThemeProvider } from 'styled-components'

const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d'
  }
}

function ThemedApp() {
  return (
    <ThemeProvider theme={theme}>
      <MultimediaProvider>
        {/* Components will use theme colors */}
      </MultimediaProvider>
    </ThemeProvider>
  )
}
```

## Accessibility

All components follow WCAG 2.1 guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Logical focus order

## Performance

### Optimization Strategies

- **Lazy Loading**: Components load content on demand
- **Memoization**: React.memo for pure components
- **Code Splitting**: Dynamic imports for large components
- **Virtual Scrolling**: For large lists and galleries

### Bundle Size

| Component Category | Gzipped Size | Tree Shakeable |
|-------------------|--------------|----------------|
| Core | 15KB | Yes |
| Display | 25KB | Yes |
| Interactive | 35KB | Yes |
| Utilities | 20KB | Yes |
| Advanced | 40KB | Yes |

## Testing

### Testing Utilities

```typescript
import { render, screen } from '@testing-library/react'
import { MultimediaTestProvider } from '@cvplus/multimedia/testing'

function renderWithProvider(component: React.ReactElement) {
  return render(
    <MultimediaTestProvider>
      {component}
    </MultimediaTestProvider>
  )
}

// Test example
test('VideoIntroduction renders correctly', () => {
  renderWithProvider(<VideoIntroduction script="Test" />)
  expect(screen.getByRole('button')).toBeInTheDocument()
})
```

### Mock Services

Testing utilities include mock services:

```typescript
import { mockVideoService } from '@cvplus/multimedia/testing'

beforeEach(() => {
  mockVideoService.generateVideo.mockResolvedValue({
    id: 'video-123',
    url: 'https://example.com/video.mp4'
  })
})
```

## Migration Guide

### From v1.x to v2.x

Key breaking changes:

1. **Provider Props**: Config structure changed
2. **Event Handlers**: Standardized naming convention
3. **CSS Classes**: Updated class naming system

See [Migration Guide](../guides/migration/v1-to-v2.md) for detailed instructions.

## Support

- **Component Documentation**: Detailed docs for each component
- **Interactive Examples**: [Storybook](https://multimedia-storybook.cvplus.io)
- **TypeScript Support**: Full TypeScript definitions included
- **Community**: [Discord](https://discord.gg/cvplus) for questions and support