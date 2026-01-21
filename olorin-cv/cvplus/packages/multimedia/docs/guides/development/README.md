# Development Guide

Complete guide for developing with and contributing to the CVPlus Multimedia Module.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guide](#testing-guide)
- [Debugging](#debugging)
- [Performance Guidelines](#performance-guidelines)
- [Contributing](#contributing)

## Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js 18+**: LTS version recommended
- **TypeScript 5.0+**: For type safety and development
- **Firebase CLI**: For backend function development
- **Git**: Version control and collaboration
- **VS Code**: Recommended editor with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "firebase.firebase-vscode",
    "ms-playwright.playwright",
    "mermaid-js.mermaid-markdown-syntax-highlighting"
  ]
}
```

### Initial Setup

#### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/gilco1973/cvplus-multimedia.git
cd cvplus-multimedia

# Install dependencies
npm install

# Install global tools (optional)
npm install -g firebase-tools
npm install -g typescript
npm install -g prettier
npm install -g eslint
```

#### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your configuration
# Required variables:
# REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
# REACT_APP_HEYGEN_API_KEY=your_heygen_api_key
# REACT_APP_RUNWAYML_API_KEY=your_runwayml_api_key
# REACT_APP_CLAUDE_API_KEY=your_claude_api_key
```

#### 3. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize project (if not already configured)
firebase init

# Set function configuration
firebase functions:config:set heygen.key="your_heygen_api_key"
firebase functions:config:set runwayml.key="your_runwayml_api_key"
firebase functions:config:set claude.key="your_claude_api_key"
```

#### 4. Start Development

```bash
# Start development server
npm run dev

# Start Firebase emulators (in separate terminal)
npm run firebase:emulate

# Run tests (in separate terminal)
npm run test:watch
```

## Project Structure

### Directory Organization

```
src/
├── components/                 # React components
│   ├── core/                  # Core functionality components
│   ├── display/               # Display components (galleries, players)
│   ├── interactive/           # Interactive components (QR, video gen)
│   ├── utilities/             # Utility components (upload, processing)
│   └── advanced/              # Advanced features (analytics, AI)
├── backend/                   # Firebase functions and services
│   ├── functions/             # Cloud functions
│   ├── services/              # Business logic services
│   ├── middleware/            # Authentication and validation
│   ├── types/                 # Backend type definitions
│   └── utils/                 # Backend utilities
├── services/                  # Client-side services
│   ├── audio/                 # Audio processing services
│   ├── image/                 # Image processing services
│   ├── video/                 # Video processing services
│   ├── base/                  # Base service classes
│   └── utils/                 # Service utilities
├── types/                     # TypeScript type definitions
├── constants/                 # Application constants
├── utils/                     # Shared utilities
└── processors/                # Media processors
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `VideoIntroduction.tsx`)
- **Services**: PascalCase with suffix (e.g., `VideoGenerationService.ts`)
- **Types**: camelCase with suffix (e.g., `video.types.ts`)
- **Utils**: camelCase (e.g., `mediaUtils.ts`)
- **Constants**: UPPER_CASE (e.g., `API_ENDPOINTS.ts`)

### Import/Export Patterns

```typescript
// Barrel exports in index files
export { VideoIntroduction } from './VideoIntroduction'
export { PodcastPlayer } from './PodcastPlayer'
export type { VideoIntroductionProps, PodcastPlayerProps } from './types'

// Named imports in components
import { VideoIntroduction, PodcastPlayer } from '@cvplus/multimedia'
import type { VideoIntroductionProps } from '@cvplus/multimedia/types'

// Service imports
import { VideoGenerationService } from '@cvplus/multimedia/services'
```

## Development Workflow

### Branch Strategy

```bash
# Main branches
main           # Production-ready code
develop        # Integration branch for features

# Feature branches
feature/video-enhancement      # New features
bugfix/qr-rendering-issue     # Bug fixes
hotfix/security-patch         # Critical fixes
release/v2.4.0               # Release preparation
```

### Development Process

#### 1. Starting New Work

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-multimedia-feature

# Create development plan
# - Document requirements
# - Create architecture diagrams
# - Define acceptance criteria
```

#### 2. Development Cycle

```bash
# Make changes with tests
# Run tests frequently
npm run test

# Check TypeScript
npm run type-check

# Lint and format
npm run lint:fix
npm run format

# Commit with conventional commits
git add .
git commit -m "feat(video): add multi-provider fallback system"
```

#### 3. Integration Testing

```bash
# Run full test suite
npm run test:all

# Build all targets
npm run build:all

# Test integration
npm run test:integration

# Performance testing
npm run test:performance
```

#### 4. Code Review Process

```bash
# Push feature branch
git push origin feature/new-multimedia-feature

# Create pull request
# - Clear description
# - Link to issues
# - Add reviewers
# - Run CI checks
```

### Daily Development Commands

```bash
# Development server with hot reload
npm run dev

# Build specific targets
npm run build:minimal      # Minimal build
npm run build:full         # Full featured build
npm run build:frontend     # Frontend only
npm run build:standalone   # Standalone package

# Testing commands
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests

# Quality commands
npm run lint              # ESLint check
npm run lint:fix          # Fix linting issues
npm run type-check        # TypeScript check
npm run format            # Prettier formatting
npm run format:check      # Check formatting

# Firebase commands
npm run firebase:emulate  # Start emulators
npm run firebase:deploy   # Deploy functions
npm run firebase:logs     # View logs
```

## Coding Standards

### TypeScript Guidelines

#### Strict Type Safety

```typescript
// Use strict TypeScript configuration
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}

// Prefer interfaces over types for object shapes
interface VideoOptions {
  script: string
  style: 'professional' | 'casual' | 'corporate'
  provider?: VideoProvider
}

// Use enums for constants
enum VideoProvider {
  HEYGEN = 'heygen',
  RUNWAYML = 'runwayml',
  AUTO = 'auto'
}

// Generic constraints
interface ServiceResponse<T> {
  data: T
  status: 'success' | 'error'
  message?: string
}

function processResponse<T extends Record<string, any>>(
  response: ServiceResponse<T>
): T {
  if (response.status === 'error') {
    throw new Error(response.message)
  }
  return response.data
}
```

#### Component Props Pattern

```typescript
// Define props with clear documentation
interface VideoIntroductionProps {
  /**
   * Script content for video generation
   */
  script: string
  
  /**
   * Visual style of the generated video
   * @default 'professional'
   */
  style?: VideoStyle
  
  /**
   * Preferred video generation provider
   * @default 'auto'
   */
  provider?: VideoProvider
  
  /**
   * Callback fired when video generation completes
   */
  onComplete?: (video: VideoResult) => void
  
  /**
   * Callback fired when an error occurs
   */
  onError?: (error: MultimediaError) => void
  
  /**
   * Additional CSS class names
   */
  className?: string
  
  /**
   * Test identifier for automated testing
   */
  'data-testid'?: string
}

// Use React.FC with proper typing
const VideoIntroduction: React.FC<VideoIntroductionProps> = ({
  script,
  style = 'professional',
  provider = 'auto',
  onComplete,
  onError,
  className,
  'data-testid': testId
}) => {
  // Component implementation
}
```

#### Service Class Pattern

```typescript
// Abstract base service
abstract class BaseMultimediaService {
  protected readonly config: ServiceConfig
  protected readonly logger: Logger
  
  constructor(config: ServiceConfig) {
    this.config = config
    this.logger = new Logger(this.constructor.name)
  }
  
  protected async handleError(error: unknown): Promise<never> {
    this.logger.error('Service error:', error)
    throw new MultimediaError(
      'SERVICE_ERROR',
      'An unexpected error occurred',
      { originalError: error }
    )
  }
}

// Concrete service implementation
class VideoGenerationService extends BaseMultimediaService {
  private readonly providers: Map<VideoProvider, IVideoProvider>
  private readonly circuitBreaker: CircuitBreaker
  
  constructor(config: VideoServiceConfig) {
    super(config)
    this.providers = this.initializeProviders()
    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerOptions)
  }
  
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    try {
      const provider = this.selectProvider(options.provider)
      return await this.circuitBreaker.execute(() => 
        provider.generateVideo(options)
      )
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  private selectProvider(requested?: VideoProvider): IVideoProvider {
    // Provider selection logic
  }
  
  private initializeProviders(): Map<VideoProvider, IVideoProvider> {
    // Provider initialization
  }
}
```

### React Best Practices

#### Component Structure

```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMultimediaContext } from '../hooks/useMultimediaContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { VideoIntroductionProps } from '../types'

// Component with proper structure
const VideoIntroduction: React.FC<VideoIntroductionProps> = ({
  script,
  style = 'professional',
  onComplete,
  onError
}) => {
  // 1. Hooks (state, context, effects)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const { videoService } = useMultimediaContext()
  
  // 2. Memoized values
  const generationOptions = useMemo(() => ({
    script,
    style,
    onProgress: setProgress
  }), [script, style])
  
  // 3. Callbacks
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const result = await videoService.generateVideo(generationOptions)
      onComplete?.(result)
    } catch (error) {
      onError?.(error as MultimediaError)
    } finally {
      setIsGenerating(false)
    }
  }, [videoService, generationOptions, onComplete, onError])
  
  // 4. Effects
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      videoService.cancelActiveJobs()
    }
  }, [videoService])
  
  // 5. Render with error boundary
  return (
    <ErrorBoundary onError={onError}>
      <div className="video-introduction">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="generate-button"
        >
          {isGenerating ? `Generating... ${progress}%` : 'Generate Video'}
        </button>
      </div>
    </ErrorBoundary>
  )
}

export default VideoIntroduction
```

#### Hooks Pattern

```typescript
// Custom hook for multimedia features
export function useVideoGeneration() {
  const { videoService } = useMultimediaContext()
  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false,
    progress: 0,
    result: null,
    error: null
  })
  
  const generate = useCallback(async (options: VideoOptions) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }))
    
    try {
      const result = await videoService.generateVideo({
        ...options,
        onProgress: (progress) => setState(prev => ({ ...prev, progress }))
      })
      
      setState(prev => ({ ...prev, result, isGenerating: false }))
      return result
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as MultimediaError, 
        isGenerating: false 
      }))
      throw error
    }
  }, [videoService])
  
  const cancel = useCallback(() => {
    videoService.cancelActiveJobs()
    setState(prev => ({ ...prev, isGenerating: false }))
  }, [videoService])
  
  return { ...state, generate, cancel }
}
```

### Error Handling Standards

```typescript
// Custom error classes
export class MultimediaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message)
    this.name = 'MultimediaError'
  }
}

export class VideoGenerationError extends MultimediaError {
  constructor(message: string, details?: Record<string, any>) {
    super('VIDEO_GENERATION_ERROR', message, details)
    this.name = 'VideoGenerationError'
  }
}

// Error handling in services
class VideoGenerationService {
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    try {
      // Validate input
      this.validateOptions(options)
      
      // Perform operation
      const result = await this.processVideo(options)
      
      // Validate output
      this.validateResult(result)
      
      return result
    } catch (error) {
      // Log error
      this.logger.error('Video generation failed:', {
        options,
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Transform to domain error
      if (error instanceof ValidationError) {
        throw new VideoGenerationError(
          'Invalid video generation options',
          { validationErrors: error.details }
        )
      }
      
      if (error instanceof ProviderError) {
        throw new VideoGenerationError(
          'Video provider error',
          { provider: error.provider, originalError: error.message }
        )
      }
      
      // Generic error
      throw new VideoGenerationError(
        'Unexpected error during video generation',
        { originalError: error }
      )
    }
  }
}
```

## Testing Guide

### Testing Philosophy

- **Test-Driven Development**: Write tests before implementation
- **Comprehensive Coverage**: Aim for >90% code coverage
- **Integration Testing**: Test component interactions
- **Performance Testing**: Validate performance requirements

### Unit Testing

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MultimediaTestProvider } from '../testing/MultimediaTestProvider'
import { VideoIntroduction } from '../VideoIntroduction'

describe('VideoIntroduction', () => {
  const defaultProps = {
    script: 'Test video script',
    style: 'professional' as const
  }
  
  function renderComponent(props = {}) {
    return render(
      <MultimediaTestProvider>
        <VideoIntroduction {...defaultProps} {...props} />
      </MultimediaTestProvider>
    )
  }
  
  test('renders generate button', () => {
    renderComponent()
    expect(screen.getByText('Generate Video')).toBeInTheDocument()
  })
  
  test('shows loading state during generation', async () => {
    const onComplete = jest.fn()
    renderComponent({ onComplete })
    
    fireEvent.click(screen.getByText('Generate Video'))
    
    expect(screen.getByText(/Generating.../)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
  
  test('handles generation errors', async () => {
    const onError = jest.fn()
    renderComponent({ onError })
    
    // Mock service to throw error
    const { mockVideoService } = await import('../testing/mocks')
    mockVideoService.generateVideo.mockRejectedValue(
      new Error('Generation failed')
    )
    
    fireEvent.click(screen.getByText('Generate Video'))
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Generation failed')
        })
      )
    })
  })
})
```

### Service Testing

```typescript
// Service testing with mocks
import { VideoGenerationService } from '../VideoGenerationService'
import { MockVideoProvider } from '../testing/mocks'

