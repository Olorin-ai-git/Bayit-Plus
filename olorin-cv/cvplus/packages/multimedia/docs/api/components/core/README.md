# Core Components API

Essential components that provide the foundation for multimedia functionality.

## Table of Contents

- [MultimediaProvider](#multimediaprovider)
- [ErrorBoundary](#errorboundary)
- [FeatureWrapper](#featurewrapper)

## MultimediaProvider

The root provider component that supplies multimedia context to all child components.

### Props

```typescript
interface MultimediaProviderProps {
  children: React.ReactNode
  config: MultimediaConfig
}

interface MultimediaConfig {
  apiEndpoint: string
  providers: {
    video?: 'heygen' | 'runwayml' | 'auto'
    analytics?: boolean
  }
  features: {
    videoGeneration?: boolean
    podcastGeneration?: boolean
    portfolioGallery?: boolean
    qrGeneration?: boolean
  }
  auth?: {
    apiKey?: string
    firebaseConfig?: FirebaseConfig
  }
  performance?: {
    enableCaching?: boolean
    cacheTimeout?: number
    retryAttempts?: number
  }
}
```

### Usage

```typescript
import { MultimediaProvider } from '@cvplus/multimedia'

const config = {
  apiEndpoint: 'https://your-api.firebaseio.com',
  providers: {
    video: 'heygen',
    analytics: true
  },
  features: {
    videoGeneration: true,
    podcastGeneration: true,
    portfolioGallery: true,
    qrGeneration: true
  },
  auth: {
    apiKey: process.env.MULTIMEDIA_API_KEY
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    retryAttempts: 3
  }
}

function App() {
  return (
    <MultimediaProvider config={config}>
      <YourAppComponents />
    </MultimediaProvider>
  )
}
```

### Context Values

The provider exposes these values through context:

```typescript
interface MultimediaContext {
  config: MultimediaConfig
  services: {
    videoService: VideoGenerationService
    podcastService: PodcastGenerationService
    mediaService: MediaProcessingService
    qrService: QRGenerationService
  }
  state: {
    loading: boolean
    error: Error | null
    user: User | null
  }
  actions: {
    refreshServices: () => Promise<void>
    clearCache: () => void
    updateConfig: (newConfig: Partial<MultimediaConfig>) => void
  }
}
```

### Accessing Context

```typescript
import { useMultimediaContext } from '@cvplus/multimedia'

function MyComponent() {
  const { services, state, actions } = useMultimediaContext()
  
  const generateVideo = async () => {
    const result = await services.videoService.generateVideo({
      script: 'Hello world'
    })
  }
  
  return (
    <div>
      {state.loading && <LoadingSpinner />}
      <button onClick={generateVideo}>Generate Video</button>
    </div>
  )
}
```

---

## ErrorBoundary

React error boundary component for handling multimedia-related errors gracefully.

### Props

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  componentStack: string | null
}
```

### Usage

```typescript
import { ErrorBoundary } from '@cvplus/multimedia'

function CustomErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetError}>Try again</button>
    </div>
  )
}

function MyComponent() {
  return (
    <ErrorBoundary
      fallback={CustomErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Multimedia error:', error, errorInfo)
        // Send to error reporting service
      }}
    >
      <VideoIntroduction script="Hello world" />
    </ErrorBoundary>
  )
}
```

### Default Fallback

If no custom fallback is provided, the default fallback renders:

```typescript
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="multimedia-error-boundary">
      <h3>Multimedia Component Error</h3>
      <details>
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={resetError}>Retry</button>
    </div>
  )
}
```

### Error Recovery

The error boundary supports automatic recovery:

```typescript
<ErrorBoundary
  resetOnPropsChange={true}
  resetKeys={[userId, videoId]}
>
  <VideoIntroduction script="Hello world" />
</ErrorBoundary>
```

---

## FeatureWrapper

Conditional wrapper component for feature flag control.

### Props

```typescript
interface FeatureWrapperProps {
  children: React.ReactNode
  feature: FeatureFlag
  enabled?: boolean
  fallback?: React.ReactNode
  onDisabled?: () => void
  loadingComponent?: React.ComponentType
}

