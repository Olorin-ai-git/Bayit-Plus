import { useState, useEffect, useCallback, useMemo } from 'react';
import { EntityType } from '../EntityTypeSelector';

// Search suggestion interface
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'entity' | 'category' | 'recent' | 'popular';
  count?: number;
  description?: string;
  category?: string;
}

// Search statistics interface
export interface SearchStats {
  totalResults: number;
  searchTime: number;
  categories: Record<string, number>;
  suggestions: number;
}

// Search configuration
interface SearchConfig {
  fuzzyThreshold: number;
  maxResults: number;
  debounceMs: number;
  enableFuzzySearch: boolean;
  searchFields: (keyof EntityType)[];
  categoryWeights: Record<string, number>;
}

// Default search configuration
const DEFAULT_CONFIG: SearchConfig = {
  fuzzyThreshold: 0.6,
  maxResults: 100,
  debounceMs: 300,
  enableFuzzySearch: true,
  searchFields: ['name', 'value', 'description', 'category', 'subcategory'],
  categoryWeights: {
    name: 3,
    value: 2.5,
    category: 2,
    description: 1,
    subcategory: 1.5
  }
};

// Search result with score
interface SearchResult extends EntityType {
  searchScore: number;
  matchedFields: string[];
  highlighted: Record<string, string>;
}

