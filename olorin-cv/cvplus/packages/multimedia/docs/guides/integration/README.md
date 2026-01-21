# Integration Guide

Complete guide for integrating the CVPlus Multimedia Module into your project.

## Table of Contents

- [Parent Project Integration](#parent-project-integration)
- [Standalone Integration](#standalone-integration)
- [Firebase Setup](#firebase-setup)
- [Configuration](#configuration)
- [Component Migration](#component-migration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Parent Project Integration

### Quick Start

The fastest way to integrate multimedia capabilities into your existing CVPlus project.

#### 1. Install the Package

```bash
npm install @cvplus/multimedia
# or
yarn add @cvplus/multimedia
```

#### 2. Install Peer Dependencies

```bash
npm install react react-dom @types/react @types/react-dom
npm install firebase-functions firebase-admin  # For backend features
```

#### 3. Basic Setup

```typescript
// src/App.tsx
import React from 'react'
import { MultimediaProvider } from '@cvplus/multimedia'
import { multimediaConfig } from './config/multimedia'

function App() {
  return (
    <MultimediaProvider config={multimediaConfig}>
      <YourExistingApp />
    </MultimediaProvider>
  )
}

export default App
```

```typescript
// src/config/multimedia.ts
import { MultimediaConfig } from '@cvplus/multimedia'

export const multimediaConfig: MultimediaConfig = {
  apiEndpoint: process.env.REACT_APP_FIREBASE_ENDPOINT || '',
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
    apiKey: process.env.REACT_APP_MULTIMEDIA_API_KEY
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    retryAttempts: 3
  }
}
```

#### 4. Use Components

```typescript
// src/components/ProfilePage.tsx
import React from 'react'
import { 
  VideoIntroduction,
  PodcastPlayer,
  PortfolioGallery,
  EnhancedQRCode
} from '@cvplus/multimedia'

interface ProfilePageProps {
  user: User
  portfolioItems: GalleryItem[]
}

function ProfilePage({ user, portfolioItems }: ProfilePageProps) {
  return (
    <div className="profile-page">
      {/* AI-Generated Video Introduction */}
      <section className="video-section">
        <VideoIntroduction
          script={`Hello, I'm ${user.name}. ${user.professionalSummary}`}
          style="professional"
          provider="heygen"
          onComplete={(video) => {
            // Save video URL to user profile
            updateUserProfile({ videoUrl: video.url })
          }}
        />
      </section>

      {/* Portfolio Gallery */}
      <section className="portfolio-section">
        <PortfolioGallery
          items={portfolioItems}
          layout="masonry"
          enableFiltering={true}
          categories={['web', 'mobile', 'design']}
        />
      </section>

      {/* Contact QR Code */}
      <section className="contact-section">
        <EnhancedQRCode
          value={`https://cvplus.io/profile/${user.id}`}
          size={200}
          logo={user.profilePicture}
          onScan={(data) => {
            analytics.track('qr_scan', { profileId: user.id })
          }}
        />
      </section>
    </div>
  )
}

export default ProfilePage
```

### Advanced Integration

#### Environment Configuration

```bash
# .env.local
REACT_APP_FIREBASE_ENDPOINT=https://your-project-default-rtdb.firebaseio.com/
REACT_APP_MULTIMEDIA_API_KEY=your_multimedia_api_key
REACT_APP_HEYGEN_API_KEY=your_heygen_api_key
REACT_APP_RUNWAYML_API_KEY=your_runwayml_api_key
```

#### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@cvplus/multimedia/types"]
  }
}
```

#### Webpack Configuration (if needed)

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@cvplus/multimedia': require.resolve('@cvplus/multimedia')
    }
  }
}
```

---

## Standalone Integration

For projects that need specific multimedia features without the full CVPlus ecosystem.

### Installation

```bash
npm install @cvplus/multimedia
```

### Basic Standalone Usage

```typescript
// src/multimedia.ts
import { StandaloneIntegration } from '@cvplus/multimedia/standalone'

export const multimedia = new StandaloneIntegration({
  features: ['video', 'qr', 'media'],
  config: {
    apiEndpoint: 'https://your-api.com',
    apiKey: 'your-api-key',
    providers: {
      video: 'heygen'
    }
  }
})

// Generate video
export async function createVideoIntroduction(script: string) {
  try {
    const video = await multimedia.generateVideo({
      script,
      style: 'professional',
      provider: 'heygen'
    })
    return video
  } catch (error) {
    console.error('Video generation failed:', error)
    throw error
  }
}

// Generate QR code
export async function createQRCode(value: string, options?: QROptions) {
  return await multimedia.generateQR(value, options)
}
```

### React Integration (Standalone)

```typescript
// src/components/StandaloneVideo.tsx
import React, { useState } from 'react'
import { multimedia } from '../multimedia'

