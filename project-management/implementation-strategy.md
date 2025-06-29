# OLORIN RESTRUCTURING IMPLEMENTATION STRATEGY

## 🎯 EXECUTIVE SUMMARY

**Complexity Level**: Level 3 - Comprehensive structural changes
**Estimated Impact**: High - Affects all major components
**Risk Level**: Medium - Requires careful path management

## 📊 REFERENCE PROJECT ANALYSIS

### Components Assessment
| Gaia Component | Purpose | Olorin Equivalent | Action |
|----------------|---------|-------------------|---------|
| `gaia-server/` | Backend API server | `back/` → `olorin-server/` | ✅ Rename existing |
| `gaia-webplugin/` | Frontend React app | `front/` → `olorin-front/` | ✅ Rename existing |
| `gaia-tools/` | Python utilities package | Not needed | ❌ Skip (olorin-specific) |
| `gaia-mcp/` | MCP integration | Not needed | ❌ Skip (not relevant) |
| `docs/` | Comprehensive documentation | Create `/docs` | ✅ Copy & update |
| `scripts/` | Build automation | Minimal | 🔍 Evaluate |

### Key Findings
- **gaia-tools**: olorin-specific Python package for internal tooling - not needed for standalone Olorin
- **scripts**: Contains only `fullflows/` - likely integration testing scripts
- **docs**: Comprehensive documentation structure that we should replicate

## 🏗️ IMPLEMENTATION PHASES

### PHASE 1: DIRECTORY RESTRUCTURING

#### 1.1 Backup Current State
```bash
# Create backup before restructuring
cp -r . ../olorin-backup-$(date +%Y%m%d)
```

#### 1.2 Directory Moves
```bash
# Execute in project root
mv front olorin-front
mv olorin-web-portal olorin-web-portal  
mv back olorin-server
```

#### 1.3 Critical Path Updates

**Files requiring immediate updates:**
1. `olorin-front/package.json`
2. `olorin-web-portal/package.json`
3. `olorin-server/pyproject.toml`
4. Any Docker configurations
5. Build scripts

### PHASE 2: DOCUMENTATION MIGRATION

#### 2.1 Copy Reference Documentation
```bash
# Copy entire docs structure
cp -r /Users/gklainert/Documents/Gaia/docs ./docs
```

#### 2.2 Documentation Cleanup Strategy

**KEEP & UPDATE** (Priority 1):
- `docs/architecture/` - System design and diagrams
- `docs/api/` - API specifications and examples
- `docs/backend/` - Server configuration and deployment
- `docs/frontend/` - UI development and components
- `docs/development/` - Developer setup and workflows

**EVALUATE & FILTER** (Priority 2):
- `docs/authentication/` - Remove IDP, keep basic auth patterns
- `docs/security/` - Keep general security, remove olorin-specific
- `docs/deployment/` - Update for standalone deployment

**REMOVE** (Priority 3):
- `docs/mcp/` - Not relevant to Olorin
- `docs/legacy-archive/` - Historical artifacts
- Any olorin-specific integration docs

### PHASE 3: COMPREHENSIVE PATH FIXING

#### 3.1 Search & Replace Patterns
```bash
# Frontend path references
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  xargs sed -i 's|../front/|../olorin-front/|g'

# Backend path references  
find . -type f -name "*.py" | \
  xargs sed -i 's|../back/|../olorin-server/|g'

# UI portal references
find . -type f | \
  xargs sed -i 's|../olorin-web-portal/|../olorin-web-portal/|g'
```

#### 3.2 Documentation Renaming
```bash
# Rename all Gaia references to Olorin in documentation
find docs/ -type f | \
  xargs sed -i 's/Gaia/Olorin/g'
find docs/ -type f | \
  xargs sed -i 's/gaia/olorin/g'
find docs/ -type f | \
  xargs sed -i 's/GAIA/OLORIN/g'
```

## 🔍 VALIDATION STRATEGY

### Build Validation
```bash
# Test each component builds
cd olorin-front && npm run build
cd olorin-web-portal && npm run build  
cd olorin-server && poetry install
```

### Path Validation
```bash
# Check for broken imports
grep -r "from.*front/" . --include="*.ts" --include="*.tsx"
grep -r "from.*back/" . --include="*.py"
# Should return no results
```

## 🚨 RISK MITIGATION

### Critical Checkpoints
1. **After directory moves**: Verify no broken symlinks
2. **After path updates**: Test builds immediately
3. **After doc migration**: Check for broken internal links
4. **Final validation**: Full functionality test

### Rollback Plan
```bash
# If issues arise, restore from backup
cp -r ../olorin-backup-*/* .
```

## 📈 SUCCESS METRICS

1. **Structure Alignment**: Matches reference Gaia layout ✅
2. **Build Success**: All components build without errors ✅
3. **Test Passing**: All existing tests pass ✅
4. **Documentation Complete**: Comprehensive, Olorin-branded docs ✅
5. **Zero Gaia References**: Complete rebrand achieved ✅

**Ready for Implementation**: This plan provides comprehensive guidance for safe, systematic restructuring. 