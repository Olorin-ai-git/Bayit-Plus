import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TextField, 
  Autocomplete, 
  Chip, 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Badge,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { EntitySearchInput } from './EntitySearchInput';
import { EntityCategoryTree } from './EntityCategoryTree';
import { EntityTypeCard } from './EntityTypeCard';
import { useEntitySearch } from './hooks/useEntitySearch';
import { useEntityCategories } from './hooks/useEntityCategories';
import { useVirtualizedList } from './hooks/useVirtualizedList';

// Entity type interface
export interface EntityType {
  id: string;
  name: string;
  value: string;
  description: string;
  category: string;
  subcategory?: string;
  examples?: string[];
  validationRules?: string[];
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  isRequired?: boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

// Entity category structure
export interface EntityCategory {
  id: string;
  name: string;
  description: string;
  count: number;
  subcategories?: EntityCategory[];
  color?: string;
  icon?: string;
}

// Props interface
export interface EntityTypeSelectorProps {
  entities?: EntityType[];
  selectedEntities?: EntityType[];
  onSelectionChange?: (entities: EntityType[]) => void;
  searchEnabled?: boolean;
  autocompleteEnabled?: boolean;
  categoryFilterEnabled?: boolean;
  multiSelectEnabled?: boolean;
  maxDisplayItems?: number;
  enableVirtualization?: boolean;
  showDescriptions?: boolean;
  showCategories?: boolean;
  searchPlaceholder?: string;
  allowCustomEntities?: boolean;
  validationEnabled?: boolean;
  onValidationChange?: (results: Record<string, any>) => void;
}

export const EntityTypeSelector: React.FC<EntityTypeSelectorProps> = ({
  entities = [],
  selectedEntities = [],
  onSelectionChange,
  searchEnabled = true,
  autocompleteEnabled = true,
  categoryFilterEnabled = true,
  multiSelectEnabled = true,
  maxDisplayItems = 50,
  enableVirtualization = true,
  showDescriptions = true,
  showCategories = true,
  searchPlaceholder = "Search 300+ entity types...",
  allowCustomEntities = false,
  validationEnabled = false,
  onValidationChange
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<{
    riskLevel?: string[];
    dataType?: string[];
    required?: boolean;
  }>({});
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks
  const {
    searchResults,
    searchSuggestions,
    isSearching,
    searchStats,
    performSearch,
    clearSearch
  } = useEntitySearch(entities);
  
  const {
    categories,
    categoryTree,
    getCategoryEntities,
    getCategoryStats
  } = useEntityCategories(entities);
  
  const {
    virtualizedItems,
    scrollToIndex,
    containerHeight,
    itemHeight
  } = useVirtualizedList({
    items: searchResults.length > 0 ? searchResults : entities,
    enabled: enableVirtualization,
    maxItems: maxDisplayItems,
    itemHeight: showDescriptions ? 120 : 80
  });
  
  // Filter entities based on search and category
  const filteredEntities = useMemo(() => {
    let filtered = searchResults.length > 0 ? searchResults : entities;
    
    // Apply category filter
    if (selectedCategory) {
      filtered = getCategoryEntities(selectedCategory);
    }
    
    // Apply advanced filters
    if (filterCriteria.riskLevel?.length) {
      filtered = filtered.filter(entity => 
        filterCriteria.riskLevel?.includes(entity.riskLevel || 'low')
      );
    }
    
    if (filterCriteria.dataType?.length) {
      filtered = filtered.filter(entity => 
        filterCriteria.dataType?.includes(entity.dataType || 'string')
      );
    }
    
    if (filterCriteria.required !== undefined) {
      filtered = filtered.filter(entity => 
        entity.isRequired === filterCriteria.required
      );
    }
    
    return filtered.slice(0, maxDisplayItems);
  }, [
    searchResults, 
    entities, 
    selectedCategory, 
    filterCriteria, 
    maxDisplayItems,
    getCategoryEntities
  ]);
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      performSearch(query);
    } else {
      clearSearch();
    }
  };
  
