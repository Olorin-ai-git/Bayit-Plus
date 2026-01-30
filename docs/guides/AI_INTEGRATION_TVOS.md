# AI Features tvOS Integration Guide

**Platform:** tvOS 17+ (Apple TV with React Native)
**Last Updated:** 2026-01-30
**Status:** ✅ Production Ready

---

## Overview

This guide covers integrating Beta 500 AI features into Bayit+ Apple TV application:
- **AI Search** - Natural language content discovery optimized for 10-foot UI
- **AI Recommendations** - Personalized content suggestions with focus navigation
- **Auto Catch-Up** - Live TV summaries with Siri Remote interaction
- **Credit Management** - Real-time credit tracking visible from living room

**Stack:**
- React Native for tvOS
- TypeScript 5.0+
- TVFocusGuideView for focus management
- StyleSheet for 10-foot UI styling
- @olorin/shared-i18n for internationalization
- @bayit/glass tvOS components

---

## Architecture

### Component Hierarchy

```
App
├── CreditBalanceWidget (top-right, always visible)
├── AISearchScreen (dedicated screen with focus navigation)
├── HomeScreen
│   ├── AIRecommendationsRow
│   └── ContentGrid
└── LiveTVScreen
    ├── ChannelPlayer
    └── CatchUpButton
```

### Focus Navigation

```
┌─────────────────────────────────────────────┐
│ Header [Credit Balance] [Search] [Settings] │
├─────────────────────────────────────────────┤
│ AI Recommendations Row                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │ 1  │→│ 2  │→│ 3  │→│ 4  │→│ 5  │        │
│ └────┘ └────┘ └────┘ └────┘ └────┘        │
│   ↓                                         │
│ Content Grid                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│ │ A  │→│ B  │→│ C  │→│ D  │               │
│ └────┘ └────┘ └────┘ └────┘               │
└─────────────────────────────────────────────┘
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
    "@olorin/shared-i18n": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0"
  }
}
```

### tvOS Setup

```bash
cd tvos-app
npm install
cd ios && pod install && cd ..
npm run ios  # Launches tvOS Simulator
```

---

## 10-Foot UI Design Principles

### Typography Requirements

```typescript
const TV_TYPOGRAPHY = {
  // Minimum readable sizes from 10 feet
  body: 29,      // Body text
  heading: 38,   // Section headings
  title: 48,     // Screen titles
  hero: 76,      // Hero/featured content
  caption: 25,   // Small text, captions
};
```

### Focus States

```typescript
const FOCUS_SCALE = {
  default: 1.0,    // Unfocused state
  focused: 1.05,   // Focused state (5% scale)
  pressed: 0.95,   // Pressed state (5% scale down)
};

const FOCUS_BORDER = {
  width: 6,                        // Thick border for visibility
  color: 'rgba(255, 255, 255, 0.9)',  // High contrast
  radius: 12,                      // Rounded corners
};
```

### Touch Targets

All interactive elements must be at least **200x80 points** for comfortable Siri Remote navigation.

---

## Component Implementation

### 1. Credit Balance Widget

**Purpose:** Display credit balance in top-right corner with high visibility.

```typescript
// src/components/ai/CreditBalanceWidget.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
        <Text style={[styles.balance, getBalanceColor()]}>
          {loading ? '...' : balance}
        </Text>
        <Text style={styles.label}>{t('ai.credits')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    fontSize: 32, // Larger for 10-foot viewing
  },
  balanceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 38, // 10-foot readable
    fontWeight: 'bold',
  },
  label: {
    fontSize: 25, // 10-foot readable
    color: 'rgba(255, 255, 255, 0.7)',
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

### 2. AI Search Screen

**Purpose:** Dedicated search screen with keyboard and focus navigation.

```typescript
// src/screens/AISearchScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TVFocusGuideView,
  useTVEventHandler,
} from 'react-native';
import { useAISearchStore } from '../stores/aiSearchStore';
import { useBetaCreditsStore } from '../stores/betaCreditsStore';
import { useTranslation } from 'react-i18next';
import type { ContentItem } from '../types';

