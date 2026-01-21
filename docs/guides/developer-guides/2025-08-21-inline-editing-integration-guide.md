# Inline Placeholder Editing System - Integration Guide

## Overview

The Inline Placeholder Editing System transforms static placeholders like `[INSERT TEAM SIZE]` into interactive, editable fields that users can click and modify directly within the CV preview. This system provides real-time validation, optimistic updates, and seamless integration with the existing CVPlus architecture.

## Key Features

- **Click-to-Edit**: Transform static placeholders into interactive components
- **Type-Specific Validation**: Automatic validation for numbers, currency, percentages, and text
- **Real-Time Updates**: Optimistic UI updates with debounced server synchronization
- **Progress Tracking**: Visual feedback on completion status
- **Accessibility**: Full keyboard navigation and screen reader support
- **Error Handling**: Comprehensive validation and error recovery

## Architecture Components

### 1. Core Components

#### `EditablePlaceholder`
- **Location**: `src/components/cv-preview/EditablePlaceholder.tsx`
- **Purpose**: Main component that renders placeholders as editable fields
- **Props**:
  - `placeholderKey`: The placeholder string (e.g., "[INSERT TEAM SIZE]")
  - `placeholderInfo`: Metadata about the placeholder (type, validation, etc.)
  - `content`: The full text content containing the placeholder
  - `onContentUpdate`: Callback when content is modified

#### `PlaceholderInput`
- **Location**: `src/components/cv-preview/PlaceholderInput.tsx`
- **Purpose**: Specialized input component with type-specific behavior
- **Features**: Auto-formatting, validation, keyboard shortcuts

### 2. Context Management

#### `PlaceholderEditingProvider`
- **Location**: `src/contexts/PlaceholderEditingContext.tsx`
- **Purpose**: Manages editing state across components
- **Features**:
  - Editing session management
  - Optimistic updates
  - Debounced saves (default: 500ms)
  - Error handling and retry logic

#### `usePlaceholderEditing`
- **Location**: `src/hooks/usePlaceholderEditing.ts`
- **Purpose**: Hook for accessing editing functionality
- **Methods**:
  - `startEditing(key)`: Begin editing a placeholder
  - `stopEditing()`: Save and finish editing
  - `updateValue(key, value)`: Update placeholder value
  - `cancelEditing()`: Cancel without saving
  - `getCompletionStatus(placeholders)`: Get progress information

### 3. Services

#### Extended `CVUpdateService`
- **Location**: `src/services/cvUpdateService.ts`
- **New Methods**:
  - `updatePlaceholder(payload)`: Update single placeholder
  - `updatePlaceholdersBatch(updates)`: Batch update multiple placeholders
  - `updatePlaceholderOptimistic(payload, callbacks)`: Update with optimistic UI

### 4. Type Definitions

#### Core Types
- **Location**: `src/types/inline-editing.ts`
- **Key Interfaces**:
  - `EditingState`: Current editing session state
  - `PlaceholderEditingContextValue`: Context interface
  - `PlaceholderUpdatePayload`: Server update payload
  - `ValidationResult`: Validation response

## Integration Steps

### Step 1: Wrap with Provider

```tsx
import { PlaceholderEditingProvider } from '../contexts/PlaceholderEditingContext';

function CVPreviewPage({ jobId }: { jobId: string }) {
  return (
    <PlaceholderEditingProvider 
      jobId={jobId}
      options={{
        saveDelay: 500,
        optimisticUpdates: true,
        immediateValidation: true
      }}
    >
      {/* Your CV content */}
    </PlaceholderEditingProvider>
  );
}
```

### Step 2: Replace Static Highlighting

**Before (static highlighting):**
```tsx
const highlightPlaceholders = (text: string): React.ReactNode[] => {
  return text.split(/(\[INSERT[^\]]*\])/).map((part, index) => 
    /\[INSERT[^\]]*\]/.test(part) ? (
      <span key={index} className="bg-yellow-200 px-1 py-0.5 rounded">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
};
```

**After (editable highlighting):**
```tsx
import { EditablePlaceholderWrapper } from '../utils/editablePlaceholderUtils';

function CVSection({ content, onContentUpdate }) {
  return (
    <EditablePlaceholderWrapper
      content={content}
      onContentUpdate={onContentUpdate}
      fallbackToStatic={true} // Graceful fallback
    />
  );
}
```

### Step 3: Handle Content Updates

```tsx
function CVExperience({ experience, onUpdate }) {
  const handleDescriptionUpdate = (newDescription: string) => {
    onUpdate({
      ...experience,
      description: newDescription
    });
  };

  return (
    <div>
      <h3>{experience.title}</h3>
      <EditablePlaceholderWrapper
        content={experience.description}
        onContentUpdate={handleDescriptionUpdate}
      />
    </div>
  );
}
```

### Step 4: Add Progress Tracking (Optional)