  // Handle entity selection
  const handleEntityToggle = (entity: EntityType) => {
    let newSelection: EntityType[];
    
    if (multiSelectEnabled) {
      const isSelected = selectedEntities.some(e => e.id === entity.id);
      if (isSelected) {
        newSelection = selectedEntities.filter(e => e.id !== entity.id);
      } else {
        newSelection = [...selectedEntities, entity];
      }
    } else {
      newSelection = [entity];
    }
    
    onSelectionChange?.(newSelection);
  };
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when category changes
    clearSearch();
  };
  
  // Handle advanced filter changes
  const handleFilterChange = (newFilters: typeof filterCriteria) => {
    setFilterCriteria(newFilters);
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setFilterCriteria({});
    clearSearch();
  };
  
  return (
    <Card className="entity-type-selector" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with search and controls */}
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h2">
            Entity Type Selector
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Filter options">
              <IconButton
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                color={showAdvancedSearch ? 'primary' : 'default'}
                size="small"
              >
                <FilterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all filters">
              <IconButton onClick={handleClearFilters} size="small">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Search Input */}
        {searchEnabled && (
          <EntitySearchInput
            value={searchQuery}
            onChange={handleSearch}
            suggestions={searchSuggestions}
            isSearching={isSearching}
            placeholder={searchPlaceholder}
            showStats={true}
            stats={searchStats}
          />
        )}
        
        {/* Advanced Search Accordion */}
        {showAdvancedSearch && (
          <Accordion sx={{ mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {/* Risk Level Filter */}
                <Box>
                  <Typography variant="body2" gutterBottom>Risk Level</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {['low', 'medium', 'high', 'critical'].map(level => (
                      <FormControlLabel
                        key={level}
                        control={
                          <Checkbox
                            checked={filterCriteria.riskLevel?.includes(level) || false}
                            onChange={(e) => {
                              const current = filterCriteria.riskLevel || [];
                              const updated = e.target.checked
                                ? [...current, level]
                                : current.filter(l => l !== level);
                              handleFilterChange({ ...filterCriteria, riskLevel: updated });
                            }}
                            size="small"
                          />
                        }
                        label={level.charAt(0).toUpperCase() + level.slice(1)}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Data Type Filter */}
                <Box>
                  <Typography variant="body2" gutterBottom>Data Type</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {['string', 'number', 'boolean', 'date', 'object', 'array'].map(type => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={filterCriteria.dataType?.includes(type) || false}
                            onChange={(e) => {
                              const current = filterCriteria.dataType || [];
                              const updated = e.target.checked
                                ? [...current, type]
                                : current.filter(t => t !== type);
                              handleFilterChange({ ...filterCriteria, dataType: updated });
                            }}
                            size="small"
                          />
                        }
                        label={type.charAt(0).toUpperCase() + type.slice(1)}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Required Fields Filter */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filterCriteria.required || false}
                      onChange={(e) => {
                        handleFilterChange({ 
                          ...filterCriteria, 
                          required: e.target.checked ? true : undefined 
                        });
                      }}
                      size="small"
                    />
                  }
                  label="Required fields only"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
        
        {/* Selected entities display */}
        {selectedEntities.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Selected ({selectedEntities.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {selectedEntities.map(entity => (
                <Chip
                  key={entity.id}
                  label={entity.name}
                  onDelete={() => handleEntityToggle(entity)}
                  size="small"
                  variant="outlined"
                  color={entity.riskLevel === 'high' || entity.riskLevel === 'critical' ? 'error' : 'primary'}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
      
      {/* Main Content */}
      <Box flex={1} display="flex" minHeight={0}>
        {/* Category Tree Sidebar */}
        {showCategories && categoryFilterEnabled && (
          <Box width={250} borderRight={1} borderColor="divider" sx={{ overflowY: 'auto' }}>
            <EntityCategoryTree
              categories={categoryTree}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              showItemCounts={true}
              expandable={true}
            />
          </Box>
        )}
        
        {/* Entity List */}
        <Box flex={1} sx={{ overflowY: 'auto' }} ref={containerRef}>
          {filteredEntities.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="textSecondary">
                {searchQuery ? 'No entities match your search criteria' : 'No entities available'}
              </Typography>
              {searchQuery && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Try adjusting your search terms or clearing filters
                </Typography>
              )}
            </Box>
          ) : (
            <Box p={1}>
              {/* Results Summary */}
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1, px: 1 }}>
                Showing {filteredEntities.length} of {entities.length} entities
                {selectedCategory && (
                  <Chip 
                    label={categories.find(c => c.id === selectedCategory)?.name} 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Typography>
              
              {/* Entity Cards */}
              {(enableVirtualization ? virtualizedItems : filteredEntities).map((entity, index) => (
                <EntityTypeCard
                  key={entity.id}
                  entity={entity}
                  isSelected={selectedEntities.some(e => e.id === entity.id)}
                  onToggle={() => handleEntityToggle(entity)}
                  showDescription={showDescriptions}
                  showValidation={validationEnabled}
                  compact={!showDescriptions}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
};