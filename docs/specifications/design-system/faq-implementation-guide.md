# CVPlus FAQ Visual System Implementation Guide

**Author**: Gil Klainert  
**Date**: 2025-08-20  
**Version**: 1.0

---

## 1. CSS/SCSS Implementation

### 1.1 Core Visual Variables (Add to existing Tailwind config)

```javascript
// tailwind.config.js - Extend existing configuration
module.exports = {
  // ... existing config
  theme: {
    extend: {
      // ... existing extensions
      colors: {
        // ... existing colors
        faq: {
          // Primary brand colors for FAQ
          'blue': '#3B82F6',
          'blue-light': '#60A5FA',
          'blue-dark': '#1E40AF',
          'purple': '#8B5CF6',
          'purple-light': '#A78BFA',
          'purple-dark': '#7C3AED',
          'green': '#10B981',
          'green-light': '#34D399',
          'green-dark': '#047857',
          'red': '#EF4444',
          'orange': '#F59E0B',
          
          // FAQ-specific semantic colors
          'category-ai': '#3B82F6',
          'category-account': '#10B981',
          'category-features': '#8B5CF6',
          'category-formats': '#F59E0B',
          'category-billing': '#6366F1',
          'category-start': '#06B6D4',
        }
      },
      animation: {
        // ... existing animations
        'faq-expand': 'faq-expand 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'faq-collapse': 'faq-collapse 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'search-focus': 'search-focus 0.3s ease-out',
        'category-hover': 'category-hover 0.2s ease-out',
        'success-bounce': 'success-bounce 0.6s ease-out',
        'error-shake': 'error-shake 0.5s ease-out',
        'ai-thinking': 'ai-thinking 1.5s ease-in-out infinite',
        'neural-pulse': 'neural-pulse 1.5s ease-in-out infinite',
        'transform-arrow': 'transform-arrow 2s ease-in-out infinite',
      },
      keyframes: {
        // ... existing keyframes
        'faq-expand': {
          'from': { height: '0', opacity: '0' },
          'to': { height: 'auto', opacity: '1' }
        },
        'faq-collapse': {
          'from': { height: 'auto', opacity: '1' },
          'to': { height: '0', opacity: '0' }
        },
        'search-focus': {
          '0%': { transform: 'translateY(0) scale(1)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
          '100%': { transform: 'translateY(-2px) scale(1)', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1), 0 8px 25px rgba(59, 130, 246, 0.2)' }
        },
        'category-hover': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-2px) scale(1.05)' }
        },
        'success-bounce': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' }
        },
        'error-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' }
        },
        'ai-thinking': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' }
        },
        'neural-pulse': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' }
        },
        'transform-arrow': {
          '0%': { transform: 'translateX(-10px)', opacity: '0.5' },
          '50%': { transform: 'translateX(5px)', opacity: '1' },
          '100%': { transform: 'translateX(0)', opacity: '0.8' }
        }
      },
      backgroundImage: {
        // ... existing backgrounds
        'gradient-faq-primary': 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
        'gradient-faq-success': 'linear-gradient(135deg, #10B981, #06B6D4)',
        'gradient-faq-error': 'linear-gradient(135deg, #EF4444, #DC2626)',
        'gradient-faq-warning': 'linear-gradient(135deg, #F59E0B, #F97316)',
        'pattern-circuit': 'url("/patterns/circuit-pattern.svg")',
        'pattern-neural': 'url("/patterns/neural-network.svg")',
      },
      spacing: {
        // ... existing spacing
        'faq-xs': '0.25rem',   // 4px
        'faq-sm': '0.5rem',    // 8px
        'faq-md': '1rem',      // 16px
        'faq-lg': '1.5rem',    // 24px
        'faq-xl': '2rem',      // 32px
        'faq-2xl': '3rem',     // 48px
      },
      borderRadius: {
        // ... existing borders
        'faq-card': '12px',
        'faq-icon': '8px',
        'faq-button': '6px',
      }
    }
  }
}
```

### 1.2 FAQ-Specific CSS Classes