```tsx
import { usePlaceholderEditing } from '../hooks/usePlaceholderEditing';

function ProgressIndicator({ placeholders }) {
  const { getCompletionStatus } = usePlaceholderEditing();
  const status = getCompletionStatus(placeholders);
  
  return (
    <div className="progress-bar">
      <div className="text-sm text-gray-600">
        {status.completed}/{status.total} completed ({status.completionPercentage}%)
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${status.completionPercentage}%` }}
        />
      </div>
    </div>
  );
}
```

## Placeholder Type System

### Supported Types

1. **`number`**: Numeric values with comma formatting
   - Example: `[INSERT TEAM SIZE]` → "8" → "8,000"
   - Validation: Only digits and commas allowed

2. **`currency`**: Monetary values with flexible formatting
   - Example: `[INSERT BUDGET]` → "$2.5M" or "100K"
   - Validation: Supports K, M, B suffixes and decimal points

3. **`percentage`**: Percentage values (0-100)
   - Example: `[INSERT PERCENTAGE]` → "25" (displays as "25%")
   - Validation: Must be between 0 and 100

4. **`text`**: General text input
   - Example: `[INSERT TECHNOLOGY]` → "React.js"
   - Validation: Length limits and custom regex support

5. **`timeframe`**: Time duration values
   - Example: `[INSERT TIMEFRAME]` → "6 months"
   - Validation: Flexible text format

### Custom Validation

```tsx
const customPlaceholder: PlaceholderInfo = {
  key: '[INSERT PHONE]',
  type: 'text',
  validation: /^\d{3}-\d{3}-\d{4}$/,
  example: '123-456-7890',
  label: 'Phone Number',
  helpText: 'Enter your phone number in XXX-XXX-XXXX format'
};
```

## Backend Integration

### Firebase Function

The system expects a Firebase Function called `updatePlaceholderValue`:

```typescript
// Expected function signature
export const updatePlaceholderValue = onCall(async (request) => {
  const { jobId, placeholderKey, value, section, field } = request.data;
  
  // Update logic here
  
  return {
    success: true,
    updatedContent: "Content with placeholder replaced",
    timestamp: new Date().toISOString()
  };
});
```

### Payload Structure

```typescript
interface PlaceholderUpdatePayload {
  jobId: string;           // CV job identifier
  placeholderKey: string;  // "[INSERT TEAM SIZE]"
  value: string;           // "8"
  section: string;         // "experience", "summary", etc.
  field: string;           // Specific field within section
}
```

## Error Handling

### Automatic Retry Logic

The system includes automatic retry logic for failed saves:

```tsx
<PlaceholderEditingProvider 
  jobId={jobId}
  options={{
    maxRetries: 3,           // Retry up to 3 times
    saveDelay: 500,          // Wait 500ms before saving
    optimisticUpdates: true  // Show changes immediately
  }}
>
```

### Error States

- **Validation Errors**: Shown immediately with red styling
- **Network Errors**: Automatic retry with exponential backoff
- **Server Errors**: Toast notifications with retry options

## Testing

### Unit Tests

```bash
npm test -- EditablePlaceholder
npm test -- PlaceholderEditingContext
npm test -- usePlaceholderEditing
```

### Test Coverage

- ✅ Component rendering and interaction
- ✅ Validation logic for all types
- ✅ Context state management
- ✅ Error handling and recovery
- ✅ Accessibility compliance
- ✅ Integration scenarios

## Performance Considerations

1. **Debounced Saves**: Prevents excessive API calls during rapid typing
2. **Optimistic Updates**: Immediate UI feedback without waiting for server
3. **Memoized Components**: Efficient re-rendering of placeholder components
4. **Lazy Loading**: Only load editing components when needed

## Migration Guide

### From Static to Editable

1. **Identify Components**: Find all uses of `highlightPlaceholders`
2. **Add Provider**: Wrap parent component with `PlaceholderEditingProvider`
3. **Replace Function**: Use `EditablePlaceholderWrapper` instead
4. **Add Handlers**: Implement content update callbacks
5. **Test Integration**: Verify all placeholders work correctly

### Backward Compatibility

The system includes a fallback mode for graceful degradation:

```tsx
<EditablePlaceholderWrapper
  content={content}
  onContentUpdate={onUpdate}
  fallbackToStatic={true} // Falls back to static highlighting if provider unavailable
/>
```

## Example Implementation

See `src/examples/InlineEditingIntegrationExample.tsx` for a complete working example.

## Troubleshooting

### Common Issues

1. **Provider Not Found**: Ensure component is wrapped in `PlaceholderEditingProvider`
2. **Validation Errors**: Check placeholder type definitions and validation rules
3. **Save Failures**: Verify Firebase function deployment and permissions
4. **TypeScript Errors**: Ensure all type definitions are properly imported

### Debug Mode

Enable debug logging:

```tsx
<PlaceholderEditingProvider 
  jobId={jobId}
  options={{ debug: true }}
>
```

This comprehensive system transforms the static placeholder experience into an interactive, user-friendly editing interface while maintaining full backward compatibility and robust error handling.