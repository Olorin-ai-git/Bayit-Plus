# AI Features Mobile Integration Guide

**Platform:** iOS 16+ and Android 10+ (React Native)
**Last Updated:** 2026-01-30
**Status:** ✅ Production Ready

---

## Overview

This guide covers integrating Beta 500 AI features into Bayit+ mobile apps (iOS and Android):
- **AI Search** - Natural language content discovery
- **AI Recommendations** - Personalized content suggestions
- **Auto Catch-Up** - Live TV summaries
- **Credit Management** - Real-time credit tracking

**Stack:**
- React Native for iOS and Android
- TypeScript 5.0+
- AsyncStorage for persistence
- StyleSheet for styling
- @olorin/shared-i18n for internationalization
- @bayit/glass mobile components

---

## Architecture

### Component Hierarchy

```
App
├── CreditBalanceWidget (top-right, persistent)
├── AISearchModal (accessible from search tab)
├── HomeScreen
│   ├── AIRecommendationsPanel
│   └── ContentGrid
└── LiveTVScreen
    ├── ChannelPlayer
    └── CatchUpButton
```

### State Management

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

---

## Installation

### Dependencies

```json
{
  "dependencies": {
    "react-native": "^0.72.0",
    "react": "^18.2.0",
    "zustand": "^4.4.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "i18next": "^25.8.0",
    "react-i18next": "^16.5.3",
    "@olorin/shared-i18n": "^2.0.0",
    "react-native-safe-area-context": "^4.7.0",
    "react-native-gesture-handler": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "detox": "^20.0.0"
  }
}
```

### iOS Setup

```bash
cd mobile-app
npm install
cd ios && pod install && cd ..
npm run ios
```

### Android Setup

```bash
cd mobile-app
npm install
npm run android
```

---

## Component Implementation

### 1. Credit Balance Widget

**Purpose:** Display real-time credit balance in header.

```typescript
// src/components/ai/CreditBalanceWidget.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
    if (balance <= 10) return styles.balanceCritical;
    if (balance <= 20) return styles.balanceLow;
    if (balance <= 50) return styles.balanceWarning;
    return styles.balanceGood;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🪙</Text>
      <View style={styles.balanceContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={[styles.balance, getBalanceColor()]}>{balance}</Text>
            <Text style={styles.label}>{t('ai.credits')}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    fontSize: 20,
  },
  balanceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceGood: {
    color: '#4ade80',
  },
  balanceWarning: {
    color: '#fbbf24',
  },
  balanceLow: {
    color: '#fb923c',
  },
  balanceCritical: {
    color: '#f87171',
  },
});
```

### 2. AI Search Modal

**Purpose:** Natural language search accessible from search tab.

```typescript
// src/components/ai/AISearchModal.tsx
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAISearchStore } from '../../stores/aiSearchStore';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';
import type { ContentItem } from '../../types';

export const AISearchModal: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { isOpen, results, loading, search, close } = useAISearchStore();
  const { balance, deductCredits } = useBetaCreditsStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    if (balance < 10) {
      Alert.alert(
        t('ai.insufficient_credits'),
        t('ai.insufficient_credits_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      await search(query);
      await deductCredits(10, 'ai_search');
    } catch (error) {
      Alert.alert(t('ai.error'), t('ai.search_failed'), [
        { text: t('common.ok') },
      ]);
    }
  }, [query, balance, search, deductCredits, t]);

  const renderItem = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity style={styles.resultItem}>
      <Image source={{ uri: item.poster_url }} style={styles.poster} />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.resultInsight} numberOfLines={3}>
          {item.ai_insight}
        </Text>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.section}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.year}</Text>
          </View>
          <View style={[styles.tag, styles.relevanceTag]}>
            <Text style={styles.relevanceText}>
              {t('ai.relevance')}: {(item.relevance_score * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('ai.search.title')}</Text>
            <TouchableOpacity onPress={close} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('ai.search.placeholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                (loading || balance < 10) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={loading || balance < 10}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>
                  {t('ai.search.button')} (-10)
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {balance < 10 && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {t('ai.insufficient_credits')}
              </Text>
            </View>
          )}

          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.results}
            ListEmptyComponent={
              !loading && results.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {query ? t('ai.no_results') : t('ai.search.start')}
                  </Text>
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  results: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  resultInsight: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  relevanceTag: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  relevanceText: {
    fontSize: 11,
    color: '#4ade80',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
```