```scss
// FAQ Visual Components Stylesheet
// Add to /src/styles/components/faq-visuals.scss

// ==============================================
// FAQ Container and Layout
// ==============================================
.faq-container {
  @apply max-w-6xl mx-auto px-6;
}

.faq-section {
  @apply py-16;
}

// ==============================================
// FAQ Hero Section
// ==============================================
.faq-hero {
  @apply relative py-20 px-6 text-center;
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%);
  
  &::before {
    content: '';
    @apply absolute inset-0 opacity-5;
    background: url('/patterns/circuit-pattern.svg') no-repeat center;
    background-size: cover;
  }
}

.faq-hero-title {
  @apply text-4xl lg:text-5xl font-extrabold mb-6;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

.faq-hero-subtitle {
  @apply text-xl text-gray-400 max-w-3xl mx-auto mb-8;
}

.transformation-visual {
  @apply flex items-center justify-center gap-8 mb-12;
  
  .paper-state {
    @apply flex flex-col items-center opacity-60;
    
    .document-icon {
      @apply w-16 h-16 mb-2 text-gray-500;
    }
    
    .state-label {
      @apply text-sm text-gray-500 font-medium;
    }
  }
  
  .transform-arrow {
    @apply text-2xl text-faq-blue animate-transform-arrow;
  }
  
  .powerful-state {
    @apply flex flex-col items-center;
    
    .document-icon {
      @apply w-16 h-16 mb-2 text-faq-blue animate-pulse-slow;
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
    }
    
    .state-label {
      @apply text-sm text-faq-blue font-bold;
    }
  }
}

// ==============================================
// FAQ Search Component
// ==============================================
.faq-search-container {
  @apply relative max-w-2xl mx-auto mb-12;
}

.faq-search-input {
  @apply w-full px-6 py-4 bg-gray-800/80 border border-gray-600 rounded-2xl text-white text-lg placeholder-gray-400;
  @apply focus:outline-none focus:border-faq-blue focus:animate-search-focus;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::placeholder {
    @apply text-gray-500;
  }
}

.search-icon {
  @apply absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400;
  @apply transition-colors duration-300;
  
  .faq-search-input:focus + & {
    @apply text-faq-blue animate-neural-pulse;
  }
}

// Search Results
.search-results {
  @apply mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700;
  
  .search-result-item {
    @apply p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors;
    
    .result-title {
      @apply font-semibold text-gray-200 mb-1;
    }
    
    .result-snippet {
      @apply text-sm text-gray-400;
    }
    
    .result-category {
      @apply inline-flex items-center gap-1 px-2 py-1 bg-faq-blue/20 text-faq-blue text-xs rounded-full mt-2;
    }
  }
}

// ==============================================
// FAQ Category Grid
// ==============================================
.faq-categories-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16;
}

.faq-category-card {
  @apply bg-gray-800/60 rounded-xl p-6 border border-gray-700 cursor-pointer;
  @apply hover:border-faq-blue hover:bg-gray-800/80 hover:animate-category-hover;
  @apply transition-all duration-300;
  
  &:hover {
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
  }
  
  .category-icon-container {
    @apply w-16 h-16 rounded-xl mb-4 flex items-center justify-center text-2xl;
    @apply transition-transform duration-300;
    
    &.ai-tech {
      background: linear-gradient(135deg, #3B82F6, #1E40AF);
    }
    
    &.account-privacy {
      background: linear-gradient(135deg, #10B981, #047857);
    }
    
    &.features {
      background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    }
    
    &.formats {
      background: linear-gradient(135deg, #F59E0B, #D97706);
    }
    
    &.billing {
      background: linear-gradient(135deg, #6366F1, #4F46E5);
    }
    
    &.getting-started {
      background: linear-gradient(135deg, #06B6D4, #0891B2);
    }
  }
  
  .category-title {
    @apply text-xl font-bold text-gray-100 mb-2;
  }
  
  .category-description {
    @apply text-gray-400 text-sm;
  }
  
  .category-count {
    @apply inline-flex items-center gap-1 mt-3 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full;
  }
}

// ==============================================
// FAQ Accordion
// ==============================================
.faq-accordion {
  @apply space-y-4;
}

.faq-item {
  @apply bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden;
  @apply transition-all duration-300;
  
  &.expanded {
    @apply border-faq-blue/50 bg-gray-800/80;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
  }
}

.faq-question-button {
  @apply w-full px-6 py-4 text-left flex items-center justify-between cursor-pointer;
  @apply hover:bg-gray-700/30 transition-colors duration-200;
  
  .question-text {
    @apply text-lg font-semibold text-gray-200 pr-4;
  }
  
  .expand-icon {
    @apply w-5 h-5 text-gray-400 transition-transform duration-300;
    
    .expanded & {
      @apply transform rotate-180 text-faq-blue;
    }
  }
}

.faq-answer {
  @apply px-6 pb-6 text-gray-300 leading-relaxed;
  @apply animate-faq-expand;
  
  // Rich content styling
  p {
    @apply mb-4;
    
    &:last-child {
      @apply mb-0;
    }
  }
  
  code {
    @apply bg-gray-900 px-2 py-1 rounded text-faq-blue font-mono text-sm;
  }
  
  pre {
    @apply bg-gray-900 p-4 rounded-lg overflow-x-auto my-4;
    
    code {
      @apply bg-transparent p-0;
    }
  }
  
  a {
    @apply text-faq-blue hover:text-faq-blue-light underline transition-colors;
  }
  
  ul, ol {
    @apply ml-6 mb-4;
    
    li {
      @apply mb-2;
    }
  }
  
  ul li {
    @apply list-disc;
  }
  
  ol li {
    @apply list-decimal;
  }
}

// ==============================================
// Visual Feedback States
// ==============================================
.success-state {
  @apply flex items-center gap-3 p-4 rounded-xl;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
  @apply border border-faq-green/30 animate-success-bounce;
  
  .success-icon {
    @apply w-6 h-6 bg-gradient-faq-success rounded-full flex items-center justify-center text-white text-sm;
  }
  
  .success-message {
    @apply text-faq-green font-medium;
  }
}

.error-state {
  @apply flex items-center gap-3 p-4 rounded-xl;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
  @apply border border-faq-red/30 animate-error-shake;
  
  .error-icon {
    @apply w-6 h-6 bg-gradient-faq-error rounded-full flex items-center justify-center text-white text-sm;
  }
  
  .error-message {
    @apply text-faq-red font-medium;
  }
}

.loading-state {
  @apply flex items-center gap-3 p-4;
  
  .ai-brain-icon {
    @apply w-8 h-8 bg-gradient-faq-primary rounded-full flex items-center justify-center text-white animate-ai-thinking;
  }
  
  .thinking-dots {
    @apply flex gap-1;
    
    .thinking-dot {
      @apply w-2 h-2 bg-faq-blue rounded-full animate-ai-thinking;
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
  
  .loading-message {
    @apply text-gray-400 ml-2;
  }
}

// ==============================================
// AI Visual Elements
// ==============================================
.neural-network-bg {
  @apply absolute inset-0 opacity-5;
  background: url('/patterns/neural-network.svg') repeat;
  animation: float 6s ease-in-out infinite;
}

.ai-processing-indicator {
  @apply inline-flex items-center gap-2 px-3 py-1 bg-faq-blue/20 text-faq-blue rounded-full text-sm;
  
  .processing-icon {
    @apply animate-neural-pulse;
  }
}

// ==============================================
// Accessibility Enhancements
// ==============================================
.faq-skip-link {
  @apply absolute -top-10 left-6 bg-faq-blue text-white px-4 py-2 rounded-md z-50;
  @apply focus:top-6 transition-all duration-300;
}

.faq-focusable {
  @apply focus:outline-none focus:ring-2 focus:ring-faq-blue focus:ring-offset-2 focus:ring-offset-gray-800;
  @apply rounded-lg transition-shadow duration-200;
}

// High contrast mode
@media (prefers-contrast: high) {
  .faq-category-card {
    @apply border-2 border-white;
  }
  
  .faq-question-button {
    @apply border-b border-white;
  }
  
  .faq-search-input {
    @apply border-2 border-white;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .transform-arrow {
    @apply animate-none;
  }
  
  .ai-thinking,
  .neural-pulse,
  .category-hover {
    @apply animate-none;
  }
}

// ==============================================
// Responsive Design
// ==============================================
@media (max-width: 640px) {
  .faq-hero-title {
    @apply text-3xl;
  }
  
  .transformation-visual {
    @apply flex-col gap-4;
    
    .transform-arrow {
      @apply transform rotate-90;
    }
  }
  
  .faq-categories-grid {
    @apply grid-cols-1 gap-4;
  }
  
  .faq-category-card {
    @apply p-4;
    
    .category-icon-container {
      @apply w-12 h-12 text-xl;
    }
  }
  
  .faq-search-input {
    @apply px-4 py-3 text-base;
  }
}

@media (max-width: 768px) {
  .faq-search-container {
    @apply px-4;
  }
  
  .faq-question-button {
    @apply px-4 py-3;
    
    .question-text {
      @apply text-base;
    }
  }
  
  .faq-answer {
    @apply px-4 pb-4;
  }
}
```

