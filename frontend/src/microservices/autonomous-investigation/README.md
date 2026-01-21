# Hybrid Graph Investigation UI - Autonomous Investigation Microservice

## Overview

This microservice implements a sophisticated hybrid investigation interface with four distinct UI concepts, each tailored for different user personas and investigation workflows. The system features seamless concept switching with smooth transitions and comprehensive state management.

## UI Concepts

### 1. Power Grid Concept (`power-grid`)
- **Target Users**: Security Analysts
- **Metaphor**: Energy/Power Grid Control System
- **Key Features**:
  - Real-time energy flow visualization
  - Grid health monitoring with KPIs
  - Domain energy panels with flow indicators
  - Energy-themed color scheme (blue gradients)
  - Live status updates with animated indicators

### 2. Command Center Concept (`command-center`)
- **Target Users**: Investigation Managers
- **Metaphor**: Mission Control Operations Center
- **Key Features**:
  - Kanban board workflow management
  - Team member monitoring and assignment
  - System metrics dashboard
  - Investigation progress tracking
  - Green-themed color scheme for operational focus

### 3. Evidence Trail Concept (`evidence-trail`)
- **Target Users**: Compliance Officers
- **Metaphor**: Forensic Evidence Chain of Custody
- **Key Features**:
  - Timeline-first evidence visualization
  - Chain of custody tracking
  - Legal compliance indicators
  - Audit trail with detailed logs
  - Red-themed color scheme for critical attention

### 4. Network Explorer Concept (`network-explorer`)
- **Target Users**: SRE Teams
- **Metaphor**: Network Topology Explorer
- **Key Features**:
  - Advanced graph visualization
  - Multiple layout algorithms (force, hierarchical, circular, grid)
  - Cluster analysis and path finding
  - Network metrics overlay
  - Purple-themed color scheme for technical analysis

## Architecture

### Core Components

#### `HybridInvestigationApp`
Main orchestrator component that manages concept switching and provides:
- Lazy loading of concept components
- Transition animations and progress tracking
- Error boundaries for robust fallback handling
- Keyboard shortcut management (⌘1-4)
- Real-time concept indicators

#### `ConceptSwitcher`
Sophisticated navigation component featuring:
- Multiple layout modes (floating, horizontal, vertical, grid, dropdown)
- Transition progress visualization
- Usage analytics and recent concept tracking
- Keyboard navigation support
- Smooth hover effects and previews

#### Concept View Components
Each concept has its own dedicated view component:
- `PowerGridView` - Energy flow interface
- `CommandCenterView` - Mission control dashboard
- `EvidenceTrailView` - Timeline-based evidence tracking
- `NetworkExplorerView` - Advanced graph exploration

### State Management

#### Zustand Stores
The system uses four specialized Zustand stores:

1. **ConceptStore** (`conceptStore.ts`)
   - Active concept tracking
   - Transition state management
   - Concept-specific preferences
   - Usage analytics and history

2. **InvestigationStore** (`investigationStore.ts`)
   - Investigation data and metadata
   - Current investigation context
   - Investigation filtering and search

3. **GraphStore** (`graphStore.ts`)
   - Graph data and visualization state
   - Node/edge selection and filtering
   - Layout and rendering preferences

4. **UIStore** (`uiStore.ts`)
   - Panel visibility and layout
   - Modal states and notifications
   - Loading states and user preferences

### Shared Components

#### Core Visualization Components
- **GraphVisualization**: Advanced graph rendering with multiple engines
- **Timeline**: Virtualized timeline with filtering and search
- **EvidencePanel**: Interactive evidence browser with categorization
- **DomainCard**: Domain information cards with optional energy metrics

#### UI Components
- **LoadingSpinner**: Configurable loading indicators
- **ErrorAlert**: Comprehensive error display with retry options
- **StatusBadge**: Various status and risk level indicators
- **ResponsiveLayout**: Adaptive layout management

## Concept Switching System

### Transition Management
The concept switching system provides smooth transitions between different UI concepts:

