# Frontend Migration Guide - Firestore to MongoDB

**Version**: 1.0
**Last Updated**: 2026-01-21
**Migration Timeline**: Days 9-12 (Phase 3)

## Overview

This guide provides step-by-step instructions for migrating the CVPlus frontend from Firebase Firestore to MongoDB Atlas. The migration is designed to be incremental with a dual-API support period to ensure zero downtime.

---

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Component Migration](#component-migration)
4. [API Client Migration](#api-client-migration)
5. [Real-Time Updates Migration](#real-time-updates-migration)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Procedures](#rollback-procedures)
8. [Breaking Changes](#breaking-changes)

---

## Migration Strategy

### Timeline

| Phase | Days | Description |
|-------|------|-------------|
| **Dual API Support** | Days 9-10 | Run Firestore and MongoDB APIs simultaneously |
| **Gradual Cutover** | Days 11-12 | Route 10% → 50% → 100% traffic to MongoDB |
| **Firestore Deprecation** | Day 13+ | Remove Firestore dependencies (2 weeks after 100%) |

### Feature Flags

```typescript
// Feature flag controls which database backend to use
const FEATURE_FLAGS = {
  ENABLE_MONGODB: process.env.REACT_APP_ENABLE_MONGODB === 'true',
  ENABLE_CHANGE_STREAMS: process.env.REACT_APP_ENABLE_CHANGE_STREAMS === 'true',
};
```

---

## Pre-Migration Checklist

### Dependencies

Install required packages:

```bash
cd olorin-cv/cvplus/frontend
npm install socket.io-client@4.6.0
npm install web-vitals@3.5.0
npm install @olorin/shared-node@1.0.0
```

### Environment Variables

Update `.env.production`:

```bash
# API Configuration
REACT_APP_API_BASE_URL=https://us-central1-olorin-cvplus.cloudfunctions.net
REACT_APP_API_VERSION=2.0
REACT_APP_WS_BASE_URL=wss://us-central1-olorin-cvplus.cloudfunctions.net

# Feature Flags (start with false, enable gradually)
REACT_APP_ENABLE_MONGODB=false
REACT_APP_ENABLE_CHANGE_STREAMS=false

# Performance Monitoring
REACT_APP_ENABLE_WEB_VITALS=true
REACT_APP_BUNDLE_SIZE_LIMIT_KB=200
```

### File Structure Changes

```
frontend/src/
├── services/
│   ├── APIClient.ts          # NEW: Centralized API client
│   ├── WebSocketService.ts   # NEW: WebSocket manager
│   ├── FeatureFlagService.ts # NEW: Feature flag system
│   └── firestore.ts          # DEPRECATED: Will be removed
├── hooks/
│   ├── useAPIRequest.ts      # NEW: API request hook
│   ├── useOptimisticUpdate.ts# NEW: Optimistic updates
│   └── useFirestore.ts       # DEPRECATED: Will be removed
├── components/
│   ├── ErrorBoundary.tsx     # NEW: Error boundary
│   └── MaintenanceMode.tsx   # NEW: Maintenance overlay
└── utils/
    ├── performance.ts        # NEW: Web Vitals monitoring
    └── migration.ts          # NEW: Migration utilities
```

---

## Component Migration

### Step 1: User Profile Component

**Before (Firestore)**:

```tsx
// DEPRECATED: frontend/src/components/UserProfile.tsx
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../services/firestore';

export function UserProfile({ userId }: { userId: string }) {
  const [value, loading, error] = useDocument(
    doc(db, 'users', userId)
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const user = value?.data();

  return (
    <div>
      <h1>{user?.displayName}</h1>
      <p>{user?.email}</p>
    </div>
  );
}
```

**After (MongoDB with Dual Support)**:

```tsx
// NEW: frontend/src/components/UserProfile.tsx
import { useAPIRequest } from '../hooks/useAPIRequest';
import { FeatureFlagService } from '../services/FeatureFlagService';
import { apiClient } from '../services/APIClient';
import { GlassCard, GlassSpinner } from '@bayit/glass';

export function UserProfile({ userId }: { userId: string }) {
  // Use MongoDB API if feature flag enabled, otherwise fallback to Firestore
  const { data: user, isLoading, error, execute } = useAPIRequest(
    () => FeatureFlagService.isEnabled('ENABLE_MONGODB')
      ? apiClient.get<UserProfileResponse>('/api/user/profile')
      : fetchFromFirestore(userId), // Fallback during transition
    { maxRetries: 3, retryDelay: 1000 }
  );

  useEffect(() => {
    execute();
  }, [execute]);

  if (isLoading) {
    return (
      <GlassCard className="p-8">
        <GlassSpinner aria-label="Loading user profile" />
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8 bg-red-500/20">
        <p className="text-white">Error loading profile: {error.message}</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-8">
      <h1 className="text-2xl font-bold text-white">{user?.displayName}</h1>
      <p className="text-white/80">{user?.email}</p>
      <p className="text-white/60">Locale: {user?.locale} ({user?.textDirection})</p>
    </GlassCard>
  );
}

// Temporary fallback (remove after migration complete)
async function fetchFromFirestore(userId: string) {
  const docRef = doc(db, 'users', userId);
  const snapshot = await getDoc(docRef);
  return snapshot.data();
}
```

### Step 2: Jobs List Component

**Before (Firestore)**:

```tsx
// DEPRECATED
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';

export function JobsList({ userId }: { userId: string }) {
  const [value, loading, error] = useCollection(
    query(collection(db, 'jobs'), where('userId', '==', userId))
  );

  const jobs = value?.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return (
    <div>
      {jobs?.map(job => (
        <div key={job.id}>{job.status}</div>
      ))}
    </div>
  );
}
```

**After (MongoDB with Pagination)**:

```tsx
// NEW
import { useState } from 'react';
import { useAPIRequest } from '../hooks/useAPIRequest';
import { apiClient } from '../services/APIClient';
import { GlassCard, GlassButton } from '@bayit/glass';

interface JobsListResponse {
  jobs: JobDocument[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export function JobsList({ userId }: { userId: string }) {
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data, isLoading, error, execute } = useAPIRequest(
    () => apiClient.get<JobsListResponse>(`/api/jobs?limit=${limit}&skip=${page * limit}`),
    { maxRetries: 3 }
  );

  useEffect(() => {
    execute();
  }, [page, execute]);

  if (isLoading) return <GlassSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      {data?.jobs.map(job => (
        <GlassCard key={job._id} className="p-4">
          <p className="text-white">Status: {job.status}</p>
          <p className="text-white/60">Created: {new Date(job.createdAt).toLocaleDateString()}</p>
        </GlassCard>
      ))}

      {/* Pagination */}
      <div className="flex gap-4 justify-center">
        <GlassButton
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </GlassButton>
        <GlassButton
          onClick={() => setPage(p => p + 1)}
          disabled={!data?.hasMore}
        >
          Next
        </GlassButton>
      </div>
    </div>
  );
}
```

### Step 3: Real-Time Job Updates

**Before (Firestore onSnapshot)**:

```tsx
// DEPRECATED
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'jobs', jobId),
    (snapshot) => {
      setJob(snapshot.data());
    }
  );

  return () => unsubscribe();
}, [jobId]);
```

**After (WebSocket Change Streams)**:

```tsx
// NEW
import { useWebSocket } from '../hooks/useWebSocket';

export function JobStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDocument | null>(null);

  // WebSocket connection with automatic reconnection
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    // Subscribe to job updates
    socket.emit('subscribe', { channel: 'jobs', jobId });

    // Listen for updates
    socket.on('job:updated', (data: { jobId: string; status: string }) => {
      if (data.jobId === jobId) {
        setJob(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    return () => {
      socket.emit('unsubscribe', { channel: 'jobs', jobId });
      socket.off('job:updated');
    };
  }, [socket, jobId]);

  return (
    <div>
      <p>Status: {job?.status}</p>
      <p>Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
    </div>
  );
}
```

---

## API Client Migration

### New Centralized API Client

**File**: `frontend/src/services/APIClient.ts`

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { auth } from './firebase';

export class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL,
      timeout: 10000,
      headers: {
        'X-API-Version': process.env.REACT_APP_API_VERSION || '2.0',
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // API version mismatch - force reload
        if (error.response?.status === 426) {
          console.error('API version mismatch - reloading page');
          window.location.reload();
          return Promise.reject(error);
        }

        // Rate limit exceeded
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.warn(`Rate limited - retry after ${retryAfter}s`);
        }

        // Version conflict - optimistic concurrency failure
        if (error.response?.status === 409) {
          console.error('Version conflict - document was modified');
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
```

### useAPIRequest Hook

**File**: `frontend/src/hooks/useAPIRequest.ts`

```typescript
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface APIRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export function useAPIRequest<T>(
  requestFn: () => Promise<T>,
  options: APIRequestOptions<T> = {}
) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let attempts = 0;
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;

    while (attempts < maxRetries) {
      try {
        const result = await requestFn();
        setData(result);
        setIsLoading(false);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        attempts++;

        if (attempts >= maxRetries) {
          const error = err as Error;
          setError(error);
          setIsLoading(false);
          options.onError?.(error);
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
      }
    }
  }, [requestFn, options]);

  return { execute, isLoading, error, data };
}
```

---

## Real-Time Updates Migration

### WebSocket Service

**File**: `frontend/src/services/WebSocketService.ts`

```typescript
import io, { Socket } from 'socket.io-client';
import { auth } from './firebase';

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private heartbeatInterval = 30000;
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();

    this.socket = io(process.env.REACT_APP_WS_BASE_URL!, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
    });

    this.setupEventHandlers();
    this.setupOnlineDetection();

    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`WebSocket reconnect attempt ${attempt}`);
      this.reconnectAttempts = attempt;
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimeout = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private setupOnlineDetection(): void {
    window.addEventListener('online', () => {
      console.log('Network online - reconnecting WebSocket');
      this.socket?.connect();
    });

    window.addEventListener('offline', () => {
      console.log('Network offline - disconnecting WebSocket');
      this.socket?.disconnect();
    });
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const wsService = WebSocketService.getInstance();
```

### useWebSocket Hook

**File**: `frontend/src/hooks/useWebSocket.ts`

```typescript
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { wsService } from '../services/WebSocketService';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const ws = await wsService.connect();
        setSocket(ws);

        ws.on('connect', () => setIsConnected(true));
        ws.on('disconnect', () => setIsConnected(false));
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, []);

  return { socket, isConnected };
}
```

---

## Testing Strategy

### Unit Tests

Test each migrated component:

```bash
npm test src/components/UserProfile.test.tsx
npm test src/services/APIClient.test.ts
npm test src/hooks/useAPIRequest.test.ts
```

### Integration Tests

Test API integration:

```typescript
// tests/integration/api.test.ts
import { apiClient } from '../services/APIClient';