function StandaloneVideoGenerator() {
  const [script, setScript] = useState('')
  const [video, setVideo] = useState<VideoResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await multimedia.generateVideo({
        script,
        style: 'professional'
      })
      setVideo(result)
    } catch (error) {
      console.error('Generation failed:', error)
    }
    setLoading(false)
  }

  return (
    <div>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Enter your video script..."
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Video'}
      </button>
      {video && (
        <video src={video.url} controls width="100%" />
      )}
    </div>
  )
}
```

---

## Firebase Setup

### Backend Functions Setup

#### 1. Install Dependencies

```bash
cd functions
npm install @cvplus/multimedia firebase-functions firebase-admin
```

#### 2. Configure Functions

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions'
import { 
  generateVideoIntroduction,
  generatePodcast,
  portfolioGallery,
  enhancedQR
} from '@cvplus/multimedia/functions'

// Export multimedia functions
export const videoIntroduction = generateVideoIntroduction
export const podcast = generatePodcast
export const gallery = portfolioGallery
export const qrCode = enhancedQR

// Custom function with multimedia services
export const customVideoProcess = functions.https.onCall(async (data, context) => {
  const { VideoGenerationService } = await import('@cvplus/multimedia/services')
  
  const videoService = new VideoGenerationService({
    apiKey: functions.config().heygen.key
  })
  
  return await videoService.generateVideo(data)
})
```

#### 3. Environment Variables

```bash
# Set Firebase function config
firebase functions:config:set heygen.key="your_heygen_api_key"
firebase functions:config:set runwayml.key="your_runwayml_api_key"
firebase functions:config:set multimedia.api_key="your_multimedia_api_key"
```

