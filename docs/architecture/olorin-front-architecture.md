# OLORIN Frontend Architecture Documentation

## Project Overview
**olorin-front** is the frontend web application component of the OLORIN fraud investigation platform, providing a modern React TypeScript-based user interface for conducting comprehensive fraud investigations with real-time data visualization and analysis tools.

## High-Level Architecture

### Frontend Application Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    OLORIN Frontend (olorin-front)                │
├─────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                            │
│  ├── React Components with TypeScript                         │
│  ├── Investigation Dashboard & Analysis Tools                 │
│  ├── Risk Assessment Visualization                            │
│  └── Case Management Interface                                │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                              │
│  ├── React Context & Custom Hooks                             │
│  ├── Investigation State Management                           │
│  ├── User Configuration & Settings                            │
│  └── API Response Caching                                     │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                 │
│  ├── RESTful API Client Services                              │
│  ├── OlorinService (Main API Integration)                     │
│  ├── ChatService (Investigation Communication)                │
│  └── Configuration Management                                 │
├─────────────────────────────────────────────────────────────────┤
│  Integration Layer                                             │
│  ├── OLORIN Backend API (olorin-server:8000)                   │
│  ├── Investigation Workflow APIs                              │
│  ├── Risk Assessment Services                                 │
│  └── PDF Report Generation                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Technology Stack

### Frontend Technologies
- **React 18**: Modern component-based UI library with hooks
- **TypeScript**: Type-safe development with enhanced IDE support
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Vite/Webpack**: Modern build tools for development and production

### Development Tools
- **ESLint & Prettier**: Code quality and formatting standards
- **Jest & React Testing Library**: Unit and integration testing
- **Cypress**: End-to-end testing and user journey validation
- **TypeScript Compiler**: Static type checking and compilation

## Application Structure

### Project Organization
```
olorin-front/
├── public/                    # Static assets and HTML template
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── FraudInvestigationForm.tsx
│   │   ├── Home.tsx
│   │   └── Investigation.tsx
│   ├── js/                   # Main application code
│   │   ├── components/       # Core React components
│   │   │   ├── AgentDetailsTable.tsx
│   │   │   ├── AgentLogSidebar.tsx
│   │   │   ├── ChatLogAnimated.tsx
│   │   │   └── investigation/  # Investigation-specific components
│   │   ├── pages/            # Application pages
│   │   │   ├── InvestigationPage.tsx
│   │   │   ├── Investigations.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/         # API and external services
│   │   │   ├── ChatService.ts
│   │   │   ├── GAIAService.ts (OlorinService)
│   │   │   └── restService/
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useConfig.tsx
│   │   │   ├── useSandbox.tsx
│   │   │   └── useSettings.ts
│   │   ├── types/            # TypeScript type definitions
│   │   │   ├── AnalyzeResponse.ts
│   │   │   └── RiskAssessment.ts
│   │   ├── utils/            # Utility functions
│   │   │   ├── fetchFCIWrapper.ts
│   │   │   ├── investigation.ts
│   │   │   └── investigationDataUtils.ts
│   │   └── widgets/          # Widget components
│   │       └── olorin/       # OLORIN-specific widgets
│   └── config.json          # Application configuration
├── test/                    # Test files and utilities
└── package.json            # Dependencies and scripts
```

## Core Components Architecture

### Investigation Dashboard Components

#### 1. **InvestigationPage.tsx**
**Purpose**: Main investigation workflow interface
**Features**:
- Investigation parameter configuration
- Real-time progress tracking
- Results visualization and analysis
- Export and reporting capabilities

#### 2. **AgentDetailsTable.tsx**
**Purpose**: Display investigation agent results and status
**Features**:
- Tabular display of agent findings
- Risk score visualization
- Detailed analysis breakdown
- Interactive filtering and sorting

#### 3. **ChatLogAnimated.tsx**
**Purpose**: Real-time investigation progress communication
**Features**:
- Animated chat-like interface for investigation steps
- Progress indicators and status updates
- Error handling and retry mechanisms
- User-friendly progress communication

#### 4. **Investigation Components**
**Purpose**: Specialized components for investigation workflows
**Features**:
- Risk assessment visualization
- Timeline analysis tools
- Evidence collection interfaces
- Collaboration and annotation tools

### Service Layer Architecture

#### 1. **OlorinService (GAIAService.ts)**
**Purpose**: Main API communication with olorin-server
**Features**:
```typescript
class OlorinService {
  // Investigation management
  async createInvestigation(params: InvestigationParams): Promise<Investigation>
  async getInvestigationStatus(id: string): Promise<InvestigationStatus>
  
  // Risk assessment endpoints
  async analyzeDevice(params: DeviceAnalysisParams): Promise<DeviceRiskResponse>
  async analyzeLocation(params: LocationAnalysisParams): Promise<LocationRiskResponse>
  async analyzeNetwork(params: NetworkAnalysisParams): Promise<NetworkRiskResponse>
  async analyzeLogs(params: LogAnalysisParams): Promise<LogRiskResponse>
  
  // Overall risk assessment
  async getOverallRiskAssessment(id: string): Promise<OverallRiskResponse>
}
```

#### 2. **ChatService.ts**
**Purpose**: Investigation communication and collaboration
**Features**:
- Investigation comment system
- Real-time messaging capabilities
- Status update broadcasting
- Audit trail maintenance