describe('MongoDB API Integration', () => {
  it('should fetch user profile', async () => {
    const profile = await apiClient.get('/api/user/profile');
    expect(profile).toHaveProperty('_id');
    expect(profile).toHaveProperty('email');
  });

  it('should handle version conflicts', async () => {
    await expect(
      apiClient.put('/api/user/preferences', {
        locale: 'es',
        version: 999 // Wrong version
      })
    ).rejects.toThrow();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/migration.spec.ts
import { test, expect } from '@playwright/test';

test('User can view profile with MongoDB', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login"]');

  // Wait for profile to load
  await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();

  // Verify MongoDB API was called
  const requests = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter((r: any) => r.name.includes('/api/user/profile'))
  );
  expect(requests.length).toBeGreaterThan(0);
});
```

---

## Rollback Procedures

### Immediate Rollback (< 1 hour after deployment)

```bash
# 1. Disable MongoDB feature flag
firebase deploy --only functions:config.set ENABLE_MONGODB=false

# 2. Roll back frontend deployment
cd frontend
firebase hosting:rollback

# 3. Verify Firestore is working
curl https://cvplus.web.app/health
```

### Partial Rollback (Components with Issues)

Revert specific components to Firestore while keeping others on MongoDB:

```tsx
// Temporary: Force Firestore for specific component
const FORCE_FIRESTORE_FOR_JOBS = true;

export function JobsList() {
  const useMongoDB = FeatureFlagService.isEnabled('ENABLE_MONGODB') && !FORCE_FIRESTORE_FOR_JOBS;

  // ... rest of component
}
```

---

## Breaking Changes

### Data Structure Changes

| Field | Firestore | MongoDB | Migration |
|-------|-----------|---------|-----------|
| Document ID | `.id` | `._id` | Map in response |
| Timestamps | `Timestamp` | `Date` (ISO 8601 string) | Convert in client |
| Nested Objects | Direct access | Same | No change |
| Arrays | Same | Same | No change |

### API Response Changes

**Firestore** (via Firebase SDK):
```json
{
  "id": "doc-123",
  "data": { "..." },
  "exists": true
}
```

**MongoDB** (via REST API):
```json
{
  "_id": "doc-123",
  "...": "...",
  "version": 1,
  "createdAt": "2026-01-21T10:00:00Z",
  "updatedAt": "2026-01-21T10:00:00Z"
}
```

### Removed Features

- `onSnapshot()` → Replaced with WebSocket Change Streams
- `batch()` writes → Use transaction API endpoint
- Firestore Security Rules → MongoDB RBAC (server-side)

---

## Performance Checklist

- [ ] Bundle size < 200KB (initial load)
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] FID < 100ms (First Input Delay)
- [ ] CLS < 0.1 (Cumulative Layout Shift)
- [ ] WebSocket connects < 2s
- [ ] API response time < 200ms (95th percentile)

---

## Success Criteria

Migration is complete when:

1. ✅ All components migrated to MongoDB API
2. ✅ WebSocket real-time updates working
3. ✅ All tests passing (unit, integration, E2E)
4. ✅ Performance metrics meeting targets
5. ✅ Zero errors in production for 48 hours
6. ✅ Firestore dependencies removed from package.json
7. ✅ Documentation updated

---

## Support

For migration issues:
- **Slack**: #cvplus-migration
- **GitHub**: https://github.com/olorin/cvplus/issues
- **On-call**: migration-oncall@olorin.ai