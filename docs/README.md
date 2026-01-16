# 🚀 OLORIN Documentation Hub

**Welcome to the unified documentation for the OLORIN (Generative AI Investigation Assistant) ecosystem.**

## 🏗️ Project Architecture

### Core Components
- **[olorin-server](../olorin-server/)** - Python FastAPI backend with AI agents and investigation tools
- **[olorin-front](../olorin-front/)** - React TypeScript frontend application for investigations
- **[olorin-web-portal](../olorin-web-portal/)** - Marketing website and product information portal

### Architecture Documentation
- 📋 [System Architecture Overview](architecture/olorin-system-overview.md)
- 🖥️ [Backend Architecture](architecture/olorin-architecture.md)
- 🎨 [Frontend Architecture](architecture/olorin-front-architecture.md)
- 🌐 [Web Portal Architecture](architecture/olorin-web-portal-architecture.md)

## 📚 Documentation Categories

### 🤖 MCP Integration (Model Context Protocol)
- [MCP Integration Comprehensive Guide](integration/MCP_INTEGRATION_COMPREHENSIVE_GUIDE.md) - Complete technical overview of MCP integration
- [MCP Investigator Guide](user-guides/MCP_INVESTIGATOR_GUIDE.md) - User guide for fraud investigators using Claude Desktop
- [MCP API Documentation](api/MCP_API_DOCUMENTATION.md) - Complete API reference for developers
- [MCP Security & Compliance Guide](security/MCP_SECURITY_COMPLIANCE_GUIDE.md) - Enterprise security and compliance framework  
- [MCP Operations & Monitoring Guide](operations/MCP_OPERATIONS_MONITORING_GUIDE.md) - Operations and monitoring procedures

### 🔌 API Integration
- [API Integration Guide](api/API_INTEGRATION_GUIDE.md)
- [Polling API Examples](api/POLLING_API_EXAMPLES.md)

### 🗄️ Database Migration (PostgreSQL → MongoDB Atlas)
- [MongoDB Migration README](MONGODB_README.md) - Documentation index and quick reference
- [MongoDB Migration Complete Guide](MONGODB_MIGRATION_COMPLETE.md) - Master guide for entire migration
- [MongoDB Configuration Guide](MONGODB_CONFIGURATION.md) - Comprehensive Atlas setup and tuning
- [MongoDB Startup Integration](MONGODB_STARTUP_INTEGRATION.md) - Application integration guide
- [MongoDB Service Migration Guide](MONGODB_SERVICE_MIGRATION_GUIDE.md) - Service layer conversion patterns
- [MongoDB API Migration Guide](MONGODB_API_MIGRATION_GUIDE.md) - API endpoint conversion patterns
- [MongoDB Reference Implementation](MONGODB_REFERENCE_IMPLEMENTATION.md) - Complete router migration example

**Status**: ✅ Ready for production deployment (all infrastructure complete)

### 🎨 Frontend Development
- [Frontend Guides](frontend/) - Component development, UI patterns
- [Frontend Polling Specification](frontend/FRONTEND_POLLING_SPECIFICATION.md)
- [VAN Security Summary](frontend/OLORIN_Frontend_VAN_Summary.md)
- [API Documentation](frontend/OLORIN_API_Documentation.md)
- [User Manual](frontend/OLORIN_User_Manual.md)

### 🔐 Authentication & Security
- [Authentication Program Summary](authentication/AUTHENTICATION_PROGRAM_COMPLETE_SUMMARY.md)
- [Security Guidelines](security/SECURITY_GUIDELINES.md)
- [WebSocket Configuration](security/WEBSOCKET_CONFIGURATION_GUIDE.md)

### 🚀 Deployment & Build
- [Build Completion Guides](build-deployment/)

### 🛠️ Development
- [Custom Prompt Usage](development/Custom_Prompt_Usage_Guide.md)
- [Settings Component Implementation](development/settings-component-breakdown-implementation-summary.md)

### 🔧 Troubleshooting
- [Critical Emergency Fixes](troubleshooting/ARCHIVE_CRITICAL_EMERGENCY_FIX_20250128.md)
- [Day 3 Integration Polish](troubleshooting/Day3_Integration_Polish_Summary.md)

## 🚀 Quick Start Guides

### For Developers
1. **Setup**: Follow development setup guides in [development/](development/)
2. **Architecture**: Review [architecture/](architecture/) for system understanding
3. **API Integration**: Use [api/](api/) guides for service integration

### For Frontend Developers
1. **Component Development**: Check [frontend/](frontend/) for UI patterns and guides
2. **API Integration**: Review [frontend/OLORIN_API_Documentation.md](frontend/OLORIN_API_Documentation.md)
3. **Security**: Follow [frontend/OLORIN_Frontend_VAN_Summary.md](frontend/OLORIN_Frontend_VAN_Summary.md)

### For Operators  
1. **Deployment**: Check [build-deployment/](build-deployment/) for deployment guides
2. **Security**: Review [security/](security/) for security configuration
3. **Troubleshooting**: Use [troubleshooting/](troubleshooting/) for issue resolution

## 📊 Project Status

- ✅ **Backend (olorin-server)**: Python FastAPI with 1,050+ tests passing, production ready
- ✅ **Frontend (olorin-front)**: React TypeScript SPA with comprehensive investigation tools
- ✅ **Web Portal (olorin-web-portal)**: Marketing site with multi-language support
- ✅ **MCP Integration**: Complete Model Context Protocol integration with 200+ investigation tools
- ✅ **Documentation**: Comprehensive technical guides and architecture documentation

## 🎯 Key Features

### Investigation Platform
- **Multi-Domain Analysis**: Device, location, network, and logs risk assessment
- **AI-Powered Insights**: LLM-driven risk analysis with natural language explanations
- **Real-Time Processing**: Immediate investigation results and reporting
- **Comprehensive Dashboard**: User-friendly interface for fraud investigators
- **MCP Integration**: Natural language investigation through Claude Desktop with 200+ specialized tools

### Development Features
- **Modern Tech Stack**: Python 3.11, React 18, TypeScript, Tailwind CSS
- **Production Ready**: Comprehensive testing, monitoring, and deployment capabilities
- **Developer Friendly**: Clear documentation, code standards, and contribution guides
- **Scalable Architecture**: Designed for enterprise-scale fraud investigation workflows

## 🚀 Getting Started

### Quick Setup
1. **Backend**: `cd olorin-server && poetry install && poetry run uvicorn app.main:app`
2. **Frontend**: `cd olorin-front && npm install && npm start`  
3. **Portal**: `cd olorin-web-portal && npm install && npm run dev`

### Documentation Navigation
- **New to Olorin?** Start with [System Overview](architecture/olorin-system-overview.md)
- **Setting up Development?** Check [Development Guides](development/)
- **Integrating APIs?** Review [API Documentation](api/)
- **Deploying to Production?** Follow [Deployment Guides](build-deployment/)

---

**📍 Note**: This unified documentation hub provides comprehensive technical documentation for the complete Olorin fraud investigation platform.