1. **Transition Initiation**: User selects new concept via switcher or keyboard shortcut
2. **Progress Tracking**: Real-time progress bar with percentage completion
3. **State Preservation**: Concept-specific state is preserved during transitions
4. **Error Handling**: Robust error boundaries prevent concept loading failures
5. **Completion**: New concept is loaded with preserved context

### Keyboard Shortcuts
- **⌘1**: Switch to Power Grid Concept
- **⌘2**: Switch to Command Center Concept
- **⌘3**: Switch to Evidence Trail Concept
- **⌘4**: Switch to Network Explorer Concept

### Preview Mode
When enabled, hovering over concepts in the switcher provides preview functionality without full concept switching.

## Usage

### Basic Implementation
```tsx
import { HybridInvestigationApp } from './components';

function App() {
  return (
    <HybridInvestigationApp
      investigationId="inv-001"
      enablePreview={true}
      showConceptSwitcher={true}
      switcherLayout="floating"
    />
  );
}
```

### Custom Concept Switcher
```tsx
import { ConceptSwitcher } from './components/shared';

function CustomNavigation() {
  return (
    <ConceptSwitcher
      layout="horizontal"
      size="large"
      showDescriptions={true}
      showAnalytics={true}
      enablePreview={false}
    />
  );
}
```

### Store Integration
```tsx
import {
  useActiveConcept,
  useConceptActions,
  useTransitionState
} from './stores';

function ConceptAwareComponent() {
  const activeConcept = useActiveConcept();
  const { switchConcept } = useConceptActions();
  const { isTransitioning } = useTransitionState();

  return (
    <div>
      <p>Current concept: {activeConcept}</p>
      <button
        onClick={() => switchConcept('power-grid')}
        disabled={isTransitioning}
      >
        Switch to Power Grid
      </button>
    </div>
  );
}
```

## Performance Optimizations

### Lazy Loading
All concept components are lazy-loaded to improve initial bundle size and loading performance.

### Virtualization
Large datasets in Timeline and Evidence Panel components use react-window for optimal rendering performance.

### State Persistence
Critical state is persisted to localStorage to maintain user context across sessions.

### Memoization
Strategic use of React.memo, useMemo, and useCallback to prevent unnecessary re-renders.

## Development

### Adding New Concepts
1. Create new concept directory under `/concepts/`
2. Implement concept view component
3. Add concept configuration to `conceptStore.ts`
4. Update `HybridInvestigationApp` component routing
5. Add appropriate icons and styling

### Extending State Management
1. Define new state interfaces in appropriate store
2. Implement actions and selectors
3. Add persistence configuration if needed
4. Export new hooks from store index

### Testing Strategy
- Unit tests for individual components
- Integration tests for concept switching
- E2E tests for full user workflows
- Performance tests for large datasets

## File Structure

```
src/microservices/autonomous-investigation/
├── components/
│   ├── concepts/
│   │   ├── power-grid/PowerGridView.tsx
│   │   ├── command-center/CommandCenterView.tsx
│   │   ├── evidence-trail/EvidenceTrailView.tsx
│   │   └── network-explorer/NetworkExplorerView.tsx
│   ├── shared/
│   │   ├── ConceptSwitcher.tsx
│   │   ├── GraphVisualization.tsx
│   │   ├── Timeline.tsx
│   │   ├── EvidencePanel.tsx
│   │   └── index.ts
│   ├── HybridInvestigationApp.tsx
│   └── index.ts
├── stores/
│   ├── conceptStore.ts
│   ├── investigationStore.ts
│   ├── graphStore.ts
│   ├── uiStore.ts
│   └── index.ts
├── types/
│   └── [type definitions]
├── demo/
│   └── ConceptSwitchingDemo.tsx
└── README.md
```

## Contributing

When contributing to this microservice:

1. **Follow TypeScript patterns**: Use proper type definitions and interfaces
2. **Maintain under 200 lines**: Keep all component files under 200 lines for maintainability
3. **Use Tailwind CSS**: No custom CSS or external UI libraries
4. **Implement proper error handling**: Use error boundaries and fallback states
5. **Test concept switching**: Ensure smooth transitions between all concepts
6. **Document new features**: Update this README for any new functionality

## License

This code is part of the Olorin fraud detection and investigation platform.