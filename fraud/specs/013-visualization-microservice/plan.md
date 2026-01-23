# Implementation Plan: Visualization Microservice

**Branch**: `002-visualization-microservice` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-visualization-microservice/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a specialized visualization microservice (port 3004) that consolidates all visualization capabilities from the Olorin frontend into an independent, reusable service. The microservice will provide six major visualization categories: risk visualization (gauges and dashboards), network/relationship graphs, geographic maps, timelines, real-time monitoring (EKG, sparklines, radar), and an interactive chart builder supporting 15 chart types. The service will integrate with the existing microservices architecture using Webpack 5 Module Federation for runtime composition and event bus for inter-service communication. Performance requirements include 60 FPS for real-time animations, sub-2-second load times for complex visualizations, and support for large datasets (10,000+ events, 1,000+ network nodes).

## Technical Context

**Language/Version**: TypeScript 5.x with React 18.2
**Primary Dependencies**:
  - **Visualization**: D3.js 7.9.0, Chart.js 4.2.1, vis-network 9.1.13, recharts 3.2.1
  - **React**: React 18.2, react-chartjs-2 5.2.0, react-flow-renderer 10.3.17
  - **Styling**: Tailwind CSS 3.x (Olorin corporate color palette)
  - **Maps**: @googlemaps/js-api-loader 1.16.8
  - **Utilities**: html2canvas 1.4.1 (export), lucide-react 0.263.0 (icons)

**Storage**: Browser-based state management (React Context/Zustand), visualization state persisted to localStorage, no database requirements

**Testing**: Jest 29.x with React Testing Library, @testing-library/react, integration tests for cross-service communication, visual regression tests with Playwright for visualization accuracy

**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), runs as independent microservice on port 3004

**Project Type**: Web microservice with Webpack 5 Module Federation

**Performance Goals**:
  - Real-time visualizations: 60 FPS consistently
  - Network graphs (100+ nodes): Load within 2 seconds
  - Map visualizations (500+ markers): Render within 3 seconds
  - Timeline (1,000 events): Display within 1 second
  - Dashboard view switching: Within 2 seconds
  - Export generation: Within 5 seconds
  - Event bus latency: Under 50 milliseconds

**Constraints**:
  - File size: All .tsx/.ts files under 200 lines (MANDATORY)
  - No Material-UI: Tailwind CSS only (ZERO TOLERANCE)
  - No hardcoded values: All configuration via environment variables (SYSTEM MANDATE)
  - No mocks/stubs/TODOs in production code (ZERO TOLERANCE)
  - Independent deployment: No direct dependencies on other microservices
  - Configuration-driven: All URLs, features, styling configurable
  - Canvas rendering: For high-frequency animations (EKG, radar)
  - SVG rendering: For interactive components (gauges, network graphs)
  - Event-driven: All inter-service communication via event bus

**Scale/Scope**:
  - Component count: ~30-40 visualization components (all under 200 lines)
  - Service hooks: ~10-15 custom hooks for visualization logic
  - Concurrent users: Support 100 concurrent analysts
  - Data volume: 10,000 timeline events, 1,000 network nodes, 500 map markers per investigation
  - Event frequency: 10 updates per second maximum
  - Chart types: 15 supported types
  - Color palettes: 5 predefined palettes
  - Dashboard views: 4 multi-view dashboards
  - Export formats: 3 (PNG, SVG, JSON)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Constitution template found at `.specify/memory/constitution.md` but not yet populated for Olorin project.

**Applying Olorin CLAUDE.md Mandates** (from project documentation):

### Zero-Tolerance Rules Compliance

- [x] **NO MOCK/STUBS/TODO**: All visualization code will be production-ready with no placeholders (CRITICAL FAILURE if violated)
- [x] **NO HARDCODED VALUES**: All configuration via environment variables with Zod schema validation (CRITICAL FAILURE if violated)
- [x] **200-LINE LIMIT**: Every .tsx/.ts file under 200 lines through modular architecture (MANDATORY)
- [x] **TAILWIND CSS ONLY**: Absolutely NO Material-UI imports (ZERO TOLERANCE for current refactoring)
- [x] **CONFIGURATION-DRIVEN**: All URLs, features, colors, and UI settings from environment/config

### Architecture Standards Compliance

- [x] **Microservices Pattern**: Independent service with event-driven communication
- [x] **Module Federation**: Runtime composition using Webpack 5
- [x] **Dependency Injection**: Services receive dependencies through constructors
- [x] **Event Bus Integration**: No direct service-to-service calls
- [x] **Error Boundaries**: Graceful degradation when visualization fails

### Testing Requirements Compliance

- [x] **No Mocks in Production**: Integration tests use real event bus and data flows
- [x] **Comprehensive Coverage**: Unit tests for components, integration tests for event handling
- [x] **Visual Regression**: Playwright tests verify visualization rendering accuracy
- [x] **Performance Tests**: Validate 60 FPS and load time requirements

### Security & Configuration Compliance

- [x] **Environment Variables**: All sensitive data from environment/secret manager
- [x] **Zod Schema Validation**: Fail-fast configuration validation at startup
- [x] **No Inline Secrets**: Authentication tokens from secure config source
- [x] **Schema-Locked**: No database schema modifications (visualization service has no database)

