# AI Features Web Integration Guide

**Platform:** Web (React 18 + TypeScript + Vite)
**Last Updated:** 2026-01-30
**Status:** ✅ Production Ready

---

## Overview

This guide covers integrating Beta 500 AI features into the Bayit+ web application:
- **AI Search** - Natural language content discovery
- **AI Recommendations** - Personalized content suggestions
- **Auto Catch-Up** - Live TV summaries
- **Credit Management** - Real-time credit tracking

**Stack:**
- React 18 with TypeScript 5.0+
- Vite for build and HMR
- Zustand for state management
- TailwindCSS for styling
- Glass UI component library
- i18next for internationalization

---

## Architecture

### Component Hierarchy

```
App
├── CreditBalanceWidget (top-right, persistent)
├── AISearchModal (Cmd/Ctrl+K shortcut)
├── HomePage
│   ├── AIRecommendationsPanel
│   └── ContentGrid
└── LiveTVPage
    ├── ChannelPlayer
    └── CatchUpButton
```

### State Management

::: v-pre
```typescript
// stores/betaCreditsStore.ts
interface BetaCreditsState {
  balance: number;
  isBetaUser: boolean;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  deductCredits: (amount: number, feature: string) => Promise<void>;
}

// stores/aiSearchStore.ts
interface AISearchState {
  query: string;
  results: ContentItem[];
  loading: boolean;
  isOpen: boolean;
  search: (query: string) => Promise<void>;
  close: () => void;
}

// stores/aiRecommendationsStore.ts
interface AIRecommendationsState {
  recommendations: ContentItem[];
  loading: boolean;
  lastFetched: Date | null;
  fetchRecommendations: () => Promise<void>;
}
```
:::

---

## Installation

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "i18next": "^25.8.0",
    "react-i18next": "^16.5.3",
    "@olorin/shared-i18n": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.3.0"
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'ai-features': [
            './src/components/ai/AISearchModal',
            './src/components/ai/AIRecommendationsPanel',
            './src/components/ai/CatchUpButton',
          ],
        },
      },
    },
  },
});
```

---

## Component Implementation

### 1. Credit Balance Widget

**Purpose:** Display real-time credit balance in top-right corner.

::: v-pre
```typescript
// src/components/ai/CreditBalanceWidget.tsx
import React, { useEffect } from 'react';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';

