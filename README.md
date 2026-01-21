# Olorin.ai Ecosystem

**Unified AI-powered enterprise platform delivering fraud detection, media streaming, professional CV services, and marketing solutions.**

## 🏗️ Project Architecture

Olorin is built as a comprehensive monorepo with multiple specialized platforms:

```
olorin/
├── olorin-core/            # Shared packages (@olorin/*)
├── olorin-fraud/           # Fraud Detection Platform (git subtree)
│   ├── backend/            # Python FastAPI + AI/ML agents
│   └── frontend/           # React TypeScript microservices
├── olorin-media/           # Media Platforms (git subtrees)
│   ├── bayit-plus/         # Bayit+ Streaming Platform
│   └── israeli-radio-manager/  # Radio Management Platform
├── olorin-cv/              # CV Platform (git subtree)
│   └── cvplus/             # Professional CV/Resume Builder
├── olorin-omen/            # Omen Platform (git subtree)
│   └── ios-app/            # iOS Application
├── olorin-portals/         # Marketing Websites
│   ├── portal-fraud/       # Fraud Detection Marketing
│   ├── portal-streaming/   # Bayit+ Marketing
│   ├── portal-radio/       # Radio Manager Marketing
│   └── portal-main/        # Main Olorin.ai Portal
├── docs/                   # Comprehensive documentation
└── scripts/                # Build and deployment scripts
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** with Poetry (for fraud backend)
- **Node.js 20+** with npm 10+ (for all frontend services)
- **Git** for version control
- **Turbo** for monorepo orchestration (installed automatically)

### Monorepo Setup
```bash
# Install all dependencies across platforms
npm install

# Start all Olorin services
npm run olorin

# Or start individual platforms
npm run dev:fraud        # Fraud Detection Platform
npm run dev:media        # Media Platforms
npm run dev:cv           # CV Platform

# Build all platforms
npm run build

# Or build individual platforms
npm run build:fraud
npm run build:media
npm run build:cv
npm run build:portals
```

### Git Subtrees Management
```bash
# Pull updates from upstream repositories
npm run subtree:pull

# Push changes back to upstream repositories
npm run subtree:push

# Or use the sync script directly
./scripts/sync-subtrees.sh pull bayit-plus
./scripts/sync-subtrees.sh pull israeli-radio-manager
./scripts/sync-subtrees.sh pull cvplus
./scripts/sync-subtrees.sh pull fraud-detection
./scripts/sync-subtrees.sh pull omen
```

## 📊 Platform Status

| Platform | Status | Build | Deployment |
|----------|--------|-------|------------|
| **Fraud Detection** | ✅ Fully Functional | ✅ Ready | ✅ Production Ready |
| **Bayit+ Streaming** | ✅ Fully Functional | ✅ Ready | ✅ Production Ready |
| **Israeli Radio Manager** | ✅ Fully Functional | ✅ Ready | ✅ Production Ready |
| **CV Plus** | ✅ Functional | ✅ Ready | 🚧 In Development |
| **Omen iOS** | ✅ Functional | ✅ Ready | 🚧 In Development |
| **Marketing Portals** | ✅ Fully Functional | ✅ Ready | ✅ Production Ready |
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

### Monorepo Infrastructure
- **Package Manager**: npm workspaces
- **Build Orchestration**: Turbo (caching, task scheduling)
- **Git Strategy**: Subtrees for platform independence
- **Shared Packages**: @olorin/* (core, auth, ui-components)

### Fraud Detection Platform
- **Backend**: FastAPI (Python 3.11+), Poetry, LangChain, MongoDB
- **Frontend**: React 18 + TypeScript, Webpack Module Federation (6 microservices)
- **Features**: AI agents, real-time analytics, investigation dashboard

### Media Platforms (Bayit+, Israeli Radio)
- **Backend**: FastAPI (Python), Firebase, GCS
- **Frontend**: React Native (mobile/tvOS), React (web)
- **Styling**: TailwindCSS + @bayit/glass components
- **Features**: VOD streaming, live radio, content management

### CV Plus Platform
- **Backend**: Firebase Functions (TypeScript)
- **Frontend**: React + TypeScript
- **Architecture**: Nx monorepo with modular packages
- **Features**: AI-enhanced CV generation, templates, export

### Marketing Portals
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS + shared design system
- **Features**: Multi-language, responsive, SEO-optimized

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
