# Implementation Plan: Enhanced Frontend Refactoring - Tailwind CSS Migration & Microservices Architecture

**Branch**: `001-refactoring-the-frontend` | **Date**: 2025-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-refactoring-the-frontend/spec.md`
<<<<<<< HEAD
**Enhancement**: Separate autonomous/manual investigation services + Figma MCP + Playwright MCP testing
=======
**Enhancement**: Separate structured/manual investigation services + Figma MCP + Playwright MCP testing
>>>>>>> 001-modify-analyzer-method

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: Web application (frontend+backend)
   → ✅ Structure Decision: Enhanced microservices architecture
   → ✅ Added: Figma MCP for design mocks, Playwright MCP for testing
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ Constitution template found (not customized for project)
4. Evaluate Constitution Check section below
   → ✅ No constitutional violations identified
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md (Enhanced with Figma + Playwright)
   → ✅ Research complete (all technical decisions resolved)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Enhanced with 8 microservices instead of 6
7. Re-evaluate Constitution Check section
   → ✅ Post-design constitutional compliance verified
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Enhanced task generation approach
   → ✅ Complete
9. STOP - Ready for /tasks command
```

## Summary
Complete migration of Olorin frontend from Material-UI to Tailwind CSS while decomposing the monolithic React application into **8 independent microservices** (enhanced from 6). This includes splitting 19 oversized files into compliant modules under 200 lines each, implementing module federation architecture, maintaining full backend integration with WebSocket support, plus integration of Figma MCP for design consistency and Playwright MCP for comprehensive testing.

## Technical Context
**Language/Version**: TypeScript 4.9.5, Node.js 18+, React 18.2.0
**Primary Dependencies**: Tailwind CSS 3.3.0, Module Federation, React Router 6.11.0, Axios 1.4.0, Figma Plugin API, Playwright
**Storage**: Browser localStorage, session storage, WebSocket state management
**Testing**: Playwright MCP (E2E), Jest, React Testing Library, Visual regression testing
**Design System**: Figma MCP integration for component mocks and design tokens
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
**Project Type**: web - Enhanced frontend microservices with shared backend
**Performance Goals**: <3s page load on 3G, 60fps scrolling, <40% bundle reduction
**Constraints**: <200 lines per file, Tailwind CSS only, independent deployability, Figma design consistency
**Scale/Scope**: 169 component files, 8 microservices, 25 functional requirements, automated design-to-code workflow

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitutional violations detected

The constitution template is present but not customized for this project. Based on typical frontend development principles:
- ✅ Component-based architecture maintained and enhanced
- ✅ Separation of concerns through enhanced microservices
- ✅ Testability through isolated services + Playwright integration
- ✅ Performance-focused design
- ✅ Accessibility compliance required
- ✅ Design consistency through Figma MCP integration

## Project Structure

### Documentation (this feature)
```
specs/001-refactoring-the-frontend/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (Enhanced with Figma + Playwright)
├── data-model.md        # Phase 1 output (8 microservices)
├── quickstart.md        # Phase 1 output (Enhanced setup)
├── contracts/           # Phase 1 output (8 service contracts)
<<<<<<< HEAD
│   ├── autonomous-investigation-service.yaml
=======
│   ├── structured-investigation-service.yaml
>>>>>>> 001-modify-analyzer-method
│   ├── manual-investigation-service.yaml
│   ├── agent-analytics-service.yaml
│   ├── rag-intelligence-service.yaml
│   ├── visualization-service.yaml
│   ├── reporting-service.yaml
│   ├── core-ui-service.yaml
│   ├── design-system-service.yaml
│   ├── event-bus.yaml
│   └── websocket-events.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Enhanced Web application with 8 microservices
frontend/ (olorin-front)
├── src/
│   ├── microservices/
<<<<<<< HEAD
│   │   ├── autonomous-investigation/  # NEW: Autonomous Investigation Service
=======
│   │   ├── structured-investigation/  # NEW: Structured Investigation Service
>>>>>>> 001-modify-analyzer-method
│   │   ├── manual-investigation/      # NEW: Manual Investigation Service
│   │   ├── agent-analytics/          # Agent Analytics Service
│   │   ├── rag-intelligence/         # RAG Intelligence Service
│   │   ├── visualization/            # Visualization Service
│   │   ├── reporting/                # Reporting Service
│   │   ├── core-ui/                  # Core UI Service
│   │   └── design-system/            # NEW: Design System Service (Figma integration)
│   ├── shared/
│   │   ├── components/               # Tailwind component library (Figma-generated)
│   │   ├── hooks/                    # Shared React hooks
│   │   ├── types/                    # TypeScript definitions
│   │   ├── utils/                    # Utility functions
│   │   ├── services/                 # Shared API services
│   │   ├── figma/                    # NEW: Figma MCP integration
│   │   └── testing/                  # NEW: Playwright test utilities
│   └── config/                       # Module federation config (8 services)
└── tests/
    ├── playwright/                   # NEW: Playwright E2E tests
<<<<<<< HEAD
    │   ├── autonomous-investigation/
=======
    │   ├── structured-investigation/
>>>>>>> 001-modify-analyzer-method
    │   ├── manual-investigation/
    │   ├── cross-service/
    │   └── visual-regression/
    ├── contract/                     # Service contract tests
    ├── integration/                  # Cross-service tests
    └── unit/                         # Component unit tests
```