export const useEntitySearch = (
  entities: EntityType[],
  config: Partial<SearchConfig> = {}
) => {
  // Merge config with defaults
  const searchConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EntityType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('entitySearchHistory');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved).slice(0, 10));
      } catch (e) {
        console.warn('Failed to load search history:', e);
      }
    }
  }, []);
  
  // Fuzzy search implementation
  const fuzzyScore = useCallback((text: string, query: string): number => {
    if (!text || !query) return 0;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (textLower.includes(queryLower)) {
      const position = textLower.indexOf(queryLower);
      const lengthRatio = query.length / text.length;
      const positionBonus = position === 0 ? 1.5 : 1 / (position + 1);
      return lengthRatio * positionBonus * 2;
    }
    
    // Fuzzy matching - check if all query characters appear in order
    let textIndex = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;
    let maxConsecutive = 0;
    
    while (textIndex < textLower.length && queryIndex < queryLower.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        queryIndex++;
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
      textIndex++;
    }
    
    if (queryIndex === queryLower.length) {
      const completionRatio = queryIndex / queryLower.length;
      const consecutiveBonus = maxConsecutive / queryLower.length;
      const lengthPenalty = queryLower.length / textLower.length;
      return (completionRatio + consecutiveBonus) * lengthPenalty * 0.8;
    }
    
    return 0;
  }, []);
  
  // Highlight matching text
  const highlightMatches = useCallback((text: string, query: string): string => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.split('').join('|')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }, []);
  
  // Search entities
  const searchEntities = useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    
    const queryLower = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];
    
    entities.forEach(entity => {
      let totalScore = 0;
      const matchedFields: string[] = [];
      const highlighted: Record<string, string> = {};
      
      // Search in configured fields
      searchConfig.searchFields.forEach(field => {
        const fieldValue = String(entity[field] || '');
        if (!fieldValue) return;
        
        const fieldScore = fuzzyScore(fieldValue, queryLower);
        if (fieldScore > 0) {
          const weight = searchConfig.categoryWeights[field] || 1;
          totalScore += fieldScore * weight;
          matchedFields.push(field);
          highlighted[field] = highlightMatches(fieldValue, queryLower);
        }
      });
      
      // Boost score for exact matches in important fields
      if (entity.name.toLowerCase().includes(queryLower)) {
        totalScore *= 1.5;
      }
      if (entity.value.toLowerCase().includes(queryLower)) {
        totalScore *= 1.3;
      }
      
      // Add category relevance boost
      if (entity.category.toLowerCase().includes(queryLower)) {
        totalScore *= 1.2;
      }
      
      // Only include results above threshold
      if (totalScore >= searchConfig.fuzzyThreshold) {
        results.push({
          ...entity,
          searchScore: totalScore,
          matchedFields,
          highlighted
        });
      }
    });
    
    // Sort by score descending
    results.sort((a, b) => b.searchScore - a.searchScore);
    
    // Limit results
    return results.slice(0, searchConfig.maxResults);
  }, [entities, searchConfig, fuzzyScore, highlightMatches]);
  
  // Generate search suggestions
  const generateSuggestions = useCallback((searchQuery: string): SearchSuggestion[] => {
    if (!searchQuery.trim()) {
      // Return recent searches and popular terms when no query
      const recentSuggestions: SearchSuggestion[] = searchHistory.map((term, index) => ({
        id: `recent-${index}`,
        text: term,
        type: 'recent'
      }));
      
      const popularSuggestions: SearchSuggestion[] = [
        { id: 'pop-1', text: 'email', type: 'popular', count: 1250 },
        { id: 'pop-2', text: 'transaction', type: 'popular', count: 980 },
        { id: 'pop-3', text: 'payment', type: 'popular', count: 756 },
        { id: 'pop-4', text: 'risk', type: 'popular', count: 642 },
        { id: 'pop-5', text: 'address', type: 'popular', count: 523 }
      ];
      
      return [...recentSuggestions, ...popularSuggestions].slice(0, 8);
    }
    
    const suggestions: SearchSuggestion[] = [];
    const queryLower = searchQuery.toLowerCase();
    const seen = new Set<string>();
    
    // Entity name suggestions
    entities.forEach(entity => {
      const name = entity.name.toLowerCase();
      if (name.includes(queryLower) && !seen.has(name)) {
        seen.add(name);
        suggestions.push({
          id: `entity-${entity.id}`,
          text: entity.name,
          type: 'entity',
          description: entity.description,
          category: entity.category
        });
      }
    });
    
    // Category suggestions
    const categories = Array.from(new Set(entities.map(e => e.category)));
    categories.forEach(category => {
      const categoryLower = category.toLowerCase();
      if (categoryLower.includes(queryLower) && !seen.has(categoryLower)) {
        seen.add(categoryLower);
        const count = entities.filter(e => e.category === category).length;
        suggestions.push({
          id: `category-${category}`,
          text: category,
          type: 'category',
          count,
          description: `${count} entities in this category`
        });
      }
    });
    
    return suggestions.slice(0, 10);
  }, [entities, searchHistory]);
  
  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchStats(null);
      return;
    }
    
    setIsSearching(true);
    const startTime = performance.now();
    
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const results = searchEntities(searchQuery);
      const endTime = performance.now();
      
      // Calculate statistics
      const categories: Record<string, number> = {};
      results.forEach(result => {
        categories[result.category] = (categories[result.category] || 0) + 1;
      });
      
      const stats: SearchStats = {
        totalResults: results.length,
        searchTime: endTime - startTime,
        categories,
        suggestions: generateSuggestions(searchQuery).length
      };
      
      setSearchResults(results);
      setSearchStats(stats);
      
      // Add to search history
      if (searchQuery.length > 2) {
        const newHistory = [
          searchQuery,
          ...searchHistory.filter(h => h !== searchQuery)
        ].slice(0, 10);
        
        setSearchHistory(newHistory);
        localStorage.setItem('entitySearchHistory', JSON.stringify(newHistory));
      }
      
    } finally {
      setIsSearching(false);
    }
  }, [searchEntities, generateSuggestions, searchHistory]);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSearchStats(null);
  }, []);
  
  // Get search suggestions
  const searchSuggestions = useMemo(() => {
    return generateSuggestions(query);
  }, [generateSuggestions, query]);
  
  return {
    query,
    setQuery,
    searchResults,
    searchSuggestions,
    isSearching,
    searchStats,
    searchHistory,
    performSearch,
    clearSearch,
    
    // Helper methods
    highlightMatches,
    fuzzyScore
  };
};