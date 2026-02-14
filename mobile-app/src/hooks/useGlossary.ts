/**
 * useGlossary Hook
 *
 * Manages glossary search state, caching, and filtering
 * with debounced search and offline caching support.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('useGlossary');
const GLOSSARY_CACHE_KEY = 'bayit_glossary_cache';
const DEBOUNCE_DELAY_MS = 200;
const PAGE_SIZE = 20;

export interface GlossaryEntry {
  id: string;
  phrase: string;
  transliteration: string;
  translation: string;
  origin: string;
  usageExample: string;
  funFact: string;
  tags: string[];
}

interface GlossaryState {
  entries: GlossaryEntry[];
  searchQuery: string;
  activeCategory: string;
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
}

const ALL_CATEGORY = 'All';

export function useGlossary() {
  const [state, setState] = useState<GlossaryState>({
    entries: [], searchQuery: '', activeCategory: ALL_CATEGORY,
    isLoading: true, isRefreshing: false, hasMore: true, error: null,
  });

  const skipRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadCachedEntries();
    fetchEntries(true);
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const loadCachedEntries = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(GLOSSARY_CACHE_KEY);
      if (cached && mountedRef.current) {
        const parsed: GlossaryEntry[] = JSON.parse(cached);
        setState(prev => ({ ...prev, entries: parsed }));
      }
    } catch (err) { moduleLogger.warn('Cache load failed', { error: err }); }
  }, []);

  const cacheEntries = useCallback(async (entries: GlossaryEntry[]) => {
    try { await AsyncStorage.setItem(GLOSSARY_CACHE_KEY, JSON.stringify(entries)); }
    catch (err) { moduleLogger.warn('Cache save failed', { error: err }); }
  }, []);

  const fetchEntries = useCallback(async (reset: boolean = false) => {
    if (reset) skipRef.current = 0;
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, isLoading: reset, isRefreshing: !reset, error: null }));

    try {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), skip: String(skipRef.current) };
      if (state.searchQuery) params.query = state.searchQuery;
      if (state.activeCategory !== ALL_CATEGORY) params.tags = state.activeCategory.toLowerCase();

      const data: GlossaryEntry[] = await api.get('/cultural/glossary', { params });
      if (!mountedRef.current) return;

      const normalized = (Array.isArray(data) ? data : []).map(e => ({ ...e, id: e.id || e.phrase }));
      const updated = reset ? normalized : [...state.entries, ...normalized];
      skipRef.current += PAGE_SIZE;

      setState(prev => ({ ...prev, entries: updated, isLoading: false, isRefreshing: false, hasMore: normalized.length === PAGE_SIZE }));
      if (reset) await cacheEntries(updated);
    } catch (err) {
      moduleLogger.error('Fetch glossary failed', { error: err instanceof Error ? err.message : String(err) });
      if (mountedRef.current) setState(prev => ({ ...prev, isLoading: false, isRefreshing: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [state.searchQuery, state.activeCategory, state.entries, cacheEntries]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { skipRef.current = 0; fetchEntries(true); }, DEBOUNCE_DELAY_MS);
  }, [fetchEntries]);

  const setActiveCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, activeCategory: category }));
    skipRef.current = 0;
    fetchEntries(true);
  }, [fetchEntries]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading && !state.isRefreshing) fetchEntries(false);
  }, [state.hasMore, state.isLoading, state.isRefreshing, fetchEntries]);

  return {
    entries: state.entries, searchQuery: state.searchQuery, activeCategory: state.activeCategory,
    isLoading: state.isLoading, isRefreshing: state.isRefreshing, hasMore: state.hasMore, error: state.error,
    setSearchQuery, setActiveCategory, loadMore, refresh: useCallback(async () => { await fetchEntries(true); }, [fetchEntries]),
  };
}

export default useGlossary;
