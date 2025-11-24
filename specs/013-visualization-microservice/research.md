# Research & Technology Selection: Visualization Microservice

**Feature**: 002-visualization-microservice
**Date**: 2025-11-08
**Status**: Research Complete

## Executive Summary

This document consolidates research findings for building the Visualization Microservice. All technical decisions are based on analysis of the existing Olorin codebase (~6,000 lines of visualization code across 21 components) and industry best practices for high-performance data visualization in React applications.

**Key Decisions**:
- **Multi-library approach**: Use D3.js, Chart.js, vis-network, and Recharts for different visualization types
- **Rendering strategy**: Canvas for real-time animations (60 FPS), SVG for interactive components
- **State management**: React Context with Zustand for complex visualization state
- **Event bus**: Custom event bus singleton for microservice communication
- **Module Federation**: Webpack 5 for runtime component composition
- **Export strategy**: html2canvas for PNG, native SVG export, JSON serialization

---

## 1. Visualization Library Evaluation

### Decision: Multi-Library Approach

**Rationale**: Different visualization types have different optimal libraries. Using specialized libraries for each category provides best performance and developer experience.

| Library | Use Cases | Strengths | Limitations |
|---------|-----------|-----------|-------------|
| **D3.js 7.9.0** | Network graphs, custom visualizations, radar | Maximum flexibility, excellent performance, large community | Steeper learning curve, verbose API |
| **Chart.js 4.2.1** | Standard charts (line, bar, pie), gauges | Simple API, good performance, extensive chart types | Less flexible for custom visualizations |
| **vis-network 9.1.13** | Entity relationship graphs, network diagrams | Physics-based layouts, excellent for large graphs, interactive | Specific to network visualizations |
| **Recharts 3.2.1** | Responsive charts, sparklines, timeseries | React-native API, composable, responsive | Limited customization compared to D3 |

**Alternatives Considered**:
- **Recharts-only approach**: Rejected due to limitations with network graphs and custom visualizations
- **D3.js-only approach**: Rejected due to verbosity for simple charts and learning curve
- **Victory.js**: Rejected due to performance issues with large datasets
- **Apache ECharts**: Rejected due to bundle size concerns

**Implementation Strategy**:
```typescript
// Component-level library selection
Risk Gauges → Chart.js (circular gauges)
Network Graphs → vis-network (physics-based layouts)
Timeline → Recharts (responsive timeseries)
Custom Visualizations (EKG, Radar) → D3.js (maximum control)
Standard Charts → Chart.js (15 chart types via Chart Builder)
Maps → Google Maps API (existing integration)
```

---

## 2. Performance Optimization for 60 FPS

### Decision: Canvas for Real-Time, SVG for Interactive

**Rationale**: Canvas provides superior performance for high-frequency updates (60 FPS requirement), while SVG enables easier interactivity for user-controlled visualizations.

### 2.1 Canvas Rendering Strategy

**Use For**:
- EKG Monitor (continuous waveform updates)
- Radar Visualization (rotating needle, scanning ray)
- Real-time sparklines (TPS indicator)

**Implementation Pattern**:
```typescript
// Hardware-accelerated rendering
const useCanvasRenderer = (fps: number = 60) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const frameDuration = 1000 / fps;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime.current;

      if (elapsed >= frameDuration) {
        // Render frame
        renderVisualization(ctx);
        lastFrameTime.current = currentTime;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fps]);

  return canvasRef;
};
```

**Performance Optimizations**:
- Pre-render static elements (grids, backgrounds) to off-screen canvas
- Use `{ alpha: false }` context option for performance
- Implement frame skipping if browser can't maintain 60 FPS
- Use `requestAnimationFrame` for smooth animations

### 2.2 SVG Rendering Strategy

**Use For**:
- Risk Gauges (user can select gauge type)
- Network Graphs (user can zoom, pan, select nodes)
- Timeline (user can expand events, filter)
- Maps (user can click markers, zoom regions)

**Performance Optimizations**:
- Virtualization for large lists (timeline with 10,000+ events)
- Memoization with React.memo for expensive components
- Lazy loading for off-screen visualizations
- Debounced resize handlers

