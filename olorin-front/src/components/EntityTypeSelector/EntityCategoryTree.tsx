import React, { useState, useMemo } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Box,
  Typography,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Folder,
  FolderOpen,
  Category as CategoryIcon,
  AccountBalance as FinancialIcon,
  Security as SecurityIcon,
  LocationOn as GeographicIcon,
  Schedule as TemporalIcon,
  NetworkCheck as NetworkIcon,
  ShoppingCart as CommerceIcon,
  Info as InfoIcon,
  FilterNone as AllIcon
} from '@mui/icons-material';
import { EntityCategory } from './EntityTypeSelector';

// Props interface
export interface EntityCategoryTreeProps {
  categories: EntityCategory[];
  selectedCategory?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
  showItemCounts?: boolean;
  expandable?: boolean;
  maxDepth?: number;
  showAllOption?: boolean;
  compactView?: boolean;
}

// Category icon mapping
const getCategoryIcon = (categoryId: string, isOpen = false) => {
  const iconProps = { fontSize: 'small' as const };
  
  switch (categoryId.toLowerCase()) {
    case 'financial':
    case 'payment':
    case 'transaction':
      return <FinancialIcon {...iconProps} color="primary" />;
    
    case 'security':
    case 'fraud':
    case 'risk':
      return <SecurityIcon {...iconProps} color="error" />;
    
    case 'geographic':
    case 'location':
    case 'address':
      return <GeographicIcon {...iconProps} color="success" />;
    
    case 'temporal':
    case 'time':
    case 'date':
      return <TemporalIcon {...iconProps} color="warning" />;
    
    case 'network':
    case 'device':
    case 'ip':
      return <NetworkIcon {...iconProps} color="info" />;
    
    case 'commerce':
    case 'cart':
    case 'product':
      return <CommerceIcon {...iconProps} color="secondary" />;
    
    default:
      return isOpen ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
  }
};

// Category color mapping
const getCategoryColor = (categoryId: string): string => {
  const colors: Record<string, string> = {
    'financial': '#1976d2',
    'security': '#d32f2f',
    'geographic': '#2e7d32',
    'temporal': '#ed6c02',
    'network': '#0288d1',
    'commerce': '#7b1fa2'
  };
  
  return colors[categoryId.toLowerCase()] || '#666666';
};

// Individual category item component
interface CategoryItemProps {
  category: EntityCategory;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (categoryId: string | null) => void;
  onToggleExpand: (categoryId: string) => void;
  showItemCounts: boolean;
  expandable: boolean;
  compactView: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  level,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  showItemCounts,
  expandable,
  compactView
}) => {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;
  const indentLevel = level * (compactView ? 16 : 24);
  
  return (
    <>
      <ListItem disablePadding sx={{ pl: `${indentLevel}px` }}>
        <ListItemButton
          selected={isSelected}
          onClick={() => onSelect(category.id)}
          sx={{
            borderRadius: 1,
            mx: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.main',
              }
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: compactView ? 32 : 40 }}>
            {getCategoryIcon(category.id, isExpanded)}
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography 
                  variant={compactView ? 'body2' : 'body1'}
                  fontWeight={level === 0 ? 'medium' : 'normal'}
                >
                  {category.name}
                </Typography>
                
                {showItemCounts && (
                  <Chip
                    label={category.count}
                    size="small"
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      height: compactView ? 20 : 24,
                      fontSize: compactView ? '0.7rem' : '0.75rem',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent'
                    }}
                  />
                )}
              </Box>
            }
            secondary={!compactView ? category.description : undefined}
            secondaryTypographyProps={{
              variant: 'caption',
              color: isSelected ? 'inherit' : 'textSecondary',
              sx: { opacity: isSelected ? 0.8 : 0.7 }
            }}
          />
          
          {hasSubcategories && expandable && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(category.id);
              }}
              sx={{ 
                color: isSelected ? 'inherit' : 'action.active',
                opacity: isSelected ? 0.8 : 1
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </ListItemButton>
      </ListItem>
      
      {/* Subcategories */}
      {hasSubcategories && expandable && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          {category.subcategories!.map(subcategory => (
            <CategoryItemRecursive
              key={subcategory.id}
              category={subcategory}
              level={level + 1}
              selectedCategory={isSelected ? category.id : null}
              onSelect={onSelect}
              showItemCounts={showItemCounts}
              expandable={expandable}
              compactView={compactView}
            />
          ))}
        </Collapse>
      )}
    </>
  );
};

// Recursive category item wrapper
interface CategoryItemRecursiveProps {
  category: EntityCategory;
  level: number;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  showItemCounts: boolean;
  expandable: boolean;
  compactView: boolean;
}

const CategoryItemRecursive: React.FC<CategoryItemRecursiveProps> = (props) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const handleToggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
  
  return (
    <CategoryItem
      {...props}
      isSelected={props.selectedCategory === props.category.id}
      isExpanded={expandedCategories.has(props.category.id)}
      onToggleExpand={handleToggleExpand}
    />
  );
};