describe('VideoGenerationService', () => {
  let service: VideoGenerationService
  let mockProvider: MockVideoProvider
  
  beforeEach(() => {
    mockProvider = new MockVideoProvider()
    service = new VideoGenerationService({
      providers: { heygen: mockProvider }
    })
  })
  
  test('generates video successfully', async () => {
    const options = {
      script: 'Test script',
      style: 'professional' as const
    }
    
    const expectedResult = {
      id: 'video-123',
      url: 'https://example.com/video.mp4',
      status: 'completed'
    }
    
    mockProvider.generateVideo.mockResolvedValue(expectedResult)
    
    const result = await service.generateVideo(options)
    
    expect(result).toEqual(expectedResult)
    expect(mockProvider.generateVideo).toHaveBeenCalledWith(options)
  })
  
  test('handles provider failures with fallback', async () => {
    const options = {
      script: 'Test script',
      style: 'professional' as const
    }
    
    // Primary provider fails
    mockProvider.generateVideo
      .mockRejectedValueOnce(new Error('Provider error'))
      .mockResolvedValueOnce({ id: 'video-fallback' })
    
    const result = await service.generateVideo(options)
    
    expect(result.id).toBe('video-fallback')
    expect(mockProvider.generateVideo).toHaveBeenCalledTimes(2)
  })
})
```

### Integration Testing

```typescript
// Integration testing with Firebase emulators
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { VideoGenerationService } from '../VideoGenerationService'