#### 3. **Configuration Services**
**Purpose**: Application settings and user preferences
**Features**:
- User configuration management
- Investigation parameter persistence
- Environment-specific settings
- Feature flag management

## User Experience Architecture

### Investigation Workflow UX
```
Investigation User Journey:
1. Investigation Setup
   ├── Entity identification (user_id, device_id)
   ├── Time range selection
   ├── Investigation parameters configuration
   └── Analysis domain selection

2. Investigation Execution
   ├── Real-time progress monitoring
   ├── Agent status tracking
   ├── Intermediate results preview
   └── Error handling and recovery

3. Results Analysis
   ├── Multi-domain risk assessment review
   ├── Detailed findings exploration
   ├── Evidence and supporting data analysis
   └── Risk factor prioritization

4. Reporting & Action
   ├── Investigation summary generation
   ├── PDF report export
   ├── Recommendations review
   └── Case documentation and closure
```

### Responsive Design
- **Mobile-First Approach**: Progressive enhancement from mobile to desktop
- **Adaptive Layouts**: Flexible grid systems for various screen sizes
- **Touch Optimization**: Touch-friendly interfaces for tablet use
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design

## State Management Architecture

### React State Patterns
```typescript
// Investigation state management
const InvestigationContext = createContext<InvestigationState>();

// Custom hooks for state management
function useInvestigation() {
  const context = useContext(InvestigationContext);
  return {
    investigation: context.investigation,
    isLoading: context.isLoading,
    error: context.error,
    createInvestigation: context.actions.create,
    updateInvestigation: context.actions.update
  };
}

// Settings and configuration management
function useSettings() {
  const [settings, setSettings] = useState<Settings>();
  const updateSetting = useCallback((key: string, value: any) => {
    // Settings update logic
  }, []);
  
  return { settings, updateSetting };
}
```

### Data Flow Architecture
- **Unidirectional Data Flow**: Predictable state updates using React patterns
- **Event-Driven Updates**: Investigation status changes trigger UI updates
- **Optimistic Updates**: Immediate UI feedback for better user experience
- **Error Boundaries**: Graceful error handling with user-friendly fallbacks

## API Integration Architecture

### REST API Communication
```typescript
// API client configuration
const apiClient = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  }
};

// Investigation API methods
interface InvestigationAPI {
  POST /api/investigation - Create new investigation
  GET /api/investigation/{id} - Get investigation status
  POST /api/investigation/{id}/comment - Add investigation comment
  
  GET /api/device/{entity_id} - Device risk analysis
  GET /api/location/{entity_id} - Location risk analysis
  GET /api/network/{entity_id} - Network risk analysis
  GET /api/logs/{entity_id} - Log analysis
  
  GET /api/risk-assessment/{entity_id} - Overall risk assessment
}
```

### Error Handling & Resilience
- **Network Error Recovery**: Automatic retry with exponential backoff
- **User-Friendly Error Messages**: Clear, actionable error communication
- **Fallback Mechanisms**: Graceful degradation when services are unavailable
- **Loading States**: Comprehensive loading indicators and skeleton screens

## Performance Architecture

### Optimization Strategies
- **Component Memoization**: React.memo and useMemo for expensive operations
- **Code Splitting**: Dynamic imports for route-based code splitting
- **Lazy Loading**: On-demand component and data loading
- **Virtual Scrolling**: Efficient rendering for large data sets

### Caching & Data Management
- **API Response Caching**: Intelligent caching of investigation results
- **Local Storage**: Persistent user preferences and settings
- **Session Storage**: Temporary data for investigation workflows
- **Memory Management**: Efficient cleanup of unused resources

## Testing Architecture

### Test Strategy
```
Testing Pyramid:
├── Unit Tests (Jest + React Testing Library)
│   ├── Component behavior testing
│   ├── Hook functionality testing
│   ├── Utility function testing
│   └── Service layer testing
├── Integration Tests
│   ├── Component integration testing
│   ├── API integration testing
│   ├── User workflow testing
│   └── Error scenario testing
└── E2E Tests (Cypress)
    ├── Complete user journeys
    ├── Cross-browser compatibility
    ├── Performance testing
    └── Accessibility testing
```

### Quality Assurance
- **Type Safety**: Comprehensive TypeScript coverage
- **Code Coverage**: Minimum 80% test coverage requirement
- **Performance Testing**: Core Web Vitals monitoring
- **Accessibility Testing**: Automated and manual accessibility validation

## Build & Deployment Architecture

### Development Environment
```bash
# Development commands
npm install          # Install dependencies
npm start           # Development server with hot reload
npm test            # Run test suite
npm run build       # Production build
npm run lint        # Code quality checking
```

### Production Build
- **Bundle Optimization**: Webpack optimization for minimal bundle size
- **Asset Optimization**: Image compression and CSS minification
- **Environment Configuration**: Multi-environment build support
- **Source Maps**: Production debugging support (conditional)

### Deployment Strategy
- **Static Site Deployment**: CDN-optimized static asset deployment
- **Container Deployment**: Docker-based application deployment
- **CI/CD Integration**: Automated testing and deployment pipelines
- **Performance Monitoring**: Real-time application performance tracking

---

**Document Version**: 2.0  
**Last Updated**: January 30, 2025  
**Component**: olorin-front  
**Architecture Owner**: OLORIN Frontend Team