export const AISearchScreen: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { results, loading, search } = useAISearchStore();
  const { balance, deductCredits } = useBetaCreditsStore();
  const inputRef = useRef<TextInput>(null);

  // Siri Remote event handling
  useTVEventHandler((evt) => {
    if (evt && evt.eventType === 'playPause') {
      // Play/Pause button focuses search input
      inputRef.current?.focus();
    }
  });

  const handleSearch = async () => {
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
  };

  const renderItem = ({ item }: { item: ContentItem }) => (
    <Pressable
      style={({ focused }) => [
        styles.resultItem,
        focused && styles.resultItemFocused,
      ]}
      onPress={() => {/* Navigate to content */}}
    >
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
              {(item.relevance_score * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('ai.search.title')}</Text>

      <TVFocusGuideView style={styles.searchContainer} autoFocus>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('ai.search.placeholder')}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <Pressable
          style={({ focused }) => [
            styles.searchButton,
            focused && styles.searchButtonFocused,
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
        </Pressable>
      </TVFocusGuideView>

      {balance < 10 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ {t('ai.insufficient_credits')}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.results}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {query ? t('ai.no_results') : t('ai.search.start_tv')}
              </Text>
              <Text style={styles.emptyHint}>
                💡 {t('ai.search.hint_tv')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 60,
  },
  title: {
    fontSize: 76, // Hero size for tvOS
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 24,
    color: '#fff',
    fontSize: 38, // 10-foot readable
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  searchButtonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  warningContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  warningText: {
    color: '#fca5a5',
    fontSize: 29,
    textAlign: 'center',
  },
  results: {
    gap: 32,
  },
  resultItem: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  resultItemFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  resultInsight: {
    fontSize: 25,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    lineHeight: 34,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  relevanceTag: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  relevanceText: {
    fontSize: 22,
    color: '#4ade80',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 38,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyHint: {
    fontSize: 29,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});
```

### 3. AI Recommendations Row

**Purpose:** Horizontal scrollable row with focus navigation.

```typescript
// src/components/ai/AIRecommendationsRow.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
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

export const AIRecommendationsRow: React.FC = () => {
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
    <Pressable
      style={({ focused }) => [
        styles.item,
        focused && styles.itemFocused,
      ]}
      onPress={() => {/* Navigate to content */}}
    >
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
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 {t('ai.recommendations.title')}</Text>
        <Pressable
          style={({ focused }) => [
            styles.refreshButton,
            focused && styles.refreshButtonFocused,
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
        </Pressable>
      </View>

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
                {t('ai.recommendations.empty_tv')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 60,
  },
  title: {
    fontSize: 48, // Title size for tvOS
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderWidth: 6,
    borderColor: 'transparent',
    minWidth: 240,
    alignItems: 'center',
  },
  refreshButtonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 60,
    gap: 32,
  },
  item: {
    width: 320,
    borderWidth: 6,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 8,
  },
  itemFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  posterContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 29,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  itemReason: {
    fontSize: 25,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    width: 600,
  },
  emptyText: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
```

### 4. Catch-Up Button (tvOS)

**Purpose:** Generate AI summaries with large touch target.

```typescript
// src/components/ai/CatchUpButton.tsx
import React, { useState } from 'react';
import {
  Pressable,
  Text,
  Modal,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
      <Pressable
        style={({ focused }) => [
          styles.button,
          focused && styles.buttonFocused,
          balance < 15 && styles.buttonDisabled,
        ]}
        onPress={handleCatchUp}
        disabled={balance < 15}
      >
        <Text style={styles.buttonIcon}>⚡</Text>
        <Text style={styles.buttonText}>
          {t('ai.catchup.button')} (-15)
        </Text>
      </Pressable>

      <Modal
        visible={showModal}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📺 {channelName}
              </Text>
              <Pressable
                style={({ focused }) => [
                  styles.closeButton,
                  focused && styles.closeButtonFocused,
                ]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
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
                  <Text style={styles.errorText}>
                    {t('ai.catchup.error')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderWidth: 6,
    borderColor: 'transparent',
    minWidth: 400, // Large touch target for tvOS
  },
  buttonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  buttonIcon: {
    fontSize: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 1600,
    height: '80%',
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 32,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'transparent',
  },
  closeButtonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 48,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  loadingText: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 24,
  },
  summaryContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 48,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 32,
  },
  errorText: {
    fontSize: 29,
    color: '#fca5a5',
    textAlign: 'center',
  },
});
```

---

## Focus Navigation Best Practices

### 1. TVFocusGuideView

```typescript
import { TVFocusGuideView } from 'react-native';

// Group related focusable elements
<TVFocusGuideView autoFocus style={styles.row}>
  <Pressable focusable onPress={handleAction1}>
    <Text>Action 1</Text>
  </Pressable>
  <Pressable focusable onPress={handleAction2}>
    <Text>Action 2</Text>
  </Pressable>
</TVFocusGuideView>
```

### 2. Custom Focus Navigation

```typescript
import { useTVEventHandler } from 'react-native';

useTVEventHandler((evt) => {
  if (evt) {
    if (evt.eventType === 'swipeLeft') {
      // Handle left swipe
    } else if (evt.eventType === 'swipeRight') {
      // Handle right swipe
    } else if (evt.eventType === 'select') {
      // Handle select (press Siri Remote touch surface)
    }
  }
});
```

### 3. Focus State Styling

```typescript
<Pressable
  style={({ focused, pressed }) => [
    styles.button,
    focused && styles.buttonFocused,
    pressed && styles.buttonPressed,
  ]}
>
  <Text style={styles.buttonText}>Button</Text>
</Pressable>

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8b5cf6',
    borderWidth: 6,
    borderColor: 'transparent',
  },
  buttonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#fff',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
});
```

---

## Performance Optimization

### Image Prefetching

```typescript
import { Image } from 'react-native';

useEffect(() => {
  if (recommendations.length > 0) {
    const urls = recommendations.map((item) => item.poster_url);
    urls.forEach((url) => Image.prefetch(url));
  }
}, [recommendations]);
```

### Lazy Loading

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={items}
  initialNumToRender={6}
  maxToRenderPerBatch={6}
  windowSize={3}
  removeClippedSubviews
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

---

## Testing

### Focus Navigation Tests

```typescript
// e2e/tvos/ai-features.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('tvOS AI Features', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate with Siri Remote', async () => {
    // Swipe right to focus next item
    await element(by.id('ai-recommendations-row')).swipe('right');

    // Press to select
    await element(by.id('recommendation-item-1')).tap();

    await detoxExpect(element(by.id('content-detail'))).toBeVisible();
  });

  it('should display credit balance', async () => {
    await detoxExpect(element(by.text('🪙'))).toBeVisible();
    await detoxExpect(element(by.text('500'))).toBeVisible();
  });

  it('should perform AI search with focus', async () => {
    await element(by.id('search-screen')).tap();
    await element(by.id('search-input')).typeText('Israeli comedy');
    await element(by.id('search-button')).tap();

    await detoxExpect(element(by.id('search-results'))).toBeVisible();
  });
});
```

---

## Troubleshooting

### Focus Not Working

```typescript
// Ensure Pressable has focusable prop
<Pressable focusable onPress={handlePress}>
  <Text>Button</Text>
</Pressable>

// Check TVFocusGuideView contains focusable children
<TVFocusGuideView>
  <Pressable focusable>...</Pressable>
</TVFocusGuideView>
```

### Text Too Small

```typescript
// Use minimum 29pt for body text
const styles = StyleSheet.create({
  bodyText: {
    fontSize: 29, // Minimum for 10-foot viewing
  },
});
```

### Touch Targets Too Small

```typescript
// Minimum 200x80 for comfortable navigation
const styles = StyleSheet.create({
  button: {
    minWidth: 200,
    minHeight: 80,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
});
```

---

## Best Practices

1. **Always use focus states** - 5% scale + white border
2. **Minimum 29pt font size** - Readable from 10 feet
3. **Large touch targets** - 200x80 minimum
4. **Use TVFocusGuideView** - Group related elements
5. **Thick borders** - 6pt minimum for focus indicators
6. **High contrast** - White text on dark backgrounds
7. **Test with Siri Remote** - All gestures must work

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - Complete API documentation
- [Beta 500 User Manual](BETA_500_USER_MANUAL.md) - End-user guide
- [tvOS Development Guide](TVOS_DEVELOPMENT_GUIDE.md) - General tvOS development

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** tvOS Team
**Next Review:** 2026-03-30