export const EntityCategoryTree: React.FC<EntityCategoryTreeProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  showItemCounts = true,
  expandable = true,
  maxDepth = 3,
  showAllOption = true,
  compactView = false
}) => {
  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['root']));
  
  // Handle category expansion
  const handleToggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
  
  // Calculate total entities
  const totalEntities = useMemo(() => {
    return categories.reduce((sum, category) => sum + category.count, 0);
  }, [categories]);
  
  // Group categories by type for better organization
  const categorizedGroups = useMemo(() => {
    const core = categories.filter(cat => 
      ['financial', 'security', 'geographic', 'temporal', 'network'].includes(cat.id.toLowerCase())
    );
    const business = categories.filter(cat => 
      ['commerce', 'merchant', 'product', 'customer'].includes(cat.id.toLowerCase())
    );
    const technical = categories.filter(cat => 
      ['device', 'session', 'validation', 'processing'].includes(cat.id.toLowerCase())
    );
    const other = categories.filter(cat => 
      !core.some(c => c.id === cat.id) && 
      !business.some(c => c.id === cat.id) && 
      !technical.some(c => c.id === cat.id)
    );
    
    return { core, business, technical, other };
  }, [categories]);
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box p={compactView ? 1 : 2} borderBottom={1} borderColor="divider">
        <Typography 
          variant={compactView ? 'subtitle2' : 'subtitle1'} 
          fontWeight="medium"
          gutterBottom
        >
          Entity Categories
        </Typography>
        
        {showAllOption && (
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedCategory === null}
              onClick={() => onCategorySelect?.(null)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: compactView ? 32 : 40 }}>
                <AllIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="All Categories"
                secondary={!compactView ? `${totalEntities} total entities` : undefined}
              />
              {showItemCounts && (
                <Chip
                  label={totalEntities}
                  size="small"
                  variant={selectedCategory === null ? 'filled' : 'outlined'}
                  sx={{
                    backgroundColor: selectedCategory === null ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        )}
      </Box>
      
      {/* Category Tree */}
      <Box flex={1} sx={{ overflowY: 'auto' }}>
        <List dense={compactView}>
          {/* Core Categories */}
          {categorizedGroups.core.length > 0 && (
            <>
              {!compactView && (
                <ListItem>
                  <Typography variant="caption" color="textSecondary" fontWeight="bold">
                    CORE ENTITIES
                  </Typography>
                </ListItem>
              )}
              {categorizedGroups.core.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  level={0}
                  isSelected={selectedCategory === category.id}
                  isExpanded={expandedCategories.has(category.id)}
                  onSelect={onCategorySelect || (() => {})}
                  onToggleExpand={handleToggleExpand}
                  showItemCounts={showItemCounts}
                  expandable={expandable}
                  compactView={compactView}
                />
              ))}
            </>
          )}
          
          {/* Business Categories */}
          {categorizedGroups.business.length > 0 && (
            <>
              {!compactView && (
                <ListItem sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary" fontWeight="bold">
                    BUSINESS ENTITIES
                  </Typography>
                </ListItem>
              )}
              {categorizedGroups.business.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  level={0}
                  isSelected={selectedCategory === category.id}
                  isExpanded={expandedCategories.has(category.id)}
                  onSelect={onCategorySelect || (() => {})}
                  onToggleExpand={handleToggleExpand}
                  showItemCounts={showItemCounts}
                  expandable={expandable}
                  compactView={compactView}
                />
              ))}
            </>
          )}
          
          {/* Technical Categories */}
          {categorizedGroups.technical.length > 0 && (
            <>
              {!compactView && (
                <ListItem sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary" fontWeight="bold">
                    TECHNICAL ENTITIES
                  </Typography>
                </ListItem>
              )}
              {categorizedGroups.technical.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  level={0}
                  isSelected={selectedCategory === category.id}
                  isExpanded={expandedCategories.has(category.id)}
                  onSelect={onCategorySelect || (() => {})}
                  onToggleExpand={handleToggleExpand}
                  showItemCounts={showItemCounts}
                  expandable={expandable}
                  compactView={compactView}
                />
              ))}
            </>
          )}
          
          {/* Other Categories */}
          {categorizedGroups.other.length > 0 && (
            <>
              {!compactView && categorizedGroups.other.length > 0 && (
                <ListItem sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary" fontWeight="bold">
                    OTHER ENTITIES
                  </Typography>
                </ListItem>
              )}
              {categorizedGroups.other.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  level={0}
                  isSelected={selectedCategory === category.id}
                  isExpanded={expandedCategories.has(category.id)}
                  onSelect={onCategorySelect || (() => {})}
                  onToggleExpand={handleToggleExpand}
                  showItemCounts={showItemCounts}
                  expandable={expandable}
                  compactView={compactView}
                />
              ))}
            </>
          )}
        </List>
      </Box>
      
      {/* Footer with category stats */}
      {!compactView && (
        <Box p={1} borderTop={1} borderColor="divider" bgcolor="grey.50">
          <Typography variant="caption" color="textSecondary" textAlign="center">
            {categories.length} categories • {totalEntities} entities
          </Typography>
        </Box>
      )}
    </Box>
  );
};