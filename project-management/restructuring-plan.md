# OLORIN PROJECT RESTRUCTURING PLAN

## 🎯 OBJECTIVE
Transform current project structure to match reference Gaia architecture while maintaining Olorin branding and removing irrelevant components.

## 📋 CURRENT STATE ANALYSIS

### Current Structure
```
olorin/
├── front/           → olorin-front
├── olorin-web-portal/       → olorin-web-portal  
├── back/            → olorin-server
├── test/
└── README.md
```

### Reference Structure (/Users/gklainert/Documents/Gaia)
```
Gaia/
├── gaia-server/     → olorin-server (already exists as /back)
├── gaia-webplugin/ → olorin-front (already exists as /front)
├── gaia-tools/      → olorin-tools (create if needed)
├── gaia-mcp/        → SKIP (not relevant)
├── docs/            → /docs (copy and update)
├── scripts/         → /scripts (evaluate and copy)
└── push
```

## 🏗️ PHASE 1: DIRECTORY RESTRUCTURING

### 1.1 Rename Operations
```bash
# Move directories
mv front olorin-front
mv olorin-web-portal olorin-web-portal
mv back olorin-server
```

### 1.2 Files Requiring Path Updates

**Package.json files:**
- `olorin-front/package.json` - scripts, paths
- `olorin-web-portal/package.json` - scripts, paths

**Configuration files:**
- `olorin-server/config/*.yaml` - any relative paths
- `olorin-server/pyproject.toml` - project paths
- `olorin-front/tsconfig.json` - path mappings
- `olorin-front/webpack.config.js` (if exists)

**Import statements requiring updates:**
- All TypeScript/JavaScript files with relative imports
- Python files with relative imports
- Test files referencing moved directories

### 1.3 Script Updates
- Update any build scripts
- Update Docker configurations
- Update deployment scripts

## 🔍 PHASE 2: REFERENCE PROJECT ANALYSIS

### 2.1 Component Mapping
| Reference Gaia | Current Olorin | Action |
|----------------|----------------|---------|
| `gaia-server/` | `back/` → `olorin-server/` | ✅ Rename |
| `gaia-webplugin/` | `front/` → `olorin-front/` | ✅ Rename |
| `gaia-tools/` | Missing | 🔍 Evaluate need |
| `gaia-mcp/` | N/A | ❌ Skip |
| `docs/` | `back/docs/` | 📁 Move to root |
| `scripts/` | `back/scripts/` | 📁 Evaluate |

### 2.2 Missing Components Analysis
- **gaia-tools/**: Check if contains utilities needed for Olorin
- **root-level scripts/**: Analyze for project-wide automation
- **root-level docs/**: Comprehensive documentation structure

## 📚 PHASE 3: DOCUMENTATION MIGRATION

### 3.1 Documentation Categories

**KEEP & UPDATE:**
- `architecture/` - Core system design
- `api/` - API documentation  
- `backend/` - Server documentation
- `frontend/` - UI documentation
- `development/` - Developer guides
- `build-deployment/` - Build processes

**EVALUATE:**
- `authentication/` - Remove IDP, keep basic auth
- `security/` - Keep relevant security practices
- `deployment/` - Update for standalone deployment
- `tools/` - Evaluate tool relevance

**REMOVE:**
- `mcp/` - Not relevant to Olorin
- `legacy-archive/` - Historical artifacts
- Any olorin-specific documentation

### 3.2 Documentation Update Process
1. Copy entire `/Users/gklainert/Documents/Gaia/docs` to `/docs`
2. Systematic rename: "Gaia" → "Olorin" in all files
3. Remove irrelevant sections (IDP, olorin references)
4. Update architecture diagrams and references
5. Validate all internal links and references

## 🔧 PHASE 4: PATH FIXING & VALIDATION

### 4.1 File Reference Updates

**Import Statement Patterns:**
```typescript
// Update these patterns:
import { ... } from '../front/...'     → '../olorin-front/...'
import { ... } from '../back/...'      → '../olorin-server/...'
import { ... } from '../olorin-web-portal/...' → '../olorin-web-portal/...'
```

**Configuration Path Updates:**
```yaml
# Update paths in config files:
static_files: "./front/dist"     → "./olorin-front/dist"
log_path: "./back/logs"          → "./olorin-server/logs"
```

### 4.2 Build System Updates
- Update package.json scripts
- Update Docker paths
- Update CI/CD configurations
- Update test paths

### 4.3 Validation Checklist
- [ ] All imports resolve correctly
- [ ] Build processes work
- [ ] Tests pass
- [ ] Development server starts
- [ ] All configurations load properly

## 🚨 CRITICAL CONSIDERATIONS

### Dependencies
- Ensure no hardcoded paths in dependencies
- Check for any symlinks that need updating
- Validate relative path calculations

### Testing
- Update test file paths
- Verify test data paths
- Check mock file references

### Documentation
- Ensure no broken internal links
- Update README files in each directory
- Validate code examples in docs

## 📈 SUCCESS CRITERIA

1. **Structure Match**: Project structure mirrors reference Gaia layout
2. **Clean Build**: All components build without path errors
3. **Functional Tests**: All existing functionality preserved
4. **Documentation**: Complete, accurate, Olorin-branded docs
5. **No Gaia References**: All references updated to Olorin

## 🎯 IMPLEMENTATION ORDER

1. **Phase 1**: Directory restructuring (requires careful path updates)
2. **Phase 2**: Reference analysis and missing component creation
3. **Phase 3**: Documentation migration and cleanup
4. **Phase 4**: Final validation and testing

**Estimated Complexity**: Level 3 (Comprehensive changes affecting multiple systems) 