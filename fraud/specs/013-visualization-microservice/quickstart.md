# Quick Start Guide: Visualization Microservice

**Last Updated**: 2025-11-08
**Branch**: `002-visualization-microservice`
**Service Port**: 3004
**Status**: Planning Phase

## Overview

This guide will help you set up and run the Olorin Visualization Microservice locally. The service provides comprehensive data visualization capabilities including risk gauges, network graphs, geographic maps, timelines, real-time monitoring, and an interactive chart builder.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control
- **Google Maps API Key**: Required for map visualizations ([Get API Key](https://developers.google.com/maps/documentation/javascript/get-api-key))

**Optional but Recommended**:
- VS Code with TypeScript and ESLint extensions
- Chrome/Firefox DevTools for debugging
- React Developer Tools browser extension

## Installation

### 1. Clone the Repository

```bash
cd /Users/gklainert/Documents/olorin/olorin-front
git checkout 002-visualization-microservice
```

### 2. Install Dependencies

```bash
# From the olorin-front directory
npm install
```

This will install all required dependencies including:
- React 18.2
- TypeScript 5.x
- D3.js, Chart.js, vis-network, Recharts
- Webpack 5 Module Federation
- Tailwind CSS
- Zod for schema validation

### 3. Configure Environment Variables

Create a `.env.local` file in the `olorin-front` directory:

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# ============================================================================
# VISUALIZATION SERVICE CONFIGURATION
# ============================================================================

# Service Configuration
APP_ENV=development
VISUALIZATION_PORT=3004
VISUALIZATION_HOST=localhost
VISUALIZATION_BASE_URL=http://localhost:3004
VISUALIZATION_CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3005,http://localhost:3006

# Google Maps (REQUIRED)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# Event Bus Configuration
EVENT_BUS_TYPE=local
EVENT_BUS_MAX_QUEUE_SIZE=1000
EVENT_BUS_PROCESSING_TIMEOUT_MS=5000

# Performance Settings
VISUALIZATION_TARGET_FPS=60
VISUALIZATION_MAX_NETWORK_NODES=1000
VISUALIZATION_MAX_MAP_MARKERS=500
VISUALIZATION_MAX_TIMELINE_EVENTS=1000

# Feature Flags (all enabled by default)
FEATURE_RISK_GAUGES=true
FEATURE_NETWORK_GRAPHS=true
FEATURE_MAPS=true
FEATURE_TIMELINE=true
FEATURE_REALTIME_MONITORING=true
FEATURE_CHART_BUILDER=true
FEATURE_PNG_EXPORT=true
FEATURE_SVG_EXPORT=true
FEATURE_JSON_EXPORT=true
FEATURE_DASHBOARD=true
```

**⚠️ CRITICAL**: You MUST set a valid `GOOGLE_MAPS_API_KEY` or map visualizations will fail.

## Running the Service

### Development Mode

#### Option 1: Run Visualization Service Only

```bash
npm run dev:visualization
```

This starts the visualization microservice on port 3004. Access it at:
- http://localhost:3004

#### Option 2: Run All Microservices Together

```bash
npm run dev:all-services
```

This starts all Olorin microservices:
- Shell App: http://localhost:3000
- Investigation Service: http://localhost:3001
- Agent Analytics: http://localhost:3002
- RAG Intelligence: http://localhost:3003
- **Visualization Service**: http://localhost:3004
- Reporting Service: http://localhost:3005
- Core UI: http://localhost:3006

#### Option 3: Use Olorin Startup Script

```bash
# From the olorin root directory
npm run olorin -- --log-level debug
```

This starts all backend and frontend services with centralized logging.

### Verifying the Service is Running

Once started, you should see:

```
✅ Visualization service configuration loaded and validated successfully
   Environment: development
   Port: 3004
   Event Bus: local
   Features enabled: 10/10

🚀 Visualization microservice ready on http://localhost:3004
📊 Module Federation remote exposed: visualizationApp
```

## Configuration Details

### Required Environment Variables

These MUST be set for the service to start:

- `VISUALIZATION_BASE_URL` - Full service URL
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (for map visualizations)

### Optional Environment Variables

All other configuration has sensible defaults. See [contracts/config.ts](./contracts/config.ts) for the complete list.

### Fail-Fast Validation

The service uses Zod schema validation with fail-fast behavior. If any required configuration is missing or invalid:

1. Service will NOT start
2. Detailed error message will be logged to console
3. Missing/invalid configuration keys will be listed

Example validation error:

```
❌ Visualization service configuration validation failed:
{
  "googleMaps": {
    "apiKey": {
      "_errors": [
        "String must contain at least 1 character(s)"
      ]
    }
  }
}
Configuration validation failed. Check environment variables. Service will not start.
```

## Integration with Other Microservices

### Event Bus Communication

The visualization service communicates with other microservices via the event bus:

#### Events Consumed (from other services):

```typescript
// Investigation Service
'investigation:risk-updated'           // Risk score updates
'investigation:entity-discovered'      // Network node discoveries
'investigation:location-detected'      // Geographic location data
'investigation:progress-updated'       // Investigation progress
'investigation:completed'              // Investigation finished

// Agent Analytics Service
'agent:tool-execution-started'         // Tool execution tracking
'agent:tool-execution-completed'       // Tool completion
'agent:heartbeat'                      // Real-time EKG data
'agent:tps-updated'                    // Tools per second metrics

// Investigation Logs
'investigation:log-entry'              // Timeline events
```

#### Events Published (to other services):

```typescript
// Network Graph Interactions
'visualization:node-selected'          // User selected a node
'visualization:edge-selected'          // User selected an edge

// Map Interactions
'visualization:location-clicked'       // User clicked a marker
'visualization:map-view-changed'       // User moved/zoomed map

// Timeline Interactions
'visualization:timeline-event-expanded'  // User expanded event
'visualization:timeline-filtered'        // User applied filters

// Export Events
'visualization:export-started'         // Export initiated
'visualization:export-completed'       // Export finished

// Dashboard Events
'visualization:dashboard-view-changed' // Dashboard view switched
'visualization:chart-created'          // New chart created
```

### Module Federation Integration

The visualization service exposes its components via Webpack Module Federation:

```typescript
// In consuming microservice (e.g., Investigation Service)
import { RiskGauge } from 'visualizationApp/RiskGauge';
import { NetworkGraph } from 'visualizationApp/NetworkGraph';
import { LocationMap } from 'visualizationApp/LocationMap';

// Use components
<RiskGauge score={85} severity="high" />
<NetworkGraph investigationId="inv-123" nodes={nodes} edges={edges} />
<LocationMap investigationId="inv-123" markers={markers} />
```

### Service Dependencies

The visualization service is **independent** but integrates with:

- **Investigation Service** - Receives investigation data and state updates
- **Agent Analytics Service** - Receives agent performance metrics
- **Shell App** - Consumed by shell for routing and layout
- **Backend API** - Loads historical data for visualizations

## Testing

### Unit Tests

```bash
# Run all visualization service tests
npm run test:visualization

# Run with coverage
npm run test:visualization -- --coverage

# Run specific test file
npm run test -- src/microservices/visualization/components/risk/RiskGauge.test.tsx
```

### Integration Tests

```bash
# Run cross-service integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- visualization-event-bus
```

### Visual Regression Tests

```bash
# Run Playwright visual tests
npm run test:visual

# Update visual baselines
npm run test:visual -- --update-snapshots
```

## Building for Production

### Build the Visualization Service

```bash
# Build visualization microservice
npm run build:service visualization
```

This creates an optimized production build in `dist/visualization/` with:

- Minified JavaScript bundles
- Optimized CSS
- Module Federation manifests
- Source maps (for debugging)

### Build All Services

```bash
# Build all microservices
npm run build
```

### Production Configuration

Set production environment variables:

```env
APP_ENV=production
VISUALIZATION_BASE_URL=https://visualization.olorin.example.com
GOOGLE_MAPS_API_KEY=prod-google-maps-api-key
VISUALIZATION_DEBUG_LOGGING=false
VISUALIZATION_LOG_LEVEL=warn
EVENT_BUS_TYPE=redis
EVENT_BUS_REDIS_URL=redis://prod-redis:6379
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/visualization-enhancement
```

### 2. Make Changes

All visualization code lives under:

```
src/microservices/visualization/
├── components/      # React components (all <200 lines)
├── services/        # Business logic
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript definitions
├── config/         # Configuration
└── __tests__/      # Test files
```

### 3. Follow File Size Limit

**CRITICAL**: All `.tsx` and `.ts` files MUST be under 200 lines.

Check file sizes:

```bash
npm run check:file-sizes
```

If a file exceeds 200 lines, refactor it into smaller modules.

### 4. Use Only Tailwind CSS

**ZERO TOLERANCE**: Do NOT import Material-UI components.

✅ Correct:

```typescript
// Use Tailwind classes
<div className="flex items-center justify-between bg-blue-500 rounded-lg p-4">
```

❌ Incorrect:

```typescript
// NO Material-UI!
import { Button } from '@mui/material';
```

### 5. Run Linting

```bash
npm run lint
npm run format
npm run typecheck
```

### 6. Write Tests

Every component MUST have tests:

```typescript
// RiskGauge.test.tsx
import { render, screen } from '@testing-library/react';
import { RiskGauge } from './RiskGauge';

describe('RiskGauge', () => {
  it('renders risk score correctly', () => {
    render(<RiskGauge score={75} severity="high" />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});
```

### 7. Commit Changes

```bash
git add .
git commit -m "feat(visualization): Add new gauge animation"
```

## Troubleshooting

### Service Won't Start

**Problem**: Configuration validation fails

**Solution**: Check that all required environment variables are set. Run:

```bash
npm run config:validate
```

---

**Problem**: Port 3004 already in use

**Solution**: Kill the process using the port:

```bash
lsof -ti:3004 | xargs kill -9
```

Or change the port in `.env.local`:

```env
VISUALIZATION_PORT=3014
```

### Google Maps Not Loading

**Problem**: Map shows "For development purposes only" watermark

**Solution**: Your API key needs billing enabled. Visit [Google Cloud Console](https://console.cloud.google.com/billing) to add a billing account.

---

**Problem**: Map shows blank/gray area

**Solution**: Check browser console for errors. Ensure `GOOGLE_MAPS_API_KEY` is valid.

### Performance Issues

**Problem**: Network graph is slow with many nodes

**Solution**: Reduce `maxNetworkNodes` in configuration or enable physics-based layout:

```env
VISUALIZATION_MAX_NETWORK_NODES=500
VISUALIZATION_ENABLE_PHYSICS=true
```

---

**Problem**: Real-time visualizations are choppy

**Solution**: Check your FPS target and reduce if necessary:

```env
VISUALIZATION_TARGET_FPS=30
```

### Module Federation Errors

**Problem**: "Module not found: Error: Can't resolve 'visualizationApp/...'"

**Solution**: Ensure visualization service is running on port 3004 before starting consuming services.

---

**Problem**: Type errors when importing visualization components

**Solution**: Rebuild the service to regenerate type definitions:

```bash
npm run build:service visualization
```

### Event Bus Issues

**Problem**: Events not being received

**Solution**: Check event bus configuration. For local development, use:

```env
EVENT_BUS_TYPE=local
```

For production with Redis:

```env
EVENT_BUS_TYPE=redis
EVENT_BUS_REDIS_URL=redis://localhost:6379
```

## Next Steps

1. **Read the Architecture Docs**: See [data-model.md](./data-model.md) for data structures
2. **Review Event Contracts**: See [contracts/events.ts](./contracts/events.ts) for event definitions
3. **Explore Components**: Browse `src/microservices/visualization/components/`
4. **Run Examples**: Check `examples/` directory for usage examples
5. **Join Development**: See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines

## Support

For questions or issues:

- **Documentation**: See `specs/002-visualization-microservice/` directory
- **Issue Tracker**: Create issue in project repository
- **Team Chat**: Contact #visualization-service channel

## Additional Resources

- [Implementation Plan](./plan.md) - Complete technical implementation plan
- [Technology Research](./research.md) - Library evaluation and best practices
- [Data Model](./data-model.md) - TypeScript types and schemas
- [Event Contracts](./contracts/events.ts) - Inter-service communication
- [Configuration Schema](./contracts/config.ts) - Complete configuration reference

---

**Quick Start Checklist**:

- [ ] Node.js 18+ installed
- [ ] Repository cloned and on `002-visualization-microservice` branch
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with `GOOGLE_MAPS_API_KEY`
- [ ] Service starts successfully (`npm run dev:visualization`)
- [ ] Tests pass (`npm run test:visualization`)
- [ ] Linting passes (`npm run lint`)

**Ready to develop!** 🚀
