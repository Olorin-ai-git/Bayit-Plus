# OLORIN-FRONT COMPONENT DIAGRAMS

**Component**: olorin-front (React TypeScript Frontend)  
**Purpose**: Investigation dashboard and user interface  
**Architecture**: Modern React SPA with Material-UI  
**Created**: January 31, 2025  

---

## 📊 COMPONENT OVERVIEW

The **olorin-front** component is a sophisticated React TypeScript application that serves as the primary user interface for the Olorin fraud investigation platform. Built with modern React patterns and Material-UI components, it provides investigators with powerful tools for conducting and managing fraud investigations.

### 🎯 Key Capabilities
- **Investigation Management**: Create, track, and analyze fraud investigations
- **Real-time Dashboard**: Live investigation status and agent progress tracking
- **AI Agent Integration**: Interactive tools for AI-powered investigation assistance
- **Report Generation**: Export and visualization of investigation results
- **Multi-language Support**: Internationalization with NLS (National Language Support)

### 🏗️ Architecture Highlights
- **React 18**: Modern React with TypeScript for type safety
- **Material-UI 5**: Professional UI components with custom theming
- **React Router**: Client-side routing with protected routes
- **Service Layer**: Clean separation between UI and API logic
- **State Management**: Context-based state with custom hooks
- **Testing**: Comprehensive test suite with Jest and React Testing Library

---

## 📋 AVAILABLE DIAGRAMS

### 1. [Frontend Application Architecture](frontend-application-architecture.md)
Complete React application structure showing component hierarchy, routing, and state management patterns.

### 2. [Investigation Dashboard Architecture](investigation-dashboard-architecture.md)
Detailed view of the investigation interface, real-time updates, and agent coordination components.

### 3. [User Interface Flow](user-interface-flow.md)
User journey mapping from landing to investigation completion, including navigation and workflow patterns.

### 4. [Service Layer Architecture](service-layer-architecture.md)
Backend integration patterns, API clients, and data flow between frontend and olorin-server.

---

## 🔧 TECHNICAL SPECIFICATIONS

### Technology Stack
- **React**: 18.2.0 with TypeScript
- **Material-UI**: 5.17.1 with emotion styling
- **Routing**: React Router DOM 6.11.0
- **State Management**: React Context + Custom Hooks
- **Styling**: Tailwind CSS 3.3.0 + styled-components
- **API Client**: Axios for HTTP requests
- **Maps Integration**: Google Maps API Loader
- **Testing**: Jest + React Testing Library
- **Build**: React Scripts 5.0.1

### Key Dependencies
```json
{
  "@mui/material": "5.17.1",
  "@mui/icons-material": "5.17.1",
  "react": "18.2.0",
  "react-router-dom": "6.11.0",
  "axios": "1.4.0",
  "styled-components": "6.1.18",
  "tailwindcss": "3.3.0"
}
```

### Performance Characteristics
- **Bundle Size**: ~2.5MB (optimized production build)
- **Load Time**: <3 seconds on standard connections
- **Real-time Updates**: WebSocket integration for live investigation status
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Accessibility**: WCAG 2.1 AA compliance with Material-UI components

---

## 🚀 INTEGRATION PATTERNS

### Backend Communication
- **REST API**: Primary communication with olorin-server
- **WebSocket**: Real-time investigation updates and agent status
- **Authentication**: JWT-based auth with automatic token refresh
- **Error Handling**: Comprehensive error boundaries and user feedback

### External Services
- **Google Maps**: Location visualization and analysis
- **Browser APIs**: File upload, local storage, and notifications
- **MCP Integration**: Model Context Protocol for AI tool integration

### Development Workflow
- **Hot Reload**: Fast development with React Fast Refresh
- **Type Safety**: Full TypeScript integration with strict mode
- **Code Quality**: ESLint + Prettier with pre-commit hooks
- **Testing**: Unit tests with >85% coverage requirement

---

## 📈 COMPONENT METRICS

| Metric | Value | Notes |
|--------|-------|-------|
| **Components** | 25+ | React components and pages |
| **Services** | 4 | API integration services |
| **Routes** | 8 | Protected and public routes |
| **Hooks** | 10+ | Custom React hooks |
| **Test Coverage** | 85%+ | Unit and integration tests |
| **Bundle Size** | 2.5MB | Optimized production build |
| **Load Time** | <3s | Average page load time |
| **TypeScript** | 100% | Full type coverage |

---

## 🔗 RELATED DOCUMENTATION

### Component Architecture
- [olorin-server Backend](../olorin-server/) - Backend service integration
- [System Overview](../../system/olorin-ecosystem-overview.md) - Complete system context

### Technical Implementation
- [API Architecture](../../technical/api-architecture.md) - Backend API integration
- [Security Architecture](../../technical/security-architecture.md) - Authentication and security

### Process Flows
- [Investigation Workflow](../../flows/investigation-workflow.md) - End-to-end investigation process
- [Authentication Flow](../../flows/authentication-flow.md) - User authentication patterns

---

**Last Updated**: January 31, 2025  
**Maintainer**: Olorin Frontend Team  
**Status**: 🔧 **ACTIVE DEVELOPMENT** 