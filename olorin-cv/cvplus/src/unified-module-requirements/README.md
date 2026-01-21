# CVPlus Unified Module Requirements System

A comprehensive validation and architectural compliance system for CVPlus modules, ensuring adherence to the 5 critical architectural requirements.

## 🎯 Purpose

The Unified Module Requirements System validates CVPlus modules against critical architectural standards:

1. **Code Segregation Principle** - Each module should NOT have any code not required by it
2. **Distribution Architecture** - Modules MUST have a proper dist/ folder with compiled, production-ready code
3. **Real Implementation Only** - Modules must NOT contain mock implementations, stubs, or placeholders
4. **Build and Test Standards** - All modules must build without errors and have a passing test suite
5. **Dependency Chain Integrity** - No circular dependencies between modules

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the API server
npm start

# Or run the CLI
npm run cli discover
```

### CLI Usage

```bash
# Discover all CVPlus modules
umr discover

# Validate all modules
umr validate

# Check architectural compliance
umr compliance

# Generate architectural analysis
umr architecture --format html --output report.html

# Check system health
umr health

# Start API server
umr server --port 3001
```

### API Usage

```bash
# Start the server
npm start

# Health check
curl http://localhost:3001/health

# Validate a module
curl -X POST http://localhost:3001/api/v1/validation/module \
  -H "Content-Type: application/json" \
  -d '{
    "modulePath": "/path/to/module",
    "enableStrictMode": false
  }'

# Generate architectural analysis
curl -X POST http://localhost:3001/api/v1/architecture/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "modulePaths": ["/path/to/module1", "/path/to/module2"],
    "checks": ["segregation", "distribution", "mocks", "build", "dependencies"]
  }'
```

## 📡 API Endpoints

### Validation
- `POST /api/v1/validation/module` - Validate a single module
- `POST /api/v1/validation/batch` - Validate multiple modules
- `GET /api/v1/validation/rules` - Get validation rules

### Architecture
- `POST /api/v1/architecture/analyze` - Comprehensive architectural analysis
- `POST /api/v1/architecture/segregation` - Code segregation analysis
- `POST /api/v1/architecture/distribution` - Distribution validation
- `POST /api/v1/architecture/mocks` - Mock detection
- `POST /api/v1/architecture/build` - Build validation
- `POST /api/v1/architecture/dependencies` - Dependency analysis
- `GET /api/v1/architecture/requirements` - Get architectural requirements

### Templates
- `GET /api/v1/templates` - List available templates
- `POST /api/v1/templates/generate` - Generate from template
- `GET /api/v1/templates/search` - Search templates

### Reporting
- `POST /api/v1/reporting/generate` - Generate comprehensive reports
- `POST /api/v1/reporting/quick` - Quick summary reports
- `GET /api/v1/reporting/formats` - Available report formats
- `GET /api/v1/reporting/templates` - Report templates

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with service diagnostics
- `GET /health/ready` - Readiness probe for Kubernetes
- `GET /health/live` - Liveness probe for Kubernetes

## 🏗️ Architecture

### Core Components

1. **ModuleValidator** - Primary validation engine
2. **ArchitecturalAnalyzers** - Specialized analyzers for each requirement
3. **TemplateManager** - Template-based validation configuration
4. **ReportingService** - Multi-format report generation
5. **CVPlusIntegration** - Seamless integration with CVPlus monorepo

### Validation Pipeline

```
Module Path → Discovery → Validation → Analysis → Reporting
     ↓           ↓           ↓           ↓          ↓
   Scan      Parse       Apply       Detect    Generate
   Files     AST         Rules      Issues     Report
```

### Service Architecture

```
CLI/API Layer
     ↓
Service Factory
     ↓
Core Services (Validation, Architecture, Reporting)
     ↓
Analyzers (Segregation, Distribution, Mock, Build, Dependency)
     ↓
File System / AST Parsing
```

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
UMR_PORT=3001
UMR_HOST=0.0.0.0
UMR_ENVIRONMENT=development

# Validation configuration
UMR_MAX_CONCURRENT_VALIDATIONS=5
UMR_VALIDATION_TIMEOUT_MS=300000
UMR_ENABLE_STRICT_MODE=false

# Build configuration
UMR_ENABLE_PARALLEL_BUILDS=true
UMR_BUILD_TIMEOUT_MS=600000

# Logging configuration
UMR_LOG_LEVEL=info
UMR_ENABLE_REQUEST_LOGGING=true
```

### CVPlus Integration

The system automatically detects the CVPlus root directory and discovers all modules in the `packages/` directory. You can override the detection:

```bash
export CVPLUS_ROOT=/path/to/cvplus
```

## 📊 Report Formats

The system supports multiple report formats:

- **HTML** - Interactive reports with charts and responsive design
- **JSON** - Structured data for programmatic consumption
- **Markdown** - Documentation-friendly format
- **CSV** - Spreadsheet-compatible data export
- **XML** - Enterprise system integration format

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## 🔍 Development

### Building

```bash
# Clean build
npm run clean
npm run build

# Watch mode for development
npm run build:watch

# Development server with hot reload
npm run dev
```

### Project Structure

```
src/
├── models/           # Type definitions and interfaces
├── lib/             # Core library components
│   ├── validation/  # Validation engine
│   ├── architecture/ # Architectural analyzers
│   ├── templates/   # Template management
│   ├── reporting/   # Report generation
│   └── utils/       # Utility functions
├── api/             # REST API implementation
│   ├── routes/      # API route handlers
│   ├── middleware/  # Express middleware
│   └── server.ts    # Express server setup
├── cli/             # Command-line interface
├── bin/             # Executable scripts
├── integration/     # CVPlus integration layer
└── config/          # Configuration management
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the documentation and examples
- Review the health check endpoints for system status

---

**CVPlus Unified Module Requirements System** - Ensuring architectural excellence across all CVPlus modules.