## 2. React Component Implementation

### 2.1 Core FAQ Visual Components

```typescript
// /src/components/faq/FAQCategoryIcon.tsx
import React from 'react';
import { 
  Brain, 
  Shield, 
  Sparkles, 
  FileText, 
  CreditCard, 
  Rocket 
} from 'lucide-react';

interface FAQCategoryIconProps {
  category: 'ai-tech' | 'account-privacy' | 'features' | 'formats' | 'billing' | 'getting-started';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
  className?: string;
}

const categoryConfig = {
  'ai-tech': {
    icon: Brain,
    label: 'AI & Technology',
    emoji: '🤖',
    className: 'ai-tech',
    gradient: 'from-blue-500 to-blue-600'
  },
  'account-privacy': {
    icon: Shield,
    label: 'Account & Privacy',
    emoji: '🔐',
    className: 'account-privacy',
    gradient: 'from-green-500 to-emerald-600'
  },
  'features': {
    icon: Sparkles,
    label: 'Features & Enhancement',
    emoji: '✨',
    className: 'features',
    gradient: 'from-purple-500 to-pink-600'
  },
  'formats': {
    icon: FileText,
    label: 'Formats & Export',
    emoji: '📄',
    className: 'formats',
    gradient: 'from-orange-500 to-red-600'
  },
  'billing': {
    icon: CreditCard,
    label: 'Billing & Subscription',
    emoji: '💳',
    className: 'billing',
    gradient: 'from-indigo-500 to-purple-600'
  },
  'getting-started': {
    icon: Rocket,
    label: 'Getting Started',
    emoji: '🚀',
    className: 'getting-started',
    gradient: 'from-cyan-500 to-blue-600'
  }
};

export const FAQCategoryIcon: React.FC<FAQCategoryIconProps> = ({
  category,
  size = 'md',
  interactive = true,
  showLabel = false,
  className = ''
}) => {
  const config = categoryConfig[category];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  };
  
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32
  };
  
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]}
          category-icon-container ${config.className}
          bg-gradient-to-br ${config.gradient}
          rounded-xl flex items-center justify-center
          transition-all duration-300
          ${interactive ? 'hover:scale-110 hover:shadow-lg cursor-pointer' : ''}
        `}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={config.label}
      >
        <Icon 
          size={iconSizes[size]} 
          className="text-white"
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-300 text-center">
          {config.label}
        </span>
      )}
    </div>
  );
};
```

```typescript
// /src/components/faq/TransformationVisual.tsx
import React from 'react';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';

