# Olorin - Generative AI Agentic Solutions for Enterprise Fraud Prevention

**Advanced AI-powered fraud detection and investigation platform leveraging multi-agent systems and real-time analytics.**

## 🏗️ Project Architecture

Olorin is built as a comprehensive multi-component system:

```
olorin/
├── olorin-server/          # Python FastAPI backend
├── olorin-front/           # React frontend application  
├── olorin-web-portal/      # Marketing website
├── docs/                   # Comprehensive documentation
├── project-management/     # Project planning & status files
└── test/                   # Cross-component tests
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** with Poetry
- **Node.js 18+** with npm
- **Git** for version control

### Backend Server (olorin-server)
```bash
cd olorin-server
poetry install
poetry run python -m app.local_server
```

### Frontend Application (olorin-front)
```bash
cd olorin-front
npm install
npm start                                    # Development
TSC_COMPILE_ON_ERROR=true npm run build    # Production
```

### Web Portal (olorin-web-portal)
```bash
cd olorin-web-portal
npm install --legacy-peer-deps
npm start                                    # Development
npm run build                               # Production
```

## 📊 Component Status

| Component | Status | Build | Deployment |
|-----------|--------|-------|------------|
| **olorin-server** | ✅ Fully Functional | ✅ Ready | ✅ Production Ready |
| **olorin-front** | ✅ Functional | ⚠️ With Warnings | ✅ Production Ready |
| **olorin-web-portal** | ✅ Fully Functional | ✅ Clean | ✅ Production Ready |
| **Documentation** | ✅ Complete | N/A | ✅ Ready |

## 🛠️ Development

### Development Workflow
1. **Backend**: Start the FastAPI server for API development
2. **Frontend**: Run React development server with hot reload
3. **Testing**: Use component-specific test suites
4. **Documentation**: Reference `/docs` for technical guides

### Build Commands
```bash
# All components production build
cd olorin-server && poetry install
cd ../olorin-front && npm install && TSC_COMPILE_ON_ERROR=true npm run build
cd ../olorin-web-portal && npm install --legacy-peer-deps && npm run build
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **API Documentation**: OpenAPI specs and integration guides
- **Architecture**: System design and component interactions  
- **Development**: Setup, workflows, and best practices
- **Deployment**: Production deployment guides
- **Security**: Security guidelines and configurations

## 🔧 Technical Stack

### Backend (olorin-server)
- **Framework**: FastAPI (Python)
- **Dependencies**: Poetry management
- **Features**: AI agents, real-time analytics, fraud detection

### Frontend (olorin-front)  
- **Framework**: React 18 with TypeScript
- **Build**: Create React App with custom configurations
- **Features**: Investigation interface, real-time dashboards

### Web Portal (olorin-web-portal)
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Features**: Marketing site, multi-language support

## 🚀 Deployment

### Production Deployment
Each component is production-ready with established build processes:

- **Containerization**: Docker support available
- **Cloud Deployment**: Compatible with major cloud providers
- **Monitoring**: Built-in logging and metrics
- **Scaling**: Horizontal scaling support

### Environment Configuration
- Development: Local development servers
- Staging: Pre-production testing environment  
- Production: Full-scale deployment with monitoring

## 🛡️ Code Quality & Compliance

### Pre-Commit Hooks System

Olorin enforces **ZERO TOLERANCE for mock data** through an enterprise-grade pre-commit hook system:

```bash
# Quick setup (5 minutes)
./scripts/setup-hooks.sh install

# Validate installation
./scripts/setup-hooks.sh test
```

**Key Features:**
- **248+ Detection Patterns** across 4 severity levels (CRITICAL, HIGH, MEDIUM, LOW)
- **High Performance**: 45+ files/sec scanning with multi-threading
- **Enterprise Integration**: CI/CD, monitoring, and compliance reporting
- **Zero False Negatives**: Prevents mock data from reaching production

**Documentation:**
- 📖 [Setup Guide](docs/development/PRE_COMMIT_HOOKS_SETUP.md) - Complete installation and configuration
- 👨‍💻 [Developer Onboarding](docs/development/DEVELOPER_ONBOARDING.md) - New team member guide
- 🔧 [Administration Guide](docs/development/HOOKS_ADMINISTRATION.md) - Enterprise deployment and management
- 📚 [Technical Reference](docs/development/MOCK_DETECTION_REFERENCE.md) - Pattern catalog and API documentation
- 🚨 [Troubleshooting Guide](docs/development/TROUBLESHOOTING_GUIDE.md) - Problem resolution procedures

**For Administrators:**
- Team-wide deployment procedures
- CI/CD pipeline integration (GitHub Actions, Jenkins, GitLab CI)
- Monitoring dashboards and compliance reporting
- Emergency bypass protocols for critical situations

**For Developers:**
- Automatic enforcement on every commit
- IDE integration (VS Code, PyCharm, others)
- Clear violation reporting with remediation guidance
- Support for legitimate test data and documentation examples

## 🤝 Contributing

1. **Setup**: Follow the Quick Start guide
2. **Install Hooks**: Run `./scripts/setup-hooks.sh install` (required for all developers)
3. **Development**: Use established workflows in `/docs/development`
4. **Testing**: Run component test suites before submitting
5. **Documentation**: Update relevant docs for changes

## 📄 License

Enterprise software - See license documentation for details.

## 🔗 Resources

- **Project Management**: `/project-management` - Planning and status files
- **Technical Docs**: `/docs` - Comprehensive technical documentation  
- **Issue Tracking**: Use established project management workflows
- **Support**: Reference documentation and development guides

---

**Olorin.ai** - Transforming enterprise fraud prevention through advanced AI agentic solutions.
