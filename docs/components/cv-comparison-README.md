# CV Before/After Comparison View

This module provides a comprehensive Before/After CV comparison view that shows the original CV content alongside the improved version with highlighted changes.

## Features

### 🔄 **Comparison Modes**
- **Single View**: Default CV preview
- **Comparison View**: Side-by-side before/after with highlighted changes
- **Mobile View**: Touch-optimized comparison with swipeable sections

### 📱 **Responsive Design**
- Desktop: Side-by-side comparison layout
- Mobile: Stacked view with swipeable sections and toggle buttons
- Automatic responsive behavior based on screen size

### 🎯 **Change Highlighting**
- **Green highlighting**: Added content
- **Red highlighting**: Removed content (with strikethrough)
- **Unchanged**: Normal text styling
- Visual indicators for improvement impact

### 🔍 **Interactive Features**
- Toggle between single and comparison views
- Expand/collapse individual sections
- Filter to show only changed sections
- Section-by-section navigation on mobile
- Improvement statistics and summaries

## Usage

### Basic Implementation

```tsx
import { CVComparisonView } from '@/components/cv-comparison';

function MyComponent() {
  return (
    <CVComparisonView
      originalData={job.parsedData}
      improvedData={appliedImprovements}
    >
      {/* Your existing CV preview content */}
      <CVPreviewContent {...props} />
    </CVComparisonView>
  );
}
```

### Integration with Existing CV Preview

The comparison view wraps your existing CV preview component and automatically detects when improvements are available:

```tsx
// In CVPreview.tsx - already integrated
const hasComparison = useHasComparison(job.parsedData, appliedImprovements);

return (
  <div className="cv-preview-wrapper">
    {hasComparison ? (
      <CVComparisonView originalData={job.parsedData} improvedData={appliedImprovements}>
        {previewContent}
      </CVComparisonView>
    ) : (
      previewContent
    )}
  </div>
);
```

## Components

### CVComparisonView
Main comparison wrapper component.

**Props:**
- `originalData`: Original CV data
- `improvedData`: Improved CV data (can be null)
- `children`: CV preview content to display
- `className?`: Additional CSS classes

### DiffRenderer
Renders text differences with appropriate styling.

**Props:**
- `changes`: Array of diff changes
- `showInline?`: Whether to show changes inline or as blocks
- `className?`: Additional CSS classes

### SideBySideDiff
Desktop comparison with before/after panels.

**Props:**
- `beforeContent`: Original content
- `afterContent`: Improved content
- `changes`: Diff changes array
- `sectionName`: Display name for the section

### MobileComparisonView
Mobile-optimized comparison interface.

**Props:**
- `sections`: Array of section comparisons
- `className?`: Additional CSS classes

## Hooks

### useCVComparison
Main hook for comparison state management.

```tsx
const { state, actions } = useCVComparison(originalData, improvedData);

// State
state.viewMode         // 'single' | 'comparison'
state.comparison       // Comparison data
state.stats           // Improvement statistics
state.selectedSection // Currently selected section
state.showOnlyChanged // Filter toggle state

// Actions
actions.setViewMode(mode)
actions.setSelectedSection(section)
actions.toggleShowOnlyChanged()
actions.refreshComparison()
```

### useHasComparison
Utility hook to check if comparison is available.

```tsx
const hasComparison = useHasComparison(originalData, improvedData);
```

### useFilteredSections
Filter sections based on user preferences.

```tsx
const filteredSections = useFilteredSections(comparison, showOnlyChanged);
```

## Utilities

### Diff Utils

**compareCV(originalData, improvedData)**
Generates section-by-section comparison data.

**extractSectionText(data, sectionKey)**
Extracts comparable text from CV sections.

**createTextDiff(before, after)**
Creates word-level text differences.

**getSectionDisplayName(sectionKey)**
Converts internal section names to display names.

**calculateImprovementStats(comparison)**
Generates improvement statistics.

## Data Flow

1. **Input**: Original CV data + Applied improvements
2. **Processing**: Generate section comparisons using diff algorithms
3. **Rendering**: Display with appropriate highlighting and controls
4. **Interaction**: User can toggle views, expand sections, filter changes

## Styling

The components use Tailwind CSS with semantic color coding:

- **Green** (`bg-green-50`, `text-green-800`): Added content
- **Red** (`bg-red-50`, `text-red-800`): Removed content
- **Blue** (`bg-blue-50`, `text-blue-700`): UI controls and highlights
- **Gray** (`bg-gray-50`, `text-gray-600`): Unchanged content and backgrounds

## Mobile Experience

On mobile devices (< 1024px width):
- Automatic detection and mobile layout activation
- Floating comparison toggle button
- Swipeable section navigation
- Simplified view mode controls
- Touch-optimized interaction targets

## Performance Considerations

- **Lazy Comparison**: Comparisons are only generated when needed
- **Memoized Calculations**: Heavy diff operations are memoized
- **Progressive Enhancement**: Basic functionality works without JS
- **Efficient Rendering**: Only changed sections re-render on updates

## Error Handling

- Graceful handling of null/undefined data
- Fallback content for empty sections
- Error boundaries for diff generation failures
- User-friendly error messages

## Testing

Comprehensive test suite covering:
- Component rendering and interactions
- Diff algorithm accuracy
- Mobile responsive behavior
- Edge cases and error handling
- Performance characteristics

Run tests:
```bash
npm test cv-comparison
```

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast color choices
- Focus management

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Future Enhancements

- **Export Comparison**: PDF/image export of before/after
- **Animated Transitions**: Smooth transitions between states
- **Custom Highlighting**: User-configurable color schemes
- **Comparison History**: Track multiple improvement iterations
- **AI Insights**: Smart suggestions based on changes