**Structure Decision**: Enhanced web application with 8 microservices + Figma/Playwright integration

## Phase 0: Enhanced Outline & Research
1. **Extract unknowns from Technical Context** above:
   - ✅ Module Federation setup for React microservices (8 services)
   - ✅ Tailwind CSS component library architecture with Figma integration
   - ✅ WebSocket integration patterns for distributed services
   - ✅ State management across microservices
   - ✅ Figma MCP integration for design-to-code workflow
   - ✅ Playwright MCP setup for comprehensive testing

2. **Generate and dispatch research agents**:
   ```
   ✅ Research Module Federation for 8 React microservices
   ✅ Best practices for Tailwind CSS + Figma design systems
   ✅ WebSocket state management in distributed frontend
   ✅ Performance optimization for microservices
   ✅ Figma MCP API integration patterns
   ✅ Playwright MCP testing strategies for microservices
<<<<<<< HEAD
   ✅ Autonomous vs Manual investigation separation patterns
=======
   ✅ Structured vs Manual investigation separation patterns
>>>>>>> 001-modify-analyzer-method
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: ✅ research.md with all technical decisions resolved (enhanced with new tools)

## Phase 1: Enhanced Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ✅ 8 service boundaries and responsibilities identified
   - ✅ Data flow between microservices mapped
   - ✅ State management architecture defined
   - ✅ Figma design token integration mapped
   - ✅ Playwright testing architecture defined

2. **Generate API contracts** from functional requirements:
   - ✅ 8 service-to-service communication contracts
   - ✅ WebSocket event schemas (enhanced)
   - ✅ Shared type definitions and interfaces
   - ✅ Figma design token API contracts
   - ✅ Playwright test execution contracts
   - Output OpenAPI/AsyncAPI schemas to `/contracts/`

3. **Generate contract tests** from contracts:
   - ✅ Service boundary tests (8 services)
   - ✅ WebSocket communication tests
   - ✅ Component library tests (Figma integration)
   - ✅ Playwright E2E test scenarios
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - ✅ Each microservice integration scenario
   - ✅ Cross-service user flow validation
   - ✅ Performance benchmark tests
   - ✅ Visual regression testing scenarios
<<<<<<< HEAD
   - ✅ Autonomous vs Manual investigation workflows
=======
   - ✅ Structured vs Manual investigation workflows
>>>>>>> 001-modify-analyzer-method

5. **Update CLAUDE.md incrementally** (O(1) operation):
   - ✅ Add enhanced microservices architecture context (8 services)
   - ✅ Include Tailwind CSS + Figma migration guidelines
   - ✅ Update file structure patterns
   - ✅ Add Playwright testing and deployment patterns
   - ✅ Include design-to-code workflow documentation

**Output**: ✅ data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md (all enhanced)

## Phase 2: Enhanced Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each service → setup and infrastructure tasks [P] (8 services)
- Each oversized file → splitting and migration tasks [P]
- Each Material-UI component → Tailwind replacement task
- Figma integration setup and design token generation tasks
- Playwright test setup and E2E test creation tasks
- Integration and testing tasks for service boundaries

**Ordering Strategy**:
- Infrastructure first: Module federation setup (8 services)
- Design System service (Figma integration foundation)
- Core UI service (foundation components)
<<<<<<< HEAD
- Autonomous Investigation service (complex workflows)
=======
- Structured Investigation service (complex workflows)
>>>>>>> 001-modify-analyzer-method
- Manual Investigation service (simpler workflows)
- Supporting services (agent analytics, RAG, visualization, reporting)
- Integration and performance optimization
- Playwright E2E testing implementation
- Mark [P] for parallel execution (independent services)

**Estimated Output**: 65-70 numbered, ordered tasks in tasks.md (enhanced from 45-50)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Enhanced Microservices Architecture

<<<<<<< HEAD
### 1. Autonomous Investigation Service (Port 3001)
**Responsibility**: AI-driven automated fraud investigations
**Components**: EnhancedAutonomousInvestigationPanel, AutoInvestigationFlow, AIAgentOrchestrator
=======
### 1. Structured Investigation Service (Port 3001)
**Responsibility**: AI-driven automated fraud investigations
**Components**: EnhancedStructuredInvestigationPanel, AutoInvestigationFlow, AIAgentOrchestrator
>>>>>>> 001-modify-analyzer-method
**Key Features**:
- Complex multi-agent orchestration
- Real-time AI decision making
- Automated evidence collection
- Risk score calculation algorithms

### 2. Manual Investigation Service (Port 3002)
**Responsibility**: Human-driven guided investigations
**Components**: ManualInvestigationPanel, GuidedWorkflow, EvidenceCollection
**Key Features**:
- Step-by-step investigation wizards
- Manual evidence review interfaces
- Collaboration tools for investigators
- Custom investigation templates

### 3. Agent Analytics Service (Port 3003)
**Responsibility**: AI agent monitoring and performance analysis
**Components**: AgentDetailsTable, AgentLogSidebar, PerformanceMetrics
**Key Features**:
- Agent performance dashboards
- Real-time execution monitoring
- Log aggregation and analysis
- Performance optimization insights

### 4. RAG Intelligence Service (Port 3004)
**Responsibility**: Retrieval-augmented generation and knowledge management
**Components**: RAG analytics, insights, query processing
**Key Features**:
- Knowledge base querying
- Contextual information retrieval
- AI-powered insights generation
- Source effectiveness tracking

### 5. Visualization Service (Port 3005)
**Responsibility**: Data visualization and interactive analysis
**Components**: InteractiveGraphs, Maps, Charts, NeuralNetworkVisualization
**Key Features**:
- Investigation relationship graphs
- Geographic data visualization
- Interactive data exploration
- Custom visualization widgets

### 6. Reporting Service (Port 3006)
**Responsibility**: Report generation and document export
**Components**: ReportBuilder, ExportControls, TemplateManager
**Key Features**:
- PDF report generation
- Custom report templates
- Multi-format exports
- Automated report scheduling

### 7. Core UI Service (Port 3007)
**Responsibility**: Shared UI components and authentication
**Components**: NavigationBar, AuthProvider, SharedModals
**Key Features**:
- Authentication and authorization
- Global navigation and routing
- Shared UI components and utilities
- Error boundaries and fallbacks

### 8. Design System Service (Port 3008) ⭐ NEW
**Responsibility**: Figma-integrated design system management
**Components**: DesignTokenProvider, ComponentLibrary, FigmaSync
**Key Features**:
- Figma design token synchronization
- Component library management
- Design-to-code automation
- Visual consistency enforcement

## Enhanced Testing Strategy with Playwright MCP

### E2E Testing Architecture
```typescript
// Playwright test organization
tests/playwright/
<<<<<<< HEAD
├── autonomous-investigation/
=======
├── structured-investigation/
>>>>>>> 001-modify-analyzer-method
│   ├── ai-agent-orchestration.spec.ts
│   ├── automated-evidence-collection.spec.ts
│   └── risk-calculation.spec.ts
├── manual-investigation/
│   ├── guided-workflow.spec.ts
│   ├── manual-evidence-review.spec.ts
│   └── collaboration-tools.spec.ts
├── cross-service/
│   ├── investigation-handoff.spec.ts
│   ├── data-consistency.spec.ts
│   └── real-time-updates.spec.ts
└── visual-regression/
    ├── component-library.spec.ts
    ├── page-layouts.spec.ts
    └── responsive-design.spec.ts