### 3. AI Recommendations Panel

**Purpose:** Display personalized recommendations on home screen.

```typescript
// src/components/ai/AIRecommendationsPanel.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAIRecommendationsStore } from '../../stores/aiRecommendationsStore';
import { useBetaCreditsStore } from '../../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';
import type { ContentItem } from '../../types';

export const AIRecommendationsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { recommendations, loading, lastFetched, fetchRecommendations } =
    useAIRecommendationsStore();
  const { balance, isBetaUser, deductCredits } = useBetaCreditsStore();

  useEffect(() => {
    if (isBetaUser && !lastFetched) {
      handleFetch();
    }
  }, [isBetaUser, lastFetched]);

  const handleFetch = async () => {
    if (balance < 5) {
      Alert.alert(
        t('ai.insufficient_credits'),
        t('ai.insufficient_credits_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      await fetchRecommendations();
      await deductCredits(5, 'ai_recommendations');
    } catch (error) {
      Alert.alert(t('ai.error'), t('ai.recommendations_failed'), [
        { text: t('common.ok') },
      ]);
    }
  };

  if (!isBetaUser) return null;

  const renderItem = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity style={styles.item}>
      <View style={styles.posterContainer}>
        <Image source={{ uri: item.poster_url }} style={styles.poster} />
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.itemReason} numberOfLines={2}>
        {item.reason}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 {t('ai.recommendations.title')}</Text>
        <TouchableOpacity
          style={[
            styles.refreshButton,
            (loading || balance < 5) && styles.refreshButtonDisabled,
          ]}
          onPress={handleFetch}
          disabled={loading || balance < 5}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>
              {t('ai.refresh')} (-5)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {balance < 5 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>{t('ai.low_credits')}</Text>
        </View>
      )}

      <FlatList
        horizontal
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {t('ai.recommendations.empty')}
              </Text>
            </View>
          ) : null
        }
      />

      {lastFetched && (
        <Text style={styles.lastUpdated}>
          {t('ai.last_updated')}: {new Date(lastFetched).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: '#fdba74',
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  item: {
    width: 120,
  },
  posterContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  aiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemReason: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  lastUpdated: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: 300,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
```

### 4. Catch-Up Button

**Purpose:** Generate AI summaries for live TV.

```typescript
// src/components/ai/CatchUpButton.tsx
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  Modal,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      Alert.alert(
        t('ai.insufficient_credits'),
        t('ai.insufficient_credits_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setLoading(true);
    setShowModal(true);

    try {
      const result = await aiService.getCatchUpSummary(channelId);
      setSummary(result.summary);
      await deductCredits(15, 'catch_up');
    } catch (error) {
      Alert.alert(t('ai.error'), t('ai.catchup.failed'), [
        { text: t('common.ok') },
      ]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, balance < 15 && styles.buttonDisabled]}
        onPress={handleCatchUp}
        disabled={balance < 15}
      >
        <Text style={styles.buttonIcon}>⚡</Text>
        <Text style={styles.buttonText}>
          {t('ai.catchup.button')} (-15)
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              📺 {t('ai.catchup.title')}: {channelName}
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>
                  {t('ai.catchup.generating')}
                </Text>
              </View>
            ) : summary ? (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('ai.catchup.error')}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
  },
  summaryContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
  },
});
```

---

## State Management with AsyncStorage

### Beta Credits Store with Persistence

```typescript
// src/stores/betaCreditsStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiService } from '../services/aiService';

interface BetaCreditsState {
  balance: number;
  isBetaUser: boolean;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  deductCredits: (amount: number, feature: string) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useBetaCreditsStore = create<BetaCreditsState>((set, get) => ({
  balance: 0,
  isBetaUser: false,
  loading: false,
  error: null,

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('beta_credits');
      if (stored) {
        const { balance, isBetaUser } = JSON.parse(stored);
        set({ balance, isBetaUser });
      }
    } catch (error) {
      console.error('Failed to load credits from storage:', error);
    }
  },

  fetchBalance: async () => {
    set({ loading: true, error: null });
    try {
      const data = await aiService.getCreditBalance();
      set({
        balance: data.balance,
        isBetaUser: data.is_beta_user,
        loading: false,
      });

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        'beta_credits',
        JSON.stringify({
          balance: data.balance,
          isBetaUser: data.is_beta_user,
        })
      );
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

---

## API Service

```typescript
// src/services/aiService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ContentItem, CatchUpSummary } from '../types';

