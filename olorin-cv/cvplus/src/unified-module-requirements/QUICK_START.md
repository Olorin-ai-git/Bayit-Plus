# CVPlus Unified Module Requirements - Quick Start Guide

## 🚀 Installation

```bash
cd /Users/gklainert/Documents/cvplus/src/unified-module-requirements

# Install dependencies
npm install

# Build the system (with warnings - system still functional)
npm run build
```

## 🎯 Basic Usage

### **1. CLI Commands**

```bash
# Start the API server
npm start

# Use CLI tools directly with ts-node
npm run cli discover                    # Discover all CVPlus modules
npm run cli validate                    # Validate all modules
npm run cli compliance                  # Check architectural compliance
npm run cli health                      # System health check
```

### **2. API Server**

```bash
# Start server
npm start
# Server runs on http://localhost:3001

# Health check
curl http://localhost:3001/health

# API documentation
curl http://localhost:3001/api
```

### **3. Quick Validation Example**

```bash
# Validate specific modules
npm run cli validate --modules auth core cv-processing

# Generate HTML report
npm run cli architecture --format html --output report.html

# Quick compliance check
npm run cli compliance --format json
```

## 🏗️ Core Features

### **Architectural Requirements Validated:**

1. **Code Segregation** - No unnecessary code in modules
2. **Distribution Architecture** - Proper dist/ folders
3. **Real Implementation** - No mocks/stubs/placeholders
4. **Build Standards** - Clean builds and passing tests
5. **Dependency Integrity** - No circular dependencies

### **API Endpoints:**

```bash
POST /api/v1/validation/module          # Validate single module
POST /api/v1/validation/batch           # Validate multiple modules
POST /api/v1/architecture/analyze       # Complete architectural analysis
POST /api/v1/reporting/generate         # Generate reports
GET  /health                            # Health check
```

### **Report Formats:**
- HTML (interactive)
- JSON (programmatic)
- Markdown (documentation)
- CSV (spreadsheet)
- XML (enterprise)

## 📊 Example: Check CVPlus Compliance

```typescript
// Using the service directly
import { CVPlusIntegration } from './src/integration/CVPlusIntegration';

const integration = new CVPlusIntegration('/Users/gklainert/Documents/cvplus');

// Discover all modules
const modules = await integration.discoverModules();
console.log(`Found ${modules.length} modules`);

// Check architectural compliance
const compliance = await integration.checkArchitecturalCompliance();
console.log(`Compliance: ${compliance.compliancePercentage}%`);

// Get recommendations
compliance.recommendations.forEach(rec => console.log(`• ${rec}`));
```

## 🔧 Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run type-check

# Run tests
npm test

# Lint code
npm run lint
```

## 📝 Example Output

```
🔍 Discovering CVPlus modules...

📦 Found 12 modules:
  auth (1.2.0) ✅
  core (2.1.1) ✅
  cv-processing (1.8.3) ❌ (2 violations)
  multimedia (1.5.0) ✅
  analytics (2.0.1) ✅
  premium (1.4.2) ❌ (1 violation)
  ...

📊 Compliance Summary:
  Overall Compliance: ❌ (83%)
  Total Modules: 12
  Valid Modules: 10 ✅
  Invalid Modules: 2 ❌
  Critical Violations: 3 🔴

💡 Recommendations:
  • Fix 2 critical code segregation violations in cv-processing
  • Remove 1 mock implementation from premium module
  • All other modules are compliant ✅
```

## 🎯 Integration with CVPlus

The system automatically:
- Detects CVPlus root directory
- Discovers all modules in `/packages`
- Validates against architectural requirements
- Generates actionable reports
- Provides CLI and API interfaces

**Ready to ensure architectural excellence across all CVPlus modules! 🚀**