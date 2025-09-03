# OLORIN Backend Architecture Documentation

## Project Overview
**OLORIN (Olorin Fraud Investigation System)** is an enterprise-grade fraud investigation platform built with modern Python and React technologies, featuring AI-powered investigation agents and comprehensive risk assessment capabilities.

## High-Level Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────────┐
│                        OLORIN Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Applications                                          │
│  ├── olorin-front (React Investigation Dashboard)             │
│  └── olorin-web-portal (Marketing & Information Site)         │
├─────────────────────────────────────────────────────────────────┤
│  Backend Service (olorin-server:8000)                           │
│  ├── FastAPI Application with Authentication                  │
│  ├── AI Investigation Agents & Risk Assessment                │
│  ├── Multi-Domain Analysis Engine                             │
│  └── RESTful API Endpoints                                   │
├─────────────────────────────────────────────────────────────────┤
│  Investigation Agents & Tools                                  │
│  ├── Device Fingerprint Analysis Agent                        │
│  ├── Location Risk Assessment Agent                           │
│  ├── Network Analysis Agent                                   │
│  ├── Log Monitoring & Analysis Agent                          │
│  └── LLM-Powered Risk Assessment Engine                       │
├─────────────────────────────────────────────────────────────────┤
│  External Data Sources                                         │
│  ├── Splunk SIEM Logs                                        │
│  ├── Device Intelligence Services                            │
│  ├── Location & Geographic Services                          │
│  ├── Network Analysis Tools                                  │
│  └── Vector Search & Analysis                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core Service Architecture

### OLORIN Server (Port 8000)
- **Framework**: FastAPI with Python 3.11+
- **Package Management**: Poetry for dependency management
- **Investigation Engine**: Multi-agent investigation orchestration
- **API Endpoints**: RESTful APIs with comprehensive OpenAPI documentation
- **AI Integration**: LLM-powered risk assessment and analysis

### Key Components

#### 1. **Service Layer** (`app/service/`)
- **Investigation Agents**: Specialized agents for different analysis domains
- **Risk Assessment Engine**: AI-powered risk scoring and explanation
- **External Adapters**: Integration with Splunk, device intelligence, location services
- **Configuration Management**: Environment-specific settings and credentials

#### 2. **Router Layer** (`app/router/`)
- **Investigation API**: Core investigation workflow endpoints
- **Domain-Specific APIs**: Device, location, network, and logs analysis endpoints
- **Comment System**: Investigation notes and collaboration features
- **Demo & Testing**: Demo mode for presentations and testing

#### 3. **Models & Data** (`app/models/`)
- **Investigation Models**: Investigation state, results, and metadata
- **Risk Assessment Models**: Risk scores, factors, and detailed analysis
- **Agent Models**: Request/response schemas for investigation agents
- **API Models**: Pydantic schemas for all API endpoints

#### 4. **Agent Architecture** (`app/service/agent/`)
```
Agent Framework:
├── ato_agents/                 # Analysis and Testing Operation Agents
│   ├── anomaly_detection_agent/    # Behavioral anomaly detection
│   ├── device_fingerprint_agent/   # Device analysis and profiling
│   ├── location_data_agent/        # Geographic and location analysis
│   ├── network_analysis_agent/     # Network traffic and security analysis
│   ├── user_behavior_agent/        # User activity pattern analysis
│   ├── splunk_agent/              # SIEM log analysis
│   └── mysql_agent/               # Database investigation queries
└── tools/                      # Investigation Tools
    ├── splunk_tool/               # Splunk query and analysis
    ├── chronos_tool/              # Device timeline analysis
    ├── vector_search_tool/        # Similarity and pattern search
    └── snowflake_tool/            # Data warehouse analytics
```

## Investigation Workflow Architecture

### Multi-Domain Risk Assessment
The OLORIN system performs comprehensive risk assessment across four primary domains:

#### 1. **Device Analysis**
- **Data Sources**: Chronos device intelligence, device fingerprinting
- **Analysis**: Behavioral patterns, device anomalies, authentication patterns
- **Output**: Device risk score with detailed explanations

