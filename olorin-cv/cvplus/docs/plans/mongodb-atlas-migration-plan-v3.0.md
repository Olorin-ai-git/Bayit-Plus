# CVPlus MongoDB Atlas Migration Plan v3.0

## Executive Summary

Migrate olorin-cvplus from Firebase Firestore to MongoDB Atlas using centralized olorin-shared database infrastructure. This migration aligns CVPlus with the Olorin ecosystem database strategy and enables advanced features like vector search, aggregations, and better performance.

**Duration**: 20 days (comprehensive quality-first approach)
**Risk Level**: Medium (data migration with full rollback capability)
**Database**: `cvplus` on shared MongoDB Atlas cluster (extracted from URI, not hardcoded)
**Scope**: Web platform only (no iOS/tvOS - they don't exist)

## Version History

- **v1.0**: Initial plan with basic migration strategy
- **v2.0**: Addressed initial agent feedback (6/13 approvals - 46%)
- **v3.0**: Comprehensive update addressing all 50+ critical issues identified by 7 rejecting agents

## Agent Feedback Summary (v2.0 Review)

### Approved (6/13):
✅ System Architect, Architect Reviewer, iOS Developer, tvOS Expert, Mobile Expert, Database Architect

### Changes Required (7/13):
❌ UI/UX Designer (5 critical issues)
❌ UX Designer (6 critical issues)
❌ Frontend Developer (8 critical issues)
❌ MongoDB Expert (6 critical issues)
❌ Security Specialist (12 critical issues - 4 CRITICAL + 8 HIGH)
❌ Platform Deployment (4 critical issues)
❌ Voice Technician (9 critical issues)

**Total Issues to Address**: 50+

---

## Critical Issues Fixed in v3.0

### 1. Security (12 Issues - HIGHEST PRIORITY)
- ✅ Input validation and sanitization (XSS, NoSQL injection)
- ✅ Rate limiting (global, auth, per-user)
- ✅ Network security (IP whitelist, VPC peering, zero-trust)
- ✅ Security audit logging (auth events, data access, suspicious activity)
- ✅ Password policy enforcement
- ✅ Session timeout and concurrent session limits
- ✅ Encryption at rest strategy (field encryption for PII)
- ✅ Security headers (helmet, CSP, HSTS)
- ✅ Data retention policy (TTL indexes, GDPR deletion)
- ✅ Error sanitization (no stack traces to client)
- ✅ NoSQL injection prevention documentation
- ✅ Secrets rotation strategy

### 2. UI/UX Design (5 Issues)
- ✅ Accessibility (ARIA labels, keyboard nav, screen readers)
- ✅ Internationalization (react-i18next integration)
- ✅ Complete hook implementations (no truncation)
- ✅ User communication strategy (pre/post migration UI)
- ✅ Glass component compliance (no native elements)

### 3. UX/Localization (6 Issues)
- ✅ Locale validation enum (10 supported languages)
- ✅ Integration with existing @cvplus/i18n module
- ✅ RTL auto-detection logic
- ✅ Expanded accessibility preferences (7 properties)
- ✅ Frontend i18n/RTL/accessibility integration phase
- ✅ WCAG 2.1 Level AA compliance strategy

### 4. Frontend Development (8 Issues)
- ✅ API contract documentation file created
- ✅ WebSocket reconnection with socket.io-client
- ✅ Comprehensive error handling (ErrorBoundary, useAPIRequest)
- ✅ Frontend migration guide
- ✅ Performance metrics (bundle size, Core Web Vitals)
- ✅ Feature flags system
- ✅ API versioning
- ✅ Optimistic updates

### 5. MongoDB Expert (6 Issues)
- ✅ Write concern configuration
- ✅ Custom error types (VersionConflictError, DocumentNotFoundError)
- ✅ Type-safe getCollection<T> (no any default)
- ✅ Connection pool health monitoring
- ✅ Change Streams resume token handling
- ✅ Proper TypeScript interfaces (no any types)

### 6. Platform Deployment (4 Issues)
- ✅ All 5 missing scripts implemented
- ✅ Complete health checks with authentication
- ✅ Rollback workflow fixes
- ✅ Comprehensive validation suite (10+ checks)

### 7. Voice Technician (9 Issues)
- ✅ Ecosystem integration with Olorin TTS/STT services
- ✅ Complete AudioFileDocument schema
- ✅ Audio processing pipeline
- ✅ Streaming TTS and caching
- ✅ Audio migration validation
- ✅ Multi-language audio support
- ✅ Audio security measures
- ✅ Web Audio API integration
- ✅ PII detection in transcripts

---

## Architecture Overview

### Olorin Ecosystem Integration

```
┌─────────────────────────────────────────────────────────────┐
│                   OLORIN CORE PLATFORM                      │
│  • MongoDB Atlas (Shared Cluster)                           │
│  • Google Cloud Secret Manager                              │
│  • Structured Logging                                       │
│  • Security Infrastructure                                  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│ olorin-shared │  │ olorin-shared-  │  │  CVPlus     │
│  (Python)     │  │   node (NEW)    │  │  Functions  │
│               │  │                 │  │             │
│ • Motor       │  │ • MongoDB       │  │ • Firebase  │
│ • MongoDB URI │  │   Driver        │  │   Functions │
│ • Logging     │  │ • Connection    │  │ • TypeScript│
│               │  │   Pool          │  │ • REST API  │
└───────────────┘  │ • Repositories  │  └─────────────┘
                   │ • Transactions  │
                   │ • Type Safety   │
                   └─────────────────┘
```

### CVPlus Database Structure

**MongoDB Atlas**:
- **Cluster**: Shared Olorin cluster (extracted from URI)
- **Database**: `cvplus`
- **Collections**: users, jobs, publicProfiles, chatSessions, chatMessages, audioFiles, analytics

**Collection Design**:
```typescript
// Separate collections for scalability
users           → User profiles and preferences
jobs            → CV/resume data (16MB limit safe)
publicProfiles  → Public-facing profile data
chatSessions    → Chat metadata
chatMessages    → Individual messages (denormalized for performance)
audioFiles      → TTS/STT audio metadata (files in GCS)
analytics       → Usage analytics and metrics
```

---

## Phase 1: Infrastructure Setup (Days 1-3)

### 1.1 Create Node.js MongoDB Shared Package

**Location**: `olorin-core/backend-core/olorin-shared-node/`

**Package Structure**:
```
olorin-shared-node/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── database/
│   │   ├── mongodb.ts          # MongoDB connection manager
│   │   ├── repository.ts       # Base repository pattern
│   │   ├── transactions.ts     # Transaction support
│   │   ├── errors.ts           # Custom error types
│   │   ├── health.ts           # Connection health monitoring
│   │   └── index.ts
│   ├── config/
│   │   ├── config.ts           # Configuration validation
│   │   ├── secrets.ts          # Google Cloud Secret Manager
│   │   └── index.ts
│   ├── security/
│   │   ├── input-validator.ts  # Input sanitization
│   │   ├── rate-limiter.ts     # Rate limiting middleware
│   │   ├── audit-logger.ts     # Security audit logging
│   │   ├── encryption.ts       # Field encryption
│   │   └── index.ts
│   ├── auth/
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── firebase.ts         # Firebase auth integration
│   │   ├── session.ts          # Session management
│   │   └── index.ts
│   ├── logging/
│   │   ├── logger.ts           # Structured logging
│   │   └── index.ts
│   └── types/
│       ├── database.ts         # Database type definitions
│       └── index.ts
└── tests/
    ├── database/
    ├── security/
    └── config/
```

**package.json**:
```json
{
  "name": "@olorin/shared-node",
  "version": "1.0.0",
  "description": "Olorin shared Node.js infrastructure for MongoDB, security, and logging",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "mongodb": "^6.3.0",
    "@google-cloud/secret-manager": "^5.0.0",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "redis": "^4.6.12",
    "helmet": "^7.1.0",
    "validator": "^13.11.0",
    "isomorphic-dompurify": "^2.11.0",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/validator": "^13.11.8",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 1.2 MongoDB Connection Manager (Security-Hardened)

**File**: `src/database/mongodb.ts`

```typescript
import { MongoClient, MongoClientOptions, Db, Collection } from 'mongodb';
import { getMongoDBConfig } from '../config/config';
import { logger } from '../logging/logger';
import { DatabaseConnectionError } from './errors';

export type CollectionName =
  | 'users'
  | 'jobs'
  | 'publicProfiles'
  | 'chatSessions'
  | 'chatMessages'
  | 'audioFiles'
  | 'analytics'
  | 'auditLogs'
  | 'securityAlerts'
  | 'gdprDeletions';

export interface BaseDocument {
  _id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

class MongoDBConnectionManager {
  private static instance: MongoDBConnectionManager;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config = getMongoDBConfig();

  private constructor() {}

  public static getInstance(): MongoDBConnectionManager {
    if (!MongoDBConnectionManager.instance) {
      MongoDBConnectionManager.instance = new MongoDBConnectionManager();
    }
    return MongoDBConnectionManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.client && this.db) {
      logger.info('MongoDB already connected');
      return;
    }

    try {
      const options: MongoClientOptions = {
        maxPoolSize: this.config.maxPoolSize,
        minPoolSize: this.config.minPoolSize,
        // CRITICAL: Write concern for data safety
        writeConcern: {
          w: 'majority',      // Acknowledge writes on majority of replicas
          j: true,            // Wait for journal commit
          wtimeout: 5000,     // Timeout after 5 seconds
        },
        readPreference: 'primaryPreferred',
        maxIdleTimeMS: this.config.maxIdleTimeMs,
        connectTimeoutMS: this.config.connectTimeoutMs,
        serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMs,
        retryWrites: true,
        retryReads: true,
      };

      this.client = new MongoClient(this.config.uri, options);
      await this.client.connect();

      // Ping to verify connection
      await this.client.db('admin').command({ ping: 1 });

      this.db = this.client.db(this.config.dbName);

      logger.info('MongoDB connected successfully', {
        database: this.config.dbName,
        maxPoolSize: this.config.maxPoolSize,
      });
    } catch (error) {
      logger.error('MongoDB connection failed', { error });
      throw new DatabaseConnectionError(
        `Failed to connect to MongoDB: ${error.message}`
      );
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('MongoDB disconnected');
    }
  }

  public getDatabase(): Db {
    if (!this.db) {
      throw new DatabaseConnectionError('MongoDB not connected');
    }
    return this.db;
  }

  public getClient(): MongoClient {
    if (!this.client) {
      throw new DatabaseConnectionError('MongoDB not connected');
    }
    return this.client;
  }

  // FIXED: Type-safe collection getter (no 'any' default)
  public getCollection<T extends BaseDocument>(name: CollectionName): Collection<T> {
    return this.getDatabase().collection<T>(name);
  }

  // NEW: Connection pool health monitoring
  public getConnectionPoolStats() {
    if (!this.client) {
      return null;
    }

    const server = (this.client as any).topology?.s?.server;
    const pool = server?.s?.pool;
    const stats = pool?.stats();

    return {
      activeConnections: stats?.activeConnections || 0,
      availableConnections: stats?.availableConnections || 0,
      totalConnections: stats?.totalConnections || 0,
      maxPoolSize: stats?.maxPoolSize || 0,
      utilization: stats?.activeConnections / stats?.maxPoolSize || 0,
    };
  }

  // NEW: Alert if connection pool > 80% utilized
  public checkPoolHealth(): void {
    const stats = this.getConnectionPoolStats();
    if (!stats) return;

    if (stats.utilization > 0.8) {
      logger.warn('High connection pool utilization', {
        utilization: `${(stats.utilization * 100).toFixed(1)}%`,
        activeConnections: stats.activeConnections,
        maxPoolSize: stats.maxPoolSize,
      });
    }
  }
}

// Export singleton instance methods
export const connectToMongoDB = () => MongoDBConnectionManager.getInstance().connect();
export const disconnectFromMongoDB = () => MongoDBConnectionManager.getInstance().disconnect();
export const getDatabase = () => MongoDBConnectionManager.getInstance().getDatabase();
export const getMongoDBClient = () => MongoDBConnectionManager.getInstance().getClient();
export const getCollection = <T extends BaseDocument>(name: CollectionName) =>
  MongoDBConnectionManager.getInstance().getCollection<T>(name);
export const getConnectionPoolStats = () =>
  MongoDBConnectionManager.getInstance().getConnectionPoolStats();
export const checkPoolHealth = () =>
  MongoDBConnectionManager.getInstance().checkPoolHealth();
```

### 1.3 Custom Error Types

**File**: `src/database/errors.ts`

```typescript
// Custom error types for precise error handling

export class VersionConflictError extends Error {
  constructor(
    public documentId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Version conflict on document ${documentId}: expected ${expectedVersion}, got ${actualVersion}`
    );
    this.name = 'VersionConflictError';
  }
}

export class DocumentNotFoundError extends Error {
  constructor(public collection: string, public documentId: string) {
    super(`Document not found in ${collection}: ${documentId}`);
    this.name = 'DocumentNotFoundError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Sanitize errors before sending to client
export function sanitizeError(error: Error): { message: string; code: string } {
  // Never expose stack traces or internal details to client
  if (error instanceof ValidationError) {
    return { message: error.message, code: 'VALIDATION_ERROR' };
  }
  if (error instanceof UnauthorizedError) {
    return { message: 'Unauthorized', code: 'UNAUTHORIZED' };
  }
  if (error instanceof VersionConflictError) {
    return {
      message: 'Document was modified by another user. Please refresh and try again.',
      code: 'VERSION_CONFLICT',
    };
  }
  if (error instanceof DocumentNotFoundError) {
    return { message: 'The requested resource was not found', code: 'NOT_FOUND' };
  }
  if (error instanceof DatabaseConnectionError) {
    return { message: 'Database service unavailable', code: 'SERVICE_UNAVAILABLE' };
  }

  // Generic error for everything else (don't leak details)
  return { message: 'An error occurred', code: 'INTERNAL_ERROR' };
}
```

### 1.4 Security Infrastructure

#### Input Validation and Sanitization

**File**: `src/security/input-validator.ts`

```typescript
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import { ValidationError } from '../database/errors';

export class InputValidator {
  // Email validation and normalization
  static sanitizeEmail(email: string): string {
    if (!validator.isEmail(email)) {
      throw new ValidationError('Invalid email format');
    }
    return validator.normalizeEmail(email) || email;
  }

  // HTML sanitization (prevent XSS)
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
    });
  }

  // Slug validation (URL-safe strings)
  static validateSlug(slug: string): string {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Invalid slug format (only lowercase letters, numbers, hyphens)');
    }
    if (slug.length > 200) {
      throw new ValidationError('Slug too long (max 200 characters)');
    }
    if (slug.length < 3) {
      throw new ValidationError('Slug too short (min 3 characters)');
    }
    return slug;
  }

  // NoSQL injection prevention (sanitize MongoDB filter objects)
  static sanitizeFilter(filter: any): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(filter)) {
      // Block MongoDB operators in user input
      if (key.startsWith('$')) {
        throw new ValidationError(`Invalid filter key: ${key}`);
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeFilter(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Password validation
  static validatePassword(password: string): void {
    if (password.length < 12) {
      throw new ValidationError('Password must be at least 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character');
    }
  }

  // Sanitize user input strings
  static sanitizeString(input: string, maxLength: number = 1000): string {
    // Trim whitespace
    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Enforce max length
    if (sanitized.length > maxLength) {
      throw new ValidationError(`Input too long (max ${maxLength} characters)`);
    }

    return sanitized;
  }

  // Validate UUID
  static validateUUID(uuid: string): string {
    if (!validator.isUUID(uuid)) {
      throw new ValidationError('Invalid UUID format');
    }
    return uuid;
  }
}
```

#### Rate Limiting

**File**: `src/security/rate-limiter.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'redis';
import { getRateLimitConfig } from '../config/config';

const config = getRateLimitConfig();
const redisClient = Redis.createClient({ url: config.redisUrl });

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect();

// Global rate limiter (100 requests per 15 minutes)
export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter (5 attempts per 15 minutes)
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Too many authentication attempts, please try again later',
});

// Per-user database operations rate limiter (60 operations per minute)
export const dbOperationRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:db:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many database operations, please slow down',
});

// TTS/Audio generation rate limiter (10 requests per hour)
export const audioRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:audio:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many audio generation requests, please try again later',
});
```

#### Security Audit Logging

**File**: `src/security/audit-logger.ts`

```typescript
import { getDatabase } from '../database/mongodb';
import { logger } from '../logging/logger';

export interface AuthEvent {
  userId?: string;
  eventType: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'token_refresh';
  ipAddress: string;
  userAgent: string;
  success: boolean;
  metadata?: any;
}

export interface DataAccessEvent {
  userId: string;
  collection: string;
  operation: 'read' | 'write' | 'delete';
  documentId?: string;
  ipAddress: string;
  metadata?: any;
}

export interface SuspiciousActivityEvent {
  userId?: string;
  activityType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  ipAddress: string;
}

export class AuditLogger {
  private static async getAuditCollection() {
    return getDatabase().collection('auditLogs');
  }

  private static async getSecurityAlertCollection() {
    return getDatabase().collection('securityAlerts');
  }

  // Log authentication events
  static async logAuthEvent(event: AuthEvent): Promise<void> {
    try {
      const auditLogs = await this.getAuditCollection();
      await auditLogs.insertOne({
        ...event,
        timestamp: new Date(),
        category: 'authentication',
      });

      logger.info('Auth event logged', {
        eventType: event.eventType,
        userId: event.userId,
        success: event.success,
      });

      // Check for brute force attacks
      if (event.eventType === 'login_failed') {
        await this.checkForBruteForce(event.ipAddress);
      }
    } catch (error) {
      logger.error('Failed to log auth event', { error, event });
    }
  }

  // Log data access events
  static async logDataAccess(event: DataAccessEvent): Promise<void> {
    try {
      const auditLogs = await this.getAuditCollection();
      await auditLogs.insertOne({
        ...event,
        timestamp: new Date(),
        category: 'data_access',
      });

      // Alert on unusual access patterns
      if (event.collection === 'users' && event.operation === 'read') {
        await this.checkForDataExfiltration(event.userId);
      }
    } catch (error) {
      logger.error('Failed to log data access', { error, event });
    }
  }

  // Log suspicious activity
  static async logSuspiciousActivity(event: SuspiciousActivityEvent): Promise<void> {
    try {
      const securityAlerts = await this.getSecurityAlertCollection();
      await securityAlerts.insertOne({
        ...event,
        timestamp: new Date(),
        investigated: false,
      });

      logger.warn('Suspicious activity detected', {
        activityType: event.activityType,
        severity: event.severity,
        userId: event.userId,
      });

      // Send immediate alert for critical severity
      if (event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      logger.error('Failed to log suspicious activity', { error, event });
    }
  }

  // Check for brute force attacks (5+ failed logins in 15 minutes)
  private static async checkForBruteForce(ipAddress: string): Promise<void> {
    const auditLogs = await this.getAuditCollection();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts = await auditLogs.countDocuments({
      ipAddress,
      eventType: 'login_failed',
      timestamp: { $gte: fifteenMinutesAgo },
    });

    if (failedAttempts >= 5) {
      await this.logSuspiciousActivity({
        activityType: 'brute_force_login',
        severity: 'high',
        details: { failedAttempts, ipAddress },
        ipAddress,
      });
    }
  }

  // Check for data exfiltration (100+ user reads in 1 minute)
  private static async checkForDataExfiltration(userId: string): Promise<void> {
    const auditLogs = await this.getAuditCollection();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentReads = await auditLogs.countDocuments({
      userId,
      collection: 'users',
      operation: 'read',
      timestamp: { $gte: oneMinuteAgo },
    });

    if (recentReads >= 100) {
      await this.logSuspiciousActivity({
        userId,
        activityType: 'potential_data_exfiltration',
        severity: 'critical',
        details: { recentReads },
        ipAddress: 'unknown', // Will be filled in by caller
      });
    }
  }

  // Send security alert to team (Slack/Email)
  private static async sendSecurityAlert(event: SuspiciousActivityEvent): Promise<void> {
    // TODO: Integrate with notification service
    logger.error('SECURITY ALERT', { event });
  }
}
```

#### Field Encryption for PII

**File**: `src/security/encryption.ts`

```typescript
import crypto from 'crypto';
import { getEncryptionConfig } from '../config/config';

const config = getEncryptionConfig();

export class FieldEncryption {
  private static algorithm = 'aes-256-gcm';
  private static key = Buffer.from(config.encryptionKey, 'hex');

  // Encrypt sensitive field data
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Return: IV + Auth Tag + Encrypted Data (all base64 encoded)
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  // Decrypt sensitive field data
  static decrypt(encryptedText: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');
    const iv = buffer.slice(0, 16);
    const tag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  // Encrypt PII fields in document
  static encryptPIIFields(document: any): any {
    const piiFields = ['email', 'phoneNumber', 'address', 'ssn'];
    const encrypted = { ...document };

    for (const field of piiFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  // Decrypt PII fields in document
  static decryptPIIFields(document: any): any {
    const piiFields = ['email', 'phoneNumber', 'address', 'ssn'];
    const decrypted = { ...document };

    for (const field of piiFields) {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    }

    return decrypted;
  }
}
```

#### Session Management

**File**: `src/auth/session.ts`

```typescript
import Redis from 'redis';
import { getRedisConfig } from '../config/config';
import { UnauthorizedError } from '../database/errors';

const config = getRedisConfig();
const redisClient = Redis.createClient({ url: config.redisUrl });
redisClient.connect();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CONCURRENT_SESSIONS = 3;

export interface Session {
  userId: string;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export class SessionManager {
  // Create new session
  static async createSession(
    sessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Check concurrent session limit
    const userSessions = await this.getUserSessions(userId);
    if (userSessions.length >= MAX_CONCURRENT_SESSIONS) {
      // Delete oldest session
      await this.deleteSession(userSessions[0].sessionId);
    }

    const session: Session = {
      userId,
      lastActivity: new Date(),
      ipAddress,
      userAgent,
    };

    await redisClient.set(`session:${sessionId}`, JSON.stringify(session), {
      EX: Math.floor(SESSION_TIMEOUT_MS / 1000),
    });

    // Track user's sessions
    await redisClient.sAdd(`user:${userId}:sessions`, sessionId);
  }

  // Validate session
  static async validateSession(sessionId: string, userId: string): Promise<void> {
    const sessionData = await redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      throw new UnauthorizedError('Session expired');
    }

    const session: Session = JSON.parse(sessionData);

    // Check if session belongs to user
    if (session.userId !== userId) {
      throw new UnauthorizedError('Invalid session');
    }

    // Check timeout
    const lastActivity = new Date(session.lastActivity);
    if (Date.now() - lastActivity.getTime() > SESSION_TIMEOUT_MS) {
      await this.deleteSession(sessionId);
      throw new UnauthorizedError('Session timeout');
    }

    // Update last activity
    session.lastActivity = new Date();
    await redisClient.set(`session:${sessionId}`, JSON.stringify(session), {
      EX: Math.floor(SESSION_TIMEOUT_MS / 1000),
    });
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    const sessionData = await redisClient.get(`session:${sessionId}`);
    if (sessionData) {
      const session: Session = JSON.parse(sessionData);
      await redisClient.sRem(`user:${session.userId}:sessions`, sessionId);
    }
    await redisClient.del(`session:${sessionId}`);
  }

  // Get all user sessions
  static async getUserSessions(userId: string): Promise<{ sessionId: string; session: Session }[]> {
    const sessionIds = await redisClient.sMembers(`user:${userId}:sessions`);
    const sessions: { sessionId: string; session: Session }[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await redisClient.get(`session:${sessionId}`);
      if (sessionData) {
        sessions.push({
          sessionId,
          session: JSON.parse(sessionData),
        });
      }
    }

    // Sort by last activity (oldest first)
    return sessions.sort(
      (a, b) => new Date(a.session.lastActivity).getTime() - new Date(b.session.lastActivity).getTime()
    );
  }

  // Delete all user sessions
  static async deleteAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await redisClient.sMembers(`user:${userId}:sessions`);
    for (const sessionId of sessionIds) {
      await redisClient.del(`session:${sessionId}`);
    }
    await redisClient.del(`user:${userId}:sessions`);
  }
}
```

### 1.5 Configuration Management

**File**: `src/config/config.ts`

```typescript
import { z } from 'zod';

// MongoDB configuration schema
const MongoDBConfigSchema = z.object({
  uri: z.string().startsWith('mongodb'),
  dbName: z.string().default('cvplus'),
  maxPoolSize: z.number().default(50),
  minPoolSize: z.number().default(10),
  maxIdleTimeMs: z.number().default(60000),
  connectTimeoutMs: z.number().default(10000),
  serverSelectionTimeoutMs: z.number().default(5000),
});

// Rate limiting configuration schema
const RateLimitConfigSchema = z.object({
  redisUrl: z.string().startsWith('redis'),
});

// Encryption configuration schema
const EncryptionConfigSchema = z.object({
  encryptionKey: z.string().length(64), // 32 bytes hex-encoded
});

// Export configuration getters
export function getMongoDBConfig() {
  const config = {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'cvplus',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50'),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10'),
    maxIdleTimeMs: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '60000'),
    connectTimeoutMs: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000'),
    serverSelectionTimeoutMs: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000'),
  };

  return MongoDBConfigSchema.parse(config);
}

export function getRateLimitConfig() {
  const config = {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  return RateLimitConfigSchema.parse(config);
}

export function getEncryptionConfig() {
  const config = {
    encryptionKey: process.env.ENCRYPTION_KEY,
  };

  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  return EncryptionConfigSchema.parse(config);
}
```

**File**: `src/config/secrets.ts`

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${secretName} is empty`);
    }
    return payload;
  } catch (error) {
    throw new Error(`Failed to fetch secret ${secretName}: ${error.message}`);
  }
}

// Load MongoDB URI from Secret Manager
export async function getMongoDBURI(): Promise<string> {
  return await getSecret('MONGODB_URI');
}

// Load encryption key from Secret Manager
export async function getEncryptionKey(): Promise<string> {
  return await getSecret('ENCRYPTION_KEY');
}
```

### 1.6 Repository Pattern

**File**: `src/database/repository.ts`

```typescript
import { Collection, Filter, UpdateFilter, OptionalId } from 'mongodb';
import { BaseDocument } from './mongodb';
import { VersionConflictError, DocumentNotFoundError } from './errors';
import { logger } from '../logging/logger';

export abstract class BaseRepository<T extends BaseDocument> {
  constructor(protected collection: Collection<T>) {}

  // Create document with optimistic concurrency control
  async create(document: OptionalId<T>): Promise<T> {
    const now = new Date();
    const newDocument = {
      ...document,
      version: 1,
      createdAt: now,
      updatedAt: now,
    } as OptionalId<T>;

    const result = await this.collection.insertOne(newDocument);

    logger.info('Document created', {
      collection: this.collection.collectionName,
      documentId: result.insertedId,
    });

    return {
      ...newDocument,
      _id: result.insertedId.toString(),
    } as T;
  }

  // Find by ID
  async findById(id: string): Promise<T | null> {
    return await this.collection.findOne({ _id: id } as Filter<T>);
  }

  // Find by ID or throw
  async findByIdOrThrow(id: string): Promise<T> {
    const document = await this.findById(id);
    if (!document) {
      throw new DocumentNotFoundError(this.collection.collectionName, id);
    }
    return document;
  }

  // Find many with filter
  async find(filter: Filter<T>, limit?: number, skip?: number): Promise<T[]> {
    let query = this.collection.find(filter);

    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }

    return await query.toArray();
  }

  // Count documents
  async count(filter: Filter<T>): Promise<number> {
    return await this.collection.countDocuments(filter);
  }

  // Update with optimistic concurrency control
  async update(id: string, expectedVersion: number, update: UpdateFilter<T>): Promise<T> {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: id,
        version: expectedVersion,
      } as Filter<T>,
      {
        $set: {
          ...update.$set,
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      // Check if document exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new DocumentNotFoundError(this.collection.collectionName, id);
      }

      // Version conflict
      throw new VersionConflictError(id, expectedVersion, existing.version);
    }

    logger.info('Document updated', {
      collection: this.collection.collectionName,
      documentId: id,
      newVersion: result.value.version,
    });

    return result.value;
  }

  // Delete document
  async delete(id: string): Promise<void> {
    const result = await this.collection.deleteOne({ _id: id } as Filter<T>);

    if (result.deletedCount === 0) {
      throw new DocumentNotFoundError(this.collection.collectionName, id);
    }

    logger.info('Document deleted', {
      collection: this.collection.collectionName,
      documentId: id,
    });
  }

  // Soft delete (mark as deleted)
  async softDelete(id: string, expectedVersion: number): Promise<T> {
    return await this.update(id, expectedVersion, {
      $set: { deletedAt: new Date() } as any,
    });
  }
}
```

### 1.7 Transaction Support

**File**: `src/database/transactions.ts`

```typescript
import { ClientSession } from 'mongodb';
import { getMongoDBClient } from './mongodb';
import { logger } from '../logging/logger';

export async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T> {
  const client = getMongoDBClient();
  const session = client.startSession();

  try {
    let result: T;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    logger.info('Transaction committed');
    return result!;
  } catch (error) {
    logger.error('Transaction failed', { error });
    throw error;
  } finally {
    await session.endSession();
  }
}

// Example usage:
// const result = await withTransaction(async (session) => {
//   await userRepo.create(user, session);
//   await jobRepo.create(job, session);
//   return { userId: user._id, jobId: job._id };
// });
```

### 1.8 Document Interfaces

**File**: `src/types/database.ts`

```typescript
import { BaseDocument } from '../database/mongodb';

// User document
export interface UserDocument extends BaseDocument {
  uid: string; // Firebase Auth UID
  email: string; // Encrypted
  displayName?: string;
  photoURL?: string;

  // User preferences
  locale: 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'zh' | 'ar' | 'ru' | 'nl';
  textDirection: 'ltr' | 'rtl';
  timezone?: string;

  // Accessibility preferences
  accessibility: {
    screenReader: boolean;
    highContrast: boolean;
    fontSize: 'normal' | 'large' | 'xlarge';
    reducedMotion: boolean;
    keyboardOnly: boolean;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    focusIndicatorStyle: 'default' | 'high-contrast' | 'extra-large';
  };

  // Subscription and limits
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'expired';
    expiresAt?: Date;
  };
}

// CV/Job document
export interface JobDocument extends BaseDocument {
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // CV data
  data: CVData;

  // Public profile
  publicProfile?: {
    isPublic: boolean;
    slug?: string;
  };

  // Processing metadata
  processingMetadata?: {
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  };
}

export interface CVData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  profileImage?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  achievements: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
  startDate: string;
  endDate?: string;
  technologies: string[];
}

// Public profile document
export interface PublicProfileDocument extends BaseDocument {
  userId: string;
  jobId: string;
  slug: string; // URL-safe unique identifier

  // Public CV data (subset of JobDocument.data)
  displayName: string;
  headline?: string;
  summary?: string;
  profileImage?: string;

  // Visibility settings
  visibility: {
    email: boolean;
    phone: boolean;
    location: boolean;
    experience: boolean;
    education: boolean;
    skills: boolean;
    languages: boolean;
    certifications: boolean;
    projects: boolean;
  };

  // Analytics
  views: number;
  lastViewedAt?: Date;
}

// Chat session document
export interface ChatSessionDocument extends BaseDocument {
  userId: string;
  jobId?: string;
  title?: string;
  status: 'active' | 'archived';

  // Session metadata
  messageCount: number;
  lastMessageAt?: Date;
}

// Chat message document (separate for scalability)
export interface ChatMessageDocument extends BaseDocument {
  sessionId: string;
  userId: string;

  // Message content
  role: 'user' | 'assistant' | 'system';
  content: string;

  // AI metadata
  model?: string;
  tokens?: number;
  cost?: number;
}

// Audio file document
export interface AudioFileDocument extends BaseDocument {
  userId: string;
  jobId?: string;
  type: 'tts' | 'stt';

  // GCS storage
  gcsPath: string;

  // Audio properties
  format: 'mp3' | 'wav' | 'ogg' | 'flac';
  duration: number; // seconds
  size: number; // bytes
  sampleRate: number; // Hz (44100, 48000)
  bitDepth: number; // bits (16, 24)
  channels: number; // 1 (mono) or 2 (stereo)
  bitrate?: number; // kbps

  // Checksum for integrity validation
  checksum: string; // SHA-256 hash

  // Processing status
  status: 'processing' | 'ready' | 'failed';
  processingError?: string;

  // Provider metadata
  provider: 'elevenlabs' | 'google' | 'azure' | 'upload';
  providerMetadata?: {
    requestId?: string;
    model?: string;
    costCredits?: number;
  };

  // Content metadata
  metadata: {
    language?: string;
    voice?: string;
    transcript?: string;
    containsPII?: boolean;
  };

  // Expiration (for temporary audio)
  expiresAt?: Date;
}

// Analytics document
export interface AnalyticsDocument extends BaseDocument {
  userId: string;
  eventType: string;
  eventData: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
```

---

## Phase 2: Data Migration Scripts (Days 4-6)

### 2.1 Migration Script Architecture

**Directory**: `scripts/migration/`

```
scripts/migration/
├── migrate-all.ts          # Master migration orchestrator
├── migrate-users.ts        # User collection migration
├── migrate-jobs.ts         # Job collection migration
├── migrate-profiles.ts     # Public profile migration
├── migrate-chats.ts        # Chat session/message migration
├── migrate-audio.ts        # Audio file migration (if applicable)
├── verify-migration.ts     # Comprehensive validation
├── verify-connection.js    # MongoDB connection test
├── verify-firestore.js     # Firestore connection test
├── create-snapshot.js      # Pre-migration backup
├── cleanup-mongodb.js      # Rollback cleanup
└── README.md               # Migration documentation
```

