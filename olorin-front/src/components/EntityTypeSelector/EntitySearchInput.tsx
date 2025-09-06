import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TextField,
  Autocomplete,
  InputAdornment,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as RecentIcon,
  Star as FavoriteIcon,
  Info as InfoIcon
} from '@mui/icons-material';

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

// Props interface
export interface EntitySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: SearchSuggestion[];
  isSearching?: boolean;
  placeholder?: string;
  showStats?: boolean;
  stats?: SearchStats;
  maxSuggestions?: number;
  enableFuzzySearch?: boolean;
  showRecentSearches?: boolean;
  showPopularSearches?: boolean;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  debounceMs?: number;
}

export const EntitySearchInput: React.FC<EntitySearchInputProps> = ({
  value,
  onChange,
  suggestions = [],
  isSearching = false,
  placeholder = "Search entity types...",
  showStats = false,
  stats,
  maxSuggestions = 10,
  enableFuzzySearch = true,
  showRecentSearches = true,
  showPopularSearches = true,
  onSuggestionSelect,
  debounceMs = 300
}) => {
  // State management
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState<SearchSuggestion[]>([
    { id: '1', text: 'email', type: 'popular', count: 1250, description: 'Email address validation' },
    { id: '2', text: 'transaction', type: 'popular', count: 980, description: 'Transaction-related entities' },
    { id: '3', text: 'payment', type: 'popular', count: 756, description: 'Payment method entities' },
    { id: '4', text: 'risk', type: 'popular', count: 642, description: 'Risk assessment entities' },
    { id: '5', text: 'address', type: 'popular', count: 523, description: 'Address and location entities' },
    { id: '6', text: 'device', type: 'popular', count: 467, description: 'Device fingerprinting entities' },
    { id: '7', text: 'timestamp', type: 'popular', count: 389, description: 'Time and date entities' },
    { id: '8', text: 'currency', type: 'popular', count: 334, description: 'Currency and amount entities' }
  ]);
  
  // Refs
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('entitySearchRecent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.warn('Failed to load recent searches:', e);
      }
    }
  }, []);
  
  // Debounced search handler
  const debouncedOnChange = useCallback((searchValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onChange(searchValue);
    }, debounceMs);
  }, [onChange, debounceMs]);
  
  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setShowSuggestions(newValue.length > 0);
    setHighlightedIndex(-1);
    debouncedOnChange(newValue);
  };
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    const searchText = suggestion.text;
    setInputValue(searchText);
    setShowSuggestions(false);
    onChange(searchText);
    
    // Add to recent searches
    addToRecentSearches(searchText);
    
    onSuggestionSelect?.(suggestion);
  };
  
  // Add to recent searches
  const addToRecentSearches = (searchText: string) => {
    if (!searchText.trim()) return;
    
    const updated = [searchText, ...recentSearches.filter(s => s !== searchText)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('entitySearchRecent', JSON.stringify(updated));
  };
  
  // Handle clear search
  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    onChange('');
    inputRef.current?.focus();
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    const allSuggestions = getFilteredSuggestions();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
        
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allSuggestions.length) {
          handleSuggestionSelect(allSuggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          addToRecentSearches(inputValue);
          setShowSuggestions(false);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };
  
  // Get filtered suggestions
  const getFilteredSuggestions = (): SearchSuggestion[] => {
    const query = inputValue.toLowerCase().trim();
    if (!query) {
      // Show recent and popular when no query
      const recentSuggs: SearchSuggestion[] = recentSearches.map((search, index) => ({
        id: `recent-${index}`,
        text: search,
        type: 'recent'
      }));
      
      return [
        ...recentSuggs,
        ...(showPopularSearches ? popularSearches.slice(0, 5) : [])
      ].slice(0, maxSuggestions);
    }
    
    // Filter suggestions based on query
    const filtered = suggestions.filter(suggestion => {
      const text = suggestion.text.toLowerCase();
      const description = suggestion.description?.toLowerCase() || '';
      const category = suggestion.category?.toLowerCase() || '';
      
      if (enableFuzzySearch) {
        // Simple fuzzy matching - checks if all query characters appear in order
        return fuzzyMatch(text, query) || 
               fuzzyMatch(description, query) || 
               fuzzyMatch(category, query);
      } else {
        return text.includes(query) || 
               description.includes(query) || 
               category.includes(query);
      }
    });
    
    return filtered.slice(0, maxSuggestions);
  };
  
  // Simple fuzzy match implementation
  const fuzzyMatch = (text: string, query: string): boolean => {
    let textIndex = 0;
    let queryIndex = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
        queryIndex++;
      }
      textIndex++;
    }
    
    return queryIndex === query.length;
  };
  
  // Get suggestion icon based on type
  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'recent':
        return <RecentIcon fontSize="small" color="action" />;
      case 'popular':
        return <TrendingUpIcon fontSize="small" color="action" />;
      case 'category':
        return <InfoIcon fontSize="small" color="primary" />;
      default:
        return <SearchIcon fontSize="small" color="action" />;
    }
  };
  
  const filteredSuggestions = getFilteredSuggestions();
  
  return (
    <Box position="relative">
      <TextField
        ref={inputRef}
        fullWidth
        variant="outlined"
        size="small"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(inputValue.length > 0 || recentSearches.length > 0)}
        onBlur={(e) => {
          // Delay hiding suggestions to allow clicks
          setTimeout(() => {
            if (!e.currentTarget.contains(document.activeElement)) {
              setShowSuggestions(false);
            }
          }, 150);
        }}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {isSearching ? (
                <CircularProgress size={20} />
              ) : (
                <SearchIcon />
              )}
            </InputAdornment>
          ),
          endAdornment: inputValue && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small" edge="end">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {/* Search Statistics */}
      {showStats && stats && inputValue && (
        <Box mt={1} display="flex" alignItems="center" gap={2}>
          <Typography variant="caption" color="textSecondary">
            {stats.totalResults} results in {stats.searchTime}ms
          </Typography>
          {Object.entries(stats.categories).length > 0 && (
            <Box display="flex" gap={0.5}>
              {Object.entries(stats.categories).slice(0, 3).map(([category, count]) => (
                <Chip 
                  key={category}
                  label={`${category}: ${count}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Box>
      )}
      
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            zIndex: 1300,
            maxHeight: 300,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider'
          }}
          elevation={3}
        >
          {/* Recent Searches Header */}
          {!inputValue && recentSearches.length > 0 && (
            <Box px={2} py={1} borderBottom={1} borderColor="divider">
              <Typography variant="caption" color="textSecondary" fontWeight="bold">
                RECENT SEARCHES
              </Typography>
            </Box>
          )}
          
          {/* Popular Searches Header */}
          {!inputValue && showPopularSearches && recentSearches.length === 0 && (
            <Box px={2} py={1} borderBottom={1} borderColor="divider">
              <Typography variant="caption" color="textSecondary" fontWeight="bold">
                POPULAR SEARCHES
              </Typography>
            </Box>
          )}
          
          <List dense>
            {filteredSuggestions.map((suggestion, index) => (
              <ListItem
                key={suggestion.id}
                button
                selected={index === highlightedIndex}
                onClick={() => handleSuggestionSelect(suggestion)}
                sx={{
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getSuggestionIcon(suggestion)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {suggestion.text}
                      </Typography>
                      {suggestion.count && (
                        <Chip 
                          label={suggestion.count.toLocaleString()} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={suggestion.description}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    color: 'textSecondary',
                    noWrap: true
                  }}
                />
                
                {suggestion.type === 'popular' && (
                  <Tooltip title="Popular search">
                    <TrendingUpIcon fontSize="small" color="action" />
                  </Tooltip>
                )}
              </ListItem>
            ))}
          </List>
          
          {/* Show more indicator */}
          {suggestions.length > maxSuggestions && (
            <Box px={2} py={1} textAlign="center" borderTop={1} borderColor="divider">
              <Typography variant="caption" color="textSecondary">
                +{suggestions.length - maxSuggestions} more results...
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};