describe('Video Generation Integration', () => {
  let testEnv: RulesTestEnvironment
  let service: VideoGenerationService
  
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'multimedia-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8')
      },
      functions: {
        host: 'localhost',
        port: 5001
      }
    })
    
    service = new VideoGenerationService({
      firebaseApp: testEnv.authenticatedContext('test-user').app
    })
  })
  
  afterAll(async () => {
    await testEnv.cleanup()
  })
  
  test('end-to-end video generation flow', async () => {
    // Test complete flow from API call to database storage
    const options = {
      script: 'Integration test script',
      style: 'professional' as const
    }
    
    const result = await service.generateVideo(options)
    
    // Verify result structure
    expect(result).toMatchObject({
      id: expect.stringMatching(/^video-/),
      url: expect.stringMatching(/^https?:\/\//),
      status: 'completed'
    })
    
    // Verify database storage
    const db = testEnv.authenticatedContext('test-user').firestore()
    const doc = await db.collection('videos').doc(result.id).get()
    
    expect(doc.exists).toBe(true)
    expect(doc.data()).toMatchObject({
      script: options.script,
      style: options.style,
      createdAt: expect.any(Object)
    })
  })
})
```

### Performance Testing

```typescript
// Performance benchmarking
import { performance } from 'perf_hooks'
import { VideoGenerationService } from '../VideoGenerationService'