### Firestore Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Multimedia data rules
    match /videos/{videoId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /podcasts/{podcastId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /galleries/{galleryId} {
      allow read: if true; // Public galleries
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /multimedia/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /public/multimedia/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Configuration

### Complete Configuration Reference

```typescript
interface MultimediaConfig {
  // API Configuration
  apiEndpoint: string
  apiKey?: string
  
  // Provider Configuration
  providers: {
    video?: 'heygen' | 'runwayml' | 'auto'
    analytics?: boolean
    storage?: 'firebase' | 's3' | 'cloudinary'
  }
  
  // Feature Flags
  features: {
    videoGeneration?: boolean
    podcastGeneration?: boolean
    portfolioGallery?: boolean
    qrGeneration?: boolean
    analytics?: boolean
    advancedFeatures?: boolean
  }
  
  // Authentication
  auth?: {
    apiKey?: string
    firebaseConfig?: {
      apiKey: string
      authDomain: string
      projectId: string
      storageBucket: string
      messagingSenderId: string
      appId: string
    }
  }
  
  // Performance Settings
  performance?: {
    enableCaching?: boolean
    cacheTimeout?: number
    retryAttempts?: number
    timeoutMs?: number
  }
  
  // UI Configuration
  ui?: {
    theme?: 'light' | 'dark' | 'auto'
    locale?: string
    customCSS?: string
  }
  
  // Analytics Configuration
  analytics?: {
    trackingId?: string
    enableUserTracking?: boolean
    customEvents?: string[]
  }
}
```

### Environment-Specific Configurations

```typescript
// config/environments/development.ts
export const developmentConfig: MultimediaConfig = {
  apiEndpoint: 'http://localhost:5001/your-project/us-central1',
  providers: {
    video: 'heygen', // Use single provider for development
    analytics: false
  },
  features: {
    videoGeneration: true,
    podcastGeneration: true,
    portfolioGallery: true,
    qrGeneration: true
  },
  performance: {
    enableCaching: false, // Disable caching in development
    retryAttempts: 1
  }
}

// config/environments/production.ts
export const productionConfig: MultimediaConfig = {
  apiEndpoint: 'https://us-central1-your-project.cloudfunctions.net',
  providers: {
    video: 'auto', // Use intelligent provider selection
    analytics: true,
    storage: 'firebase'
  },
  features: {
    videoGeneration: true,
    podcastGeneration: true,
    portfolioGallery: true,
    qrGeneration: true,
    analytics: true,
    advancedFeatures: true
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 600000, // 10 minutes
    retryAttempts: 3
  }
}
```

---

## Component Migration

### Migrating from Legacy Components

#### Video Components

```typescript
// Before (Legacy)
import { VideoPlayer } from '../components/video/VideoPlayer'

<VideoPlayer 
  src="/video.mp4"
  autoplay={true}
/>

// After (Multimedia Module)
import { VideoIntroduction, VideoPlayer } from '@cvplus/multimedia'

<VideoIntroduction
  script="Professional introduction"
  style="professional"
  onComplete={(video) => setVideoUrl(video.url)}
/>

<VideoPlayer
  src={videoUrl}
  controls={true}
  quality="auto"
/>
```

#### Gallery Components

```typescript
// Before (Legacy)
import { ImageGallery } from '../components/gallery/ImageGallery'

<ImageGallery images={images} />

// After (Multimedia Module)
import { PortfolioGallery } from '@cvplus/multimedia'

<PortfolioGallery
  items={images.map(img => ({
    id: img.id,
    src: img.url,
    alt: img.description,
    category: img.type
  }))}
  layout="masonry"
  enableFiltering={true}
/>
```

#### Audio Components

```typescript
// Before (Legacy)
import { AudioPlayer } from '../components/audio/AudioPlayer'

<AudioPlayer src="/audio.mp3" />

// After (Multimedia Module)
import { PodcastPlayer } from '@cvplus/multimedia'

<PodcastPlayer
  src="/audio.mp3"
  title="My Podcast"
  showWaveform={true}
  onProgress={(progress) => saveProgress(progress)}
/>
```

### Migration Checklist

- [ ] Install `@cvplus/multimedia` package
- [ ] Remove legacy multimedia components
- [ ] Update imports to use new components
- [ ] Configure `MultimediaProvider` with appropriate settings
- [ ] Update component props to match new API
- [ ] Test all multimedia functionality
- [ ] Update TypeScript types if needed
- [ ] Update tests to use new component structure

---

## Best Practices

### Performance Optimization

```typescript
// Lazy load multimedia components
import { lazy, Suspense } from 'react'

const VideoIntroduction = lazy(() => 
  import('@cvplus/multimedia').then(module => ({ 
    default: module.VideoIntroduction 
  }))
)

function LazyVideoComponent() {
  return (
    <Suspense fallback={<VideoLoadingSkeleton />}>
      <VideoIntroduction script="Professional introduction" />
    </Suspense>
  )
}
```

### Error Handling

```typescript
import { ErrorBoundary } from '@cvplus/multimedia'

function RobustMultimediaApp() {
  return (
    <ErrorBoundary
      fallback={MultimediaErrorFallback}
      onError={(error, errorInfo) => {
        // Log to error reporting service
        errorReporting.captureException(error, {
          extra: errorInfo
        })
      }}
    >
      <MultimediaProvider config={config}>
        <YourApp />
      </MultimediaProvider>
    </ErrorBoundary>
  )
}
```

### Security Best Practices

```typescript
// Validate user permissions before enabling features
const userFeatures = {
  videoGeneration: user.plan === 'premium',
  analytics: user.hasAnalyticsAccess,
  advancedFeatures: user.role === 'admin'
}

<MultimediaProvider
  config={{
    ...baseConfig,
    features: userFeatures
  }}
>
  <YourApp />
</MultimediaProvider>
```

### Testing Best Practices

```typescript
// Use testing utilities
import { MultimediaTestProvider, mockVideoService } from '@cvplus/multimedia/testing'

beforeEach(() => {
  mockVideoService.generateVideo.mockResolvedValue({
    id: 'test-video',
    url: 'https://example.com/test-video.mp4'
  })
})

function renderWithMultimedia(component) {
  return render(
    <MultimediaTestProvider>
      {component}
    </MultimediaTestProvider>
  )
}
```

---

## Troubleshooting

### Common Issues

#### Issue: Components not loading

**Symptoms:** Components render but functionality doesn't work

**Solutions:**
1. Ensure `MultimediaProvider` wraps your app
2. Check API endpoint configuration
3. Verify authentication credentials
4. Check browser console for errors

```typescript
// Debug configuration
console.log('Multimedia config:', multimediaConfig)

// Check provider context
const { services, state } = useMultimediaContext()
console.log('Services available:', Object.keys(services))
console.log('Current state:', state)
```

#### Issue: Firebase functions not found

**Symptoms:** Network errors when calling multimedia functions

**Solutions:**
1. Deploy Firebase functions: `firebase deploy --only functions`
2. Check function names match exports
3. Verify Firebase project configuration
4. Check CORS settings

```bash
# Check Firebase functions
firebase functions:list

# Check function logs
firebase functions:log
```

#### Issue: Video generation fails

**Symptoms:** Video generation returns errors

**Solutions:**
1. Check API keys for video providers
2. Verify account quotas and limits
3. Test with shorter scripts
4. Check provider status pages

```typescript
// Debug video generation
const videoService = new VideoGenerationService({
  debug: true, // Enable debug mode
  apiKey: 'your-key'
})

try {
  const result = await videoService.generateVideo({
    script: 'Test script',
    style: 'professional'
  })
} catch (error) {
  console.error('Video generation error:', error)
  // Check error.code for specific error types
}
```

### Performance Issues

#### Large bundle size

**Solutions:**
- Use specific imports: `import { VideoIntroduction } from '@cvplus/multimedia/components'`
- Enable tree shaking in your bundler
- Use lazy loading for multimedia components

#### Slow component loading

**Solutions:**
- Enable caching in configuration
- Implement component memoization
- Use loading states and skeletons

### Getting Help

- **Documentation:** Complete API documentation
- **GitHub Issues:** [Report bugs and request features](https://github.com/gilco1973/cvplus-multimedia/issues)
- **Discord Community:** [Join our community](https://discord.gg/cvplus)
- **Professional Support:** [Enterprise support](https://cvplus.io/enterprise)

---

This integration guide provides comprehensive instructions for incorporating the CVPlus Multimedia Module into any project, whether as part of the CVPlus ecosystem or as a standalone solution.