# RAG UI Components

This directory contains React TypeScript components for displaying RAG (Retrieval-Augmented Generation) enhancement indicators in the Olorin fraud detection platform.

## Components

### RAGStatusIndicator
Displays real-time RAG enhancement status with visual indicators.
- Shows current RAG processing state (idle, retrieving, augmenting, recommending, enhancing)
- Displays confidence scores with color-coded indicators
- Includes current operation details
- Provides toggle for detailed insights

### RAGPerformanceMetrics
Displays performance metrics for RAG operations.
- Shows total queries, average retrieval time, hit rates
- Real-time updates with live indicators
- Compact and full display modes
- Color-coded performance status

### RAGKnowledgePanel
Displays knowledge sources and attribution information.
- Lists active knowledge sources with type icons
- Shows confidence and relevance scores
- Expandable source details
- Context size and retrieval time information

### RAGEnhancementSection
Comprehensive RAG display combining all components.
- Status indicator, metrics, and knowledge panel
- Collapsible sections for space management
- Integration with WebSocket events
- Insights summary display

## Usage

```typescript
import { RAGStatusIndicator, RAGPerformanceMetrics, RAGKnowledgePanel } from './rag';

// Basic status indicator
<RAGStatusIndicator
  isRAGEnabled={true}
  processingState="retrieving"
  confidence={0.85}
  currentOperation="Fetching fraud patterns"
/>

// Performance metrics
<RAGPerformanceMetrics
  metrics={{
    total_queries: 10,
    avg_retrieval_time: 185,
    knowledge_hit_rate: 0.87,
    enhancement_success_rate: 0.94,
    total_knowledge_chunks: 25,
    active_sources: ['patterns.md', 'rules.json'],
  }}
  realTime={true}
/>
```

## Design Principles

- **Accessibility**: All components include proper ARIA labels and semantic HTML
- **Performance**: Optimized for real-time updates with minimal re-renders
- **Responsive**: Mobile-first design with Tailwind CSS
- **Modular**: Each component <200 lines, focused responsibility
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## Integration

Components are integrated into:
- Autonomous Investigation Panel (RAG enhancement overlay)
- Agent Log Sidebar (RAG status section)
- Investigation Page (WebSocket event handling)

## WebSocket Events

RAG components respond to these WebSocket event types:
- `rag_knowledge_retrieved`: Knowledge source retrieval
- `rag_context_augmented`: Context enhancement
- `rag_tool_recommended`: Tool recommendation
- `rag_result_enhanced`: Result augmentation
- `rag_performance_metrics`: Performance updates

## Testing

Components include comprehensive test coverage:
- Unit tests for individual component behavior
- Integration tests for WebSocket event handling
- Mock implementations for development and testing

## Styling

All components use Tailwind CSS with consistent:
- Color scheme (indigo/purple gradients for RAG elements)
- Typography (proper hierarchy and contrast)
- Spacing (consistent padding/margins)
- Animations (smooth transitions and loading states)