describe('Performance Tests', () => {
  test('video generation performance', async () => {
    const service = new VideoGenerationService(testConfig)
    const options = {
      script: 'Performance test script',
      style: 'professional' as const
    }
    
    const startTime = performance.now()
    const result = await service.generateVideo(options)
    const endTime = performance.now()
    
    const duration = endTime - startTime
    
    // Performance requirements
    expect(duration).toBeLessThan(30000) // 30 seconds max
    expect(result).toBeDefined()
  })
  
  test('concurrent video generation load', async () => {
    const service = new VideoGenerationService(testConfig)
    const concurrentRequests = 10
    
    const startTime = performance.now()
    
    const promises = Array(concurrentRequests).fill(null).map((_, index) => 
      service.generateVideo({
        script: `Load test script ${index}`,
        style: 'professional'
      })
    )
    
    const results = await Promise.all(promises)
    const endTime = performance.now()
    
    const duration = endTime - startTime
    const averageTime = duration / concurrentRequests
    
    expect(results).toHaveLength(concurrentRequests)
    expect(averageTime).toBeLessThan(5000) // 5 seconds average
    
    // Verify all requests succeeded
    results.forEach(result => {
      expect(result.status).toBe('completed')
    })
  })
})
```

## Debugging

### Development Tools

#### Browser DevTools

```typescript
// Enable debugging in development
if (process.env.NODE_ENV === 'development') {
  window.__MULTIMEDIA_DEBUG__ = {
    services: multimediaServices,
    config: multimediaConfig,
    version: process.env.REACT_APP_VERSION
  }
}
```

#### Logging

```typescript
// Structured logging
import { Logger } from '../utils/Logger'

