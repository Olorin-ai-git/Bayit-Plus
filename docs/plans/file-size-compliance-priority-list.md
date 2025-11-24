# File Size Compliance - Priority Refactoring List

**Generated:** January 21, 2025
**Total Files to Refactor:** 667
**Critical Files (>1000 lines):** 20

## 🔴 PHASE 1: Critical Priority (Week 1-2)
### Extreme Violations (>1000 lines) - IMMEDIATE ACTION REQUIRED

#### Backend Services (14 files)
1. **`enhanced_html_report_generator.py`** - 2,285 lines
   - Location: `olorin-server/app/service/reporting/`
   - Strategy: Split into core + 10 component modules
   - Estimated modules: 12 files

2. **`pattern_recognition.py`** - 1,931 lines
   - Location: `olorin-server/app/service/agent/tools/ml_ai_tools/`
   - Strategy: Extract patterns, algorithms, scoring
   - Estimated modules: 10 files

3. **`risk_scoring.py`** - 1,535 lines
   - Location: `olorin-server/app/service/agent/tools/ml_ai_tools/`
   - Strategy: Separate models, calculators, validators
   - Estimated modules: 8 files

4. **`orchestrator_agent.py`** - 1,524 lines
   - Location: `olorin-server/app/service/agent/orchestration/`
   - Strategy: Node handlers, state machine, routing
   - Estimated modules: 9 files

5. **`fraud_detection.py`** - 1,411 lines
   - Location: `olorin-server/app/service/agent/tools/ml_ai_tools/`
   - Strategy: Detection engines, rules, analyzers
   - Estimated modules: 8 files

6. **`comprehensive_investigation_report.py`** - 1,379 lines
   - Location: `olorin-server/app/service/reporting/`
   - Strategy: Report sections, formatters, generators
   - Estimated modules: 8 files

7. **`clean_graph_builder.py`** - 1,153 lines
   - Location: `olorin-server/app/service/agent/orchestration/`
   - Strategy: Graph components, builders, validators
   - Estimated modules: 7 files

8. **`finalize.py`** - 1,145 lines
   - Location: `olorin-server/app/service/agent/orchestration/risk/`
   - Strategy: Finalization steps, validators, processors
   - Estimated modules: 6 files

9. **`schema_constants.py`** - 1,136 lines
   - Location: `olorin-server/app/service/agent/tools/snowflake_tool/`
   - Strategy: Group by domain, create sub-schemas
   - Estimated modules: 6 files

10. **`entity_manager.py`** - 1,099 lines
    - Location: `olorin-server/app/service/agent/multi_entity/`
    - Strategy: Entity types, managers, validators
    - Estimated modules: 7 files

11. **`journey_visualization.py`** - 1,085 lines
    - Location: `olorin-server/app/service/reporting/components/`
    - Strategy: Visualization components, renderers
    - Estimated modules: 6 files

12. **`anomaly_detection.py`** - 1,074 lines
    - Location: `olorin-server/app/service/agent/tools/ml_ai_tools/`
    - Strategy: Detectors, analyzers, scorers
    - Estimated modules: 6 files

13. **`quality_assurance.py`** - 1,060 lines
    - Location: `olorin-server/app/service/agent/`
    - Strategy: QA checks, validators, reporters
    - Estimated modules: 6 files

14. **`langgraph_visualization.py`** - 1,009 lines
    - Location: `olorin-server/app/service/reporting/components/`
    - Strategy: Graph builders, renderers, formatters
    - Estimated modules: 5 files

#### Scripts & Tools (6 files)
15. **`scenario_investigation_runner.py`** - 1,218 lines
    - Location: `scripts/investigation/`
    - Strategy: Runner core, scenarios, executors
    - Estimated modules: 7 files

<<<<<<< HEAD
16. **`autonomous_investigation_router_backup.py`** - 1,245 lines
=======
16. **`structured_investigation_router_backup.py`** - 1,245 lines
>>>>>>> 001-modify-analyzer-method
    - Location: `olorin-server/app/router/`
    - Strategy: Route handlers, validators, processors
    - Estimated modules: 7 files

17. **Frontend backup files** (4 files - TO BE REMOVED)
    - These are backup files and should be deleted after verification
    - Total lines to remove: 7,194

## 🟡 PHASE 2: High Priority (Week 3-4)
### Large Violations (501-1000 lines) - 215 files

#### Top 30 High-Impact Files
1. `cross-browser-test-engine.ts` - 989 lines
2. `compatibility-audit.js` - 980 lines
3. `contract-validator.js` - 962 lines
4. `html_report_generator.py` - 929 lines
5. `useReporting.ts` - 915 lines
6. `ServicesPage.tsx` - 912 lines
7. `event-routing.ts` - 906 lines
8. `visualization.ts` - 877 lines
9. `detect-mock-data.py` - 781 lines
10. `deployment_verifier.py` - 740 lines

[... continues with remaining 205 files in this category]

## 🟠 PHASE 3: Medium Priority (Week 5-6)
### Medium Violations (301-500 lines) - 272 files

#### Categories to Address
- API Routers: 45 files
- Service Components: 65 files
- Utility Modules: 80 files
- Test Helpers: 40 files
- Configuration: 42 files

## 🟢 PHASE 4: Low Priority (Week 7)
### Small Violations (201-300 lines) - 160 files

#### Quick Wins
- Helper utilities: 50 files
- Small services: 45 files
- Configuration files: 35 files
- Test fixtures: 30 files

## Refactoring Execution Strategy

### For Each File:
1. **Analyze** - Identify responsibilities and dependencies
2. **Design** - Create module architecture
3. **Test** - Write tests for current behavior
4. **Extract** - Split into modules (<200 lines each)
5. **Validate** - Ensure functionality preserved
6. **Document** - Update imports and documentation
7. **Review** - Code review and approval
8. **Merge** - Integration and regression testing

### Daily Targets:
- **Week 1-2:** 2-3 extreme files per day
- **Week 3-4:** 10-15 large files per day
- **Week 5-6:** 20-25 medium files per day
- **Week 7:** 30-40 small files per day
- **Week 8:** Validation and documentation

## Automated Validation Script

```bash
# Run daily to track progress
python scripts/file-size-analysis.py

# Check specific module compliance
python scripts/check_module_compliance.py --module olorin-server

# Generate progress report
python scripts/generate_refactoring_report.py
```

## Success Criteria
- ✅ All files under 200 lines
- ✅ Maintain 100% functionality
- ✅ Improve test coverage to 85%+
- ✅ Zero performance degradation
- ✅ Complete documentation

## Notes
- Frontend backup files should be removed immediately (7,194 lines saved)
- Schema constants can be auto-generated from database
- Consider using code generation for repetitive patterns
- Implement CI/CD checks to prevent future violations

---
**Status:** Ready for Phase 1 Execution