export const CreditBalanceWidget: React.FC = () => {
  const { t } = useTranslation();
  const { balance, isBetaUser, loading, fetchBalance } = useBetaCreditsStore();

  useEffect(() => {
    if (isBetaUser) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isBetaUser, fetchBalance]);

  if (!isBetaUser) return null;

  const getBalanceColor = () => {
    if (balance <= 10) return 'text-red-400';
    if (balance <= 20) return 'text-orange-400';
    if (balance <= 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
      <span className="text-2xl">🪙</span>
      <div className="flex flex-col">
        <span className={`text-lg font-bold ${getBalanceColor()}`}>
          {loading ? '...' : balance}
        </span>
        <span className="text-xs text-white/60">{t('ai.credits')}</span>
      </div>
    </div>
  );
};
```
:::

### 2. AI Search Modal

**Purpose:** Natural language search with Cmd/Ctrl+K shortcut.

::: v-pre
```typescript
// src/components/ai/AISearchModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GlassModal, GlassInput, GlassButton, GlassCard } from '@bayit/glass';
import { useAISearchStore } from '../../stores/aiSearchStore';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';

export const AISearchModal: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { isOpen, results, loading, search, close } = useAISearchStore();
  const { balance, deductCredits } = useBetaCreditsStore();

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useAISearchStore.setState({ isOpen: true });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    if (balance < 10) {
      alert(t('ai.insufficient_credits'));
      return;
    }

    try {
      await search(query);
      await deductCredits(10, 'ai_search');
    } catch (error) {
      console.error('AI Search failed:', error);
    }
  }, [query, balance, search, deductCredits, t]);

  return (
    <GlassModal visible={isOpen} onClose={close} className="max-w-4xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('ai.search.title')}
        </h2>

        <div className="flex gap-2 mb-6">
          <GlassInput
            placeholder={t('ai.search.placeholder')}
            value={query}
            onChangeText={setQuery}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
            autoFocus
          />
          <GlassButton
            variant="primary"
            onPress={handleSearch}
            disabled={loading || balance < 10}
          >
            {loading ? t('ai.searching') : `${t('ai.search.button')} (-10)`}
          </GlassButton>
        </div>

        {balance < 10 && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-300">{t('ai.insufficient_credits')}</p>
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {results.map((item) => (
            <GlassCard key={item.id} className="p-4 hover:scale-[1.02] transition-transform">
              <div className="flex gap-4">
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-24 h-36 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-white/70 mb-2">{item.ai_insight}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                      {item.section}
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                      {item.year}
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 rounded text-xs text-green-300">
                      {t('ai.relevance')}: {(item.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </GlassModal>
  );
};
```
:::

### 3. AI Recommendations Panel

**Purpose:** Display personalized recommendations on home page.

::: v-pre
```typescript
// src/components/ai/AIRecommendationsPanel.tsx
import React, { useEffect } from 'react';
import { GlassCard, GlassButton, GlassSpinner } from '@bayit/glass';
import { useAIRecommendationsStore } from '../../stores/aiRecommendationsStore';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';

export const AIRecommendationsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { recommendations, loading, lastFetched, fetchRecommendations } =
    useAIRecommendationsStore();
  const { balance, isBetaUser, deductCredits } = useBetaCreditsStore();

  // Auto-fetch on mount if no recent recommendations
  useEffect(() => {
    if (isBetaUser && !lastFetched) {
      handleFetch();
    }
  }, [isBetaUser, lastFetched]);

  const handleFetch = async () => {
    if (balance < 5) {
      alert(t('ai.insufficient_credits'));
      return;
    }

    try {
      await fetchRecommendations();
      await deductCredits(5, 'ai_recommendations');
    } catch (error) {
      console.error('AI Recommendations failed:', error);
    }
  };

  if (!isBetaUser) return null;

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">
          🤖 {t('ai.recommendations.title')}
        </h2>
        <GlassButton
          variant="secondary"
          onPress={handleFetch}
          disabled={loading || balance < 5}
        >
          {loading ? <GlassSpinner size="small" /> : `${t('ai.refresh')} (-5)`}
        </GlassButton>
      </div>

      {balance < 5 && (
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 mb-4">
          <p className="text-orange-300">{t('ai.low_credits')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="group cursor-pointer"
            onClick={() => window.location.href = `/content/${item.id}`}
          >
            <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3]">
              <img
                src={item.poster_url}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                AI
              </div>
            </div>
            <h3 className="text-sm font-medium text-white truncate">
              {item.title}
            </h3>
            <p className="text-xs text-white/60">{item.reason}</p>
          </div>
        ))}
      </div>

      {lastFetched && (
        <p className="text-xs text-white/40 mt-4 text-center">
          {t('ai.last_updated')}: {new Date(lastFetched).toLocaleString()}
        </p>
      )}
    </GlassCard>
  );
};
```
:::

### 4. Catch-Up Button

**Purpose:** Generate AI summaries for live TV.

::: v-pre
```typescript
// src/components/ai/CatchUpButton.tsx
import React, { useState } from 'react';
import { GlassButton, GlassModal, GlassCard, GlassSpinner } from '@bayit/glass';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';
import { aiService } from '../../services/aiService';

interface CatchUpButtonProps {
  channelId: string;
  channelName: string;
}

export const CatchUpButton: React.FC<CatchUpButtonProps> = ({
  channelId,
  channelName,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { balance, deductCredits } = useBetaCreditsStore();

  const handleCatchUp = async () => {
    if (balance < 15) {
      alert(t('ai.insufficient_credits'));
      return;
    }

    setLoading(true);
    setShowModal(true);

    try {
      const result = await aiService.getCatchUpSummary(channelId);
      setSummary(result.summary);
      await deductCredits(15, 'catch_up');
    } catch (error) {
      console.error('Catch-Up failed:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlassButton
        variant="primary"
        onPress={handleCatchUp}
        disabled={balance < 15}
        className="flex items-center gap-2"
      >
        <span>⚡</span>
        <span>{t('ai.catchup.button')} (-15)</span>
      </GlassButton>

      <GlassModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-2xl"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            📺 {t('ai.catchup.title')}: {channelName}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <GlassSpinner size="large" />
              <p className="text-white/60 mt-4">{t('ai.catchup.generating')}</p>
            </div>
          ) : summary ? (
            <GlassCard className="p-4">
              <div className="prose prose-invert max-w-none">
                <p className="text-white leading-relaxed whitespace-pre-line">
                  {summary}
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300">{t('ai.catchup.error')}</p>
            </div>
          )}
        </div>
      </GlassModal>
    </>
  );
};
```
:::

---

## State Management

### Beta Credits Store

::: v-pre
```typescript
// src/stores/betaCreditsStore.ts
import { create } from 'zustand';
import { aiService } from '../services/aiService';

interface BetaCreditsState {
  balance: number;
  isBetaUser: boolean;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  deductCredits: (amount: number, feature: string) => Promise<void>;
}

export const useBetaCreditsStore = create<BetaCreditsState>((set, get) => ({
  balance: 0,
  isBetaUser: false,
  loading: false,
  error: null,

  fetchBalance: async () => {
    set({ loading: true, error: null });
    try {
      const data = await aiService.getCreditBalance();
      set({
        balance: data.balance,
        isBetaUser: data.is_beta_user,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
        loading: false,
      });
    }
  },

  deductCredits: async (amount: number, feature: string) => {
    const currentBalance = get().balance;

    // Optimistic update
    set({ balance: Math.max(0, currentBalance - amount) });

    try {
      await aiService.deductCredits(amount, feature);
      // Verify actual balance
      await get().fetchBalance();
    } catch (error) {
      // Rollback on failure
      set({ balance: currentBalance });
      throw error;
    }
  },
}));
```
:::

### AI Search Store

::: v-pre
```typescript
// src/stores/aiSearchStore.ts
import { create } from 'zustand';
import { aiService } from '../services/aiService';
import type { ContentItem } from '../types';

interface AISearchState {
  query: string;
  results: ContentItem[];
  loading: boolean;
  isOpen: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  close: () => void;
}

export const useAISearchStore = create<AISearchState>((set) => ({
  query: '',
  results: [],
  loading: false,
  isOpen: false,
  error: null,

  search: async (query: string) => {
    set({ loading: true, query, error: null });
    try {
      const results = await aiService.searchWithAI(query);
      set({ results, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false,
        results: [],
      });
    }
  },

  close: () => set({ isOpen: false, query: '', results: [], error: null }),
}));
```
:::

### AI Recommendations Store

::: v-pre
```typescript
// src/stores/aiRecommendationsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aiService } from '../services/aiService';
import type { ContentItem } from '../types';

interface AIRecommendationsState {
  recommendations: ContentItem[];
  loading: boolean;
  lastFetched: Date | null;
  error: string | null;
  fetchRecommendations: () => Promise<void>;
}

export const useAIRecommendationsStore = create<AIRecommendationsState>()(
  persist(
    (set) => ({
      recommendations: [],
      loading: false,
      lastFetched: null,
      error: null,

      fetchRecommendations: async () => {
        set({ loading: true, error: null });
        try {
          const recommendations = await aiService.getRecommendations();
          set({
            recommendations,
            loading: false,
            lastFetched: new Date(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch',
            loading: false,
          });
        }
      },
    }),
    {
      name: 'ai-recommendations',
      partialize: (state) => ({
        recommendations: state.recommendations,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
```
:::

---

## API Service

::: v-pre
```typescript
// src/services/aiService.ts
import axios from 'axios';
import type { ContentItem, CatchUpSummary } from '../types';

const API_BASE = '/api/v1';

interface AISearchResponse {
  results: ContentItem[];
  query: string;
  total: number;
}

interface CreditBalanceResponse {
  balance: number;
  is_beta_user: boolean;
}

interface AIRecommendationsResponse {
  recommendations: ContentItem[];
}

export const aiService = {
  /**
   * Get current user's credit balance
   */
  getCreditBalance: async (): Promise<CreditBalanceResponse> => {
    const response = await axios.get<CreditBalanceResponse>(
      `${API_BASE}/beta/credits/balance`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Deduct credits (internal - called automatically by features)
   */
  deductCredits: async (amount: number, feature: string): Promise<void> => {
    await axios.post(
      `${API_BASE}/beta/credits/deduct`,
      { amount, feature },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
  },

  /**
   * AI Search - Natural language content search
   * Cost: 10 credits
   */
  searchWithAI: async (
    query: string,
    filters?: {
      section?: string;
      language?: string;
      year_min?: number;
      genre?: string;
    }
  ): Promise<ContentItem[]> => {
    const response = await axios.post<AISearchResponse>(
      `${API_BASE}/beta/search`,
      { query, limit: 20, filters },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.data.results;
  },

  /**
   * AI Recommendations - Personalized suggestions
   * Cost: 5 credits
   */
  getRecommendations: async (): Promise<ContentItem[]> => {
    const response = await axios.get<AIRecommendationsResponse>(
      `${API_BASE}/beta/recommendations`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.data.recommendations;
  },

  /**
   * Auto Catch-Up - Live TV summary
   * Cost: 15 credits
   */
  getCatchUpSummary: async (channelId: string): Promise<CatchUpSummary> => {
    const response = await axios.get<CatchUpSummary>(
      `${API_BASE}/live/${channelId}/catchup`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.data;
  },
};
```
:::

---

## Error Handling

### API Error Interceptor

```typescript
// src/services/apiClient.ts
import axios from 'axios';
import { useBetaCreditsStore } from '../stores/betaCreditsStore';

const apiClient = axios.create({
  baseURL: '/api/v1',
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402) {
      // Insufficient credits
      alert('Insufficient AI credits. Please check your balance.');
      useBetaCreditsStore.getState().fetchBalance();
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      alert('Too many requests. Please try again in a few moments.');
    } else if (error.response?.status === 401) {
      // Unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Component Error Boundaries

::: v-pre
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard, GlassButton } from '@bayit/glass';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Feature Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <GlassCard className="p-6 max-w-md mx-auto mt-8">
          <h2 className="text-xl font-bold text-white mb-4">
            ⚠️ Something went wrong
          </h2>
          <p className="text-white/70 mb-4">
            {this.state.error?.message || 'AI feature encountered an error'}
          </p>
          <GlassButton
            variant="primary"
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </GlassButton>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}
```
:::

---

## Testing

### Unit Tests

::: v-pre
```typescript
// src/components/ai/__tests__/CreditBalanceWidget.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { CreditBalanceWidget } from '../CreditBalanceWidget';
import { useBetaCreditsStore } from '../../../stores/betaCreditsStore';

jest.mock('../../../stores/betaCreditsStore');

describe('CreditBalanceWidget', () => {
  it('does not render for non-beta users', () => {
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 500,
      isBetaUser: false,
      loading: false,
      fetchBalance: jest.fn(),
    });

    const { container } = render(<CreditBalanceWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('displays credit balance for beta users', () => {
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 250,
      isBetaUser: true,
      loading: false,
      fetchBalance: jest.fn(),
    });

    render(<CreditBalanceWidget />);
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('🪙')).toBeInTheDocument();
  });

  it('shows warning color for low credits', () => {
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 15,
      isBetaUser: true,
      loading: false,
      fetchBalance: jest.fn(),
    });

    render(<CreditBalanceWidget />);
    const balanceElement = screen.getByText('15');
    expect(balanceElement).toHaveClass('text-orange-400');
  });

  it('polls for balance updates every 30 seconds', async () => {
    const fetchBalance = jest.fn();
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 500,
      isBetaUser: true,
      loading: false,
      fetchBalance,
    });

    render(<CreditBalanceWidget />);

    await waitFor(() => {
      expect(fetchBalance).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetchBalance).toHaveBeenCalledTimes(2);
    });
  });
});
```
:::

### Integration Tests

::: v-pre
```typescript
// src/services/__tests__/aiService.test.ts
import { aiService } from '../aiService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('auth_token', 'test-token');
  });

  it('fetches credit balance', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { balance: 500, is_beta_user: true },
    });

    const result = await aiService.getCreditBalance();

    expect(result.balance).toBe(500);
    expect(result.is_beta_user).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/v1/beta/credits/balance',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    );
  });

  it('performs AI search', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        results: [
          { id: '1', title: 'Movie 1', relevance_score: 0.95 },
          { id: '2', title: 'Movie 2', relevance_score: 0.87 },
        ],
      },
    });

    const results = await aiService.searchWithAI('Israeli comedy');

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Movie 1');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/v1/beta/search',
      { query: 'Israeli comedy', limit: 20, filters: undefined },
      expect.any(Object)
    );
  });

  it('handles insufficient credits error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 402, data: { detail: 'Insufficient credits' } },
    });

    await expect(aiService.searchWithAI('test')).rejects.toThrow();
  });
});
```
:::

### E2E Tests (Playwright)

```typescript
// tests/e2e/ai-features.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('displays credit balance for beta users', async ({ page }) => {
    // Mock API response
    await page.route('**/api/v1/beta/credits/balance', (route) => {
      route.fulfill({
        json: { balance: 500, is_beta_user: true },
      });
    });

    await page.reload();
    await expect(page.locator('text=🪙')).toBeVisible();
    await expect(page.locator('text=500')).toBeVisible();
  });

  test('opens AI search modal with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+K'); // Cmd+K on Mac
    await expect(page.locator('text=AI Search')).toBeVisible();
  });

  test('performs AI search and displays results', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/beta/search', (route) => {
      route.fulfill({
        json: {
          results: [
            {
              id: '1',
              title: 'Israeli Comedy Movie',
              poster_url: '/posters/movie1.jpg',
              relevance_score: 0.95,
              ai_insight: 'Perfect match for Israeli comedy',
            },
          ],
        },
      });
    });

    await page.keyboard.press('Meta+K');
    await page.fill('input[placeholder*="Search"]', 'Israeli comedy');
    await page.click('button:has-text("Search")');

    await expect(page.locator('text=Israeli Comedy Movie')).toBeVisible();
    await expect(page.locator('text=Perfect match')).toBeVisible();
  });

  test('displays insufficient credits warning', async ({ page }) => {
    await page.route('**/api/v1/beta/credits/balance', (route) => {
      route.fulfill({
        json: { balance: 5, is_beta_user: true },
      });
    });

    await page.reload();
    await page.keyboard.press('Meta+K');
    await expect(page.locator('text=Insufficient credits')).toBeVisible();
  });
});
```

---

## Performance Optimization

### Code Splitting

::: v-pre
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { GlassSpinner } from '@bayit/glass';

// Lazy load AI components
const AISearchModal = lazy(() => import('./components/ai/AISearchModal'));
const AIRecommendationsPanel = lazy(() => import('./components/ai/AIRecommendationsPanel'));
const CatchUpButton = lazy(() => import('./components/ai/CatchUpButton'));

export const App = () => {
  return (
    <Suspense fallback={<GlassSpinner size="large" />}>
      <AISearchModal />
      <AIRecommendationsPanel />
      {/* Other components */}
    </Suspense>
  );
};
```
:::