#### 2. **Location Analysis**
- **Data Sources**: Vector search, geographic services, location intelligence
- **Analysis**: Travel patterns, geographic anomalies, location consistency
- **Output**: Location risk assessment with geographic insights

#### 3. **Network Analysis**
- **Data Sources**: Splunk network logs, IP intelligence, connection analysis
- **Analysis**: Network behavior, IP reputation, connection patterns
- **Output**: Network security assessment with threat indicators

#### 4. **Log Analysis**
- **Data Sources**: Splunk SIEM logs, audit trails, activity logs
- **Analysis**: Activity patterns, suspicious behavior, timeline analysis
- **Output**: Log-based risk indicators and behavioral insights

### Investigation Process Flow
```
1. Investigation Request
   ├── Entity identification (user_id, device_id)
   ├── Time range specification
   └── Investigation parameters

2. Multi-Domain Data Collection
   ├── Device agent data gathering
   ├── Location services querying
   ├── Network analysis execution
   └── Log analysis processing

3. AI-Powered Risk Assessment
   ├── LLM analysis of collected data
   ├── Risk factor identification
   ├── Anomaly pattern detection
   └── Risk score calculation

4. Result Aggregation & Reporting
   ├── Domain-specific risk scores
   ├── Overall risk assessment
   ├── Detailed explanations and insights
   └── Actionable recommendations

5. Investigation Management
   ├── Investigation state persistence
   ├── Comment and collaboration system
   ├── PDF report generation
   └── Audit trail maintenance
```

## Authentication & Security Architecture

### Enterprise Authentication System
- **Token-based Authentication**: Secure API key management
- **Request Validation**: Comprehensive input validation and sanitization
- **Audit Logging**: Complete investigation audit trails
- **Role-based Access**: Configurable access controls (when needed)

### Security Features
- **Input Sanitization**: Protection against injection attacks
- **Secure Configuration**: Environment-based secrets management
- **Error Handling**: Secure error messages without information leakage
- **API Rate Limiting**: Protection against abuse and DoS attacks

## Performance & Scalability

### Response Time Targets
- **Investigation API**: <2s for standard investigations
- **Risk Assessment**: <5s for complex multi-domain analysis
- **Agent Communication**: <1s for individual agent queries
- **PDF Generation**: <3s for comprehensive reports

### Scalability Features
- **Containerization**: Docker-ready for cloud deployment
- **Horizontal Scaling**: Multiple instance support
- **Efficient Caching**: Intelligent caching of investigation results
- **Database Optimization**: Optimized queries and indexing

## Technology Stack

### Backend Technologies
- **Python 3.11+** with FastAPI framework
- **Poetry** for dependency management and virtual environments
- **Pydantic** for data validation and serialization
- **Asyncio** for asynchronous request handling
- **PyPDF** for investigation report generation

### External Integrations
- **Splunk**: SIEM log analysis and query execution
- **Vector Search**: Pattern matching and similarity analysis
- **Device Intelligence**: Device fingerprinting and analysis
- **Location Services**: Geographic and location intelligence

### Development & Testing
- **Pytest**: Comprehensive test suite with 1,050+ tests
- **Poetry**: Virtual environment and dependency management
- **Type Hints**: Full type annotation for development safety
- **OpenAPI**: Automatic API documentation generation

## Deployment Architecture

### Production Environment
- **Containerization**: Docker containers for consistent deployment
- **Process Management**: Gunicorn with Uvicorn workers
- **Load Balancing**: Nginx for reverse proxy and load distribution
- **Monitoring**: Health checks and performance monitoring

### Development Environment
- **Local Development**: Poetry virtual environment with hot reload
- **Testing Environment**: Isolated test database and mock services
- **Debugging**: Comprehensive logging and debugging tools
- **Development Server**: Uvicorn with auto-reload for development

---

**Document Version**: 2.0  
**Last Updated**: January 30, 2025  
**Architecture Owner**: OLORIN Development Team
