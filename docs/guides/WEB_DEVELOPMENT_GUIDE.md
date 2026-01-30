# Web Development Guide

**Stack:** React 18 + TypeScript + Vite + Zustand + TailwindCSS + Glass UI
**Last Updated:** 2026-01-30

## Overview

This guide covers web development patterns and best practices for the Bayit+ web application. The stack prioritizes performance, type safety, and modern React patterns.

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2+ | UI framework |
| **TypeScript** | 5.0+ | Type safety |
| **Vite** | 5.0+ | Build tool & dev server |
| **Zustand** | 4.4+ | State management |
| **TailwindCSS** | 3.4+ | Styling |
| **React Router** | 6.20+ | Routing |
| **React Query** | 5.0+ | Server state |
| **Axios** | 1.6+ | HTTP client |
| **i18next** | 25.8+ | Internationalization |
| **Playwright** | 1.40+ | E2E testing |

---

## Project Structure

```
web/
├── src/
│   ├── components/          # React components
│   │   ├── common/          # Shared components
│   │   ├── features/        # Feature-specific components
│   │   └── layout/          # Layout components
│   ├── pages/               # Route pages
│   ├── services/            # API services
│   ├── stores/              # Zustand stores
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   ├── config/              # Configuration
│   ├── assets/              # Static assets
│   └── styles/              # Global styles
├── public/                  # Public assets
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests (Playwright)
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── tailwind.config.js       # Tailwind config
└── package.json             # Dependencies
```

---

## Getting Started

### Prerequisites

```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Installation

```bash
cd web
npm install
```

### Development Server

```bash
npm start
# Opens http://localhost:3000
# Backend proxy configured to http://localhost:8000
```

### Build for Production

```bash
npm run build
# Output: dist/
```

### Preview Production Build

```bash
npm run preview
# Opens http://localhost:4173
```

---

## Component Patterns

### Functional Components with TypeScript

```typescript
// src/components/features/ContentCard.tsx
import React from 'react';
import { GlassCard, GlassButton } from '@bayit/glass';

interface ContentCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  onPlay: (id: string) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  id,
  title,
  description,
  thumbnail,
  onPlay
}) => {
  const handlePlay = () => {
    onPlay(id);
  };

  return (
    <GlassCard className="p-6">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}
      <h3 className="text-white text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/70 mb-4">{description}</p>
      <GlassButton variant="primary" onPress={handlePlay}>
        Play
      </GlassButton>
    </GlassCard>
  );
};
```

### Custom Hooks

```typescript
// src/hooks/useContent.ts
import { useState, useEffect } from 'react';
import { contentService } from '@/services/contentService';
import { Content } from '@/types/content';

export const useContent = (contentId: string) => {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await contentService.getById(contentId);
        setContent(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [contentId]);

  return { content, loading, error };
};

// Usage:
const { content, loading, error } = useContent('123');
```

---

## State Management (Zustand)

### Creating a Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await authService.login(email, password);
        set({
          user: response.user,
          token: response.access_token,
          isAuthenticated: true
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);

// Usage in components:
const { user, isAuthenticated, login, logout } = useAuthStore();
```

### Store Best Practices

- **Keep stores focused** - One store per domain (auth, content, UI)
- **Use selectors** - Only subscribe to needed state
- **Persist sensitive data carefully** - Don't persist tokens in localStorage for XSS-prone apps
- **Use middleware** - `persist`, `devtools`, `immer`

---

## API Integration

### API Service Pattern

```typescript
// src/services/api.ts
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/authStore';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(config => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiService = new ApiService();
```

### Service Layer

```typescript
// src/services/contentService.ts
import { apiService } from './api';
import { Content, ContentListResponse } from '@/types/content';

class ContentService {
  async getAll(params?: {
    limit?: number;
    offset?: number;
    section?: string;
  }): Promise<ContentListResponse> {
    return apiService.get<ContentListResponse>('/content', params);
  }

  async getById(id: string): Promise<Content> {
    return apiService.get<Content>(`/content/${id}`);
  }

  async search(query: string): Promise<Content[]> {
    return apiService.get<Content[]>('/content/search', { q: query });
  }
}

export const contentService = new ContentService();
```

---

## Routing

### Route Configuration

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ContentPage } from '@/pages/ContentPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/content/:id" element={<ContentPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### Protected Route Component

```typescript
// src/components/common/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

---

## Styling (TailwindCSS + Glass UI)

### TailwindCSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
```

### Styling Best Practices

```typescript
// ✅ GOOD - Use TailwindCSS utility classes
<div className="flex flex-col gap-4 p-6 bg-black/20 backdrop-blur-xl rounded-2xl">
  <h1 className="text-white text-2xl font-bold">Title</h1>
  <p className="text-white/70">Description</p>
</div>

// ✅ GOOD - Use Glass UI components
import { GlassCard } from '@bayit/glass';

<GlassCard className="p-6">
  <h1 className="text-white text-2xl font-bold">Title</h1>
</GlassCard>

// ❌ BAD - Don't use inline styles
<div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
  Content
</div>

// ❌ BAD - Don't create external CSS files
import './MyComponent.css';
```

---

## Performance Optimization

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';
import { GlassLoadingSpinner } from '@bayit/glass';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<GlassLoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

### Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualList = ({ items }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ContentCard {...items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Testing

### Unit Tests (Jest + React Testing Library)

```typescript
// src/components/ContentCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentCard } from './ContentCard';

describe('ContentCard', () => {
  const mockProps = {
    id: '123',
    title: 'Test Movie',
    description: 'Test description',
    onPlay: jest.fn(),
  };

  it('renders title and description', () => {
    render(<ContentCard {...mockProps} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onPlay when play button clicked', async () => {
    const user = userEvent.setup();
    render(<ContentCard {...mockProps} />);

    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(mockProps.onPlay).toHaveBeenCalledWith('123');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/content.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Content browsing', () => {
  test('user can browse and play content', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Wait for content to load
    await expect(page.locator('[data-testid="content-grid"]')).toBeVisible();

    // Click first content card
    await page.locator('[data-testid="content-card"]').first().click();

    // Verify navigation to content page
    await expect(page).toHaveURL(/\/content\/\w+/);

    // Click play button
    await page.click('[data-testid="play-button"]');

    // Verify video player visible
    await expect(page.locator('video')).toBeVisible();
  });
});
```

---

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bayit/glass': path.resolve(__dirname, '../shared/components'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
});
```

---

## Environment Variables

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_PROJECT_ID=your_project_id
```

**Usage:**
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

---

## Best Practices Summary

### DO ✅

- Use TypeScript for all files
- Use functional components with hooks
- Use Zustand for global state
- Use React Query for server state
- Use TailwindCSS for styling
- Use Glass UI components
- Implement error boundaries
- Add loading states
- Test critical paths
- Optimize bundle size

### DON'T ❌

- Don't use class components
- Don't use Redux (use Zustand)
- Don't create external CSS files
- Don't use inline styles
- Don't skip TypeScript types
- Don't ignore accessibility
- Don't skip tests
- Don't hardcode API URLs

---

## Related Documents

- [API Overview](../api/API_OVERVIEW.md)
- [Shared Components Reference](../technical/SHARED_COMPONENTS_REFERENCE.md)
- [i18n Complete Guide](I18N_COMPLETE_GUIDE.md)
- [Testing Strategy](../testing/TESTING_STRATEGY.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Frontend Team
**Next Review:** 2026-04-30