### Debouncing Search

::: v-pre
```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in AISearchModal
const debouncedQuery = useDebounce(query, 500); // 500ms delay

useEffect(() => {
  if (debouncedQuery.length >= 3) {
    search(debouncedQuery);
  }
}, [debouncedQuery]);
```
:::

### Caching

::: v-pre
```typescript
// src/utils/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage
const searchCache = new Cache<ContentItem[]>(300); // 5 min TTL

export const searchWithCache = async (query: string): Promise<ContentItem[]> => {
  const cached = searchCache.get(query);
  if (cached) return cached;

  const results = await aiService.searchWithAI(query);
  searchCache.set(query, results);
  return results;
};
```
:::

---

## Best Practices

### 1. Credit Management

```typescript
// Always check balance before expensive operations
const handleExpensiveOperation = async () => {
  const { balance } = useBetaCreditsStore.getState();
  const requiredCredits = 15;

  if (balance < requiredCredits) {
    showInsufficientCreditsDialog();
    return;
  }

  // Proceed with operation
};
```

### 2. Optimistic Updates

```typescript
// Update UI immediately, rollback on failure
const deductCredits = async (amount: number) => {
  const originalBalance = get().balance;
  set({ balance: originalBalance - amount }); // Optimistic

  try {
    await api.deductCredits(amount);
  } catch (error) {
    set({ balance: originalBalance }); // Rollback
    throw error;
  }
};
```