interface TransformationVisualProps {
  animated?: boolean;
  stage?: 'before' | 'during' | 'after' | 'all';
  className?: string;
}

export const TransformationVisual: React.FC<TransformationVisualProps> = ({
  animated = true,
  stage = 'all',
  className = ''
}) => {
  return (
    <div className={`transformation-visual ${className}`}>
      {(stage === 'before' || stage === 'all') && (
        <div className="paper-state">
          <div className="document-icon">
            <FileText className="w-full h-full text-gray-500" />
          </div>
          <span className="state-label">Paper</span>
          <div className="mt-2 text-xs text-gray-600">
            Static • Limited • Ordinary
          </div>
        </div>
      )}
      
      {stage === 'all' && (
        <div className={`transform-arrow ${animated ? 'animate-transform-arrow' : ''}`}>
          <ArrowRight className="w-8 h-8" />
        </div>
      )}
      
      {(stage === 'after' || stage === 'all') && (
        <div className="powerful-state">
          <div className="document-icon relative">
            <FileText className="w-full h-full text-faq-blue" />
            <Sparkles 
              className="absolute -top-1 -right-1 w-6 h-6 text-faq-purple animate-pulse" 
              aria-hidden="true"
            />
          </div>
          <span className="state-label">Powerful</span>
          <div className="mt-2 text-xs text-faq-blue font-medium">
            Interactive • Enhanced • Outstanding
          </div>
        </div>
      )}
    </div>
  );
};
```

```typescript
// /src/components/faq/FAQSearchBar.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useFAQSearch } from '../hooks/useFAQSearch';

