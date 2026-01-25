# Admin API Factory Pattern Implementation

## Problem

The admin API was causing auth state loss because:

1. **Two Separate Auth Stores**:
   - `shared/stores/authStore.ts` (TypeScript, used by shared adminApi)
   - `web/src/stores/authStore.js` (JavaScript, used by web app)

2. **Auth State Conflict**:
   - Admin pages import `adminContentService` from shared
   - Shared adminApi reads token from `shared/stores/authStore` (empty)
   - No token sent to backend → 401 Unauthorized
   - Response interceptor calls `logout()` on shared store
   - This clears the web store's auth state (same localStorage key)

## Solution: Factory Pattern

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 shared/services/adminApi.ts                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  createAdminApi(authStore: AuthStore)               │  │
│  │  • Creates axios instance with provided auth store  │  │
│  │  • Sets up request/response interceptors            │  │
│  │  • Returns all admin services                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  • Exports factory function                                │
│  • Exports all type definitions                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼─────────┐   ┌───▼──────────────┐
         │  Web Platform      │   │  Mobile/TV       │
         │  web/src/services/ │   │  (Future)        │
         │  adminApi.ts       │   │                  │
         │                    │   │                  │
         │  createAdminApi(   │   │  createAdminApi( │
         │    useAuthStore    │   │    authStore     │
         │  )                 │   │  )               │
         └────────────────────┘   └──────────────────┘
```

### Implementation Details

#### 1. Shared Factory (`shared/services/adminApi.ts`)

**Key Changes**:
- Exports `createAdminApi(authStore)` factory function
- Accepts any auth store implementing the `AuthStore` interface
- All services defined inside the factory (closure over axios instance)
- Returns object with all services

**Interface**:
```typescript
export interface AuthStore {
  getState: () => {
    token: string | null;
    logout: () => void;
  };
}

export const createAdminApi = (authStore: AuthStore) => {
  const adminApi = createAxiosInstance(authStore);
  
  // All services use the injected authStore
  const dashboardService = { ... };
  const usersService = { ... };
  // ... more services
  
  return {
    dashboard: dashboardService,
    users: usersService,
    // ... all services
  };
};
```

#### 2. Web-Specific Implementation (`web/src/services/adminApi.ts`)

**Key Changes**:
- Imports factory from shared
- Imports web-specific auth store (`@/stores/authStore`)
- Creates instance with correct store
- Re-exports all services and types

**Implementation**:
```typescript
import { createAdminApi } from '@bayit/shared/services/adminApi';
import { useAuthStore } from '@/stores/authStore';

// Create with web auth store
const adminApiServices = createAdminApi(useAuthStore);

// Export all services
export const {
  dashboard: dashboardService,
  users: usersService,
  content: adminContentService,
  // ... all services
} = adminApiServices;
```

#### 3. Admin Pages Usage

All admin pages now import from web-specific version:

```typescript
// Before (broken)
import { adminContentService } from '@bayit/shared/services/adminApi';

// After (fixed)
import { adminContentService } from '@/services/adminApi';
```

## Benefits

### ✅ Fixes Auth State Loss
- Web admin API now uses web auth store
- Token correctly retrieved and sent to backend
- No more 401 errors triggering logout

### ✅ Platform Flexibility
- Each platform can provide its own auth store
- Mobile/TV can create their own instances
- Shared code remains DRY

### ✅ Type Safety
- All types exported from shared module
- Web re-exports for convenience
- TypeScript ensures correct usage

### ✅ Maintainability
- Single source of truth for API logic
- Platform differences handled at injection point
- Easy to test with mock auth stores

## Files Modified

1. **`shared/services/adminApi.ts`**
   - Converted to factory pattern
   - Moved all interfaces to top-level exports
   - All services wrapped in `createAdminApi()`

2. **`web/src/services/adminApi.ts`**
   - Creates instance with web auth store
   - Re-exports all services and types

3. **`web/src/pages/admin/FeaturedManagementPage.tsx`**
   - Updated import to use web-specific version

## Testing

### Verify Auth Token
1. Log in to web app
2. Navigate to admin page
3. Check Network tab → requests should have `Authorization: Bearer <token>`
4. No more 401 errors
5. Auth state persists after admin navigation

### Verify Type Safety
```bash
cd web
npm run build  # Should compile without errors
```

## Future Enhancements

### Mobile/TV Platforms
```typescript
// mobile/src/services/adminApi.ts
import { createAdminApi } from '@bayit/shared/services/adminApi';
import { useAuthStore } from '@/stores/authStore';

export const adminApiServices = createAdminApi(useAuthStore);
```

### Testing
```typescript
// __tests__/adminApi.test.ts
import { createAdminApi } from '@bayit/shared/services/adminApi';

const mockAuthStore = {
  getState: () => ({
    token: 'mock-token',
    logout: jest.fn()
  })
};

const adminApi = createAdminApi(mockAuthStore);
// Test services...
```

## Migration Guide

For other platforms (iOS, tvOS, Android):

1. Create `[platform]/src/services/adminApi.ts`:
   ```typescript
   import { createAdminApi } from '@bayit/shared/services/adminApi';
   import { useAuthStore } from '@/stores/authStore';
   
   export const adminApiServices = createAdminApi(useAuthStore);
   export const { content: adminContentService, /* ... */ } = adminApiServices;
   ```

2. Update all admin imports to use platform-specific version:
   ```typescript
   import { adminContentService } from '@/services/adminApi';
   ```

## Rollback Plan

If issues arise, the old pattern can be restored:

1. Revert `shared/services/adminApi.ts` to direct exports
2. Revert `web/src/services/adminApi.ts` to simple re-export
3. Fix auth store conflict by consolidating to single store

## Conclusion

The factory pattern solves the auth store conflict while maintaining code reusability across platforms. Each platform now has full control over its auth implementation while sharing the core API logic.