```

### Figma MCP Integration Benefits
- **Design Consistency**: Automated component generation from Figma designs
- **Token Synchronization**: Design tokens (colors, typography, spacing) auto-sync
- **Visual Testing**: Compare implemented components against Figma designs
- **Rapid Prototyping**: Generate React components from Figma prototypes

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations identified. The enhanced microservices approach aligns with:
- Separation of concerns principle (8 focused services)
- Independent testability (Playwright integration)
- Scalable architecture patterns
- Performance optimization goals
- Design consistency (Figma integration)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Enhanced research complete (/plan command)
- [x] Phase 1: Enhanced design complete (/plan command)
- [x] Phase 2: Enhanced task planning complete (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)
- [x] Enhanced requirements integrated (Figma + Playwright + Investigation separation)

**Enhancement Status**:
<<<<<<< HEAD
- [x] Autonomous Investigation Service designed
=======
- [x] Structured Investigation Service designed
>>>>>>> 001-modify-analyzer-method
- [x] Manual Investigation Service designed
- [x] Design System Service designed
- [x] Figma MCP integration planned
- [x] Playwright MCP testing planned
- [x] Enhanced contracts generated
- [x] Enhanced data model created

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
*Enhanced with: Figma MCP for design consistency + Playwright MCP for comprehensive testing*