---

## 3. Event Bus Pattern for Microservices

### Decision: Custom Event Bus Singleton

**Rationale**: Provides type-safe, decoupled communication between microservices without adding external dependencies.

**Implementation**:
```typescript
// src/shared/events/EventBus.ts
type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private static instance: EventBus;
  private events: Map<string, Set<EventCallback>>;

  private constructor() {
    this.events = new Map();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }

  publish<T>(event: string, data: T): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const eventBus = EventBus.getInstance();
```

**Event Naming Convention**:
```typescript
// Pattern: {source-service}:{entity}:{action}
investigation:risk-updated
investigation:entity-discovered
visualization:node-selected
visualization:location-clicked
agent-analytics:tool-executed
```

**Alternatives Considered**:
- **Redux**: Rejected due to complexity and coupling concerns
- **RxJS**: Rejected due to bundle size and learning curve
- **Custom event emitters per service**: Rejected due to lack of type safety

---

## 4. Module Federation Configuration

### Decision: Webpack 5 Module Federation with Shared Dependencies

**Rationale**: Enables runtime composition of visualization components while avoiding duplicate dependencies.

**Configuration Strategy**:
```javascript
// webpack.visualization.config.js
module.exports = {
  name: 'visualization',
  filename: 'remoteEntry.js',
  exposes: {
    './RiskGauge': './src/microservices/visualization/components/risk/RiskGauge',
    './NetworkGraph': './src/microservices/visualization/components/network/NetworkGraph',
    './LocationMap': './src/microservices/visualization/components/maps/LocationMap',
    './Timeline': './src/microservices/visualization/components/timeline/Timeline',
    './EKGMonitor': './src/microservices/visualization/components/monitoring/EKGMonitor',
    './ChartBuilder': './src/microservices/visualization/components/charts/ChartBuilder',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
    'd3': { singleton: true, requiredVersion: '^7.9.0' },
    'chart.js': { singleton: true, requiredVersion: '^4.2.1' },
    'vis-network': { singleton: true, requiredVersion: '^9.1.13' },
  },
};
```

**Best Practices**:
- Always use singleton for React and React-DOM
- Share visualization libraries to avoid duplication
- Version all shared dependencies
- Test federation in isolation before integration

---

## 5. Canvas vs SVG Decision Matrix

| Criterion | Canvas | SVG | Recommendation |
|-----------|--------|-----|----------------|
| **Performance (static)** | Slower | Faster | SVG for < 1000 elements |
| **Performance (animated)** | Faster | Slower | Canvas for 60 FPS animations |
| **Interactivity** | Manual hit testing | Native DOM events | SVG for user interactions |
| **Scalability** | Resolution-dependent | Resolution-independent | SVG for responsive layouts |
| **Accessibility** | Requires ARIA labels | Native DOM semantics | SVG for screen readers |
| **Export Quality** | Pixel-based | Vector-based | SVG for print quality |

**Decision Rules**:
```typescript
const selectRenderingTech = (visualization: VisualizationType) => {
  const rules = {
    // Real-time animations → Canvas
    'ekg-monitor': 'canvas',
    'radar': 'canvas',
    'live-sparkline': 'canvas',

    // User-interactive → SVG
    'risk-gauge': 'svg',
    'network-graph': 'svg',
    'timeline': 'svg',
    'map': 'google-maps-api',

    // Hybrid: Canvas background + SVG overlay
    'chart-builder': 'hybrid',
  };

  return rules[visualization] || 'svg'; // Default to SVG
};
```

---

## 6. Export Functionality Implementation

### Decision: Multi-Format Export with Specialized Libraries

**Format Support**:

| Format | Library | Use Case | Implementation |
|--------|---------|----------|----------------|
| **PNG** | html2canvas 1.4.1 | Screenshots, reports | Render DOM to canvas, export as PNG |
| **SVG** | Native SVG export | Print-quality, scaling | Serialize SVG DOM to file |
| **JSON** | Native JSON.stringify | Data exchange, backup | Export visualization state + data |

