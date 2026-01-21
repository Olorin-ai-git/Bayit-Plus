# API Reference

Complete API documentation for the CVPlus Multimedia Module.

## Table of Contents

- [Components API](components/README.md)
  - [Core Components](components/core/README.md)
  - [Display Components](components/display/README.md)
  - [Interactive Components](components/interactive/README.md)
  - [Utilities Components](components/utilities/README.md)
  - [Advanced Components](components/advanced/README.md)
- [Services API](services/README.md)
  - [Video Generation Service](services/video-generation.md)
  - [Podcast Generation Service](services/podcast-generation.md)
  - [Media Processing Service](services/media-processing.md)
  - [QR Generation Service](services/qr-generation.md)
  - [Analytics Service](services/analytics.md)
- [Types API](types/README.md)
  - [Core Types](types/core.md)
  - [Component Types](types/components.md)
  - [Service Types](types/services.md)
  - [Configuration Types](types/configuration.md)

## Quick Reference

### Core Components

```typescript
// Video Generation
<VideoIntroduction 
  script="Professional introduction"
  style="professional"
  provider="heygen"
  onComplete={(video) => console.log('Generated:', video)}
/>

// Podcast Player
<PodcastPlayer
  src="/podcast.mp3"
  title="My Journey"
  showWaveform={true}
/>

// Portfolio Gallery
<PortfolioGallery
  items={portfolioItems}
  layout="masonry"
  enableFiltering={true}
/>

// Enhanced QR Code
<EnhancedQRCode
  value="https://myprofile.com"
  size={200}
  logo="/logo.png"
/>
```

### Core Services

```typescript
// Video Generation
const videoService = new VideoGenerationService()
const video = await videoService.generateVideo({
  script: "Hello world",
  style: "professional"
})

// Podcast Generation
const podcastService = new PodcastGenerationService()
const script = await podcastService.generateScript("My career journey")
const audio = await podcastService.generateAudio(script)

// Media Processing
const mediaService = new MediaProcessingService()
const processedImage = await mediaService.processImage(file, {
  quality: 0.8,
  format: 'webp'
})
```

### Configuration

```typescript
// Provider Configuration
<MultimediaProvider
  config={{
    apiEndpoint: 'https://your-api.com',
    providers: {
      video: 'heygen',
      analytics: true
    },
    features: {
      videoGeneration: true,
      podcastGeneration: true,
      portfolioGallery: true,
      qrGeneration: true
    }
  }}
>
  {children}
</MultimediaProvider>
```

## Error Handling

All APIs follow consistent error handling patterns:

```typescript
try {
  const result = await service.performOperation(params)
  // Handle success
} catch (error) {
  if (error instanceof MultimediaError) {
    console.error('Multimedia error:', error.code, error.message)
    // Handle specific multimedia errors
  } else {
    console.error('Unexpected error:', error)
    // Handle generic errors
  }
}
```

## Performance Considerations

- **Lazy Loading**: Components are lazy loaded by default
- **Caching**: Results are cached automatically for improved performance
- **Rate Limiting**: API calls are rate limited to prevent abuse
- **Circuit Breakers**: Automatic failover for improved reliability

## Authentication

Most APIs require authentication:

```typescript
// Configure authentication
const config = {
  apiKey: 'your-api-key',
  authToken: 'user-auth-token'
}

// Or use Firebase Auth
const user = auth.currentUser
if (user) {
  const token = await user.getIdToken()
  // Use token in API calls
}
```

## Versioning

The API follows semantic versioning:
- **Major versions** (2.x.x): Breaking changes
- **Minor versions** (x.3.x): New features, backward compatible
- **Patch versions** (x.x.0): Bug fixes, backward compatible

Current API version: **2.3.0**

## Rate Limits

API endpoints have the following rate limits:
- **Video Generation**: 10 requests per minute
- **Podcast Generation**: 5 requests per minute  
- **Media Processing**: 100 requests per minute
- **QR Generation**: 1000 requests per minute

## Support

For API support:
- **Documentation**: Complete API documentation in this section
- **Examples**: Live examples in [Storybook](https://multimedia-storybook.cvplus.io)
- **Issues**: [GitHub Issues](https://github.com/gilco1973/cvplus-multimedia/issues)
- **Community**: [Discord](https://discord.gg/cvplus)