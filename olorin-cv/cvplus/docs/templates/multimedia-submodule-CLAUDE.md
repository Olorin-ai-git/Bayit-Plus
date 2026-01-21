# Multimedia Module - CVPlus Submodule

**Author**: Gil Klainert  
**Domain**: Media Processing, Generation & Enhancement  
**Type**: CVPlus Git Submodule  
**Independence**: Fully autonomous build and run capability

## Critical Requirements

⚠️ **MANDATORY**: You are a submodule of the CVPlus project. You MUST ensure you can run autonomously in every aspect.

🚫 **ABSOLUTE PROHIBITION**: Never create mock data or use placeholders - EVER!

🚨 **CRITICAL**: Never delete ANY files without explicit user approval - this is a security violation.

🎬 **MEDIA PROCESSING**: Handle large media files with proper memory management and optimization.

## Submodule Overview

The Multimedia module transforms CVPlus into a rich media platform by providing comprehensive audio, video, and image processing capabilities. It enables users to create professional video introductions, AI-generated podcasts, enhanced QR codes, and portfolio galleries. This module integrates with multiple media service providers and handles the complete media processing pipeline.

## Domain Expertise

### Primary Responsibilities
- **Video Generation**: AI-powered video introduction creation using HeyGen and RunwayML
- **Podcast Generation**: Automated podcast creation from CV content
- **QR Code Enhancement**: Advanced QR code generation with custom branding
- **Portfolio Galleries**: Image processing and gallery management
- **Media Optimization**: Transcoding, compression, and format optimization
- **Provider Integration**: Multi-provider orchestration for video and audio services
- **Media Storage**: CDN integration and optimized media delivery
- **Real-time Processing**: Live media processing status and progress tracking

### Key Features
- **AI Video Creation**: Integration with HeyGen for professional video introductions
- **Podcast Engine**: Text-to-speech and audio processing for CV podcasts
- **Enhanced QR Codes**: Custom branded QR codes with analytics tracking
- **Gallery Management**: Portfolio image processing and optimization
- **Multi-Provider Support**: Fallback systems for video/audio generation services
- **Media Analytics**: Processing statistics and performance monitoring
- **Circuit Breaker**: Resilient service integration with automatic failover
- **Webhook Integration**: Real-time updates from external media services

### Integration Points
- **CV Processing Module**: Uses CV analysis data for media generation
- **Core Module**: Shared types and utilities for media processing
- **Premium Module**: Premium media features and advanced processing
- **Auth Module**: Authentication for media processing endpoints
- **Analytics Module**: Media usage tracking and performance analytics
- **Public Profiles Module**: Portfolio galleries and media display

## Specialized Subagents

### Primary Specialist
- **multimedia-specialist**: Expert in media processing, video/audio generation, and provider integration

### Supporting Specialists
- **computer-vision-specialist**: Image processing and visual analysis
- **ml-engineer**: Machine learning for media enhancement
- **devops-automator**: Media processing pipeline deployment and scaling
- **performance-engineer**: Media processing optimization and performance tuning

### Universal Specialists
- **code-reviewer**: Quality assurance and security review
- **debugger**: Complex troubleshooting and error resolution
- **git-expert**: All git operations and repository management
- **test-writer-fixer**: Comprehensive testing and test maintenance
- **backend-test-engineer**: Media processing pipeline testing

## Technology Stack

### Core Technologies
- Node.js 20+ with TypeScript
- Firebase Functions for serverless processing
- React.js for frontend media components
- FFmpeg for video/audio processing
- Sharp for image processing

### Media Service Integrations
- HeyGen API for AI video generation
- RunwayML for advanced video processing
- ElevenLabs for text-to-speech
- Cloudinary for media storage and CDN
- Firebase Storage for file management

### Build System
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Type Check**: `npm run type-check`
- **Media Test**: `npm run test:media-processing`

## Development Workflow

### Setup Instructions
1. Clone multimedia submodule: `git clone git@github.com:gilco1973/cvplus-multimedia.git`
2. Install dependencies: `npm install`
3. Install FFmpeg: `brew install ffmpeg` (macOS) or appropriate package manager
4. Configure media service API keys (ask for approval before modifying .env)
5. Run type checks: `npm run type-check`
6. Run media processing tests: `npm test`
7. Test media service integration: `npm run test:media-processing`
8. Build module: `npm run build`