class VideoGenerationService {
  private logger = new Logger('VideoGenerationService')
  
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    this.logger.info('Starting video generation', {
      script: options.script.substring(0, 50) + '...',
      style: options.style,
      provider: options.provider
    })
    
    try {
      const result = await this.processVideo(options)
      
      this.logger.info('Video generation completed', {
        videoId: result.id,
        duration: result.metadata?.duration,
        fileSize: result.metadata?.fileSize
      })
      
      return result
    } catch (error) {
      this.logger.error('Video generation failed', {
        error: error instanceof Error ? error.message : String(error),
        options
      })
      throw error
    }
  }
}
```

#### Firebase Debugging

```bash
# Start Firebase emulators with debug logging
firebase emulators:start --debug

# View function logs in real-time
firebase functions:log --only videoGeneration

# Debug specific function locally
firebase functions:shell
```

### Common Issues and Solutions

#### Issue: Components not rendering

**Debugging steps:**
1. Check MultimediaProvider configuration
2. Verify component imports
3. Check console for errors
4. Verify feature flags

```typescript
// Debug component rendering
const DebugVideoIntroduction: React.FC = () => {
  const context = useMultimediaContext()
  
  console.log('Multimedia context:', context)
  console.log('Video service available:', !!context.videoService)
  console.log('Features enabled:', context.config.features)
  
  return <VideoIntroduction script="Debug test" />
}
```

#### Issue: Service calls failing

**Debugging steps:**
1. Check API endpoints and configuration
2. Verify authentication tokens
3. Check network requests in DevTools
4. Verify Firebase function deployment

```typescript
// Debug service calls
class DebugVideoGenerationService extends VideoGenerationService {
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    console.log('Service call:', {
      endpoint: this.config.apiEndpoint,
      options,
      timestamp: new Date().toISOString()
    })
    
