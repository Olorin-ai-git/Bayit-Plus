# FAQ Page Implementation Guide

## Quick Start

To use the FAQ page in your React application:

```tsx
import { FAQPage } from '@/components/pages/FAQ';

// Basic usage
<FAQPage />

// With initial filters
<FAQPage 
  initialCategory="getting-started" 
  initialQuery="upload"
  className="custom-faq-styles"
/>
```

## Component Usage Examples

### 1. FAQSearchBar

```tsx
import { FAQSearchBar } from '@/components/pages/FAQ';

const [searchQuery, setSearchQuery] = useState('');
const [isLoading, setIsLoading] = useState(false);

<FAQSearchBar
  query={searchQuery}
  onQueryChange={setSearchQuery}
  placeholder="Search for answers..."
  suggestions={['upload CV', 'AI features', 'pricing']}
  isLoading={isLoading}
/>
```

### 2. FAQCategoryGrid

```tsx
import { FAQCategoryGrid } from '@/components/pages/FAQ';

const categories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics',
    icon: 'zap',
    color: '#06b6d4',
    count: 8
  }
];

<FAQCategoryGrid
  categories={categories}
  selectedCategory="all"
  onCategorySelect={(id) => console.log('Selected:', id)}
/>
```

### 3. FAQAccordion

```tsx
import { FAQAccordion } from '@/components/pages/FAQ';

const faqs = [
  {
    id: '1',
    question: 'How do I upload my CV?',
    answer: 'You can upload your CV by...',
    category: 'getting-started',
    tags: ['upload', 'CV'],
    priority: 'high',
    lastUpdated: '2024-01-15'
  }
];

<FAQAccordion
  faqs={faqs}
  searchQuery=""
  selectedCategory="all"
  onFeedback={(faqId, isHelpful) => {
    console.log(`FAQ ${faqId} feedback:`, isHelpful);
  }}
/>
```

## Styling Customization

### Custom Themes

You can customize the FAQ components by overriding CSS variables:

```css
.custom-faq-theme {
  --primary-color: #10b981;
  --secondary-color: #3b82f6;
  --background-color: #1f2937;
  --surface-color: rgba(31, 41, 55, 0.5);
  --text-primary: #f3f4f6;
  --text-secondary: #d1d5db;
  --border-color: #374151;
}
```

### Component-Level Styling

```tsx
<FAQPage className="
  custom-spacing
  custom-colors
  custom-animations
" />
```

### Tailwind Overrides

```css
/* Custom FAQ button styles */
.faq-button {
  @apply px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600;
  @apply hover:from-emerald-700 hover:to-teal-700;
  @apply text-white font-semibold rounded-xl;
  @apply transition-all duration-200 hover:-translate-y-0.5;
}

/* Custom card styles */
.faq-card {
  @apply bg-slate-800/50 backdrop-blur-sm;
  @apply border border-slate-700 rounded-2xl;
  @apply hover:border-slate-600 hover:shadow-lg;
  @apply transition-all duration-300;
}
```

## API Integration

### Fetching FAQ Data

```tsx
import { useState, useEffect } from 'react';

const useFAQData = () => {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFAQData = async () => {
      try {
        setLoading(true);
        const [faqsRes, categoriesRes] = await Promise.all([
          fetch('/api/faqs').then(res => res.json()),
          fetch('/api/faq-categories').then(res => res.json())
        ]);
        
        setFaqs(faqsRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQData();
  }, []);

  return { faqs, categories, loading, error };
};
```

### Feedback Submission

```tsx
const handleFeedback = async (faqId: string, isHelpful: boolean) => {
  try {
    await fetch('/api/faq-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faqId, isHelpful, timestamp: Date.now() })
    });
    
    // Update local state or refetch data
    console.log('Feedback submitted successfully');
  } catch (error) {
    console.error('Feedback submission failed:', error);
  }
};
```

## Search Implementation

### Basic Search

```tsx
const useSearch = (faqs: FAQItem[], query: string, category: string) => {
  return useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = category === 'all' || faq.category === category;
      const matchesQuery = !query || 
        faq.question.toLowerCase().includes(query.toLowerCase()) ||
        faq.answer.toLowerCase().includes(query.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      return matchesCategory && matchesQuery;
    });
  }, [faqs, query, category]);
};
```

### Advanced Search with Debouncing

```tsx
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

const useAdvancedSearch = (faqs: FAQItem[]) => {
  const [searchState, setSearchState] = useState({
    query: '',
    category: 'all',
    tags: [],
    results: faqs
  });

  const debouncedSearch = useCallback(
    debounce((query: string, category: string, tags: string[]) => {
      const filtered = faqs.filter(faq => {
        const matchesCategory = category === 'all' || faq.category === category;
        const matchesTags = tags.length === 0 || 
          tags.some(tag => faq.tags.includes(tag));
        const matchesQuery = !query || 
          faq.question.toLowerCase().includes(query.toLowerCase()) ||
          faq.answer.toLowerCase().includes(query.toLowerCase());
        
        return matchesCategory && matchesTags && matchesQuery;
      });

      setSearchState(prev => ({ ...prev, results: filtered }));
    }, 300),
    [faqs]
  );

  const updateSearch = (updates: Partial<typeof searchState>) => {
    const newState = { ...searchState, ...updates };
    setSearchState(newState);
    debouncedSearch(newState.query, newState.category, newState.tags);
  };

  return { searchState, updateSearch };
};
```