**PNG Export Implementation**:
```typescript
import html2canvas from 'html2canvas';

const exportToPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2, // Retina quality
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
```

**SVG Export Implementation**:
```typescript
const exportToSVG = (svgElement: SVGElement, filename: string) => {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });

  const link = document.createElement('a');
  link.download = `${filename}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
};
```

**JSON Export Implementation**:
```typescript
const exportToJSON = (data: VisualizationData, filename: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
};
```

---

## 7. State Management for Visualization Data

### Decision: React Context + Zustand for Complex State

**Rationale**: React Context for simple state, Zustand for complex visualization state with persistence.

**Architecture**:
```typescript
// Simple state → React Context
interface VisualizationContextValue {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  selection: SelectionState;
  setSelection: (selection: SelectionState) => void;
}

// Complex state → Zustand
interface VisualizationStore {
  // Network graph state
  networkData: NetworkData;
  networkLayout: LayoutType;
  networkPhysics: PhysicsSettings;
  updateNetworkData: (data: NetworkData) => void;

  // Map state
  mapCenter: Coordinates;
  mapZoom: number;
  mapMarkers: MarkerData[];
  updateMapView: (center: Coordinates, zoom: number) => void;

  // Timeline state
  timelineEvents: TimelineEvent[];
  timelineFilters: TimelineFilters;
  updateTimeline: (events: TimelineEvent[]) => void;

  // Persistence
  persist: () => void;
  restore: () => void;
}

