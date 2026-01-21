#!/bin/bash

# CVPlus Dependency Graph Visualization Script
# Author: Gil Klainert
# Purpose: Generate visual dependency graphs and analysis

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 CVPlus Dependency Graph Visualization${NC}"
echo "========================================"

# Check if we're in the CVPlus root directory
if [ ! -f "package.json" ] || ! grep -q "cvplus" package.json; then
    echo -e "${RED}❌ Error: Please run this script from the CVPlus root directory${NC}"
    exit 1
fi

# Parse command line arguments
VIZ_MODE=${1:-"nx"}  # nx, madge, mermaid, all

case $VIZ_MODE in
    "nx")
        echo -e "${YELLOW}📈 Nx Dependency Graph${NC}"
        echo "Opening interactive Nx dependency graph in browser..."
        npm run build:graph
        ;;
        
    "madge")
        echo -e "${YELLOW}🔍 Madge Dependency Analysis${NC}"
        
        echo "Generating circular dependency report..."
        npx madge --circular --extensions ts,tsx packages/*/src > dependency-analysis.txt || echo "No circular dependencies found" > dependency-analysis.txt
        
        echo "Generating dependency tree..."
        npx madge --extensions ts,tsx --image dependency-tree.svg packages/*/src
        
        echo "Generating JSON dependency data..."
        npx madge --extensions ts,tsx --json packages/*/src > dependencies.json
        
        echo -e "${GREEN}✅ Madge analysis complete:${NC}"
        echo "  - dependency-analysis.txt (circular deps)"
        echo "  - dependency-tree.svg (visual tree)"
        echo "  - dependencies.json (raw data)"
        ;;
        
    "mermaid")
        echo -e "${YELLOW}🎨 Mermaid Dependency Diagram${NC}"
        
        cat > docs/diagrams/dependency-architecture.mermaid << 'EOF'
graph TD
    %% Layer 0 - Foundation
    Core[Core<br/>Types, Utils, Constants]
    
    %% Layer 1 - Base Services
    Auth[Auth<br/>Authentication & Session]
    I18n[I18n<br/>Internationalization]
    
    %% Layer 2 - Domain Services
    CV[CV-Processing<br/>AI-Powered CV Analysis]
    MM[Multimedia<br/>Media Processing]
    Analytics[Analytics<br/>Data Intelligence]
    
    %% Layer 3 - Business Services
    Premium[Premium<br/>Subscription & Billing]
    Rec[Recommendations<br/>AI Recommendations]
    Pub[Public-Profiles<br/>Portfolio Management]
    
    %% Layer 4 - Orchestration Services
    Admin[Admin<br/>System Management]
    Work[Workflow<br/>Process Orchestration]
    Pay[Payments<br/>Payment Processing]
    
    %% Applications
    Frontend[Frontend<br/>React Application]
    Functions[Functions<br/>Firebase Backend]
    
    %% Dependencies
    Auth --> Core
    I18n --> Core
    
    CV --> Core
    CV --> Auth
    CV --> I18n
    
    MM --> Core
    MM --> Auth
    MM --> I18n
    
    Analytics --> Core
    Analytics --> Auth
    Analytics --> I18n
    
    Premium --> Core
    Premium --> Auth
    Premium --> I18n
    Premium --> CV
    Premium --> MM
    Premium --> Analytics
    
    Rec --> Core
    Rec --> Auth
    Rec --> I18n
    Rec --> CV
    Rec --> MM
    Rec --> Analytics
    
    Pub --> Core
    Pub --> Auth
    Pub --> I18n
    Pub --> CV
    Pub --> MM
    Pub --> Analytics
    
    Admin --> Core
    Admin --> Auth
    Admin --> I18n
    Admin --> CV
    Admin --> MM
    Admin --> Analytics
    Admin --> Premium
    Admin --> Rec
    Admin --> Pub
    
    Work --> Core
    Work --> Auth
    Work --> I18n
    Work --> CV
    Work --> MM
    Work --> Analytics
    Work --> Premium
    Work --> Rec
    Work --> Pub
    
    Pay --> Core
    Pay --> Auth
    Pay --> I18n
    Pay --> CV
    Pay --> MM
    Pay --> Analytics
    Pay --> Premium
    Pay --> Rec
    Pay --> Pub
    
    Frontend --> Core
    Frontend --> Auth
    Frontend --> I18n
    Frontend --> CV
    Frontend --> MM
    Frontend --> Analytics
    Frontend --> Premium
    Frontend --> Rec
    Frontend --> Pub
    
    Functions --> Admin
    Functions --> Work
    Functions --> Pay
    
    %% Styling
    classDef layer0 fill:#e1f5fe,stroke:#0277bd,stroke-width:3px
    classDef layer1 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef layer2 fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef layer3 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef layer4 fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef app fill:#f5f5f5,stroke:#424242,stroke-width:2px
    
    class Core layer0
    class Auth,I18n layer1
    class CV,MM,Analytics layer2
    class Premium,Rec,Pub layer3
    class Admin,Work,Pay layer4
    class Frontend,Functions app
EOF
        
        echo -e "${GREEN}✅ Mermaid diagram created at docs/diagrams/dependency-architecture.mermaid${NC}"
        ;;
        
    "all")
        echo -e "${YELLOW}🎯 Comprehensive Dependency Analysis${NC}"
        
        echo "1. Generating Nx dependency graph..."
        npm run build:graph &
        
        echo "2. Running Madge analysis..."
        npx madge --circular --extensions ts,tsx packages/*/src > dependency-analysis.txt 2>&1 || echo "No circular dependencies found" > dependency-analysis.txt
        npx madge --extensions ts,tsx --image dependency-tree.svg packages/*/src 2>/dev/null || echo "SVG generation failed"
        npx madge --extensions ts,tsx --json packages/*/src > dependencies.json 2>/dev/null || echo "{}" > dependencies.json
        
        echo "3. Creating Mermaid diagram..."
        $0 mermaid
        
        echo "4. Generating layer analysis report..."
        cat > dependency-report.md << 'EOF'