const API_BASE = 'https://api.bayitplus.com/api/v1';

const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('auth_token');
};

export const aiService = {
  getCreditBalance: async () => {
    const token = await getAuthToken();
    const response = await axios.get(`${API_BASE}/beta/credits/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  deductCredits: async (amount: number, feature: string) => {
    const token = await getAuthToken();
    await axios.post(
      `${API_BASE}/beta/credits/deduct`,
      { amount, feature },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  searchWithAI: async (query: string): Promise<ContentItem[]> => {
    const token = await getAuthToken();
    const response = await axios.post(
      `${API_BASE}/beta/search`,
      { query, limit: 20 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.results;
  },

  getRecommendations: async (): Promise<ContentItem[]> => {
    const token = await getAuthToken();
    const response = await axios.get(`${API_BASE}/beta/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.recommendations;
  },

  getCatchUpSummary: async (channelId: string): Promise<CatchUpSummary> => {
    const token = await getAuthToken();
    const response = await axios.get(
      `${API_BASE}/live/${channelId}/catchup`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};
```

---

## Testing

### Unit Tests (Jest)

```typescript
// src/components/ai/__tests__/CreditBalanceWidget.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
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

    const { toJSON } = render(<CreditBalanceWidget />);
    expect(toJSON()).toBeNull();
  });

  it('displays credit balance for beta users', () => {
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 250,
      isBetaUser: true,
      loading: false,
      fetchBalance: jest.fn(),
    });

    const { getByText } = render(<CreditBalanceWidget />);
    expect(getByText('250')).toBeTruthy();
    expect(getByText('🪙')).toBeTruthy();
  });
});
```

### E2E Tests (Detox)

```typescript
// e2e/ai-features.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('AI Features', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display credit balance for beta users', async () => {
    await detoxExpect(element(by.text('🪙'))).toBeVisible();
    await detoxExpect(element(by.text('500'))).toBeVisible();
  });

  it('should open AI search modal', async () => {
    await element(by.id('search-tab')).tap();
    await element(by.id('ai-search-button')).tap();
    await detoxExpect(element(by.text('AI Search'))).toBeVisible();
  });

  it('should perform AI search', async () => {
    await element(by.id('search-tab')).tap();
    await element(by.id('ai-search-button')).tap();
    await element(by.id('search-input')).typeText('Israeli comedy\n');
    await element(by.text('Search (-10)')).tap();
    await detoxExpect(element(by.id('search-results'))).toBeVisible();
  });
});
```

---

## Performance Optimization

### Image Caching

```typescript
// src/utils/imageCache.ts
import { Image } from 'react-native';

export const prefetchImages = async (urls: string[]) => {
  await Promise.all(urls.map((url) => Image.prefetch(url)));
};

// Usage in recommendations
useEffect(() => {
  if (recommendations.length > 0) {
    const urls = recommendations.map((item) => item.poster_url);
    prefetchImages(urls);
  }
}, [recommendations]);
```

### Debouncing

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Platform-Specific Considerations

### iOS

- **Haptic Feedback**: Use `react-native-haptic-feedback` for button presses
- **Safe Area**: Use `SafeAreaView` from `react-native-safe-area-context`
- **Keyboard**: `KeyboardAvoidingView` with `behavior="padding"`

### Android

- **Back Button**: Handle with `BackHandler` API
- **Keyboard**: `KeyboardAvoidingView` with `behavior="height"`
- **Permissions**: No special permissions required for AI features

---

## Best Practices

1. **Always check credit balance before expensive operations**
2. **Use AsyncStorage for offline-first experience**
3. **Provide haptic feedback for better UX**
4. **Handle network errors gracefully with Alert dialogs**
5. **Optimize images with prefetching**
6. **Use StyleSheet.create() for performance**

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - Complete API documentation
- [Beta 500 User Manual](BETA_500_USER_MANUAL.md) - End-user guide
- [Mobile Development Guide](MOBILE_DEVELOPMENT_GUIDE.md) - General mobile development

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Mobile Team
**Next Review:** 2026-03-30
