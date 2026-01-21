# CVPlus Logging System

Comprehensive logging module for the CVPlus platform with Firebase integration, PII redaction, performance monitoring, and audit trail capabilities.

## Features

- **LoggerFactory**: Centralized logger creation with consistent configuration
- **FirebaseTransport**: Integration with Firebase Functions logging
- **PiiRedaction**: Automatic PII detection and redaction for compliance
- **PerformanceMonitor**: Application performance tracking and metrics
- **AuditTrail**: Comprehensive audit logging for security and compliance
- **AlertRule**: Configurable alerting based on log patterns
- **LogArchive**: Long-term log storage and retrieval system
- **Frontend Dashboard**: React components for log visualization and monitoring

## Installation

```bash
npm install @cvplus/logging
```

## Usage

```typescript
import { LoggerFactory, PiiRedaction } from '@cvplus/logging';

const logger = LoggerFactory.getLogger('MyService');
logger.info('User action completed', { userId: '12345' });
```

## Architecture

- `src/backend/` - Core logging services and Firebase integration
- `src/frontend/` - React dashboard components for log monitoring
- `src/shared/` - Shared types and utilities
- `src/types/` - TypeScript type definitions
- `__tests__/` - Comprehensive test suites

## License

MIT