# CVPlus Dependency Architecture Report

Generated: $(date)

## Layer Structure

### Layer 0 (Foundation)
- **Core**: Types, constants, utilities - NO dependencies

### Layer 1 (Base Services)
- **Auth**: Authentication & session management - depends on Core
- **I18n**: Internationalization - depends on Core

### Layer 2 (Domain Services)
- **CV-Processing**: AI-powered CV analysis - depends on Layers 0-1
- **Multimedia**: Media processing - depends on Layers 0-1
- **Analytics**: Data intelligence - depends on Layers 0-1

### Layer 3 (Business Services)
- **Premium**: Subscription & billing - depends on Layers 0-2
- **Recommendations**: AI recommendations - depends on Layers 0-2
- **Public-Profiles**: Portfolio management - depends on Layers 0-2

### Layer 4 (Orchestration Services)
- **Admin**: System management - depends on Layers 0-3
- **Workflow**: Process orchestration - depends on Layers 0-3
- **Payments**: Payment processing - depends on Layers 0-3

## Files Generated

- `dependency-analysis.txt` - Circular dependency analysis
- `dependency-tree.svg` - Visual dependency tree
- `dependencies.json` - Raw dependency data
- `docs/diagrams/dependency-architecture.mermaid` - Architecture diagram

## Validation Commands

```bash
# Run dependency validation
./scripts/validate-dependencies.sh

# Check for circular dependencies
npx madge --circular packages/*/src

# Build in layer order
npm run build:packages
```

## Next Steps

1. Fix any circular dependencies found
2. Ensure all modules follow layer rules
3. Update imports to use proper @cvplus/* patterns
4. Run full build validation
EOF
        
        echo -e "${GREEN}🎉 Comprehensive analysis complete!${NC}"
        echo -e "${BLUE}Generated files:${NC}"
        echo "  📄 dependency-report.md - Complete report"
        echo "  📊 dependency-analysis.txt - Circular deps"
        echo "  🌳 dependency-tree.svg - Visual tree"
        echo "  📋 dependencies.json - Raw data"
        echo "  🎨 docs/diagrams/dependency-architecture.mermaid - Diagram"
        ;;
        
    *)
        echo -e "${RED}❌ Error: Invalid visualization mode${NC}"
        echo "Usage: $0 [nx|madge|mermaid|all]"
        echo ""
        echo "Examples:"
        echo "  $0 nx        # Open Nx dependency graph"
        echo "  $0 madge     # Generate Madge analysis"
        echo "  $0 mermaid   # Create Mermaid diagram"
        echo "  $0 all       # Generate all visualizations"
        exit 1
        ;;
esac

echo -e "\n${BLUE}💡 Useful Commands:${NC}"
echo "  npm run build:graph    # Nx dependency graph"
echo "  nx affected --target=build    # Build affected packages"
echo "  ./scripts/validate-dependencies.sh    # Validate architecture"