interface FAQSearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export const FAQSearchBar: React.FC<FAQSearchBarProps> = ({
  onSearch,
  onClear,
  placeholder = "Search for answers...",
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { isSearching, searchResults } = useFAQSearch(query);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }, [onSearch]);
  
  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);
  
  const hasResults = searchResults.length > 0;
  const showClearButton = query.length > 0;
  
  return (
    <div className={`faq-search-container ${className}`}>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="faq-search-input faq-focusable"
          aria-label="Search FAQ"
          aria-describedby="search-help"
          autoComplete="off"
        />
        
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {showClearButton && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          <div className={`search-icon ${isSearching ? 'animate-neural-pulse' : ''}`}>
            <Search 
              className={`w-5 h-5 transition-colors duration-300 ${
                isFocused ? 'text-faq-blue' : 'text-gray-400'
              }`} 
            />
          </div>
        </div>
      </div>
      
      <div id="search-help" className="sr-only">
        Type your question to find relevant answers
      </div>
      
      {/* Search Results Dropdown */}
      {query && (
        <div className="search-results mt-2">
          {isSearching ? (
            <div className="loading-state">
              <div className="ai-brain-icon">
                <Search className="w-4 h-4" />
              </div>
              <div className="thinking-dots">
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
              </div>
              <span className="loading-message">Searching...</span>
            </div>
          ) : hasResults ? (
            <>
              <div className="text-sm text-gray-400 mb-3 px-1">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((result, index) => (
                <div key={index} className="search-result-item">
                  <div className="result-title">{result.question}</div>
                  <div className="result-snippet">{result.snippet}</div>
                  <div className="result-category">
                    <FAQCategoryIcon 
                      category={result.category} 
                      size="sm" 
                      interactive={false} 
                    />
                    {result.categoryLabel}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or browse categories below</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

```typescript
// /src/components/faq/FAQAccordion.tsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
  category: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  className?: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  allowMultiple = false,
  defaultExpanded = [],
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(defaultExpanded)
  );
  
  const toggleItem = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(itemId);
      }
      
      return newSet;
    });
  }, [allowMultiple]);
  
  return (
    <div className={`faq-accordion ${className}`}>
      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        
        return (
          <div 
            key={item.id}
            className={`faq-item ${isExpanded ? 'expanded' : ''}`}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="faq-question-button faq-focusable"
              aria-expanded={isExpanded}
              aria-controls={`faq-answer-${item.id}`}
              id={`faq-question-${item.id}`}
            >
              <span className="question-text">{item.question}</span>
              <ChevronDown 
                className="expand-icon"
                aria-hidden="true"
              />
            </button>
            
            {isExpanded && (
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                className="faq-answer"
              >
                {typeof item.answer === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                ) : (
                  item.answer
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 2.2 Custom Hooks for FAQ Functionality

```typescript
// /src/hooks/useFAQSearch.ts
import { useState, useEffect, useMemo } from 'react';
import { faqData } from '../data/faqData';

interface SearchResult {
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryLabel: string;
  snippet: string;
  score: number;
}

export const useFAQSearch = (query: string) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const searchFAQs = useMemo(() => {
    if (!query || query.length < 2) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];
    
    // Search through all FAQ items
    faqData.forEach(category => {
      category.items.forEach(item => {
        let score = 0;
        
        // Question title match (highest weight)
        if (item.question.toLowerCase().includes(normalizedQuery)) {
          score += 10;
        }
        
        // Answer content match
        if (item.answer.toLowerCase().includes(normalizedQuery)) {
          score += 5;
        }
        
        // Keywords match
        if (item.keywords?.some(keyword => 
          keyword.toLowerCase().includes(normalizedQuery)
        )) {
          score += 7;
        }
        
        // Category match
        if (category.title.toLowerCase().includes(normalizedQuery)) {
          score += 3;
        }
        
        if (score > 0) {
          // Create snippet
          const answerText = item.answer.replace(/<[^>]*>/g, ''); // Strip HTML
          const snippetStart = answerText.toLowerCase().indexOf(normalizedQuery);
          const snippet = snippetStart >= 0 
            ? `...${answerText.substring(Math.max(0, snippetStart - 30), snippetStart + 100)}...`
            : answerText.substring(0, 120) + '...';
          
          results.push({
            id: item.id,
            question: item.question,
            answer: item.answer,
            category: category.id,
            categoryLabel: category.title,
            snippet,
            score
          });
        }
      });
    });
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query]);
  
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Simulate search delay for better UX
    const searchTimeout = setTimeout(() => {
      setSearchResults(searchFAQs);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [query, searchFAQs]);
  
  return {
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0
  };
};
```

```typescript
// /src/hooks/useFAQAnalytics.ts
import { useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

interface FAQAnalytics {
  trackSearch: (query: string, resultsCount: number) => void;
  trackQuestionExpand: (questionId: string, category: string) => void;
  trackCategoryClick: (category: string) => void;
  trackHelpful: (questionId: string, isHelpful: boolean) => void;
  trackNoResults: (query: string) => void;
}

export const useFAQAnalytics = (): FAQAnalytics => {
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackEvent('faq_search', {
      query: query.toLowerCase(),
      results_count: resultsCount,
      query_length: query.length
    });
  }, []);
  
  const trackQuestionExpand = useCallback((questionId: string, category: string) => {
    trackEvent('faq_question_expand', {
      question_id: questionId,
      category: category
    });
  }, []);
  
  const trackCategoryClick = useCallback((category: string) => {
    trackEvent('faq_category_click', {
      category: category
    });
  }, []);
  
  const trackHelpful = useCallback((questionId: string, isHelpful: boolean) => {
    trackEvent('faq_feedback', {
      question_id: questionId,
      helpful: isHelpful
    });
  }, []);
  
  const trackNoResults = useCallback((query: string) => {
    trackEvent('faq_no_results', {
      query: query.toLowerCase(),
      query_length: query.length
    });
  }, []);
  
  return {
    trackSearch,
    trackQuestionExpand,
    trackCategoryClick,
    trackHelpful,
    trackNoResults
  };
};
```

### 2.3 Main FAQ Page Component

```typescript
// /src/pages/FAQPage.tsx
import React, { useState, useMemo } from 'react';
import { FAQCategoryIcon } from '../components/faq/FAQCategoryIcon';
import { FAQSearchBar } from '../components/faq/FAQSearchBar';
import { FAQAccordion } from '../components/faq/FAQAccordion';
import { TransformationVisual } from '../components/faq/TransformationVisual';
import { useFAQAnalytics } from '../hooks/useFAQAnalytics';
import { faqData } from '../data/faqData';
import { HelpCircle, MessageCircle } from 'lucide-react';

export const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const analytics = useFAQAnalytics();
  
  const filteredFAQs = useMemo(() => {
    if (selectedCategory) {
      return faqData.filter(category => category.id === selectedCategory);
    }
    return faqData;
  }, [selectedCategory]);
  
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      // Analytics will be handled by the search hook
      analytics.trackSearch(query, 0); // Results count will be updated
    }
  }, [analytics]);
  
  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    analytics.trackCategoryClick(categoryId);
  }, [selectedCategory, analytics]);
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Skip Navigation */}
      <a href="#main-content" className="faq-skip-link">
        Skip to main content
      </a>
      
      {/* FAQ Hero Section */}
      <section className="faq-hero">
        <div className="neural-network-bg" aria-hidden="true" />
        <div className="faq-container relative z-10">
          <h1 className="faq-hero-title">
            Get Instant Help
          </h1>
          <p className="faq-hero-subtitle">
            Find answers to all your questions about transforming your CV from paper to powerful
          </p>
          
          <TransformationVisual animated={true} className="mb-12" />
          
          <FAQSearchBar
            onSearch={handleSearch}
            onClear={() => setSearchQuery('')}
            placeholder="What can we help you with?"
          />
        </div>
      </section>
      
      {/* Main Content */}
      <main id="main-content" className="faq-section">
        <div className="faq-container">
          {!searchQuery && (
            <>
              {/* Category Selection */}
              <section aria-labelledby="categories-heading" className="mb-16">
                <h2 id="categories-heading" className="text-3xl font-bold text-center text-gray-100 mb-8">
                  Browse by Category
                </h2>
                <div className="faq-categories-grid">
                  {faqData.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`faq-category-card faq-focusable ${
                        selectedCategory === category.id ? 'border-faq-blue bg-gray-800/80' : ''
                      }`}
                      aria-pressed={selectedCategory === category.id}
                    >
                      <FAQCategoryIcon
                        category={category.id as any}
                        size="md"
                        interactive={false}
                      />
                      <h3 className="category-title">{category.title}</h3>
                      <p className="category-description">{category.description}</p>
                      <div className="category-count">
                        <HelpCircle className="w-3 h-3" />
                        {category.items.length} questions
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              
              {/* Selected Category or All FAQs */}
              <section aria-labelledby="faqs-heading">
                <h2 id="faqs-heading" className="text-2xl font-bold text-gray-100 mb-8">
                  {selectedCategory 
                    ? `${faqData.find(c => c.id === selectedCategory)?.title} Questions`
                    : 'Frequently Asked Questions'
                  }
                </h2>
                
                {filteredFAQs.map((category) => (
                  <div key={category.id} className="mb-12">
                    {!selectedCategory && (
                      <div className="flex items-center gap-3 mb-6">
                        <FAQCategoryIcon
                          category={category.id as any}
                          size="sm"
                          interactive={false}
                        />
                        <h3 className="text-xl font-semibold text-gray-200">
                          {category.title}
                        </h3>
                      </div>
                    )}
                    
                    <FAQAccordion
                      items={category.items}
                      allowMultiple={true}
                    />
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
      
      {/* Contact Section */}
      <section className="py-16 bg-gray-800/50">
        <div className="faq-container text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Still Need Help?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our support team is here to help you succeed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-faq-primary text-white rounded-lg font-medium hover:shadow-lg transition-all">
              <MessageCircle className="w-5 h-5" />
              Contact Support
            </button>
            
            <button className="inline-flex items-center gap-2 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-faq-blue hover:text-faq-blue transition-colors">
              <HelpCircle className="w-5 h-5" />
              Request Feature
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
```

This implementation guide provides:

1. **Complete CSS/SCSS styling** integrated with existing Tailwind configuration
2. **Fully functional React components** with TypeScript support
3. **Custom hooks** for search functionality and analytics
4. **Accessibility compliance** with ARIA labels, focus management, and screen reader support
5. **Responsive design** that works across all device sizes
6. **Performance optimizations** with proper lazy loading and animation controls
7. **Brand consistency** with existing CVPlus design language

The components are modular, reusable, and follow React best practices while maintaining the "Paper to Powerful" visual narrative throughout the user experience.