# Core Module - CVPlus Submodule

**Author**: Gil Klainert  
**Domain**: Foundation Infrastructure & Utilities  
**Type**: CVPlus Git Submodule  
**Independence**: Fully autonomous build and run capability

## Critical Requirements

⚠️ **MANDATORY**: You are a submodule of the CVPlus project. You MUST ensure you can run autonomously in every aspect.

🚫 **ABSOLUTE PROHIBITION**: Never create mock data or use placeholders - EVER!

🚨 **CRITICAL**: Never delete ANY files without explicit user approval - this is a security violation.

## Submodule Overview

The Core module serves as the foundational infrastructure for the entire CVPlus ecosystem. It provides essential types, constants, utilities, and shared configurations that other submodules depend on. This module must maintain strict backward compatibility and high stability as it forms the backbone of the entire platform.

## Domain Expertise

### Primary Responsibilities
- Foundation types and interfaces used across all CVPlus submodules
- Shared constants and configuration management
- Universal utilities for string manipulation, date handling, validation
- Error handling frameworks and response formatting
- Firebase integration utilities and authentication helpers
- API response standardization and CORS configuration

### Key Features
- **Type System**: Comprehensive TypeScript type definitions for CVPlus domain objects
- **Configuration Management**: Centralized environment and pricing configuration
- **Utility Functions**: Common utilities for array manipulation, async operations, crypto
- **Error Handling**: Standardized error types and handling mechanisms
- **Firebase Integration**: Firebase authentication, Firestore utilities, and response formatting
- **Validation Framework**: Input validation and sanitization utilities

### Integration Points
- **All Submodules**: Provides foundational types and utilities
- **Firebase Functions**: Core Firebase integration patterns
- **Frontend Applications**: Shared types and utilities for client-side development
- **API Layer**: Standardized response formats and error handling

## Specialized Subagents

### Primary Specialist
- **core-module-specialist**: Expert in foundational architecture, type systems, and utility design

### Supporting Specialists
- **system-architect**: Overall system design and architectural decisions
- **typescript-pro**: Advanced TypeScript patterns and type safety
- **backend-architect**: Server-side architecture and API design patterns

### Universal Specialists
- **code-reviewer**: Quality assurance and security review
- **debugger**: Complex troubleshooting and error resolution
- **git-expert**: All git operations and repository management
- **test-writer-fixer**: Comprehensive testing and test maintenance
- **backend-test-engineer**: Backend-specific testing strategies

## Technology Stack

### Core Technologies
- TypeScript 5.x (strict mode)
- Node.js 20+
- Firebase SDK (Admin and Client)
- Rollup (build system)

### Dependencies
- Firebase Functions SDK
- Firebase Admin SDK
- Utility libraries (date-fns, lodash-es)
- Validation libraries (joi, zod)

### Build System
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Type Check**: `npm run type-check`
- **Lint**: `npm run lint`

## Development Workflow

### Setup Instructions
1. Clone core submodule repository: `git clone git@github.com:gilco1973/cvplus-core.git`
2. Install dependencies: `npm install`
3. Run type checks: `npm run type-check`
4. Run tests: `npm test`
5. Build distribution: `npm run build`

### Testing Requirements
- **Coverage Requirement**: Minimum 85% code coverage
- **Test Framework**: Vitest
- **Test Types**: Unit tests for all utilities, integration tests for Firebase utilities
- **Critical Path Testing**: All type guards, validation functions, and error handlers

### Deployment Process
- Built as npm package for consumption by other submodules
- Version managed through semantic versioning
- Published to npm registry for external consumption (if applicable)

## Integration Patterns

### CVPlus Ecosystem Integration
- **Import Pattern**: `@cvplus/core`
- **Export Pattern**: Named exports for types, utilities, constants, and configurations
- **Dependency Chain**: Foundation module - no dependencies on other CVPlus submodules

### Type Exports
```typescript
// Types
export * from './types/api';
export * from './types/cv';
export * from './types/firebase';

// Utilities  
export * from './utils/validation';
export * from './utils/error-handling';
export * from './utils/firebase-helpers';

// Constants
export * from './constants/api';
export * from './constants/features';

// Configuration
export * from './config/environment';
export * from './config/firebase';
```

### Firebase Functions Integration
- Provides reusable Firebase utilities and middleware
- Standardizes response formats across all function endpoints
- Centralized error handling and logging patterns

## Scripts and Automation

### Available Scripts
- `npm run build`: Build TypeScript to dist/ directory
- `npm run type-check`: Run TypeScript compiler without emitting files
- `npm run test`: Run test suite with coverage
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Run ESLint and Prettier
- `npm run clean`: Clean build artifacts

### Build Automation
- Automatic type checking on build
- Tree-shaking optimized builds
- Source maps for debugging
- Declaration files for TypeScript consumption

## Quality Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint with strict rules
- Prettier for consistent formatting
- All files must be under 200 lines
- Comprehensive JSDoc documentation

### Security Requirements
- No hardcoded secrets or credentials
- Input validation for all utilities
- Secure Firebase integration patterns
- OWASP security guidelines compliance

### Performance Requirements
- Utilities must be lightweight and optimized
- Tree-shaking friendly exports
- Minimal bundle impact on consuming applications
- Fast build times (< 30 seconds)

## Core Module Specific Guidelines

### Type Definition Standards
- All types must be exportable and reusable
- Strict type definitions with no `any` types
- Generic types for maximum reusability
- Comprehensive union types for domain objects

### Utility Function Standards
- Pure functions where possible
- Comprehensive error handling
- Performance optimized implementations
- Full TypeScript support with proper return types

### Configuration Management
- Environment-specific configurations
- Type-safe configuration objects
- Default values for all configuration options
- Runtime validation of configuration values

## Troubleshooting

### Common Issues
- **Build Errors**: Check TypeScript version compatibility and tsconfig.json
- **Import Errors**: Verify export paths and module resolution
- **Type Errors**: Ensure all consuming modules use compatible TypeScript versions
- **Firebase Errors**: Check Firebase SDK versions and configuration

### Debug Commands
- `npm run type-check`: Identify TypeScript compilation issues
- `npm run test -- --verbose`: Detailed test output
- `npm run build -- --watch`: Monitor build process
- `npx tsc --listFiles`: Debug module resolution

### Support Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Firebase Documentation](https://firebase.google.com/docs)
- CVPlus Core Module Documentation (internal)
- Architecture Decision Records (ADRs) in docs/adrs/