    try {
      const result = await super.generateVideo(options)
      console.log('Service response:', result)
      return result
    } catch (error) {
      console.error('Service error:', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }
}
```

## Performance Guidelines

### Bundle Size Optimization

```typescript
// Use dynamic imports for large components
const VideoAnalyticsDashboard = lazy(() => 
  import('./VideoAnalyticsDashboard').then(module => ({
    default: module.VideoAnalyticsDashboard
  }))
)

// Tree-shakeable exports
export {
  // Core components (always included)
  VideoIntroduction,
  PodcastPlayer,
  
  // Optional components (tree-shakeable)
  PortfolioGallery,
  EnhancedQRCode
} from './components'

// Conditional service loading
export const createVideoService = async (config: VideoServiceConfig) => {
  if (config.provider === 'heygen') {
    const { HeyGenProvider } = await import('./providers/HeyGenProvider')
    return new VideoGenerationService({ provider: new HeyGenProvider() })
  }
  
  if (config.provider === 'runwayml') {
    const { RunwayMLProvider } = await import('./providers/RunwayMLProvider')
    return new VideoGenerationService({ provider: new RunwayMLProvider() })
  }
  
  throw new Error(`Unknown provider: ${config.provider}`)
}
```

### Memory Management

```typescript
// Proper cleanup in components
const VideoIntroduction: React.FC<VideoIntroductionProps> = ({ script }) => {
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  
  useEffect(() => {
    return () => {
      // Clean up blob URLs to prevent memory leaks
      if (videoBlob) {
        URL.revokeObjectURL(URL.createObjectURL(videoBlob))
      }
    }
  }, [videoBlob])
  
  // Component implementation
}

// Service cleanup
class VideoGenerationService {
  private abortControllers = new Map<string, AbortController>()
  
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const jobId = generateUniqueId()
    const controller = new AbortController()
    this.abortControllers.set(jobId, controller)
    
    try {
      const result = await this.processVideo(options, controller.signal)
      return result
    } finally {
      this.abortControllers.delete(jobId)
    }
  }
  
  cancelAllJobs() {
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
  }
}
```

### Caching Strategies

```typescript
// Service-level caching
class CachedVideoGenerationService extends VideoGenerationService {
  private cache = new Map<string, VideoResult>()
  private readonly cacheTimeout = 5 * 60 * 1000 // 5 minutes
  
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const cacheKey = this.getCacheKey(options)
    const cached = this.cache.get(cacheKey)
    
    if (cached && this.isCacheValid(cached)) {
      this.logger.debug('Returning cached video result', { cacheKey })
      return cached
    }
    
    const result = await super.generateVideo(options)
    this.cache.set(cacheKey, { ...result, cacheTimestamp: Date.now() })
    
    return result
  }
  
  private getCacheKey(options: VideoOptions): string {
    return `${options.script}-${options.style}-${options.provider}`
  }
  
  private isCacheValid(cached: VideoResult & { cacheTimestamp: number }): boolean {
    return Date.now() - cached.cacheTimestamp < this.cacheTimeout
  }
}
```

## Contributing

### Pull Request Process

1. **Fork and Branch**
   ```bash
   # Fork repository on GitHub
   git clone https://github.com/your-username/cvplus-multimedia.git
   git checkout -b feature/your-feature-name
   ```

2. **Development**
   - Follow coding standards
   - Write comprehensive tests
   - Update documentation
   - Ensure TypeScript compliance

3. **Quality Checks**
   ```bash
   # Run all quality checks
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

4. **Documentation**
   - Update API documentation
   - Add examples for new features
   - Update README if needed
   - Create/update Mermaid diagrams

5. **Pull Request**
   - Clear title and description
   - Link to related issues
   - Add screenshots for UI changes
   - Request appropriate reviewers

### Code Review Guidelines

#### For Authors

- **Self-review**: Review your own PR first
- **Small PRs**: Keep changes focused and manageable
- **Documentation**: Include relevant documentation updates
- **Tests**: Ensure comprehensive test coverage

#### For Reviewers

- **Functionality**: Does the code work as intended?
- **Standards**: Does it follow project coding standards?
- **Performance**: Are there performance implications?
- **Security**: Are there security considerations?
- **Maintainability**: Is the code easy to understand and maintain?

### Issue Reporting

Use GitHub Issues with appropriate templates:

- **Bug Report**: Detailed reproduction steps
- **Feature Request**: Clear use case and acceptance criteria
- **Documentation**: Specific documentation improvements needed
- **Performance**: Performance issues with benchmarks

This development guide provides comprehensive guidance for both core contributors and external developers working with the CVPlus Multimedia Module.