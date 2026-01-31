# Large File Refactoring Roadmap

## Summary

**Total files > 200 lines:** 39 files (20 backend, 19 frontend)  
**Total excess lines:** ~35,000 lines to refactor  
**Completed:** 1 file (live_translation_service.py)  
**Remaining:** 38 files

---

## ✅ Completed (Phase 1)

### Backend
1. ✅ **live_translation_service.py** (was 934 lines → now 11 files, all < 200)
   - Refactored into modular package
   - All tests passing
   - Backward compatibility maintained

---

## 🔥 High Priority (Next 3 Refactorings)

### Backend

2. **audit_endpoints.py** (1,437 lines) - **NEXT TARGET**
   - **Location:** `backend/app/api/routes/librarian/audit_endpoints.py`
   - **Type:** API endpoints
   - **Complexity:** Medium
   - **Strategy:** Split by resource/endpoint groupings
   - **Estimated effort:** 3-4 hours
   - **Value:** High - improves API maintainability

3. **podcast_translation_service.py** (1,275 lines)
   - **Location:** `backend/app/services/podcast_translation_service.py`
   - **Type:** Service logic (similar to live_translation we just did)
   - **Complexity:** Medium-High
   - **Strategy:** Similar pattern to live_translation refactoring
   - **Estimated effort:** 4-5 hours
   - **Value:** High - active feature development

4. **config.py** (1,761 lines) - **LARGEST FILE**
   - **Location:** `backend/app/core/config.py`
   - **Type:** Application configuration
   - **Complexity:** High (affects entire app)
   - **Strategy:** Split by configuration domains
   - **Estimated effort:** 6-8 hours
   - **Value:** Critical - affects all deployments
   - **Risk:** Very High - requires extensive testing

### Frontend

5. **MergeWizard.tsx** (1,089 lines)
   - **Location:** `web/src/components/admin/content/MergeWizard.tsx`
   - **Type:** Admin UI component
   - **Complexity:** Medium
   - **Strategy:** Split into wizard steps and components
   - **Estimated effort:** 3-4 hours
   - **Value:** Medium - admin-only feature

6. **WidgetContainer.tsx** (923 lines)
   - **Location:** `web/src/components/widgets/WidgetContainer.tsx`
   - **Type:** UI component
   - **Complexity:** Medium
   - **Strategy:** Extract widget types into separate components
   - **Estimated effort:** 3-4 hours
   - **Value:** High - core UI functionality

---

## ⚠️ Medium Priority

### Backend (10-20 files)

7. **culture_seeder.py** (998 lines) - Startup/seeding logic
8. **tool_dispatcher.py** (953 lines) - NLP service
9. **tool_registry.py** (920 lines) - NLP service
10. **jerusalem_content_service.py** (898 lines) - Content service
11. **channel_chat_service.py** (892 lines) - Chat service
12. **upload_service/service.py** (875 lines) - Upload logic
13. **youngsters_content_service.py** (861 lines) - Content service
14. **content_taxonomy_migration.py** (818 lines) - Migration script
15. **live_dubbing_service.py** (797 lines) - Dubbing service
16. **library_integrity_service_old.py** (796 lines) - Legacy service
17. **content_importer.py** (794 lines) - Import logic
18. **support.py** (768 lines) - API endpoints
19. **ai_agent/agent.py** (753 lines) - AI agent core
20. **ai_agent/executors/taxonomy.py** (749 lines) - AI executor
21. **content/featured.py** (746 lines) - API endpoints
22. **duplicate_detection_service.py** (736 lines) - Detection service

### Frontend (8-15 files)

23. **FlowsScreenMobile.tsx** (836 lines) - Mobile screen
24. **ContentCard.tsx** (835 lines) - UI component
25. **YoungstersPage.tsx** (801 lines) - Page component
26. **ChildrenPage.tsx** (801 lines) - Page component
27. **GlassSidebar.tsx** (792 lines) - Layout component
28. **liveDubbingService.ts** (787 lines) - Service logic
29. **CampaignsListPage.tsx** (768 lines) - Admin page
30. **PlayerProfilePage.tsx** (749 lines) - Page component
31. **FreeContentImportWizard.tsx** (748 lines) - Admin wizard
32. **MovieDetailPage.tsx** (747 lines) - Page component
33. **UserDetailPage.tsx** (714 lines) - Admin page

---

## ⏸️ Deferred / Low Priority

### Backend

- **olorin_config.py** (1,115 lines) - See REFACTORING_TODO.md
  - Deferred due to high risk and low change frequency
  - Requires comprehensive environment testing

### Legacy Files (Consider Delete Instead of Refactor)

- Files marked `.legacy.tsx` - Evaluate if still needed
- `library_integrity_service_old.py` - Old version, may be removable

---

## Refactoring Strategy by File Type

### API Endpoints (Split by Resource)
- Group related endpoints into separate router files
- Create sub-routers for major resources
- Example: `audit_endpoints.py` → `content_audit.py`, `user_audit.py`, `system_audit.py`

### Services (Extract into Packages)
- Similar pattern to `live_translation` refactoring
- Create package with:
  - `constants.py` - Configuration constants
  - `providers/` - Provider implementations
  - `pipeline.py` - Processing pipeline
  - `service.py` - Main orchestrator
  - `__init__.py` - Backward compatibility

### UI Components (Component Decomposition)
- Extract sub-components
- Split by logical sections/features
- Create component directory with index file

### Configuration (Domain Splitting)
- Group by configuration domain
- One file per major feature area
- Main aggregator file

---

## Success Criteria

Each refactored file must:
- ✅ All individual files < 200 lines
- ✅ Maintain backward compatibility
- ✅ All tests passing
- ✅ No functionality changes
- ✅ Clear import paths
- ✅ Documented in commit message

---

## Progress Tracking

- **Completed:** 1/39 files (2.6%)
- **In Progress:** 0 files
- **Remaining:** 38 files (97.4%)

**Estimated Total Effort:** 80-120 hours
**Estimated Completion:** 2-3 weeks at 4-6 hours/day

---

*Created: 2026-01-31*  
*Last Updated: 2026-01-31*  
*Next Review: After completing 3 high-priority files*
