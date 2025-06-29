# OLORIN Architecture Documentation

## Project Overview
**OLORIN (Governance, Audit, Investigation & Analysis)** is an enterprise-grade security investigation platform built on modern microservices architecture with comprehensive authentication, authorization, and monitoring capabilities.

## High-Level Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────────┐
│                        OLORIN Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer (olorin-webplugin)                              │
│  ├── React Components with @appfabric Integration             │
│  ├── Authentication UI & Token Management                     │
│  └── Real-time Investigation Dashboard                        │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway & Main Service (olorin:8000)                       │
│  ├── FastAPI Application with Authentication                  │
│  ├── Investigation Workflows & Agent Orchestration            │
│  ├── MCP Proxy Endpoints                                      │
│  └── WebSocket Communication                                  │
├─────────────────────────────────────────────────────────────────┤
│  MCP Service Layer (olorin-mcp:3000)                           │
│  ├── Model Context Protocol Server                            │
│  ├── Tool Management & Execution                              │
│  └── Cross-Service Communication                              │
├─────────────────────────────────────────────────────────────────┤
│  Shared Tools Library (olorin-tools)                            │
│  ├── Reusable Investigation Tools                             │
│  ├── Security Adapters (Splunk, OII, Vector Search)          │
│  └── Enterprise SDK Integrations                              │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations                                        │
│  ├── Splunk SIEM                                             │
│  ├── Identity Providers                                       │
│  ├── Vector Search Services                                   │
│  └── Enterprise Security Tools                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core Service Architecture

### Main OLORIN Service (Port 8000)
- **Framework**: FastAPI with Python 3.11+
- **Authentication**: Multi-tier enterprise authentication system
- **Investigation Engine**: Autonomous agent-based investigation workflows
- **API Endpoints**: RESTful APIs with OpenAPI specifications
- **Real-time Communication**: WebSocket support for live updates

### Key Components
1. **Service Layer** (`app/service/`)
   - Authentication services (AuthZ SDK, Identity SDK, Security Monitoring)
   - Investigation agents and workflows
   - External adapter integrations
   
2. **Router Layer** (`app/router/`)
   - API endpoint definitions
   - Request/response handling
   - Authentication middleware

3. **Models** (`app/models/`)
   - Pydantic data models
   - API request/response schemas
   - Domain entity definitions

## Authentication Architecture

### Multi-Phase Authentication System
```
Phase 1: AuthZ SDK Foundation
├── Role-based access control
├── Audit trail system
└── Standard authentication headers

Phase 2: Frontend Integration
├── @appfabric UI components
├── Token lifecycle management
└── Secure session handling

Phase 3: Enterprise Security
├── Identity SDK (375 lines)
├── Security Monitoring (576 lines)
└── Service Mesh Auth (595 lines)

Phase 4: Production Integration
├── Production Identity SDK (111 lines)
├── Production AuthZ Service (93 lines)
└── Performance optimization (<20ms)
```

### Security Features
- **Sub-20ms authentication** latency
- **10 security event types** with real-time threat detection
- **5 authentication methods** for service mesh
- **Enterprise compliance** with audit trail
- **Threat detection** with automated response

## Performance Specifications

### Response Time Targets
- **Authentication**: <20ms (Production), <30ms (Enterprise SLA)
- **API Endpoints**: <100ms for standard operations
- **Investigation Queries**: <5s for complex analysis
- **Real-time Updates**: <100ms WebSocket latency

### Scalability
- **Horizontal scaling** via container orchestration
- **Microservices architecture** for independent scaling
- **Caching layers** with 85% hit ratio
- **Load balancing** across service instances

## Technology Stack

### Backend Technologies
- **Python 3.11+** with FastAPI framework
- **Pydantic** for data validation
- **SQLAlchemy** for database operations
- **Redis** for caching and session management
- **JWT** for token-based authentication

### Infrastructure
- **Kubernetes** for container orchestration
- **Docker** for containerization
- **Nginx** for load balancing and reverse proxy
- **Monitoring** with health checks and metrics

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2025  
**Architecture Owner**: OLORIN Development Team
