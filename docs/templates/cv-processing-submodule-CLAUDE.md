# CV Processing Module - CVPlus Submodule

**Author**: Gil Klainert  
**Domain**: CV Analysis, Generation & ATS Optimization  
**Type**: CVPlus Git Submodule  
**Independence**: Fully autonomous build and run capability

## Critical Requirements

⚠️ **MANDATORY**: You are a submodule of the CVPlus project. You MUST ensure you can run autonomously in every aspect.

🚫 **ABSOLUTE PROHIBITION**: Never create mock data or use placeholders - EVER!

🚨 **CRITICAL**: Never delete ANY files without explicit user approval - this is a security violation.

🤖 **AI INTEGRATION**: This module processes sensitive user data. Ensure all AI calls are secure and compliant.

## Submodule Overview

The CV Processing module is the core intelligence engine of CVPlus, responsible for AI-powered CV analysis, generation, and optimization. It transforms traditional CVs into enhanced, ATS-optimized professional profiles using advanced language models and machine learning techniques. This module handles the complete CV transformation pipeline from analysis to generation.

## Domain Expertise

### Primary Responsibilities
- **CV Analysis**: Deep analysis of uploaded CVs using AI and natural language processing
- **ATS Optimization**: Automatic optimization for Applicant Tracking Systems
- **CV Generation**: Creation of enhanced, professional CV formats
- **Skills Analysis**: Advanced skills detection, proficiency analysis, and gap identification  
- **Achievement Highlighting**: Automatic identification and enhancement of career achievements
- **Industry Optimization**: Industry-specific CV customization and optimization
- **Success Prediction**: ML-based predictions for job application success rates
- **Personality Insights**: Professional personality analysis and career recommendations

### Key Features
- **AI-Powered Analysis**: Claude API integration for intelligent CV analysis
- **Multiple CV Formats**: Support for various CV templates and formats
- **Real-time Processing**: Live CV analysis and preview generation
- **Timeline Generation**: Automatic career timeline creation
- **External Data Enrichment**: Integration with external professional data sources
- **Role Detection**: Advanced job role categorization and matching
- **Language Proficiency**: Multi-language CV processing and analysis
- **Regional Optimization**: Localized CV optimization for different markets

### Integration Points
- **Core Module**: Uses shared types and utilities for CV data structures
- **Auth Module**: Authentication for protected CV processing endpoints
- **Premium Module**: Premium CV features and advanced processing capabilities
- **Multimedia Module**: Integration with portfolio and media generation
- **Recommendations Module**: Career recommendation engine integration
- **Frontend Applications**: React components for CV upload, analysis, and preview

## Specialized Subagents

### Primary Specialist
- **cv-processing-specialist**: Expert in CV analysis, NLP, and document processing

### Supporting Specialists
- **machine-learning-engineer**: ML model optimization and training
- **nlp-llm-integration-expert**: Large language model integration and prompt engineering
- **prompt-engineer**: AI prompt optimization for CV analysis
- **computer-vision-specialist**: Document parsing and layout analysis

### Universal Specialists
- **code-reviewer**: Quality assurance and security review
- **debugger**: Complex troubleshooting and error resolution
- **git-expert**: All git operations and repository management
- **test-writer-fixer**: Comprehensive testing and test maintenance
- **backend-test-engineer**: Backend processing pipeline testing

## Technology Stack

### Core Technologies
- Node.js 20+ with TypeScript
- Anthropic Claude API for AI processing
- Firebase Functions for serverless processing
- React.js for frontend components
- Vitest for testing

### AI & ML Dependencies
- Anthropic Claude SDK
- OpenAI API (backup/supplementary)
- Natural Language Processing libraries
- PDF parsing libraries (pdf-parse, pdf2pic)
- Document analysis tools

### Build System
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Type Check**: `npm run type-check`
- **AI Test**: `npm run test:ai-integration`

## Development Workflow

### Setup Instructions
1. Clone cv-processing submodule: `git clone git@github.com:gilco1973/cvplus-cv-processing.git`
2. Install dependencies: `npm install`
3. Configure AI API keys (ask for approval before modifying .env)
4. Run type checks: `npm run type-check`
5. Run CV processing tests: `npm test`
6. Test AI integration: `npm run test:ai-integration`
7. Build module: `npm run build`

