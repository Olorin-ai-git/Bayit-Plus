# OLORIN-WebPlugin Architecture Documentation

## Project Overview
**OLORIN-WebPlugin** is the frontend web application component of the OLORIN ecosystem, providing a modern React-based user interface for security investigations with enterprise-grade authentication and real-time collaboration features.

## High-Level Architecture

### Frontend Application Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    OLORIN-WebPlugin Frontend                     │
├─────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                            │
│  ├── React Components with @appfabric Design System           │
│  ├── Investigation Dashboard & Workspace                      │
│  ├── Settings & Configuration UI                              │
│  └── Real-time Collaboration Interface                        │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                              │
│  ├── React Context & Hooks                                    │
│  ├── Authentication State                                     │
│  ├── Investigation Data Management                            │
│  └── WebSocket State Synchronization                          │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                 │
│  ├── API Client Services                                      │
│  ├── Authentication Services                                  │
│  ├── WebSocket Communication                                  │
│  └── Real-time Event Handling                                │
├─────────────────────────────────────────────────────────────────┤
│  Integration Layer                                             │
│  ├── Main OLORIN API (Port 8000)                               │
│  ├── MCP Service Integration                                  │
│  ├── Authentication Providers                                 │
│  └── External Service Adapters                               │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### React Application Structure
- **Framework**: React 18+ with TypeScript
- **Design System**: @appfabric Intuit design components
- **Build System**: Modern build tools (Webpack, Babel, TypeScript)
- **Testing**: Jest, React Testing Library, Cypress E2E

### Key Directories
1. **`src/js/components/`**: React component library
2. **`src/js/pages/`**: Application pages and routing
3. **`src/js/services/`**: API clients and business logic
4. **`src/js/hooks/`**: Custom React hooks
5. **`src/js/utils/`**: Shared utilities and helpers

## Component Architecture

### Core Components
```
Component Hierarchy:
├── App (Root Application)
├── AuthenticationWrapper (Auth Provider)
├── InvestigationDashboard (Main Workspace)
│   ├── SettingsPage (Configuration)
│   ├── ToolsPanel (MCP Tools Interface)
│   ├── ResultsViewer (Investigation Results)
│   └── CollaborationPanel (Real-time Chat)
├── SettingsComponents (15+ Reusable Components)
└── UIComponents (@appfabric Integration)
```

### Settings Page Architecture
- **EntityTypeSelector**: Investigation entity configuration
- **InvestigationModeSelector**: Autonomous/manual mode selection
- **TimeRangeSelector**: Time-based investigation scoping
- **AgentSelectionPanel**: AI agent configuration
- **ToolsConfigurationPanel**: MCP tool management
- **And 10+ additional specialized components**

## Authentication Architecture

### Multi-Tier Authentication
```
Frontend Authentication Flow:
├── @appfabric Authentication Components
├── Token Management & Refresh
├── Session State Management
├── Role-based UI Rendering
└── Secure API Communication
```

### Authentication Features
- **SSO Integration**: Enterprise single sign-on support
- **Token Lifecycle**: Automatic token refresh and management
- **Permission-based UI**: Role-based component rendering
- **Session Security**: Secure session handling and cleanup

## Real-time Communication

### WebSocket Integration
- **Live Investigation Updates**: Real-time progress monitoring
- **Collaborative Features**: Multi-user investigation support
- **Event Streaming**: Server-sent events for status updates
- **Connection Management**: Automatic reconnection and error recovery

### Data Synchronization
```
Real-time Data Flow:
WebSocket ← → Frontend State ← → Component Updates
├── Investigation progress
├── Tool execution status
├── User presence/activity
└── System notifications
```

## API Integration

### Service Communication
- **REST API**: Standard HTTP API integration with main OLORIN service
- **MCP Protocol**: Direct MCP tool integration and execution
- **Authentication API**: Token validation and user management
- **File Upload/Download**: Investigation artifact management

### Error Handling
- **Network Resilience**: Automatic retry and circuit breaking
- **User Feedback**: Comprehensive error messaging and recovery
- **Offline Support**: Limited offline functionality
- **Performance Monitoring**: Real-time performance tracking

