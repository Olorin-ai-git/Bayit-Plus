import { useState, useEffect, useMemo, useCallback } from 'react';
import { EntityType, EntityCategory } from '../EntityTypeSelector';

// Category statistics interface
interface CategoryStats {
  totalEntities: number;
  averageRiskLevel: number;
  dataTypeDistribution: Record<string, number>;
  requiredFieldsCount: number;
  subcategoryCount: number;
}

// Hook configuration
interface CategoryConfig {
  maxDepth: number;
  minCategorySize: number;
  autoExpandPopular: boolean;
  sortByCount: boolean;
  groupSimilar: boolean;
}

// Default configuration
const DEFAULT_CONFIG: CategoryConfig = {
  maxDepth: 3,
  minCategorySize: 1,
  autoExpandPopular: true,
  sortByCount: true,
  groupSimilar: true
};

export const useEntityCategories = (
  entities: EntityType[],
  config: Partial<CategoryConfig> = {}
) => {
  // Merge config with defaults
  const categoryConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [favoriteCategories, setFavoriteCategories] = useState<Set<string>>(new Set());
  
  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('entityCategoryFavorites');
    if (saved) {
      try {
        setFavoriteCategories(new Set(JSON.parse(saved)));
      } catch (e) {
        console.warn('Failed to load category favorites:', e);
      }
    }
  }, []);
  
  // Create category hierarchy from entities
  const categoryTree = useMemo(() => {
    const categoryMap = new Map<string, EntityCategory>();
    
    // Group entities by category and subcategory
    const categoryGroups = new Map<string, EntityType[]>();
    const subcategoryGroups = new Map<string, Map<string, EntityType[]>>();
    
    entities.forEach(entity => {
      const category = entity.category || 'Other';
      const subcategory = entity.subcategory;
      
      // Add to main category
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(entity);
      
      // Add to subcategory if exists
      if (subcategory) {
        if (!subcategoryGroups.has(category)) {
          subcategoryGroups.set(category, new Map());
        }
        if (!subcategoryGroups.get(category)!.has(subcategory)) {
          subcategoryGroups.get(category)!.set(subcategory, []);
        }
        subcategoryGroups.get(category)!.get(subcategory)!.push(entity);
      }
    });
    
    // Build category tree
    const categories: EntityCategory[] = [];
    
    categoryGroups.forEach((categoryEntities, categoryName) => {
      const subcategories: EntityCategory[] = [];
      const subcategoryMap = subcategoryGroups.get(categoryName);
      
      if (subcategoryMap) {
        subcategoryMap.forEach((subcategoryEntities, subcategoryName) => {
          if (subcategoryEntities.length >= categoryConfig.minCategorySize) {
            subcategories.push({
              id: `${categoryName}.${subcategoryName}`,
              name: subcategoryName,
              description: `${subcategoryName} entities within ${categoryName}`,
              count: subcategoryEntities.length,
              color: getCategoryColor(categoryName),
              icon: getCategoryIcon(categoryName)
            });
          }
        });
      }
      
      // Sort subcategories
      if (categoryConfig.sortByCount) {
        subcategories.sort((a, b) => b.count - a.count);
      } else {
        subcategories.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      const category: EntityCategory = {
        id: categoryName,
        name: categoryName,
        description: getCategoryDescription(categoryName),
        count: categoryEntities.length,
        subcategories: subcategories.length > 0 ? subcategories : undefined,
        color: getCategoryColor(categoryName),
        icon: getCategoryIcon(categoryName)
      };
      
      categories.push(category);
      categoryMap.set(categoryName, category);
    });
    
    // Sort main categories
    if (categoryConfig.sortByCount) {
      categories.sort((a, b) => b.count - a.count);
    } else {
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return categories;
  }, [entities, categoryConfig]);
  
  // Flat list of all categories (including subcategories)
  const categories = useMemo(() => {
    const flatCategories: EntityCategory[] = [];
    
    categoryTree.forEach(category => {
      flatCategories.push(category);
      if (category.subcategories) {
        flatCategories.push(...category.subcategories);
      }
    });
    
    return flatCategories;
  }, [categoryTree]);
  
  // Get entities for a specific category
  const getCategoryEntities = useCallback((categoryId: string): EntityType[] => {
    if (categoryId.includes('.')) {
      // Subcategory
      const [mainCategory, subCategory] = categoryId.split('.');
      return entities.filter(entity => 
        entity.category === mainCategory && entity.subcategory === subCategory
      );
    } else {
      // Main category
      return entities.filter(entity => entity.category === categoryId);
    }
  }, [entities]);
  
  // Get category statistics
  const getCategoryStats = useCallback((categoryId: string): CategoryStats => {
    const categoryEntities = getCategoryEntities(categoryId);
    
    const dataTypeDistribution: Record<string, number> = {};
    let totalRiskScore = 0;
    let riskCount = 0;
    let requiredFieldsCount = 0;
    
    categoryEntities.forEach(entity => {
      // Data type distribution
      const dataType = entity.dataType || 'string';
      dataTypeDistribution[dataType] = (dataTypeDistribution[dataType] || 0) + 1;
      
      // Risk level calculation
      const riskScore = getRiskScore(entity.riskLevel);
      if (riskScore > 0) {
        totalRiskScore += riskScore;
        riskCount++;
      }
      
      // Required fields
      if (entity.isRequired) {
        requiredFieldsCount++;
      }
    });
    
    const averageRiskLevel = riskCount > 0 ? totalRiskScore / riskCount : 0;
    
    // Count subcategories
    const subcategoryCount = categoryTree.find(cat => cat.id === categoryId)?.subcategories?.length || 0;
    
    return {
      totalEntities: categoryEntities.length,
      averageRiskLevel,
      dataTypeDistribution,
      requiredFieldsCount,
      subcategoryCount
    };
  }, [getCategoryEntities, categoryTree]);
  
  // Toggle category expansion
  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);
  
  // Toggle category favorite
  const toggleCategoryFavorite = useCallback((categoryId: string) => {
    setFavoriteCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      
      // Save to localStorage
      localStorage.setItem('entityCategoryFavorites', JSON.stringify([...next]));
      
      return next;
    });
  }, []);
  
  // Get popular categories (most entities)
  const popularCategories = useMemo(() => {
    return [...categoryTree]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [categoryTree]);
  
  // Get recent categories (from usage)
  const recentCategories = useMemo(() => {
    // This would typically come from usage analytics
    // For now, return empty array
    return [];
  }, []);
  
  // Auto-expand popular categories if configured
  useEffect(() => {
    if (categoryConfig.autoExpandPopular && popularCategories.length > 0) {
      const toExpand = popularCategories.slice(0, 3).map(cat => cat.id);
      setExpandedCategories(prev => new Set([...prev, ...toExpand]));
    }
  }, [categoryConfig.autoExpandPopular, popularCategories]);
  
  return {
    // Category data
    categoryTree,
    categories,
    popularCategories,
    recentCategories,
    
    // State
    expandedCategories,
    favoriteCategories,
    
    // Methods
    getCategoryEntities,
    getCategoryStats,
    toggleCategoryExpansion,
    toggleCategoryFavorite,
    
    // Helper methods
    isCategoryExpanded: (categoryId: string) => expandedCategories.has(categoryId),
    isCategoryFavorite: (categoryId: string) => favoriteCategories.has(categoryId),
    getCategoryPath: (categoryId: string) => categoryId.split('.'),
  };
};