### Testing Requirements
- **Coverage Requirement**: Minimum 85% code coverage
- **Test Framework**: Vitest with AI testing mocks
- **Test Types**: Unit tests, integration tests, AI processing tests, end-to-end CV flows
- **AI Testing**: Mock Claude API responses, test prompt variations, validate output quality

### Deployment Process
- Firebase Functions deployment for CV processing endpoints
- AI API key and configuration management
- Processing pipeline validation and monitoring
- Performance optimization for large document processing

## Integration Patterns

### CVPlus Ecosystem Integration
- **Import Pattern**: `@cvplus/cv-processing`
- **Export Pattern**: Processing services, React components, Firebase functions
- **Dependency Chain**: Depends on @cvplus/core, @cvplus/auth, @cvplus/premium

### Service Exports
```typescript
// Processing Services
export { CVAnalysisService, ATSOptimizationService, CVGenerationService } from './services';
export { SkillsAnalysisService, AchievementHighlightingService } from './services';

// React Components
export { CVUpload, CVPreview, ProcessingStatus, CVAnalysisResults } from './components';
export { useCVProcessing, useCVUpload, useAchievementAnalysis } from './hooks';

// Firebase Functions
export { analyzeCV, generateCV, atsOptimization, enhancedAnalyzeCV } from './backend/functions';

// Types
export * from './types/cv.types';
export * from './types/processing.types';
export * from './types/enhanced-models';
```

### Firebase Functions Integration
- CV processing pipeline functions
- Real-time status updates via WebSocket
- Batch processing for multiple CVs
- Analytics and usage tracking

## Scripts and Automation

### Available Scripts
- `npm run build`: Build CV processing module
- `npm run test`: Run comprehensive test suite
- `npm run test:ai-integration`: Test AI API integration
- `npm run process-cv`: CLI tool for CV processing
- `npm run benchmark`: Performance benchmarking for CV processing
- `npm run validate-templates`: Validate CV template formats

### Build Automation
- AI API integration validation
- CV processing pipeline testing
- Template format validation
- Performance benchmarking
- Output quality assessment

## Quality Standards

### Code Quality
- TypeScript strict mode with AI-specific type safety
- Comprehensive error handling for AI API failures
- Robust input validation for uploaded documents
- Performance optimization for large document processing
- All files must be under 200 lines (processing pipelines may require architectural splits)

### AI & Data Processing Requirements
- **Data Privacy**: Secure handling of sensitive user CV data
- **AI Ethics**: Responsible AI usage with bias detection and mitigation
- **Quality Assurance**: Output validation and quality scoring
- **Rate Limiting**: Proper API rate limiting and quota management
- **Fallback Systems**: Graceful degradation when AI services are unavailable
- **Caching**: Intelligent caching of processing results

### Performance Requirements
- CV analysis completion within 30 seconds
- Support for documents up to 10MB
- Concurrent processing capability
- Real-time status updates
- Optimized memory usage for large documents

## CV Processing Module Specific Guidelines

### Document Processing Best Practices
- Support multiple file formats (PDF, DOCX, TXT)
- Robust error handling for corrupted or unsupported files
- Text extraction with layout preservation
- Image and formatting analysis
- Multi-language document support

### AI Integration Guidelines
- Secure API key management
- Prompt engineering best practices
- Response validation and sanitization
- Token usage optimization
- Error handling for AI service failures

### Output Quality Standards
- Consistent CV format generation
- Professional language and tone
- ATS compatibility validation
- Industry-specific optimization
- Accuracy verification against original content

## Troubleshooting

### Common Issues
- **AI API Failures**: Check API keys, quotas, and service status
- **Document Parsing Errors**: Validate file formats and sizes
- **Processing Timeouts**: Optimize processing pipeline and add retry logic
- **Quality Issues**: Review prompt engineering and output validation
- **Memory Issues**: Monitor memory usage with large documents

### Debug Commands
- `npm run test:ai-integration -- --verbose`: Debug AI API integration
- `npm run process-cv -- --debug <file>`: Debug single CV processing
- `npm run benchmark -- --profile`: Profile processing performance
- `npm run validate-output <cv-id>`: Validate specific CV output

### Performance Optimization
- Document preprocessing optimization
- AI prompt optimization for efficiency
- Caching strategies for repeated processing
- Batch processing for multiple documents
- Memory management for large files

### Support Resources
- [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference)
- [PDF Processing Libraries](https://www.npmjs.com/package/pdf-parse)
- CVPlus AI Integration Guidelines (internal)
- Processing Pipeline Architecture Documentation