## State Management

### React State Architecture
```
State Management:
├── React Context (Global State)
├── useReducer (Complex State Logic)
├── Custom Hooks (Reusable State Logic)
├── Local Component State
└── WebSocket State Sync
```

### Data Flow Patterns
- **Unidirectional Flow**: Predictable state updates
- **Event-driven Updates**: Real-time state synchronization
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful error handling

## Build & Deployment

### Development Environment
- **Hot Reload**: Development server with hot module replacement
- **Source Maps**: Development debugging support
- **TypeScript**: Type-safe development
- **Linting**: ESLint and Prettier code quality

### Production Build
- **Code Splitting**: Optimized bundle loading
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and CSS optimization
- **Progressive Loading**: Lazy loading and prefetching

### Deployment Strategy
- **Static Assets**: CDN deployment for static resources
- **Container Deployment**: Docker-based application deployment
- **Environment Configuration**: Multi-environment support
- **Performance Monitoring**: Real-time performance analytics

## Security Architecture

### Frontend Security
- **Content Security Policy**: XSS prevention
- **HTTPS Enforcement**: Secure communication
- **Token Security**: Secure token storage and transmission
- **Input Sanitization**: Client-side input validation

### Data Protection
- **Sensitive Data Handling**: PII and security data protection
- **Local Storage Security**: Secure browser storage
- **Session Management**: Secure session lifecycle
- **Audit Logging**: User action tracking

## Performance Architecture

### Optimization Strategies
- **Component Memoization**: React.memo and useMemo optimization
- **Virtual Scrolling**: Large data set handling
- **Image Optimization**: Lazy loading and compression
- **Bundle Optimization**: Code splitting and caching

### Monitoring & Analytics
- **Performance Metrics**: Core Web Vitals tracking
- **User Experience Monitoring**: Real-time UX analytics
- **Error Tracking**: Comprehensive error monitoring
- **Usage Analytics**: Feature usage and optimization

## Testing Strategy

### Test Architecture
```
Testing Pyramid:
├── Unit Tests (Jest + React Testing Library)
├── Integration Tests (Component Integration)
├── E2E Tests (Cypress)
└── Visual Regression Tests
```

### Test Coverage
- **Component Testing**: Individual component validation
- **Hook Testing**: Custom hook functionality
- **Service Testing**: API integration testing
- **User Flow Testing**: End-to-end user scenarios

## Technology Stack

### Core Technologies
- **React 18+**: UI framework with concurrent features
- **TypeScript**: Type-safe JavaScript development
- **@appfabric**: Intuit design system and components
- **WebSocket**: Real-time communication

### Development Tools
- **Webpack**: Module bundling and optimization
- **Babel**: JavaScript transpilation
- **ESLint/Prettier**: Code quality and formatting
- **Jest/Cypress**: Testing frameworks

### External Integrations
- **OLORIN API**: Main backend service integration
- **MCP Protocol**: Direct tool integration
- **Authentication**: Enterprise SSO and identity providers
- **Monitoring**: Application performance monitoring

## Accessibility & UX

### Accessibility Features
- **WCAG 2.1 Compliance**: Web accessibility standards
- **Screen Reader Support**: Assistive technology compatibility
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: High contrast design support

### User Experience
- **Responsive Design**: Mobile and desktop optimization
- **Progressive Enhancement**: Graceful feature degradation
- **Loading States**: Comprehensive loading indicators
- **Error Recovery**: User-friendly error handling

## Future Enhancements

### Planned Features
- **Offline Support**: Enhanced offline capabilities
- **Mobile App**: Native mobile application
- **Advanced Visualization**: Enhanced data visualization
- **AI Assistant**: Integrated AI investigation assistant

### Technical Improvements
- **Micro-frontend Architecture**: Modular frontend architecture
- **Real-time Collaboration**: Enhanced multi-user features
- **Advanced Analytics**: Deep user behavior analytics
- **Performance Optimization**: Continued performance improvements

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2025  
**Architecture Owner**: OLORIN-WebPlugin Development Team  
**Framework Version**: React 18+