// Helper functions
function getCategoryDescription(categoryName: string): string {
  const descriptions: Record<string, string> = {
    'Financial': 'Financial and payment-related entities including amounts, currencies, and transaction data',
    'Security': 'Security and fraud detection entities for risk assessment and threat analysis',
    'Geographic': 'Location-based entities including addresses, coordinates, and regional information',
    'Temporal': 'Time and date-related entities for temporal analysis and tracking',
    'Network': 'Network and device-related entities for technical analysis',
    'Commerce': 'Commerce and shopping-related entities for business transactions',
    'User': 'User identity and profile-related entities',
    'Device': 'Device fingerprinting and technical specification entities',
    'Validation': 'Data validation and verification entities',
    'Processing': 'Data processing and workflow entities'
  };
  
  return descriptions[categoryName] || `Entities related to ${categoryName.toLowerCase()}`;
}

function getCategoryColor(categoryName: string): string {
  const colors: Record<string, string> = {
    'Financial': '#1976d2',
    'Security': '#d32f2f',
    'Geographic': '#2e7d32',
    'Temporal': '#ed6c02',
    'Network': '#0288d1',
    'Commerce': '#7b1fa2',
    'User': '#388e3c',
    'Device': '#455a64',
    'Validation': '#f57c00',
    'Processing': '#5d4037'
  };
  
  return colors[categoryName] || '#666666';
}

function getCategoryIcon(categoryName: string): string {
  const icons: Record<string, string> = {
    'Financial': '💰',
    'Security': '🔒',
    'Geographic': '🌍',
    'Temporal': '⏰',
    'Network': '🌐',
    'Commerce': '🛒',
    'User': '👤',
    'Device': '📱',
    'Validation': '✅',
    'Processing': '⚙️'
  };
  
  return icons[categoryName] || '📁';
}

function getRiskScore(riskLevel?: string): number {
  switch (riskLevel) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}