type FeatureFlag = 
  | 'videoGeneration'
  | 'podcastGeneration'
  | 'portfolioGallery'
  | 'qrGeneration'
  | 'analytics'
  | 'advancedFeatures'
```

### Usage

```typescript
import { FeatureWrapper } from '@cvplus/multimedia'

function ConditionalVideo() {
  return (
    <FeatureWrapper
      feature="videoGeneration"
      enabled={user.hasVideoAccess}
      fallback={<UpgradePrompt feature="video" />}
    >
      <VideoIntroduction script="Premium feature!" />
    </FeatureWrapper>
  )
}
```

### Dynamic Feature Control

Features can be controlled dynamically:

```typescript
function DynamicFeatures() {
  const [features, setFeatures] = useState({
    videoGeneration: true,
    analytics: false
  })
  
  return (
    <div>
      <FeatureWrapper
        feature="videoGeneration"
        enabled={features.videoGeneration}
      >
        <VideoIntroduction script="Dynamic feature" />
      </FeatureWrapper>
      
      <button 
        onClick={() => setFeatures(prev => ({
          ...prev,
          analytics: !prev.analytics
        }))}
      >
        Toggle Analytics
      </button>
    </div>
  )
}
```

### Loading States

Handle loading states for dynamic feature checks:

```typescript
function LoadableFeature() {
  return (
    <FeatureWrapper
      feature="advancedFeatures"
      loadingComponent={FeatureLoadingSpinner}
      fallback={<FeatureNotAvailable />}
    >
      <AdvancedAnalyticsDashboard />
    </FeatureWrapper>
  )
}
```

## Common Patterns

### Error Handling with Recovery

```typescript
function RobustComponent() {
  const [retryKey, setRetryKey] = useState(0)
  
  return (
    <ErrorBoundary
      resetKeys={[retryKey]}
      onError={() => {
        setTimeout(() => setRetryKey(prev => prev + 1), 5000)
      }}
      fallback={({ error, resetError }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetError}>Retry Now</button>
        </div>
      )}
    >
      <MultimediaProvider config={config}>
        <VideoIntroduction script="Resilient component" />
      </MultimediaProvider>
    </ErrorBoundary>
  )
}
```

### Feature-gated Provider

```typescript
function ConditionalProvider({ children }: { children: React.ReactNode }) {
  return (
    <FeatureWrapper feature="videoGeneration">
      <MultimediaProvider config={videoConfig}>
        {children}
      </MultimediaProvider>
    </FeatureWrapper>
  )
}
```

## Testing

### Testing with Providers

```typescript
import { render } from '@testing-library/react'
import { MultimediaTestProvider } from '@cvplus/multimedia/testing'

function renderWithProviders(component: React.ReactElement) {
  return render(
    <MultimediaTestProvider>
      {component}
    </MultimediaTestProvider>
  )
}
```

### Testing Error Boundaries

```typescript
import { screen } from '@testing-library/react'

function ThrowError() {
  throw new Error('Test error')
}

test('error boundary handles errors', () => {
  renderWithProviders(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})
```

### Testing Feature Flags

```typescript
test('feature wrapper shows content when enabled', () => {
  renderWithProviders(
    <FeatureWrapper feature="videoGeneration" enabled={true}>
      <div>Feature enabled</div>
    </FeatureWrapper>
  )
  
  expect(screen.getByText('Feature enabled')).toBeInTheDocument()
})
```

## Performance Considerations

### Provider Optimization

- **Memoization**: Provider values are memoized to prevent unnecessary re-renders
- **Service Caching**: Services are cached and reused across components
- **Lazy Initialization**: Services are initialized only when first accessed

### Error Boundary Performance

- **Error Recovery**: Automatic recovery prevents cascading failures
- **Fallback Optimization**: Lightweight fallback components improve performance
- **Error Reporting**: Efficient error reporting without blocking UI

## Migration Notes

### v1.x to v2.x

- **Provider Config**: Config structure changed, see migration guide
- **Context API**: Context shape updated, update hook usage
- **Error Boundaries**: Enhanced with recovery features

## Support

- **TypeScript**: Full type definitions included
- **Testing**: Comprehensive testing utilities provided
- **Documentation**: Detailed examples and patterns
- **Community**: [Discord](https://discord.gg/cvplus) for support