# Visualization Microservice

Enterprise fraud detection visualization microservice providing comprehensive data visualization components for the Olorin platform.

**Feature**: 002-visualization-microservice
**Version**: 1.0.0
**Status**: Production Ready

## Features

### Risk Visualization
- **RiskGauge**: Circular gauge with severity color coding (0-100 scale)
- **RiskTimeline**: Historical risk score trends over time
- **RiskDistribution**: Score distribution across investigations

### Network Visualization (D3.js)
- **NetworkDiagram**: Force-directed graph with collision detection
- **ConnectionMatrix**: Heatmap-style relationship visualization

### Geographic Visualization (Google Maps)
- **LocationMap**: Interactive maps with markers and info windows
- **LocationCluster**: Automatic marker clustering for dense data
- **HeatMap**: Geographic density visualization

### Timeline Visualization
- **Timeline**: Virtualized event timeline with infinite scroll
- **EventCard**: Interactive event detail cards with severity badges

### Real-Time Monitoring
- **EKGMonitor**: Live heartbeat visualization for agent activity
- **TPSSparkline**: Transactions per second sparkline chart
- **RadarVisualization**: Rotating radar with anomaly detection

### Chart Builder (Chart.js)
- **BarChart**: Vertical/horizontal bar charts with Olorin theme
- **LineChart**: Time series and multi-dataset line charts
- **PieChart**: Percentage-based pie charts with custom legends
- **ScatterChart**: X/Y coordinate scatter plots
- **DashboardGrid**: CSS Grid-based dashboard layouts

## Installation

```bash
npm install chart.js react-chartjs-2 d3 @react-google-maps/api react-window
```

## Quick Start

### Basic Usage

```tsx
import {
  RiskGauge,
  NetworkDiagram,
  Timeline,
  BarChart,
  VisualizationErrorBoundary
} from '@microservices/visualization';

function InvestigationDashboard() {
  return (
    <VisualizationErrorBoundary>
      <RiskGauge score={75} severity="high" />
      <NetworkDiagram investigationId="inv-123" />
      <Timeline investigationId="inv-123" />
    </VisualizationErrorBoundary>
  );
}
```

### Lazy Loading (Recommended)

```tsx
import {
  LazyRiskGauge,
  LazyNetworkDiagram,
  preloadCriticalComponents
} from '@microservices/visualization/config/lazyLoading';

// Preload on route change
useEffect(() => {
  preloadCriticalComponents();
}, []);

function Dashboard() {
  return (
    <>
      <LazyRiskGauge score={85} severity="critical" />
      <LazyNetworkDiagram investigationId="inv-456" />
    </>
  );
}
```

## Component Examples

### Risk Gauge
```tsx
<RiskGauge
  score={75}
  severity="high"
  size={200}
  showLabel={true}
  className="my-custom-class"
/>
```

### Network Diagram
```tsx
<NetworkDiagram
  investigationId="inv-123"
  nodes={nodes}
  edges={edges}
  onNodeClick={(node) => console.log(node)}
  width={800}
  height={600}
/>
```

### Chart Builder
```tsx
const chartConfig: ChartConfig = {
  id: 'risk-trends',
  type: 'line',
  title: 'Risk Score Trends',
  datasets: [{
    label: 'Risk Score',
    data: [
      { x: '2025-01', y: 45 },
      { x: '2025-02', y: 62 },
      { x: '2025-03', y: 78 }
    ]
  }]
};

<LineChart config={chartConfig} />
```

## Configuration

### Olorin Theme Colors
All components use the Olorin corporate color palette:
- Primary: `#FF6600` (Orange)
- Secondary: `#06B6D4` (Cyan)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)

### Chart Theme Context
```tsx
import { ChartThemeProvider, useChartTheme } from '@microservices/visualization';

function App() {
  return (
    <ChartThemeProvider customTheme={{ accentColors: ['#FF6600', '#06B6D4'] }}>
      <Dashboard />
    </ChartThemeProvider>
  );
}
```

## Performance Optimization

### Bundle Splitting
The microservice implements automatic code splitting for heavy dependencies:
- **D3.js**: Lazy loaded for network/radar visualizations
- **Chart.js**: Lazy loaded for chart components
- **Google Maps**: Lazy loaded for geographic components

### Preloading Strategies
```tsx
import {
  preloadCriticalComponents,
  preloadChartComponents,
  preloadMonitoringComponents
} from '@microservices/visualization/config/lazyLoading';

// Preload on user interaction
onMouseEnter={() => preloadChartComponents()}
```

## API Reference

### Component Props

**RiskGauge**
- `score: number` (0-100)
- `severity: 'low' | 'medium' | 'high' | 'critical'`
- `size?: number` (default: 150)
- `showLabel?: boolean` (default: true)

**NetworkDiagram**
- `investigationId: string`
- `nodes: NetworkNode[]`
- `edges: NetworkEdge[]`
- `onNodeClick?: (node) => void`
- `width?: number` (default: 800)
- `height?: number` (default: 600)

**Timeline**
- `investigationId: string`
- `events: Event[]`
- `onEventClick?: (event) => void`
- `virtualization?: boolean` (default: true)

## Troubleshooting

**Q: Chart.js not rendering**
A: Ensure Chart.js is registered: `import { Chart } from 'chart.js'; Chart.register(...registerables);`

**Q: Google Maps not loading**
A: Verify `REACT_APP_GOOGLE_MAPS_API_KEY` is set in environment variables

**Q: D3 force simulation performance issues**
A: Reduce node count or increase collision radius for better performance

## Architecture

All components follow SYSTEM MANDATE compliance:
- ✅ No hardcoded values (configuration-driven)
- ✅ No mocks/stubs in production code
- ✅ All files under 200 lines
- ✅ TypeScript with comprehensive types
- ✅ Accessibility (ARIA labels, semantic HTML)
- ✅ Error boundaries for graceful failure handling

## Contributing

When adding new visualization components:
1. Keep files under 200 lines
2. Use Olorin corporate colors from `chart.types.ts`
3. Add TypeScript interfaces to appropriate type files
4. Include accessibility attributes (ARIA, semantic HTML)
5. Add lazy loading export to `config/lazyLoading.tsx`
6. Update barrel exports in `index.ts`
7. Add usage examples to this README

## License

Proprietary - Olorin Enterprise Fraud Detection Platform
