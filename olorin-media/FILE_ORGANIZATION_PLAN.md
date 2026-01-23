# File Organization Plan

## Current State Analysis

### Loose Files in Root Directory (38 total)
- Security audits and reviews (11 files)
- Dubbing implementation and testing docs (5 files)
- Deployment and infrastructure docs (7 files)
- Asset and code consolidation docs (5 files)
- Database and configuration docs (4 files)
- Translation/podcast planning docs (2 files)
- Voice technician approvals (1 file)
- Web frontend reviews (1 file)
- Log files (1 file)
- Scripts (1 file)

### Existing Documentation Structure
```
docs/
├── reviews/          # 18 files (some already here)
├── security/         # Exists
├── implementation/   # Exists
├── deployment/       # Exists
├── testing/          # Exists
├── plans/            # Exists
├── guides/           # Exists
├── reports/          # Exists
└── [30+ other subdirectories]
```

## Proposed Organization

### 1. Security Documents → `docs/security/`
- `SECURITY_AUDIT_REPORT_DUBBING.md`
- `SECURITY_AUDIT_DUBBING_DETAILED_REVIEW.md`
- `SECURITY_AUDIT_SUMMARY.txt`
- `SECURITY_CODE_FIXES.md`
- `SECURITY_FINDINGS_EXECUTIVE_SUMMARY.md`
- `SECURITY_REMEDIATION_CHECKLIST.md`
- `SECURITY_REMEDIATION_ROADMAP.md`
- `SECURITY_REVIEW_COMPLETION_SUMMARY.md`
- `SECURITY_REVIEW_EXECUTIVE_SUMMARY.md`
- `SECURITY_REVIEW_INDEX.md`

### 2. Review Documents → `docs/reviews/`
- `DUBBING_REVIEW_EXECUTIVE_SUMMARY.md`
- `LIVE_DUBBING_UI_UX_DESIGN_REVIEW.md`
- `WEB_FRONTEND_REVIEW_LIVE_DUBBING.md`
- `VOICE_TECHNICIAN_FINAL_APPROVAL.md`

### 3. Testing Documents → `docs/testing/`
- `DUBBING_E2E_TEST_PLAN.md`
- `DUBBING_IMPLEMENTATION_TEST_RESULTS.md`
- `DUBBING_SECURITY_TEST_PLAN.md`
- `DUBBING_SECURITY_CHECKLIST.md`
- `MONGODB_TEST_REPORT.md`

### 4. Implementation Summaries → `docs/implementation/`
- `IMPLEMENTATION_COMPLETE.md`
- `ASSET_CONSOLIDATION_COMPLETE.md`
- `ASSET_CONSOLIDATION_SUMMARY.md`
- `GLASS_UNIFICATION_COMPLETE.md`
- `GLASS_UNIFICATION_PLAN.md`
- `GLASS_UNIFICATION_REVISED.md`
- `MONGODB_CENTRALIZATION_SUMMARY.md`
- `PORT_MIGRATION_COMPLETE.md`
- `CLEANUP_SUMMARY.md`

### 5. Deployment Documents → `docs/deployment/`
- `DEPLOYMENT-ANALYSIS.md`
- `DEPLOYMENT-CONSOLIDATION-SUMMARY.md`
- `OLORIN_PORT_AUDIT_REPORT.md`
- `PORT_REFERENCE.md`

### 6. Planning Documents → `docs/plans/`
- `LIVE_DUBBING_IMPLEMENTATION_PLAN_V2_1_VIDEO_BUFFERING.md`
- `PODCAST_TRANSLATION_INTEGRATED_PLAN.md`
- `PODCAST_TRANSLATION_PLAN_COMPREHENSIVE_FIXES.md`

### 7. Scripts → `scripts/`
- `run-e2e-tests.sh` → `scripts/testing/run-e2e-tests.sh`

### 8. Logs → `logs/` (or delete if temporary)
- `deploy.log` → Consider deleting or moving to `logs/deploy.log`

### 9. Keep in Root (Core Project Files)
- `README.md` ✓
- `CLAUDE.md` ✓

## Migration Commands

### Phase 1: Create missing directories (if needed)
```bash
mkdir -p logs
mkdir -p scripts/testing
```

### Phase 2: Move security documents
```bash
git mv SECURITY_*.md docs/security/
git mv SECURITY_*.txt docs/security/
```

### Phase 3: Move review documents
```bash
git mv DUBBING_REVIEW_EXECUTIVE_SUMMARY.md docs/reviews/
git mv LIVE_DUBBING_UI_UX_DESIGN_REVIEW.md docs/reviews/
git mv WEB_FRONTEND_REVIEW_LIVE_DUBBING.md docs/reviews/
git mv VOICE_TECHNICIAN_FINAL_APPROVAL.md docs/reviews/
```

### Phase 4: Move testing documents
```bash
git mv DUBBING_E2E_TEST_PLAN.md docs/testing/
git mv DUBBING_IMPLEMENTATION_TEST_RESULTS.md docs/testing/
git mv DUBBING_SECURITY_TEST_PLAN.md docs/testing/
git mv DUBBING_SECURITY_CHECKLIST.md docs/testing/
git mv MONGODB_TEST_REPORT.md docs/testing/
```

### Phase 5: Move implementation documents
```bash
git mv IMPLEMENTATION_COMPLETE.md docs/implementation/
git mv ASSET_CONSOLIDATION_*.md docs/implementation/
git mv GLASS_UNIFICATION_*.md docs/implementation/
git mv MONGODB_CENTRALIZATION_SUMMARY.md docs/implementation/
git mv PORT_MIGRATION_COMPLETE.md docs/implementation/
git mv CLEANUP_SUMMARY.md docs/implementation/
```

### Phase 6: Move deployment documents
```bash
git mv DEPLOYMENT-*.md docs/deployment/
git mv OLORIN_PORT_AUDIT_REPORT.md docs/deployment/
git mv PORT_REFERENCE.md docs/deployment/
```

### Phase 7: Move planning documents
```bash
git mv LIVE_DUBBING_IMPLEMENTATION_PLAN_V2_1_VIDEO_BUFFERING.md docs/plans/
git mv PODCAST_TRANSLATION_*.md docs/plans/
```

### Phase 8: Move scripts
```bash
git mv run-e2e-tests.sh scripts/testing/
```

### Phase 9: Handle logs
```bash
# Option 1: Move to logs directory
git mv deploy.log logs/

# Option 2: Delete if temporary
rm deploy.log
```

## Post-Migration Tasks

1. Update any internal links in documentation that reference moved files
2. Update README.md if it references any moved files
3. Update CLAUDE.md if it references specific file paths
4. Create/update index files in each docs subdirectory
5. Review and update .gitignore for logs directory

## Expected Outcome

After organization:
- Root directory: Clean, only essential project files (README, CLAUDE, config files)
- docs/: Well-organized by category (security, reviews, testing, etc.)
- scripts/: All executable scripts organized by purpose
- logs/: Log files (with .gitignore to prevent committing)
- Total files moved: ~35 files
- Improved discoverability and maintainability