### Testing Requirements
- **Coverage Requirement**: Minimum 85% code coverage
- **Test Framework**: Vitest with media processing mocks
- **Test Types**: Unit tests, integration tests, media processing tests, provider failover tests
- **Media Testing**: Mock media service APIs, test file processing, validate output quality

### Deployment Process
- Firebase Functions deployment for media processing endpoints
- Media service API configuration and webhook setup
- CDN configuration and media storage optimization
- Performance monitoring and scaling configuration

## Integration Patterns

### CVPlus Ecosystem Integration
- **Import Pattern**: `@cvplus/multimedia`
- **Export Pattern**: Media services, React components, processing utilities
- **Dependency Chain**: Depends on @cvplus/core, @cvplus/auth, @cvplus/premium

### Service Exports
```typescript
// Media Services
export { VideoGenerationService, PodcastGenerationService, QREnhancementService } from './services';
export { PortfolioGalleryService, MediaOptimizationService } from './services';

// React Components
export { VideoIntroduction, PodcastGeneration, PortfolioGallery } from './components';
export { PodcastPlayer, AIPodcastPlayer, FileUpload } from './components';

// Firebase Functions
export { generateVideoIntroduction, generatePodcast, enhancedQR, portfolioGallery } from './backend/functions';

// Types
export * from './types/media.types';
export * from './types/video.types';
export * from './types/audio.types';
```

### Firebase Functions Integration
- Media processing pipeline functions
- Webhook handlers for external service callbacks
- Real-time status updates and progress tracking
- Media analytics and usage reporting

## Scripts and Automation

### Available Scripts
- `npm run build`: Build multimedia module
- `npm run test`: Run comprehensive test suite
- `npm run test:media-processing`: Test media processing pipelines
- `npm run process-media`: CLI tool for media processing
- `npm run optimize-images`: Batch image optimization
- `npm run validate-media`: Validate media file integrity

### Build Automation
- Media service API validation
- File processing pipeline testing
- Provider integration testing
- Performance benchmarking
- Output quality validation

## Quality Standards

### Code Quality
- TypeScript strict mode with media-specific type safety
- Comprehensive error handling for media service failures
- Robust file validation and processing
- Memory-efficient processing for large media files
- All files must be under 200 lines (complex processors may need architectural splits)

### Media Processing Requirements
- **File Security**: Secure handling of uploaded media files
- **Format Support**: Support for common media formats (MP4, MP3, JPG, PNG, etc.)
- **Quality Control**: Output quality validation and optimization
- **Rate Limiting**: Proper API rate limiting for external services
- **Fallback Systems**: Graceful degradation when media services are unavailable
- **Storage Optimization**: Efficient media storage and CDN delivery

### Performance Requirements
- Video processing completion within 5 minutes
- Audio processing within 2 minutes
- Image optimization within 30 seconds
- Support for files up to 100MB
- Concurrent processing capability
- Real-time progress updates

## Multimedia Module Specific Guidelines

### Media Processing Best Practices
- Validate file types and sizes before processing
- Implement progressive upload for large files
- Use streaming for memory-efficient processing
- Optimize output formats for web delivery
- Implement proper cleanup for temporary files

### Provider Integration Guidelines
- Implement circuit breaker pattern for service reliability
- Use webhook validation for security
- Implement retry logic with exponential backoff
- Monitor service quotas and usage limits
- Maintain service health checks and alerting

### Output Quality Standards
- Consistent video quality and formatting
- Professional audio quality with noise reduction
- Optimized image compression without quality loss
- Proper aspect ratio and resolution handling
- Accessibility features (captions, alt text)

## Troubleshooting

### Common Issues
- **Video Generation Failures**: Check HeyGen/RunwayML API status and quotas
- **Audio Processing Errors**: Validate audio file formats and FFmpeg installation
- **Upload Failures**: Check file size limits and storage quotas
- **Quality Issues**: Review processing settings and output validation
- **Memory Issues**: Monitor memory usage with large media files

### Debug Commands
- `npm run test:media-processing -- --verbose`: Debug media processing pipelines
- `npm run process-media -- --debug <file>`: Debug single media file processing
- `npm run validate-media <media-id>`: Validate specific media output
- `ffmpeg -i input.mp4`: Direct FFmpeg debugging for video issues

### Performance Optimization
- Media preprocessing optimization
- Parallel processing for multiple files
- Caching strategies for processed media
- CDN optimization for delivery
- Memory management for large files

### Support Resources
- [HeyGen API Documentation](https://docs.heygen.com/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- CVPlus Media Processing Guidelines (internal)
- Provider Integration Architecture Documentation