### 3. Accessibility

::: v-pre
```typescript
// Ensure keyboard navigation
<GlassButton
  aria-label="Search with AI (costs 10 credits)"
  onPress={handleSearch}
>
  Search (-10)
</GlassButton>

// Screen reader announcements
<div role="status" aria-live="polite">
  {loading && 'Searching with AI...'}
  {results.length > 0 && `Found ${results.length} results`}
</div>
```
:::

### 4. i18n Integration

::: v-pre
```typescript
// All text must be translatable
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<h2>{t('ai.search.title')}</h2>
<p>{t('ai.search.placeholder')}</p>
<GlassButton>{t('ai.search.button')} (-10)</GlassButton>
```
:::

---

## Troubleshooting

### Credit Balance Not Updating

```typescript
// Force refresh after operations
await deductCredits(10, 'ai_search');
await fetchBalance(); // Verify actual balance
```

### Search Results Empty

```typescript
// Check query length and filters
if (query.length < 3) {
  console.warn('Query too short for AI search');
  return;
}

// Verify API response format
console.log('API Response:', response.data);
```

### Modal Not Opening

```typescript
// Check keyboard shortcut registration
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      useAISearchStore.setState({ isOpen: true });
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - Complete API documentation
- [Beta 500 User Manual](BETA_500_USER_MANUAL.md) - End-user guide
- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - Technical overview
- [Web Development Guide](WEB_DEVELOPMENT_GUIDE.md) - General web development

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Frontend Team
**Next Review:** 2026-03-30