## Accessibility Implementation

### ARIA Labels and Roles

```tsx
// Search input with proper ARIA
<input
  type="text"
  role="combobox"
  aria-label="Search FAQ"
  aria-expanded={showSuggestions}
  aria-haspopup="listbox"
  aria-controls="search-suggestions"
  aria-describedby="search-help"
/>

// FAQ accordion with proper ARIA
<button
  aria-expanded={isOpen}
  aria-controls={`faq-content-${faq.id}`}
  aria-describedby={`faq-question-${faq.id}`}
>
  {faq.question}
</button>

<div
  id={`faq-content-${faq.id}`}
  role="region"
  aria-labelledby={`faq-question-${faq.id}`}
  hidden={!isOpen}
>
  {faq.answer}
</div>
```

### Keyboard Navigation

```tsx
const useKeyboardNavigation = (items: any[], onSelect: (item: any) => void) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0) {
          e.preventDefault();
          onSelect(items[focusedIndex]);
        }
        break;
      
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  };

  return { focusedIndex, handleKeyDown };
};
```

## Mobile Optimization

### Touch-Friendly Design

```tsx
// Minimum touch target size (44px)
const TouchButton = ({ children, ...props }) => (
  <button
    className="min-h-[44px] min-w-[44px] flex items-center justify-center"
    {...props}
  >
    {children}
  </button>
);

// Mobile-optimized search
const MobileSearch = () => (
  <div className="relative w-full">
    <input
      type="search"
      inputMode="search"
      className="w-full h-14 px-4 text-lg rounded-2xl"
      placeholder="Search..."
    />
    <button className="absolute right-2 top-2 w-10 h-10 rounded-xl">
      <Search className="w-5 h-5" />
    </button>
  </div>
);
```

### Responsive Layout

```tsx
// Mobile-first responsive grid
<div className="
  grid gap-4
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4
">
  {categories.map(category => (
    <CategoryCard key={category.id} {...category} />
  ))}
</div>

// Responsive typography
<h1 className="
  text-2xl sm:text-3xl lg:text-4xl
  font-bold text-center
  mb-4 sm:mb-6 lg:mb-8
">
  FAQ Title
</h1>
```

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const LazyFAQPage = lazy(() => import('@/components/pages/FAQ'));

const App = () => (
  <Suspense fallback={<div>Loading FAQ...</div>}>
    <LazyFAQPage />
  </Suspense>
);
```

### Virtualization for Large Lists

```tsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedFAQList = ({ faqs }) => (
  <List
    height={600}
    itemCount={faqs.length}
    itemSize={120}
    itemData={faqs}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <FAQItem faq={data[index]} />
      </div>
    )}
  </List>
);
```

### Memoization

```tsx
const MemoizedFAQAccordion = React.memo(FAQAccordion, (prevProps, nextProps) => {
  return (
    prevProps.faqs === nextProps.faqs &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory
  );
});
```

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQSearchBar } from '@/components/pages/FAQ';

describe('FAQSearchBar', () => {
  const mockOnQueryChange = jest.fn();

  beforeEach(() => {
    mockOnQueryChange.mockClear();
  });

  test('renders search input', () => {
    render(
      <FAQSearchBar
        query=""
        onQueryChange={mockOnQueryChange}
      />
    );

    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
  });

  test('calls onQueryChange when typing', () => {
    render(
      <FAQSearchBar
        query=""
        onQueryChange={mockOnQueryChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(mockOnQueryChange).toHaveBeenCalledWith('test query');
  });

  test('shows suggestions when focused', () => {
    render(
      <FAQSearchBar
        query=""
        onQueryChange={mockOnQueryChange}
        suggestions={['suggestion 1', 'suggestion 2']}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
```

### Integration Tests

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FAQPage } from '@/components/pages/FAQ';

describe('FAQ Page Integration', () => {
  test('filters FAQs when category is selected', async () => {
    render(<FAQPage />);

    // Click on a category
    const categoryButton = screen.getByText('Getting Started');
    fireEvent.click(categoryButton);

    // Wait for filtered results
    await waitFor(() => {
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    });

    // Verify only relevant FAQs are shown
    const faqItems = screen.getAllByRole('button', { name: /toggle faq/i });
    expect(faqItems.length).toBeGreaterThan(0);
  });

  test('search functionality works end-to-end', async () => {
    render(<FAQPage />);

    const searchInput = screen.getByRole('combobox');
    fireEvent.change(searchInput, { target: { value: 'upload' } });

    await waitFor(() => {
      expect(screen.getByText(/upload/i)).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Search not working**: Ensure debounce is properly implemented
2. **Animations stuttering**: Check for unnecessary re-renders
3. **Mobile layout broken**: Verify responsive classes are applied
4. **Accessibility warnings**: Add missing ARIA labels and roles

### Debug Tools

```tsx
// Debug search state
const DebugSearch = ({ searchState }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded">
      <pre>{JSON.stringify(searchState, null, 2)}</pre>
    </div>
  );
};

// Performance monitoring
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`${componentName} render time: ${endTime - startTime}ms`);
    };
  });
};
```

---

This implementation guide provides everything needed to successfully integrate and customize the FAQ page components in your CVPlus application.