**Gate Status**: ✅ PASSED - All CLAUDE.md mandates addressed in design

## Project Structure

### Documentation (this feature)

```text
specs/002-visualization-microservice/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Library evaluation and best practices
├── data-model.md        # Phase 1 output - Visualization data structures
├── quickstart.md        # Phase 1 output - Getting started guide
├── contracts/           # Phase 1 output - Event bus contracts and API definitions
│   ├── events.ts        # Event definitions for inter-service communication
│   ├── types.ts         # Shared TypeScript types
│   └── config.ts        # Configuration schema
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Requirements checklist (already created)
└── spec.md              # Feature specification (already created)
```

### Source Code (repository root)

```text
# Microservice Structure (Web Application with Module Federation)
olorin-front/
├── src/
│   ├── microservices/
│   │   └── visualization/                    # THIS MICROSERVICE (Port 3004)
│   │       ├── bootstrap.tsx                 # Microservice entry point
│   │       ├── App.tsx                       # Main app component
│   │       ├── components/                   # Visualization components (all <200 lines)
│   │       │   ├── risk/                     # Risk visualization components
│   │       │   │   ├── RiskGauge.tsx         # Circular risk gauge (<200 lines)
│   │       │   │   ├── HyperGauge.tsx        # Animated needle gauge (<200 lines)
│   │       │   │   ├── RiskGaugeCard.tsx     # Risk gauge with card wrapper
│   │       │   │   ├── RiskDashboard.tsx     # Multi-gauge dashboard
│   │       │   │   └── index.ts              # Barrel exports
│   │       │   ├── network/                  # Network graph components
│   │       │   │   ├── NetworkGraph.tsx      # Main network visualization (<200 lines)
│   │       │   │   ├── NetworkControls.tsx   # Zoom/fit/physics controls
│   │       │   │   ├── NetworkStats.tsx      # Network statistics panel
│   │       │   │   └── index.ts
│   │       │   ├── maps/                     # Geographic visualization
│   │       │   │   ├── LocationMap.tsx       # Interactive map (<200 lines)
│   │       │   │   ├── MapControls.tsx       # Zoom/filter controls
│   │       │   │   ├── MapMarker.tsx         # Custom marker component
│   │       │   │   └── index.ts
│   │       │   ├── timeline/                 # Timeline components
│   │       │   │   ├── Timeline.tsx          # Main timeline (<200 lines)
│   │       │   │   ├── TimelineEvent.tsx     # Individual event component
│   │       │   │   ├── TimelineFilters.tsx   # Filter controls
│   │       │   │   └── index.ts
│   │       │   ├── monitoring/               # Real-time monitors
│   │       │   │   ├── EKGMonitor.tsx        # EKG waveform visualization (<200 lines)
│   │       │   │   ├── TPSSparkline.tsx      # Tools per second chart
│   │       │   │   ├── RadarVisualization.tsx # Radar anomaly detection
│   │       │   │   └── index.ts
│   │       │   ├── charts/                   # Chart builder & dashboards
│   │       │   │   ├── ChartBuilder.tsx      # Chart creation wizard (<200 lines)
│   │       │   │   ├── ChartRenderer.tsx     # Chart rendering engine
│   │       │   │   ├── DataVisualization.tsx # Multi-view dashboard (<200 lines)
│   │       │   │   └── index.ts
│   │       │   └── common/                   # Shared visualization components
│   │       │       ├── ExportButton.tsx      # Export to PNG/SVG/JSON
│   │       │       ├── LoadingState.tsx      # Loading indicators
│   │       │       ├── EmptyState.tsx        # Empty data states
│   │       │       └── index.ts
│   │       ├── services/                     # Service layer
│   │       │   ├── visualizationService.ts   # Core visualization operations
│   │       │   ├── dataTransformService.ts   # Data transformation utilities
│   │       │   ├── exportService.ts          # Export functionality (PNG/SVG/JSON)
│   │       │   ├── eventBusService.ts        # Event bus integration
│   │       │   └── index.ts
│   │       ├── hooks/                        # Custom React hooks
│   │       │   ├── useVisNetwork.ts          # vis-network integration
│   │       │   ├── useRadarAnimation.ts      # Radar animation logic
│   │       │   ├── useSpringValue.ts         # Spring physics for gauges
│   │       │   ├── useVisualizationState.ts  # State management
│   │       │   ├── useEventBus.ts            # Event bus subscription
│   │       │   └── index.ts
│   │       ├── utils/                        # Utility functions
│   │       │   ├── radarGeometry.ts          # Radar calculations
│   │       │   ├── networkLayout.ts          # Network positioning algorithms
│   │       │   ├── colorPalettes.ts          # Color scheme definitions
│   │       │   ├── chartHelpers.ts           # Chart configuration utilities
│   │       │   └── index.ts
│   │       ├── types/                        # TypeScript definitions
│   │       │   ├── visualization.types.ts    # Core visualization types
│   │       │   ├── events.types.ts           # Event bus types
│   │       │   ├── config.types.ts           # Configuration types
│   │       │   └── index.ts
│   │       ├── config/                       # Configuration
│   │       │   ├── environment.ts            # Environment variable loader
│   │       │   ├── validation.ts             # Zod schema validation
│   │       │   ├── defaults.ts               # Default configuration values
│   │       │   └── index.ts
│   │       └── __tests__/                    # Tests
│   │           ├── components/               # Component tests
│   │           ├── services/                 # Service tests
│   │           ├── hooks/                    # Hook tests
│   │           └── integration/              # Integration tests
│   │
│   ├── shared/                               # Shared across all microservices
│   │   ├── components/                       # Shared UI components
│   │   ├── hooks/                            # Shared hooks
│   │   ├── types/                            # Shared types
│   │   ├── events/                           # Event bus implementation
│   │   │   ├── EventBus.ts                   # Event bus singleton
│   │   │   ├── events.types.ts               # Event type definitions
│   │   │   └── index.ts
│   │   └── services/                         # Shared services
│   │
│   └── config/                               # Module federation configs
│       └── visualization.config.js           # Webpack config for visualization service
│
├── tests/                                    # Root-level tests
│   ├── integration/                          # Cross-service integration tests
│   │   └── visualization/                    # Visualization service integration
│   └── e2e/                                  # End-to-end tests
│       └── visualization/                    # Full user flow tests
│
└── package.json                              # Dependencies and scripts
```