const useVisualizationStore = create<VisualizationStore>(
  persist(
    (set, get) => ({
      // State and actions
    }),
    {
      name: 'visualization-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Best Practices**:
- Use Context for transient UI state (modals, tooltips)
- Use Zustand for persistent visualization state
- Implement selective persistence (don't persist temporary data)
- Use immer middleware for immutable updates

---

## 8. Testing Strategies for Visual Components

### Decision: Multi-Layer Testing Approach

**Test Pyramid**:

```
        /\
       /  \  E2E Tests (Playwright)
      /    \ - Full user flows
     /------\ - Visual regression
    /        \
   /  Integration Tests
  /   - Event bus communication
 /    - Component interaction
/------------------------\
Unit Tests (Jest + RTL)
- Component rendering
- Hook behavior
- Service logic
```

**Testing Patterns**:

#### Unit Tests (Jest + React Testing Library)
```typescript
describe('RiskGauge', () => {
  it('renders with correct risk level color', () => {
    const { getByRole } = render(<RiskGauge score={85} />);
    const gauge = getByRole('img', { name: /risk gauge/i });
    expect(gauge).toHaveAttribute('data-severity', 'critical');
  });

  it('updates in real-time when score changes', () => {
    const { rerender, getByRole } = render(<RiskGauge score={50} />);
    const gauge = getByRole('img', { name: /risk gauge/i });
    expect(gauge).toHaveAttribute('data-score', '50');

    rerender(<RiskGauge score={80} />);
    expect(gauge).toHaveAttribute('data-score', '80');
  });
});
```

#### Integration Tests (Event Bus)
```typescript
describe('Visualization Event Bus Integration', () => {
  it('responds to investigation:risk-updated events', async () => {
    const { getByRole } = render(<RiskDashboard />);

    act(() => {
      eventBus.publish('investigation:risk-updated', {
        agentId: 'device-agent',
        riskScore: 75,
      });
    });

    await waitFor(() => {
      const gauge = getByRole('img', { name: /device agent risk/i });
      expect(gauge).toHaveAttribute('data-score', '75');
    });
  });
});
```

#### Visual Regression Tests (Playwright)
```typescript
test('risk gauge renders correctly at different scores', async ({ page }) => {
  await page.goto('http://localhost:3004/risk-gauge-test');

  // Test multiple risk levels
  for (const score of [25, 50, 75, 95]) {
    await page.fill('[data-testid="score-input"]', String(score));
    await expect(page.locator('[data-testid="risk-gauge"]'))
      .toHaveScreenshot(`risk-gauge-${score}.png`);
  }
});
```

**Performance Testing**:
```typescript
describe('Network Graph Performance', () => {
  it('maintains 30 FPS with 1000 nodes', async () => {
    const fps = await measureFPS(
      <NetworkGraph nodes={generate1000Nodes()} />
    );
    expect(fps).toBeGreaterThanOrEqual(30);
  });

  it('loads within 2 seconds', async () => {
    const startTime = performance.now();
    render(<NetworkGraph nodes={generate100Nodes()} />);
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });
});
```

---

## 9. Accessibility Requirements

### Decision: WCAG 2.1 AA Compliance

**Requirements**:

1. **Keyboard Navigation**: All visualizations must be keyboard accessible
   - Tab through interactive elements
   - Arrow keys for navigation within visualizations
   - Escape to close modals/tooltips
   - Enter/Space to activate controls

2. **Screen Reader Support**: Provide meaningful descriptions
   ```typescript
   <svg role="img" aria-label="Risk assessment gauge showing 75% risk level">
     <title>Risk Assessment Gauge</title>
     <desc>Current risk level is 75 out of 100, classified as high risk</desc>
     {/* Gauge elements */}
   </svg>
   ```

3. **Color Contrast**: Ensure sufficient contrast for all text and indicators
   - Risk levels use both color AND pattern (not color alone)
   - Text contrast ratio ≥ 4.5:1
   - Interactive elements have focus indicators

4. **Alternative Text**: Provide data tables for complex visualizations
   ```typescript
   <NetworkGraph data={networkData} />
   <details>
     <summary>View network data as table</summary>
     <table>
       {/* Tabular representation of network */}
     </table>
   </details>
   ```

5. **Reduced Motion**: Respect `prefers-reduced-motion`
   ```typescript
   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
   const animationDuration = prefersReducedMotion ? 0 : 300;
   ```

---

## 10. Olorin Corporate Color Palette

### Decision: Tailwind CSS Custom Theme

**Implementation**:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        corporate: {
          // Backgrounds (Dark Theme)
          bgPrimary: '#0B1221',
          bgSecondary: '#1A2332',
          bgTertiary: '#242E3E',

          // Accent Colors
          accentPrimary: '#FF6600',        // Orange
          accentPrimaryHover: '#E55A00',
          accentSecondary: '#06B6D4',      // Cyan
          accentSecondaryHover: '#0891B2',

          // Status Colors
          success: '#10B981',   // Green
          warning: '#F59E0B',   // Amber
          error: '#EF4444',     // Red
          info: '#3B82F6',      // Blue

          // Risk Level Colors
          critical: '#DC2626',  // 80-100 score
          high: '#EF4444',      // 60-79 score
          medium: '#F59E0B',    // 40-59 score
          low: '#10B981',       // 0-39 score

          // Text Colors
          textPrimary: '#F9FAFB',
          textSecondary: '#D1D5DB',
          textTertiary: '#9CA3AF',
          textDisabled: '#6B7280',

          // Border Colors
          borderPrimary: '#374151',
          borderSecondary: '#4B5563',
          borderAccent: '#FF6600',
        },
      },
    },
  },
};
```

**Usage Pattern**:
```typescript
// Risk gauge color selection
const getRiskColor = (score: number) => {
  if (score >= 80) return 'text-corporate-critical';
  if (score >= 60) return 'text-corporate-high';
  if (score >= 40) return 'text-corporate-medium';
  return 'text-corporate-low';
};

// Consistent styling across all visualizations
<div className="bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg">
  <h3 className="text-lg font-semibold text-corporate-textPrimary">
    Risk Assessment
  </h3>
</div>
```

---

## Research Status: ✅ COMPLETE

All technical decisions documented and justified. Ready for Phase 1 design and implementation.

**Key Takeaways**:
1. Use specialized libraries for different visualization types
2. Canvas for real-time (60 FPS), SVG for interactive
3. Custom event bus for microservice communication
4. Module Federation for component sharing
5. Multi-layer testing strategy (unit, integration, visual regression, performance)
6. WCAG 2.1 AA accessibility compliance
7. Configuration-driven with Tailwind CSS corporate theme

**Next Steps**: Proceed to data model design and contract definition in Phase 1.
