# @cvplus/core

Core shared library for the CVPlus platform providing types, constants, and utilities.

## Overview

This package contains the foundational elements shared across the CVPlus monorepo:

- **Types**: Shared TypeScript interfaces and type definitions
- **Constants**: Application constants and configuration values  
- **Utilities**: Common helper functions and utilities

## Installation

```bash
npm install @cvplus/core
```

## Usage

```typescript
import { Job, CVTemplate, API_ENDPOINTS } from '@cvplus/core';
import { validateEmail, isString } from '@cvplus/core/utils';
import { ERROR_CODES } from '@cvplus/core/constants';
```

## Package Structure

```
src/
├── types/           # TypeScript type definitions
│   ├── job.ts       # Job and processing types
│   ├── cv.ts        # CV and resume types
│   ├── cv-template.ts # Template and generation types
│   ├── firebase.ts  # Firebase-specific types
│   ├── api.ts       # API response types
│   ├── error.ts     # Error handling types
│   ├── status.ts    # Status and state types
│   └── utility.ts   # Generic utility types
├── constants/       # Application constants
│   ├── app.ts       # Core application settings
│   ├── validation.ts # Validation rules and patterns
│   ├── templates.ts # Template configurations
│   ├── features.ts  # Feature definitions
│   ├── processing.ts # Processing configurations
│   ├── api.ts       # API endpoints and codes
│   └── errors.ts    # Error codes and messages
└── utils/           # Utility functions
    ├── validation.ts # Validation helpers
    ├── formatting.ts # Data formatting
    ├── date.ts      # Date utilities
    ├── string.ts    # String manipulation
    ├── object.ts    # Object utilities
    ├── array.ts     # Array utilities
    ├── async.ts     # Async helpers
    ├── crypto.ts    # Cryptographic utilities
    ├── type-guards.ts # Runtime type checking
    └── error-helpers.ts # Error handling
```

## Key Features

### Type Safety
Comprehensive TypeScript types for all CVPlus data structures and APIs.

### Shared Constants
Centralized configuration and constants to ensure consistency across services.

### Utility Functions
Battle-tested helper functions for common operations.

### Error Handling
Standardized error types and handling utilities.

### Validation
Consistent validation rules and type guards.

## Development

```bash
# Build the package
npm run build

# Type checking
npm run type-check

# Development mode
npm run dev
```

## Version

1.0.0

## Author

Gil Klainert

## License

PROPRIETARY