**Structure Decision**: The visualization microservice follows the established microservices architecture pattern (Option 2: Web application) with Webpack 5 Module Federation. All visualization code lives under `src/microservices/visualization/` as an independent service running on port 3004. Components are organized by feature category (risk, network, maps, timeline, monitoring, charts) with strict adherence to the 200-line file size limit. The service integrates with other microservices via the shared event bus in `src/shared/events/` and exposes its components through Module Federation for consumption by the shell app and other services.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations to track** - The implementation adheres to all Olorin CLAUDE.md mandates:
- Modular architecture ensures all files stay under 200 lines
- Configuration-driven design eliminates hardcoded values
- Tailwind CSS exclusively (no Material-UI)
- Event-driven architecture maintains service independence
- Comprehensive testing without production mocks

---

## Phase 0: Research & Technology Selection

See [research.md](./research.md) for detailed research findings including:
- Visualization library evaluation (D3.js vs Chart.js vs Recharts vs vis-network)
- Performance optimization strategies for 60 FPS rendering
- Event bus pattern best practices for microservices
- Module Federation configuration for visualization components
- Canvas vs SVG rendering decision criteria
- Export functionality implementation approaches
- State management patterns for visualization data
- Testing strategies for visual components
- Accessibility requirements for data visualizations
- Color palette design for Olorin corporate branding

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete data structure definitions including:
- Risk visualization data models (scores, trends, agent metrics)
- Network graph structures (nodes, edges, layouts, statistics)
- Geographic data models (markers, locations, clusters)
- Timeline event structures (events, filters, metadata)
- Real-time monitoring data (heartbeat, TPS, radar)
- Chart configuration schemas (types, data mappings, styling)
- Visualization state management (filters, selections, zoom levels)
- Configuration schemas with Zod validation

### API Contracts

See [contracts/](./contracts/) directory for:
- **events.ts**: Event bus contract definitions for inter-service communication
  - Investigation events (risk updates, entity discoveries, progress updates)
  - Visualization events (node selection, location clicks, filter changes)
  - Real-time events (heartbeat, tool execution, log entries)
- **types.ts**: Shared TypeScript type definitions
- **config.ts**: Configuration schema with Zod validation

### Quick Start Guide

See [quickstart.md](./quickstart.md) for:
- Local development setup instructions
- Running the visualization microservice independently
- Integration with other Olorin microservices
- Environment configuration guide
- Testing the visualization components
- Building and deploying the service
- Troubleshooting common issues

---

## Next Steps

After this planning phase is complete (`/speckit.plan` command):

1. **Review the Plan**: Ensure all technical details are accurate and complete
2. **Generate Tasks**: Run `/speckit.tasks` to create detailed implementation tasks
3. **Begin Implementation**: Follow the task list with proper git workflow
4. **Testing**: Write tests alongside implementation (TDD approach)
5. **Integration**: Test event bus communication with other microservices
6. **Performance Validation**: Ensure 60 FPS and load time requirements met
7. **Code Review**: Validate file sizes, configuration usage, and code quality
8. **Documentation**: Update quickstart guide with any implementation learnings
9. **Deployment**: Deploy visualization microservice to staging environment

---

**Plan Status**: ✅ COMPLETE - All planning artifacts generated
**Phase 0 (Research)**: ✅ COMPLETE - research.md created
**Phase 1 (Design & Contracts)**: ✅ COMPLETE - data-model.md, contracts/, quickstart.md created
**Phase 2 (Task Generation)**: ✅ COMPLETE - tasks.md created with 87 implementation tasks
**Next Command**: `/speckit.implement` - Begin automated implementation OR manual implementation following tasks.md
**Branch**: 002-visualization-microservice
**Last Updated**: 2025-11-08
