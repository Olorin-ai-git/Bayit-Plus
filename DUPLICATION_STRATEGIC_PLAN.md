# 🕵️ Code Duplication & Refactoring Strategic Plan

**Scan Target:** `/Users/olorin/Documents/olorin`
**Files Scanned:** 3290
**Date:** Sun Nov 30 13:11:45 EST 2025

## 1. Exact File Duplicates (Immediate Action Required)
These files have identical content. **Strategy:** Delete copies and verify imports.

### Duplicate Group (Count: 2)
- `olorin-front/src/shared/components/.!33848!NetworkGraph.tsx`
- `olorin-front/src/shared/components/.!89388!NetworkGraph.tsx`

### Duplicate Group (Count: 3)
- `olorin-front/src/shared/components/.!33820!Timeline.tsx`
- `olorin-front/src/shared/components/.!89356!Timeline.tsx`
- `olorin-front/src/shared/components/.!72571!Timeline.tsx`

### Duplicate Group (Count: 2)
- `tests/unit/test_refactored_html_generator.py`
- `scripts/testing/test_refactored_html_generator.py`

### Duplicate Group (Count: 9)
- `olorin-server/app/__init__.py`
- `olorin-server/app/test/__init__.py`
- `olorin-server/app/test/unit/__init__.py`
- `olorin-server/app/test/adapters/__init__.py`
- `olorin-server/app/shell/services/ServiceDiscovery.ts`
- `olorin-server/app/utils/__init__.py`
- `olorin-server/app/adapters/__init__.py`
- `olorin-server/app/router/__init__.py`
- `olorin-server/test/performance/__init__.py`

### Duplicate Group (Count: 2)
- `olorin-server/app/service/llm/__init__.py`
- `olorin-server/app/service/llm/verification/__init__.py`

### Duplicate Group (Count: 3)
- `olorin-server/scripts/test_random_historical_windows.py`
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py`
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py`

### Duplicate Group (Count: 3)
- `olorin-server/scripts/systematic_fraud_testing.py`
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py`
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py`

### Duplicate Group (Count: 2)
- `olorin-server/scripts/test_enhanced_on_fraud.py`
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_enhanced_on_fraud.py`

### Duplicate Group (Count: 2)
- `olorin-server/scripts/test_may_21_22.py`
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_may_21_22.py`

### Duplicate Group (Count: 2)
- `scripts/utilities/logger_migration.py`
- `scripts/migration/logger_migration.py`

## 2. Duplicate Logic Patterns (Python AST)
Functions or classes with **identical structure and logic**. Variable names match exactly.
**Strategy:** Extract to a shared utility/service.

### Pattern: `test_import` (FunctionDef)
Found in 2 locations:
- `tests/unit/test_refactored_html_generator.py` (Lines 15-24)
- `scripts/testing/test_refactored_html_generator.py` (Lines 15-24)

**Refactoring Strategy:**
1. Extract `test_import` to a shared module (e.g., `app/common/test_import_util.py` or similar).
2. Import `test_import` in the identified files.
3. Run tests.

---
### Pattern: `test_initialization` (FunctionDef)
Found in 2 locations:
- `tests/unit/test_refactored_html_generator.py` (Lines 26-43)
- `scripts/testing/test_refactored_html_generator.py` (Lines 26-43)

**Refactoring Strategy:**
1. Extract `test_initialization` to a shared module (e.g., `app/common/test_initialization_util.py` or similar).
2. Import `test_initialization` in the identified files.
3. Run tests.

---
### Pattern: `test_validation` (FunctionDef)
Found in 2 locations:
- `tests/unit/test_refactored_html_generator.py` (Lines 45-59)
- `scripts/testing/test_refactored_html_generator.py` (Lines 45-59)

**Refactoring Strategy:**
1. Extract `test_validation` to a shared module (e.g., `app/common/test_validation_util.py` or similar).
2. Import `test_validation` in the identified files.
3. Run tests.

---
### Pattern: `main` (FunctionDef)
Found in 2 locations:
- `tests/unit/test_refactored_html_generator.py` (Lines 61-89)
- `scripts/testing/test_refactored_html_generator.py` (Lines 61-89)

**Refactoring Strategy:**
1. Extract `main` to a shared module (e.g., `app/common/main_util.py` or similar).
2. Import `main` in the identified files.
3. Run tests.

---
### Pattern: `mock_request` (FunctionDef)
Found in 4 locations:
- `olorin-server/app/test/unit/service/test_logs_analysis_service.py` (Lines 18-25)
- `olorin-server/app/test/unit/service/test_location_analysis_service.py` (Lines 31-38)
- `olorin-server/app/test/unit/service/test_network_analysis_service.py` (Lines 17-24)
- `olorin-server/app/test/unit/service/test_device_analysis_service.py` (Lines 16-23)

**Refactoring Strategy:**
1. Extract `mock_request` to a shared module (e.g., `app/common/mock_request_util.py` or similar).
2. Import `mock_request` in the identified files.
3. Run tests.

---
### Pattern: `mock_settings` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/test/unit/service/agent/test_ato_splunk_query_constructor.py` (Lines 12-16)
- `olorin-server/app/test/unit/service/agent/test_user_analysis_query_constructor.py` (Lines 12-16)

**Refactoring Strategy:**
1. Extract `mock_settings` to a shared module (e.g., `app/common/mock_settings_util.py` or similar).
2. Import `mock_settings` in the identified files.
3. Run tests.

---
### Pattern: `mock_request` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/test/unit/router/test_agent_router_helper.py` (Lines 16-25)
- `olorin-server/app/test/unit/router/test_agent_router.py` (Lines 25-34)

**Refactoring Strategy:**
1. Extract `mock_request` to a shared module (e.g., `app/common/mock_request_util.py` or similar).
2. Import `mock_request` in the identified files.
3. Run tests.

---
### Pattern: `agent_request` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/test/unit/router/test_agent_router_helper.py` (Lines 29-43)
- `olorin-server/app/test/unit/router/test_agent_router.py` (Lines 38-52)

**Refactoring Strategy:**
1. Extract `agent_request` to a shared module (e.g., `app/common/agent_request_util.py` or similar).
2. Import `agent_request` in the identified files.
3. Run tests.

---
### Pattern: `MockRequest` (ClassDef)
Found in 2 locations:
- `olorin-server/app/test/unit/router/test_agent_router_helper.py` (Lines 17-23)
- `olorin-server/app/test/unit/router/test_agent_router.py` (Lines 26-32)

**Refactoring Strategy:**
1. Extract `MockRequest` to a shared module (e.g., `app/common/MockRequest_util.py` or similar).
2. Import `MockRequest` in the identified files.
3. Run tests.

---
### Pattern: `clear_demo_mode` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/test/unit/router/test_logs_router.py` (Lines 23-27)
- `olorin-server/app/test/unit/router/test_network_router.py` (Lines 21-25)

**Refactoring Strategy:**
1. Extract `clear_demo_mode` to a shared module (e.g., `app/common/clear_demo_mode_util.py` or similar).
2. Import `clear_demo_mode` in the identified files.
3. Run tests.

---
### Pattern: `client` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/test/integration/conftest.py` (Lines 52-58)
- `olorin-server/app/test/integration/test_agent_eval.py` (Lines 49-54)

**Refactoring Strategy:**
1. Extract `client` to a shared module (e.g., `app/common/client_util.py` or similar).
2. Import `client` in the identified files.
3. Run tests.

---
### Pattern: `override_get_db` (FunctionDef)
Found in 4 locations:
- `olorin-server/app/test/integration/test_phase3_integration.py` (Lines 38-43)
- `olorin-server/app/test/integration/api/test_anomaly_detection_flow.py` (Lines 30-35)
- `olorin-server/app/test/integration/api/test_anomaly_api_endpoints.py` (Lines 31-36)
- `olorin-server/app/test/e2e/test_anomaly_detection_flow.py` (Lines 30-35)

**Refactoring Strategy:**
1. Extract `override_get_db` to a shared module (e.g., `app/common/override_get_db_util.py` or similar).
2. Import `override_get_db` in the identified files.
3. Run tests.

---
### Pattern: `test_db` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/test/integration/api/test_anomaly_detection_flow.py` (Lines 24-41)
- `olorin-server/app/test/integration/api/test_anomaly_api_endpoints.py` (Lines 25-42)
- `olorin-server/app/test/e2e/test_anomaly_detection_flow.py` (Lines 24-41)

**Refactoring Strategy:**
1. Extract `test_db` to a shared module (e.g., `app/common/test_db_util.py` or similar).
2. Import `test_db` in the identified files.
3. Run tests.

---
### Pattern: `validate_amount` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/models/api_models.py` (Lines 156-161)
- `olorin-server/app/service/agent/nodes/raw_data_node.py` (Lines 90-95)

**Refactoring Strategy:**
1. Extract `validate_amount` to a shared module (e.g., `app/common/validate_amount_util.py` or similar).
2. Import `validate_amount` in the identified files.
3. Run tests.

---
### Pattern: `validate_entity_type` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/models/validation.py` (Lines 129-135)
- `olorin-server/app/models/validation.py` (Lines 193-199)
- `olorin-server/app/router/models/autonomous_investigation_models.py` (Lines 85-91)

**Refactoring Strategy:**
1. Extract `validate_entity_type` to a shared module (e.g., `app/common/validate_entity_type_util.py` or similar).
2. Import `validate_entity_type` in the identified files.
3. Run tests.

---
### Pattern: `RiskAnalyticsRequest` (ClassDef)
Found in 2 locations:
- `olorin-server/app/api/routes/analytics.py` (Lines 57-72)
- `olorin-server/app/api/routes/analytics_modules/analytics_models.py` (Lines 12-27)

**Refactoring Strategy:**
1. Extract `RiskAnalyticsRequest` to a shared module (e.g., `app/common/RiskAnalyticsRequest_util.py` or similar).
2. Import `RiskAnalyticsRequest` in the identified files.
3. Run tests.

---
### Pattern: `EntityAnalysisRequest` (ClassDef)
Found in 2 locations:
- `olorin-server/app/api/routes/analytics.py` (Lines 75-82)
- `olorin-server/app/api/routes/analytics_modules/analytics_models.py` (Lines 30-37)

**Refactoring Strategy:**
1. Extract `EntityAnalysisRequest` to a shared module (e.g., `app/common/EntityAnalysisRequest_util.py` or similar).
2. Import `EntityAnalysisRequest` in the identified files.
3. Run tests.

---
### Pattern: `SilentLogger` (ClassDef)
Found in 3 locations:
- `olorin-server/app/service/config_loader.py` (Lines 23-34)
- `olorin-server/app/service/config_secrets.py` (Lines 18-29)
- `olorin-server/app/service/secret_manager.py` (Lines 40-51)

**Refactoring Strategy:**
1. Extract `SilentLogger` to a shared module (e.g., `app/common/SilentLogger_util.py` or similar).
2. Import `SilentLogger` in the identified files.
3. Run tests.

---
### Pattern: `generate_etag` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/polling_service.py` (Lines 243-258)
- `olorin-server/app/service/polling_enhancements.py` (Lines 72-87)

**Refactoring Strategy:**
1. Extract `generate_etag` to a shared module (e.g., `app/common/generate_etag_util.py` or similar).
2. Import `generate_etag` in the identified files.
3. Run tests.

---
### Pattern: `should_return_etag_304` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/polling_service.py` (Lines 260-286)
- `olorin-server/app/service/polling_enhancements.py` (Lines 89-115)

**Refactoring Strategy:**
1. Extract `should_return_etag_304` to a shared module (e.g., `app/common/should_return_etag_304_util.py` or similar).
2. Import `should_return_etag_304` in the identified files.
3. Run tests.

---
### Pattern: `InvestigationSummary` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/reporting/comprehensive_investigation_report.py` (Lines 42-59)
- `olorin-server/app/service/reporting/report_modules/report_summary.py` (Lines 13-30)

**Refactoring Strategy:**
1. Extract `InvestigationSummary` to a shared module (e.g., `app/common/InvestigationSummary_util.py` or similar).
2. Import `InvestigationSummary` in the identified files.
3. Run tests.

---
### Pattern: `_parse_timestamp` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/reporting/components/explanations.py` (Lines 235-250)
- `olorin-server/app/service/reporting/components/journey_visualization.py` (Lines 298-313)
- `olorin-server/app/service/reporting/components/flow_graph.py` (Lines 205-220)

**Refactoring Strategy:**
1. Extract `_parse_timestamp` to a shared module (e.g., `app/common/_parse_timestamp_util.py` or similar).
2. Import `_parse_timestamp` in the identified files.
3. Run tests.

---
### Pattern: `initialize_rag_stats` (FunctionDef)
Found in 6 locations:
- `olorin-server/app/service/agent/network_agent_config.py` (Lines 105-112)
- `olorin-server/app/service/agent/authentication_agent_config.py` (Lines 129-136)
- `olorin-server/app/service/agent/location_agent_config.py` (Lines 90-97)
- `olorin-server/app/service/agent/risk_agent_config.py` (Lines 90-97)
- `olorin-server/app/service/agent/device_agent_config.py` (Lines 105-112)
- `olorin-server/app/service/agent/logs_agent_config.py` (Lines 92-99)

**Refactoring Strategy:**
1. Extract `initialize_rag_stats` to a shared module (e.g., `app/common/initialize_rag_stats_util.py` or similar).
2. Import `initialize_rag_stats` in the identified files.
3. Run tests.

---
### Pattern: `update_rag_stats_on_success` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/authentication_agent_config.py` (Lines 139-145)
- `olorin-server/app/service/agent/device_agent_config.py` (Lines 115-121)

**Refactoring Strategy:**
1. Extract `update_rag_stats_on_success` to a shared module (e.g., `app/common/update_rag_stats_on_success_util.py` or similar).
2. Import `update_rag_stats_on_success` in the identified files.
3. Run tests.

---
### Pattern: `ContextInjectionStrategy` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/rag_tool_context.py` (Lines 30-36)
- `olorin-server/test/unit/test_rag_tool_context_standalone.py` (Lines 65-71)

**Refactoring Strategy:**
1. Extract `ContextInjectionStrategy` to a shared module (e.g., `app/common/ContextInjectionStrategy_util.py` or similar).
2. Import `ContextInjectionStrategy` in the identified files.
3. Run tests.

---
### Pattern: `has_rag_context` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/rag_tool_context.py` (Lines 67-73)
- `olorin-server/test/unit/test_rag_tool_context_standalone.py` (Lines 102-108)

**Refactoring Strategy:**
1. Extract `has_rag_context` to a shared module (e.g., `app/common/has_rag_context_util.py` or similar).
2. Import `has_rag_context` in the identified files.
3. Run tests.

---
### Pattern: `total_knowledge_chunks` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/rag_tool_context.py` (Lines 76-80)
- `olorin-server/test/unit/test_rag_tool_context_standalone.py` (Lines 111-115)

**Refactoring Strategy:**
1. Extract `total_knowledge_chunks` to a shared module (e.g., `app/common/total_knowledge_chunks_util.py` or similar).
2. Import `total_knowledge_chunks` in the identified files.
3. Run tests.

---
### Pattern: `__post_init__` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/result_augmentation_core.py` (Lines 23-27)
- `olorin-server/scripts/test_augmentation_direct.py` (Lines 144-148)

**Refactoring Strategy:**
1. Extract `__post_init__` to a shared module (e.g., `app/common/__post_init___util.py` or similar).
2. Import `__post_init__` in the identified files.
3. Run tests.

---
### Pattern: `__post_init__` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/result_augmentation_core.py` (Lines 74-80)
- `olorin-server/scripts/test_augmentation_direct.py` (Lines 183-189)

**Refactoring Strategy:**
1. Extract `__post_init__` to a shared module (e.g., `app/common/__post_init___util.py` or similar).
2. Import `__post_init__` in the identified files.
3. Run tests.

---
### Pattern: `_register_tool` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/tool_registry_new.py` (Lines 145-149)
- `olorin-server/app/service/agent/tools/tool_registry.py` (Lines 1008-1012)

**Refactoring Strategy:**
1. Extract `_register_tool` to a shared module (e.g., `app/common/_register_tool_util.py` or similar).
2. Import `_register_tool` in the identified files.
3. Run tests.

---
### Pattern: `get_tools_summary` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/tool_registry_new.py` (Lines 177-189)
- `olorin-server/app/service/agent/tools/tool_registry.py` (Lines 1046-1060)

**Refactoring Strategy:**
1. Extract `get_tools_summary` to a shared module (e.g., `app/common/get_tools_summary_util.py` or similar).
2. Import `get_tools_summary` in the identified files.
3. Run tests.

---
### Pattern: `_run` (FunctionDef)
Found in 5 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/unified_threat_intelligence_tool.py` (Lines 986-990)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/cidr_block_tool.py` (Lines 505-509)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/simple_ip_reputation_tool.py` (Lines 188-192)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/bulk_analysis_tool.py` (Lines 373-377)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/abuse_reporting_tool.py` (Lines 316-320)

**Refactoring Strategy:**
1. Extract `_run` to a shared module (e.g., `app/common/_run_util.py` or similar).
2. Import `_run` in the identified files.
3. Run tests.

---
### Pattern: `validate_max_detections` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/domain_analysis_tool.py` (Lines 163-167)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/file_analysis_tool.py` (Lines 61-65)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/url_analysis_tool.py` (Lines 83-87)

**Refactoring Strategy:**
1. Extract `validate_max_detections` to a shared module (e.g., `app/common/validate_max_detections_util.py` or similar).
2. Import `validate_max_detections` in the identified files.
3. Run tests.

---
### Pattern: `client` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/domain_analysis_tool.py` (Lines 191-196)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/file_analysis_tool.py` (Lines 88-93)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/url_analysis_tool.py` (Lines 111-116)

**Refactoring Strategy:**
1. Extract `client` to a shared module (e.g., `app/common/client_util.py` or similar).
2. Import `client` in the identified files.
3. Run tests.

---
### Pattern: `validate_ip_address` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/ip_analysis_tool.py` (Lines 37-45)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/simple_ip_reputation_tool.py` (Lines 39-47)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/abuse_reporting_tool.py` (Lines 43-51)

**Refactoring Strategy:**
1. Extract `validate_ip_address` to a shared module (e.g., `app/common/validate_ip_address_util.py` or similar).
2. Import `validate_ip_address` in the identified files.
3. Run tests.

---
### Pattern: `client` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/search_tool.py` (Lines 54-58)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/infrastructure_analysis_tool.py` (Lines 79-83)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/exploit_search_tool.py` (Lines 47-51)

**Refactoring Strategy:**
1. Extract `client` to a shared module (e.g., `app/common/client_util.py` or similar).
2. Import `client` in the identified files.
3. Run tests.

---
### Pattern: `_run` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/search_tool.py` (Lines 60-64)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/exploit_search_tool.py` (Lines 53-57)

**Refactoring Strategy:**
1. Extract `_run` to a shared module (e.g., `app/common/_run_util.py` or similar).
2. Import `_run` in the identified files.
3. Run tests.

---
### Pattern: `_get_client` (FunctionDef)
Found in 4 locations:
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/cidr_block_tool.py` (Lines 68-73)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/simple_ip_reputation_tool.py` (Lines 69-74)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/bulk_analysis_tool.py` (Lines 84-89)
- `olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/abuse_reporting_tool.py` (Lines 115-120)

**Refactoring Strategy:**
1. Extract `_get_client` to a shared module (e.g., `app/common/_get_client_util.py` or similar).
2. Import `_get_client` in the identified files.
3. Run tests.

---
### Pattern: `_get_risk_level` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/intelligence_tools/social_network_analysis.py` (Lines 332-342)
- `olorin-server/app/service/agent/tools/blockchain_tools/defi_protocol_analysis.py` (Lines 235-245)

**Refactoring Strategy:**
1. Extract `_get_risk_level` to a shared module (e.g., `app/common/_get_risk_level_util.py` or similar).
2. Import `_get_risk_level` in the identified files.
3. Run tests.

---
### Pattern: `_calculate_confidence` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/frequency_recognizer.py` (Lines 370-396)
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/temporal_recognizer.py` (Lines 419-445)
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/network_recognizer.py` (Lines 478-504)

**Refactoring Strategy:**
1. Extract `_calculate_confidence` to a shared module (e.g., `app/common/_calculate_confidence_util.py` or similar).
2. Import `_calculate_confidence` in the identified files.
3. Run tests.

---
### Pattern: `_extract_timestamp` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/frequency_recognizer.py` (Lines 504-525)
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/temporal_recognizer.py` (Lines 466-488)
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/network_recognizer.py` (Lines 591-612)

**Refactoring Strategy:**
1. Extract `_extract_timestamp` to a shared module (e.g., `app/common/_extract_timestamp_util.py` or similar).
2. Import `_extract_timestamp` in the identified files.
3. Run tests.

---
### Pattern: `_sort_by_timestamp` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/fraud_recognizer.py` (Lines 441-451)
- `olorin-server/app/service/agent/tools/ml_ai_tools/pattern_recognition/recognizers/behavioral_recognizer.py` (Lines 516-526)

**Refactoring Strategy:**
1. Extract `_sort_by_timestamp` to a shared module (e.g., `app/common/_sort_by_timestamp_util.py` or similar).
2. Import `_sort_by_timestamp` in the identified files.
3. Run tests.

---
### Pattern: `_import_tool_registry` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/rag/tool_recommender_base.py` (Lines 35-42)
- `olorin-server/app/service/agent/rag/tool_recommender_main.py` (Lines 29-36)

**Refactoring Strategy:**
1. Extract `_import_tool_registry` to a shared module (e.g., `app/common/_import_tool_registry_util.py` or similar).
2. Import `_import_tool_registry` in the identified files.
3. Run tests.

---
### Pattern: `ConfidenceFieldType` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/confidence_consolidator.py` (Lines 20-29)
- `olorin-server/app/service/agent/orchestration/hybrid/confidence/confidence_models.py` (Lines 17-26)

**Refactoring Strategy:**
1. Extract `ConfidenceFieldType` to a shared module (e.g., `app/common/ConfidenceFieldType_util.py` or similar).
2. Import `ConfidenceFieldType` in the identified files.
3. Run tests.

---
### Pattern: `_safe_set_confidence` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/confidence_consolidator.py` (Lines 290-308)
- `olorin-server/app/service/agent/orchestration/hybrid/confidence/confidence_applicator.py` (Lines 116-134)

**Refactoring Strategy:**
1. Extract `_safe_set_confidence` to a shared module (e.g., `app/common/_safe_set_confidence_util.py` or similar).
2. Import `_safe_set_confidence` in the identified files.
3. Run tests.

---
### Pattern: `format_snowflake_for_llm` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/utils/data_formatters.py` (Lines 14-54)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py` (Lines 18-58)

**Refactoring Strategy:**
1. Extract `format_snowflake_for_llm` to a shared module (e.g., `app/common/format_snowflake_for_llm_util.py` or similar).
2. Import `format_snowflake_for_llm` in the identified files.
3. Run tests.

---
### Pattern: `format_domains_for_llm` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/utils/data_formatters.py` (Lines 140-157)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py` (Lines 144-161)

**Refactoring Strategy:**
1. Extract `format_domains_for_llm` to a shared module (e.g., `app/common/format_domains_for_llm_util.py` or similar).
2. Import `format_domains_for_llm` in the identified files.
3. Run tests.

---
### Pattern: `format_risk_indicators_for_llm` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/utils/data_formatters.py` (Lines 160-166)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py` (Lines 164-170)

**Refactoring Strategy:**
1. Extract `format_risk_indicators_for_llm` to a shared module (e.g., `app/common/format_risk_indicators_for_llm_util.py` or similar).
2. Import `format_risk_indicators_for_llm` in the identified files.
3. Run tests.

---
### Pattern: `format_risk_indicators` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/utils/data_formatters.py` (Lines 195-208)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py` (Lines 173-186)

**Refactoring Strategy:**
1. Extract `format_risk_indicators` to a shared module (e.g., `app/common/format_risk_indicators_util.py` or similar).
2. Import `format_risk_indicators` in the identified files.
3. Run tests.

---
### Pattern: `format_domain_findings` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/utils/data_formatters.py` (Lines 211-229)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py` (Lines 189-207)

**Refactoring Strategy:**
1. Extract `format_domain_findings` to a shared module (e.g., `app/common/format_domain_findings_util.py` or similar).
2. Import `format_domain_findings` in the identified files.
3. Run tests.

---
### Pattern: `_get_model_info` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/tool_execution/llm_invoker.py` (Lines 38-50)
- `olorin-server/app/service/agent/orchestration/orchestrator/handlers/snowflake/llm_invoker.py` (Lines 38-50)

**Refactoring Strategy:**
1. Extract `_get_model_info` to a shared module (e.g., `app/common/_get_model_info_util.py` or similar).
2. Import `_get_model_info` in the identified files.
3. Run tests.

---
### Pattern: `AIConfidenceLevel` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/hybrid/hybrid_state_schema.py` (Lines 23-29)
- `olorin-server/app/service/agent/orchestration/hybrid/state/enums_and_constants.py` (Lines 12-18)

**Refactoring Strategy:**
1. Extract `AIConfidenceLevel` to a shared module (e.g., `app/common/AIConfidenceLevel_util.py` or similar).
2. Import `AIConfidenceLevel` in the identified files.
3. Run tests.

---
### Pattern: `InvestigationStrategy` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/hybrid/hybrid_state_schema.py` (Lines 32-39)
- `olorin-server/app/service/agent/orchestration/hybrid/state/enums_and_constants.py` (Lines 21-28)

**Refactoring Strategy:**
1. Extract `InvestigationStrategy` to a shared module (e.g., `app/common/InvestigationStrategy_util.py` or similar).
2. Import `InvestigationStrategy` in the identified files.
3. Run tests.

---
### Pattern: `SafetyConcernType` (ClassDef)
Found in 2 locations:
- `olorin-server/app/service/agent/orchestration/hybrid/hybrid_state_schema.py` (Lines 42-49)
- `olorin-server/app/service/agent/orchestration/hybrid/state/enums_and_constants.py` (Lines 31-38)

**Refactoring Strategy:**
1. Extract `SafetyConcernType` to a shared module (e.g., `app/common/SafetyConcernType_util.py` or similar).
2. Import `SafetyConcernType` in the identified files.
3. Run tests.

---
### Pattern: `get_server_info` (FunctionDef)
Found in 3 locations:
- `olorin-server/app/service/mcp_servers/external_api_server.py` (Lines 432-439)
- `olorin-server/app/service/mcp_servers/graph_analysis_server.py` (Lines 490-497)
- `olorin-server/app/service/mcp_servers/fraud_database_server.py` (Lines 380-387)

**Refactoring Strategy:**
1. Extract `get_server_info` to a shared module (e.g., `app/common/get_server_info_util.py` or similar).
2. Import `get_server_info` in the identified files.
3. Run tests.

---
### Pattern: `AlertSeverity` (ClassDef)
Found in 3 locations:
- `olorin-server/app/service/mcp_servers/monitoring/mcp_monitor.py` (Lines 54-60)
- `deployment/monitoring/alert_channels.py` (Lines 33-38)
- `deployment/monitoring/alert_manager.py` (Lines 25-30)

**Refactoring Strategy:**
1. Extract `AlertSeverity` to a shared module (e.g., `app/common/AlertSeverity_util.py` or similar).
2. Import `AlertSeverity` in the identified files.
3. Run tests.

---
### Pattern: `close` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/app/service/ip_risk/maxmind_client.py` (Lines 544-548)
- `olorin-server/app/service/soar/playbook_executor.py` (Lines 237-241)

**Refactoring Strategy:**
1. Extract `close` to a shared module (e.g., `app/common/close_util.py` or similar).
2. Import `close` in the identified files.
3. Run tests.

---
### Pattern: `extract_timestamp` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/analytics/velocity_utils.py` (Lines 11-25)
- `olorin-server/app/service/analytics/pattern_helpers.py` (Lines 14-28)

**Refactoring Strategy:**
1. Extract `extract_timestamp` to a shared module (e.g., `app/common/extract_timestamp_util.py` or similar).
2. Import `extract_timestamp` in the identified files.
3. Run tests.

---
### Pattern: `extract_device_id` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/service/analytics/velocity_utils.py` (Lines 37-43)
- `olorin-server/app/service/analytics/pattern_helpers.py` (Lines 98-106)

**Refactoring Strategy:**
1. Extract `extract_device_id` to a shared module (e.g., `app/common/extract_device_id_util.py` or similar).
2. Import `extract_device_id` in the identified files.
3. Run tests.

---
### Pattern: `get_tenant_id` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/router/device_signals_router.py` (Lines 28-43)
- `olorin-server/app/router/tenant_config_router.py` (Lines 38-53)

**Refactoring Strategy:**
1. Extract `get_tenant_id` to a shared module (e.g., `app/common/get_tenant_id_util.py` or similar).
2. Import `get_tenant_id` in the identified files.
3. Run tests.

---
### Pattern: `get_tool_display_names` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/router/settings_router.py` (Lines 70-96)
- `olorin-server/app/router/mcp_bridge_router.py` (Lines 27-53)

**Refactoring Strategy:**
1. Extract `get_tool_display_names` to a shared module (e.g., `app/common/get_tool_display_names_util.py` or similar).
2. Import `get_tool_display_names` in the identified files.
3. Run tests.

---
### Pattern: `get_tenant_id` (FunctionDef)
Found in 2 locations:
- `olorin-server/app/router/soar_playbooks_router.py` (Lines 59-85)
- `olorin-server/app/router/composio_router.py` (Lines 76-105)

**Refactoring Strategy:**
1. Extract `get_tenant_id` to a shared module (e.g., `app/common/get_tenant_id_util.py` or similar).
2. Import `get_tenant_id` in the identified files.
3. Run tests.

---
### Pattern: `test_db` (FunctionDef)
Found in 3 locations:
- `olorin-server/test/unit/test_tool_execution_service.py` (Lines 27-38)
- `olorin-server/test/integration/test_tool_execution_integration.py` (Lines 31-42)
- `olorin-server/test/integration/test_enhanced_tool_persistence_e2e.py` (Lines 26-37)

**Refactoring Strategy:**
1. Extract `test_db` to a shared module (e.g., `app/common/test_db_util.py` or similar).
2. Import `test_db` in the identified files.
3. Run tests.

---
### Pattern: `mock_ai_response` (FunctionDef)
Found in 2 locations:
- `olorin-server/test/unit/test_autonomous_orchestrator.py` (Lines 677-688)
- `olorin-server/test/integration/test_orchestrator_integration.py` (Lines 777-788)

**Refactoring Strategy:**
1. Extract `mock_ai_response` to a shared module (e.g., `app/common/mock_ai_response_util.py` or similar).
2. Import `mock_ai_response` in the identified files.
3. Run tests.

---
### Pattern: `test_empty_events` (FunctionDef)
Found in 2 locations:
- `olorin-server/test/unit/test_temporal_pattern_recognizer.py` (Lines 241-248)
- `olorin-server/test/unit/test_fraud_pattern_recognizer.py` (Lines 198-205)

**Refactoring Strategy:**
1. Extract `test_empty_events` to a shared module (e.g., `app/common/test_empty_events_util.py` or similar).
2. Import `test_empty_events` in the identified files.
3. Run tests.

---
### Pattern: `test_extract_timestamp_multiple_formats` (FunctionDef)
Found in 2 locations:
- `olorin-server/test/unit/test_temporal_pattern_recognizer.py` (Lines 289-298)
- `olorin-server/test/unit/test_fraud_pattern_recognizer.py` (Lines 252-261)

**Refactoring Strategy:**
1. Extract `test_extract_timestamp_multiple_formats` to a shared module (e.g., `app/common/test_extract_timestamp_multiple_formats_util.py` or similar).
2. Import `test_extract_timestamp_multiple_formats` in the identified files.
3. Run tests.

---
### Pattern: `test_error_handling` (FunctionDef)
Found in 2 locations:
- `olorin-server/test/unit/test_temporal_pattern_recognizer.py` (Lines 403-417)
- `olorin-server/test/unit/test_fraud_pattern_recognizer.py` (Lines 304-318)

**Refactoring Strategy:**
1. Extract `test_error_handling` to a shared module (e.g., `app/common/test_error_handling_util.py` or similar).
2. Import `test_error_handling` in the identified files.
3. Run tests.

---
### Pattern: `MockKnowledgeContext` (ClassDef)
Found in 2 locations:
- `olorin-server/test/unit/test_rag_tool_context_standalone.py` (Lines 24-34)
- `olorin-server/test/integration/test_rag_tool_integration.py` (Lines 52-62)

**Refactoring Strategy:**
1. Extract `MockKnowledgeContext` to a shared module (e.g., `app/common/MockKnowledgeContext_util.py` or similar).
2. Import `MockKnowledgeContext` in the identified files.
3. Run tests.

---
### Pattern: `__init__` (FunctionDef)
Found in 2 locations:
- `olorin-server/test/unit/test_rag_tool_context_standalone.py` (Lines 27-34)
- `olorin-server/test/integration/test_rag_tool_integration.py` (Lines 55-62)

**Refactoring Strategy:**
1. Extract `__init__` to a shared module (e.g., `app/common/__init___util.py` or similar).
2. Import `__init__` in the identified files.
3. Run tests.

---
### Pattern: `AgentPerformanceMetrics` (ClassDef)
Found in 2 locations:
- `olorin-server/tests/console_logging_validation.py` (Lines 11-23)
- `olorin-server/tests/autonomous/run_all_scenarios.py` (Lines 49-61)

**Refactoring Strategy:**
1. Extract `AgentPerformanceMetrics` to a shared module (e.g., `app/common/AgentPerformanceMetrics_util.py` or similar).
2. Import `AgentPerformanceMetrics` in the identified files.
3. Run tests.

---
### Pattern: `print_response` (FunctionDef)
Found in 5 locations:
- `olorin-server/tests/run_autonomous_investigation_for_device.py` (Lines 75-80)
- `olorin-server/tests/run_autonomous_investigation_for_user.py` (Lines 36-41)
- `olorin-server/tests/run_investigation_flow_for_device.py` (Lines 51-56)
- `olorin-server/tests/test_investigation_workflow.py` (Lines 117-122)
- `olorin-server/tests/run_investigation_workflow_for_user.py` (Lines 25-30)

**Refactoring Strategy:**
1. Extract `print_response` to a shared module (e.g., `app/common/print_response_util.py` or similar).
2. Import `print_response` in the identified files.
3. Run tests.

---
### Pattern: `run_websocket_listener` (FunctionDef)
Found in 2 locations:
- `olorin-server/tests/run_autonomous_investigation_for_device.py` (Lines 150-154)
- `olorin-server/tests/run_autonomous_investigation_for_user.py` (Lines 119-123)

**Refactoring Strategy:**
1. Extract `run_websocket_listener` to a shared module (e.g., `app/common/run_websocket_listener_util.py` or similar).
2. Import `run_websocket_listener` in the identified files.
3. Run tests.

---
### Pattern: `setup_method` (FunctionDef)
Found in 2 locations:
- `olorin-server/tests/integration/test_registry_schema_migration.py` (Lines 20-24)
- `olorin-server/tests/integration/test_registry_performance.py` (Lines 22-26)

**Refactoring Strategy:**
1. Extract `setup_method` to a shared module (e.g., `app/common/setup_method_util.py` or similar).
2. Import `setup_method` in the identified files.
3. Run tests.

---
### Pattern: `get_auth_token` (FunctionDef)
Found in 2 locations:
- `olorin-server/tests/e2e/test_risk_based_investigation_e2e.py` (Lines 32-45)
- `olorin-server/tests/e2e/test_investigation_state_management_e2e.py` (Lines 20-33)

**Refactoring Strategy:**
1. Extract `get_auth_token` to a shared module (e.g., `app/common/get_auth_token_util.py` or similar).
2. Import `get_auth_token` in the identified files.
3. Run tests.

---
### Pattern: `get_connection` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/calculate_baseline_fraud_rate.py` (Lines 35-52)
- `olorin-server/scripts/test_multiple_rankings.py` (Lines 37-54)
- `olorin-server/scripts/test_filtered_rankings.py` (Lines 38-55)

**Refactoring Strategy:**
1. Extract `get_connection` to a shared module (e.g., `app/common/get_connection_util.py` or similar).
2. Import `get_connection` in the identified files.
3. Run tests.

---
### Pattern: `MockToolResult` (ClassDef)
Found in 2 locations:
- `olorin-server/scripts/test_augmentation_direct.py` (Lines 97-107)
- `olorin-server/scripts/test_result_augmentation_simple.py` (Lines 23-33)

**Refactoring Strategy:**
1. Extract `MockToolResult` to a shared module (e.g., `app/common/MockToolResult_util.py` or similar).
2. Import `MockToolResult` in the identified files.
3. Run tests.

---
### Pattern: `find_fraud_in_window` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/test_random_historical_windows.py` (Lines 24-46)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py` (Lines 24-46)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py` (Lines 24-46)

**Refactoring Strategy:**
1. Extract `find_fraud_in_window` to a shared module (e.g., `app/common/find_fraud_in_window_util.py` or similar).
2. Import `find_fraud_in_window` in the identified files.
3. Run tests.

---
### Pattern: `get_entity_transactions` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/test_random_historical_windows.py` (Lines 49-74)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py` (Lines 49-74)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py` (Lines 49-74)

**Refactoring Strategy:**
1. Extract `get_entity_transactions` to a shared module (e.g., `app/common/get_entity_transactions_util.py` or similar).
2. Import `get_entity_transactions` in the identified files.
3. Run tests.

---
### Pattern: `test_window` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/test_random_historical_windows.py` (Lines 77-191)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py` (Lines 77-191)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py` (Lines 77-191)

**Refactoring Strategy:**
1. Extract `test_window` to a shared module (e.g., `app/common/test_window_util.py` or similar).
2. Import `test_window` in the identified files.
3. Run tests.

---
### Pattern: `test_random_historical_windows` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/test_random_historical_windows.py` (Lines 194-355)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py` (Lines 194-355)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py` (Lines 194-355)

**Refactoring Strategy:**
1. Extract `test_random_historical_windows` to a shared module (e.g., `app/common/test_random_historical_windows_util.py` or similar).
2. Import `test_random_historical_windows` in the identified files.
3. Run tests.

---
### Pattern: `main` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/test_random_historical_windows.py` (Lines 358-372)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/test_random_historical_windows.py` (Lines 358-372)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_random_historical_windows.py` (Lines 358-372)

**Refactoring Strategy:**
1. Extract `main` to a shared module (e.g., `app/common/main_util.py` or similar).
2. Import `main` in the identified files.
3. Run tests.

---
### Pattern: `SystematicFraudTester` (ClassDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 25-539)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 25-539)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 25-539)

**Refactoring Strategy:**
1. Extract `SystematicFraudTester` to a shared module (e.g., `app/common/SystematicFraudTester_util.py` or similar).
2. Import `SystematicFraudTester` in the identified files.
3. Run tests.

---
### Pattern: `main` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 542-557)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 542-557)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 542-557)

**Refactoring Strategy:**
1. Extract `main` to a shared module (e.g., `app/common/main_util.py` or similar).
2. Import `main` in the identified files.
3. Run tests.

---
### Pattern: `__init__` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 28-32)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 28-32)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 28-32)

**Refactoring Strategy:**
1. Extract `__init__` to a shared module (e.g., `app/common/__init___util.py` or similar).
2. Import `__init__` in the identified files.
3. Run tests.

---
### Pattern: `get_fraud_entities_in_window` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 39-64)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 39-64)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 39-64)

**Refactoring Strategy:**
1. Extract `get_fraud_entities_in_window` to a shared module (e.g., `app/common/get_fraud_entities_in_window_util.py` or similar).
2. Import `get_fraud_entities_in_window` in the identified files.
3. Run tests.

---
### Pattern: `get_entity_transactions` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 66-92)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 66-92)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 66-92)

**Refactoring Strategy:**
1. Extract `get_entity_transactions` to a shared module (e.g., `app/common/get_entity_transactions_util.py` or similar).
2. Import `get_entity_transactions` in the identified files.
3. Run tests.

---
### Pattern: `test_entity` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 94-177)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 94-177)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 94-177)

**Refactoring Strategy:**
1. Extract `test_entity` to a shared module (e.g., `app/common/test_entity_util.py` or similar).
2. Import `test_entity` in the identified files.
3. Run tests.

---
### Pattern: `test_window` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 179-249)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 179-249)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 179-249)

**Refactoring Strategy:**
1. Extract `test_window` to a shared module (e.g., `app/common/test_window_util.py` or similar).
2. Import `test_window` in the identified files.
3. Run tests.

---
### Pattern: `analyze_missed_fraud` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 251-273)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 251-273)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 251-273)

**Refactoring Strategy:**
1. Extract `analyze_missed_fraud` to a shared module (e.g., `app/common/analyze_missed_fraud_util.py` or similar).
2. Import `analyze_missed_fraud` in the identified files.
3. Run tests.

---
### Pattern: `run_systematic_test` (AsyncFunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 275-308)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 275-308)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 275-308)

**Refactoring Strategy:**
1. Extract `run_systematic_test` to a shared module (e.g., `app/common/run_systematic_test_util.py` or similar).
2. Import `run_systematic_test` in the identified files.
3. Run tests.

---
### Pattern: `analyze_and_suggest_adjustments` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 310-370)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 310-370)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 310-370)

**Refactoring Strategy:**
1. Extract `analyze_and_suggest_adjustments` to a shared module (e.g., `app/common/analyze_and_suggest_adjustments_util.py` or similar).
2. Import `analyze_and_suggest_adjustments` in the identified files.
3. Run tests.

---
### Pattern: `generate_final_report` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/systematic_fraud_testing.py` (Lines 372-539)
- `olorin-server/packages/fraud_detection_final_optimized_20251123_202655/scripts/systematic_fraud_testing.py` (Lines 372-539)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/systematic_fraud_testing.py` (Lines 372-539)

**Refactoring Strategy:**
1. Extract `generate_final_report` to a shared module (e.g., `app/common/generate_final_report_util.py` or similar).
2. Import `generate_final_report` in the identified files.
3. Run tests.

---
### Pattern: `test_on_fraud` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/test_enhanced_on_fraud.py` (Lines 21-185)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_enhanced_on_fraud.py` (Lines 21-185)

**Refactoring Strategy:**
1. Extract `test_on_fraud` to a shared module (e.g., `app/common/test_on_fraud_util.py` or similar).
2. Import `test_on_fraud` in the identified files.
3. Run tests.

---
### Pattern: `test_may_21_22` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/test_may_21_22.py` (Lines 21-283)
- `olorin-server/packages/fraud_detection_complete_package_20251123_201834/scripts/test_may_21_22.py` (Lines 21-283)

**Refactoring Strategy:**
1. Extract `test_may_21_22` to a shared module (e.g., `app/common/test_may_21_22_util.py` or similar).
2. Import `test_may_21_22` in the identified files.
3. Run tests.

---
### Pattern: `health_check` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/server/simple_main.py` (Lines 15-21)
- `olorin-server/scripts/server/main.py` (Lines 14-20)

**Refactoring Strategy:**
1. Extract `health_check` to a shared module (e.g., `app/common/health_check_util.py` or similar).
2. Import `health_check` in the identified files.
3. Run tests.

---
### Pattern: `info` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/server/simple_main.py` (Lines 31-39)
- `olorin-server/scripts/server/main.py` (Lines 30-38)

**Refactoring Strategy:**
1. Extract `info` to a shared module (e.g., `app/common/info_util.py` or similar).
2. Import `info` in the identified files.
3. Run tests.

---
### Pattern: `__init__` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/investigation/run_full_investigation_fixed.py` (Lines 31-40)
- `olorin-server/scripts/investigation/run_full_investigation.py` (Lines 31-40)

**Refactoring Strategy:**
1. Extract `__init__` to a shared module (e.g., `app/common/__init___util.py` or similar).
2. Import `__init__` in the identified files.
3. Run tests.

---
### Pattern: `OutputFormat` (ClassDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 241-247)
- `olorin-server/scripts/testing/test_runner_modules/test_config.py` (Lines 34-40)

**Refactoring Strategy:**
1. Extract `OutputFormat` to a shared module (e.g., `app/common/OutputFormat_util.py` or similar).
2. Import `OutputFormat` in the identified files.
3. Run tests.

---
### Pattern: `TestMetrics` (ClassDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 779-793)
- `olorin-server/scripts/testing/test_runner_modules/test_config.py` (Lines 81-95)

**Refactoring Strategy:**
1. Extract `TestMetrics` to a shared module (e.g., `app/common/TestMetrics_util.py` or similar).
2. Import `TestMetrics` in the identified files.
3. Run tests.

---
### Pattern: `InvestigationResult` (ClassDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 797-817)
- `olorin-server/scripts/testing/test_runner_modules/test_config.py` (Lines 99-119)

**Refactoring Strategy:**
1. Extract `InvestigationResult` to a shared module (e.g., `app/common/InvestigationResult_util.py` or similar).
2. Import `InvestigationResult` in the identified files.
3. Run tests.

---
### Pattern: `_calculate_risk_aggregation_confidence` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 4057-4172)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 4044-4159)

**Refactoring Strategy:**
1. Extract `_calculate_risk_aggregation_confidence` to a shared module (e.g., `app/common/_calculate_risk_aggregation_confidence_util.py` or similar).
2. Import `_calculate_risk_aggregation_confidence` in the identified files.
3. Run tests.

---
### Pattern: `__init__` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 286-298)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 39-51)

**Refactoring Strategy:**
1. Extract `__init__` to a shared module (e.g., `app/common/__init___util.py` or similar).
2. Import `__init__` in the identified files.
3. Run tests.

---
### Pattern: `start_monitoring` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 300-328)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 53-81)

**Refactoring Strategy:**
1. Extract `start_monitoring` to a shared module (e.g., `app/common/start_monitoring_util.py` or similar).
2. Import `start_monitoring` in the identified files.
3. Run tests.

---
### Pattern: `stop_monitoring` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 330-339)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 83-92)

**Refactoring Strategy:**
1. Extract `stop_monitoring` to a shared module (e.g., `app/common/stop_monitoring_util.py` or similar).
2. Import `stop_monitoring` in the identified files.
3. Run tests.

---
### Pattern: `start_llm_monitoring` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 500-569)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 261-330)

**Refactoring Strategy:**
1. Extract `start_llm_monitoring` to a shared module (e.g., `app/common/start_llm_monitoring_util.py` or similar).
2. Import `start_llm_monitoring` in the identified files.
3. Run tests.

---
### Pattern: `start_langgraph_monitoring` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 571-594)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 332-355)

**Refactoring Strategy:**
1. Extract `start_langgraph_monitoring` to a shared module (e.g., `app/common/start_langgraph_monitoring_util.py` or similar).
2. Import `start_langgraph_monitoring` in the identified files.
3. Run tests.

---
### Pattern: `start_agent_monitoring` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 596-606)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 357-367)

**Refactoring Strategy:**
1. Extract `start_agent_monitoring` to a shared module (e.g., `app/common/start_agent_monitoring_util.py` or similar).
2. Import `start_agent_monitoring` in the identified files.
3. Run tests.

---
### Pattern: `start_message_processor` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 608-628)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 369-389)

**Refactoring Strategy:**
1. Extract `start_message_processor` to a shared module (e.g., `app/common/start_message_processor_util.py` or similar).
2. Import `start_message_processor` in the identified files.
3. Run tests.

---
### Pattern: `log_websocket_message` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 630-646)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 391-407)

**Refactoring Strategy:**
1. Extract `log_websocket_message` to a shared module (e.g., `app/common/log_websocket_message_util.py` or similar).
2. Import `log_websocket_message` in the identified files.
3. Run tests.

---
### Pattern: `log_llm_interaction` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 648-661)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 409-422)

**Refactoring Strategy:**
1. Extract `log_llm_interaction` to a shared module (e.g., `app/common/log_llm_interaction_util.py` or similar).
2. Import `log_llm_interaction` in the identified files.
3. Run tests.

---
### Pattern: `log_langgraph_state` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 663-673)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 424-434)

**Refactoring Strategy:**
1. Extract `log_langgraph_state` to a shared module (e.g., `app/common/log_langgraph_state_util.py` or similar).
2. Import `log_langgraph_state` in the identified files.
3. Run tests.

---
### Pattern: `log_agent_conversation` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 675-689)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 436-450)

**Refactoring Strategy:**
1. Extract `log_agent_conversation` to a shared module (e.g., `app/common/log_agent_conversation_util.py` or similar).
2. Import `log_agent_conversation` in the identified files.
3. Run tests.

---
### Pattern: `display_monitoring_message` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 691-753)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 452-514)

**Refactoring Strategy:**
1. Extract `display_monitoring_message` to a shared module (e.g., `app/common/display_monitoring_message_util.py` or similar).
2. Import `display_monitoring_message` in the identified files.
3. Run tests.

---
### Pattern: `get_monitoring_summary` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 767-775)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 528-536)

**Refactoring Strategy:**
1. Extract `get_monitoring_summary` to a shared module (e.g., `app/common/get_monitoring_summary_util.py` or similar).
2. Import `get_monitoring_summary` in the identified files.
3. Run tests.

---
### Pattern: `session_manager` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 970-981)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 421-432)

**Refactoring Strategy:**
1. Extract `session_manager` to a shared module (e.g., `app/common/session_manager_util.py` or similar).
2. Import `session_manager` in the identified files.
3. Run tests.

---
### Pattern: `test_server_connectivity` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 983-997)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 434-448)

**Refactoring Strategy:**
1. Extract `test_server_connectivity` to a shared module (e.g., `app/common/test_server_connectivity_util.py` or similar).
2. Import `test_server_connectivity` in the identified files.
3. Run tests.

---
### Pattern: `start_server_if_needed` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 999-1054)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 450-505)

**Refactoring Strategy:**
1. Extract `start_server_if_needed` to a shared module (e.g., `app/common/start_server_if_needed_util.py` or similar).
2. Import `start_server_if_needed` in the identified files.
3. Run tests.

---
### Pattern: `load_csv_data` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 1114-1163)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 609-658)

**Refactoring Strategy:**
1. Extract `load_csv_data` to a shared module (e.g., `app/common/load_csv_data_util.py` or similar).
2. Import `load_csv_data` in the identified files.
3. Run tests.

---
### Pattern: `_extract_csv_user_samples` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 1165-1192)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 660-687)

**Refactoring Strategy:**
1. Extract `_extract_csv_user_samples` to a shared module (e.g., `app/common/_extract_csv_user_samples_util.py` or similar).
2. Import `_extract_csv_user_samples` in the identified files.
3. Run tests.

---
### Pattern: `_extract_agent_results_from_langgraph` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2227-2289)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 1929-1991)

**Refactoring Strategy:**
1. Extract `_extract_agent_results_from_langgraph` to a shared module (e.g., `app/common/_extract_agent_results_from_langgraph_util.py` or similar).
2. Import `_extract_agent_results_from_langgraph` in the identified files.
3. Run tests.

---
### Pattern: `_extract_agent_results_from_clean_graph` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2291-2404)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 1993-2106)

**Refactoring Strategy:**
1. Extract `_extract_agent_results_from_clean_graph` to a shared module (e.g., `app/common/_extract_agent_results_from_clean_graph_util.py` or similar).
2. Import `_extract_agent_results_from_clean_graph` in the identified files.
3. Run tests.

---
### Pattern: `_validate_risk_score_accuracy` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2622-2654)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2324-2356)

**Refactoring Strategy:**
1. Extract `_validate_risk_score_accuracy` to a shared module (e.g., `app/common/_validate_risk_score_accuracy_util.py` or similar).
2. Import `_validate_risk_score_accuracy` in the identified files.
3. Run tests.

---
### Pattern: `_validate_agent_response_quality` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2656-2696)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2358-2398)

**Refactoring Strategy:**
1. Extract `_validate_agent_response_quality` to a shared module (e.g., `app/common/_validate_agent_response_quality_util.py` or similar).
2. Import `_validate_agent_response_quality` in the identified files.
3. Run tests.

---
### Pattern: `_validate_cross_domain_correlation` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2698-2732)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2400-2434)

**Refactoring Strategy:**
1. Extract `_validate_cross_domain_correlation` to a shared module (e.g., `app/common/_validate_cross_domain_correlation_util.py` or similar).
2. Import `_validate_cross_domain_correlation` in the identified files.
3. Run tests.

---
### Pattern: `_validate_business_logic` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2734-2782)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2436-2484)

**Refactoring Strategy:**
1. Extract `_validate_business_logic` to a shared module (e.g., `app/common/_validate_business_logic_util.py` or similar).
2. Import `_validate_business_logic` in the identified files.
3. Run tests.

---
### Pattern: `_calculate_execution_confidence` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2784-2844)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2486-2546)

**Refactoring Strategy:**
1. Extract `_calculate_execution_confidence` to a shared module (e.g., `app/common/_calculate_execution_confidence_util.py` or similar).
2. Import `_calculate_execution_confidence` in the identified files.
3. Run tests.

---
### Pattern: `_extract_risk_score_from_response` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 2925-3039)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2627-2741)

**Refactoring Strategy:**
1. Extract `_extract_risk_score_from_response` to a shared module (e.g., `app/common/_extract_risk_score_from_response_util.py` or similar).
2. Import `_extract_risk_score_from_response` in the identified files.
3. Run tests.

---
### Pattern: `_extract_confidence_from_response` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3041-3100)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2743-2802)

**Refactoring Strategy:**
1. Extract `_extract_confidence_from_response` to a shared module (e.g., `app/common/_extract_confidence_from_response_util.py` or similar).
2. Import `_extract_confidence_from_response` in the identified files.
3. Run tests.

---
### Pattern: `_extract_final_risk_score` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3102-3113)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2804-2815)

**Refactoring Strategy:**
1. Extract `_extract_final_risk_score` to a shared module (e.g., `app/common/_extract_final_risk_score_util.py` or similar).
2. Import `_extract_final_risk_score` in the identified files.
3. Run tests.

---
### Pattern: `_extract_confidence_score` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3115-3148)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2817-2850)

**Refactoring Strategy:**
1. Extract `_extract_confidence_score` to a shared module (e.g., `app/common/_extract_confidence_score_util.py` or similar).
2. Import `_extract_confidence_score` in the identified files.
3. Run tests.

---
### Pattern: `run_concurrent_tests` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3150-3184)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 2852-2886)

**Refactoring Strategy:**
1. Extract `run_concurrent_tests` to a shared module (e.g., `app/common/run_concurrent_tests_util.py` or similar).
2. Import `run_concurrent_tests` in the identified files.
3. Run tests.

---
### Pattern: `generate_comprehensive_report` (AsyncFunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3305-3404)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3278-3377)

**Refactoring Strategy:**
1. Extract `generate_comprehensive_report` to a shared module (e.g., `app/common/generate_comprehensive_report_util.py` or similar).
2. Import `generate_comprehensive_report` in the identified files.
3. Run tests.

---
### Pattern: `_print_terminal_report` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3614-3679)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3587-3652)

**Refactoring Strategy:**
1. Extract `_print_terminal_report` to a shared module (e.g., `app/common/_print_terminal_report_util.py` or similar).
2. Import `_print_terminal_report` in the identified files.
3. Run tests.

---
### Pattern: `_save_investigation_results` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3681-3748)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3654-3721)

**Refactoring Strategy:**
1. Extract `_save_investigation_results` to a shared module (e.g., `app/common/_save_investigation_results_util.py` or similar).
2. Import `_save_investigation_results` in the identified files.
3. Run tests.

---
### Pattern: `_serialize_result` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3750-3769)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3723-3742)

**Refactoring Strategy:**
1. Extract `_serialize_result` to a shared module (e.g., `app/common/_serialize_result_util.py` or similar).
2. Import `_serialize_result` in the identified files.
3. Run tests.

---
### Pattern: `_get_csv_metadata` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3771-3789)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3744-3762)

**Refactoring Strategy:**
1. Extract `_get_csv_metadata` to a shared module (e.g., `app/common/_get_csv_metadata_util.py` or similar).
2. Import `_get_csv_metadata` in the identified files.
3. Run tests.

---
### Pattern: `_analyze_performance` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3791-3832)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3764-3805)

**Refactoring Strategy:**
1. Extract `_analyze_performance` to a shared module (e.g., `app/common/_analyze_performance_util.py` or similar).
2. Import `_analyze_performance` in the identified files.
3. Run tests.

---
### Pattern: `_generate_recommendations` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 3834-3879)
- `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py` (Lines 3807-3852)

**Refactoring Strategy:**
1. Extract `_generate_recommendations` to a shared module (e.g., `app/common/_generate_recommendations_util.py` or similar).
2. Import `_generate_recommendations` in the identified files.
3. Run tests.

---
### Pattern: `process_messages` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 611-624)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 372-385)

**Refactoring Strategy:**
1. Extract `process_messages` to a shared module (e.g., `app/common/process_messages_util.py` or similar).
2. Import `process_messages` in the identified files.
3. Run tests.

---
### Pattern: `LLMMonitoringCallback` (ClassDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 529-560)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 290-321)

**Refactoring Strategy:**
1. Extract `LLMMonitoringCallback` to a shared module (e.g., `app/common/LLMMonitoringCallback_util.py` or similar).
2. Import `LLMMonitoringCallback` in the identified files.
3. Run tests.

---
### Pattern: `on_message` (FunctionDef)
Found in 3 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 409-428)
- `olorin-server/scripts/testing/websocket_auth_patch.py` (Lines 78-96)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 170-189)

**Refactoring Strategy:**
1. Extract `on_message` to a shared module (e.g., `app/common/on_message_util.py` or similar).
2. Import `on_message` in the identified files.
3. Run tests.

---
### Pattern: `on_error` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 430-444)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 191-205)

**Refactoring Strategy:**
1. Extract `on_error` to a shared module (e.g., `app/common/on_error_util.py` or similar).
2. Import `on_error` in the identified files.
3. Run tests.

---
### Pattern: `on_close` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 446-451)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 207-212)

**Refactoring Strategy:**
1. Extract `on_close` to a shared module (e.g., `app/common/on_close_util.py` or similar).
2. Import `on_close` in the identified files.
3. Run tests.

---
### Pattern: `on_llm_start` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 533-540)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 294-301)

**Refactoring Strategy:**
1. Extract `on_llm_start` to a shared module (e.g., `app/common/on_llm_start_util.py` or similar).
2. Import `on_llm_start` in the identified files.
3. Run tests.

---
### Pattern: `on_llm_end` (FunctionDef)
Found in 2 locations:
- `olorin-server/scripts/testing/unified_autonomous_test_runner.py` (Lines 542-555)
- `olorin-server/scripts/testing/test_runner_modules/test_monitoring.py` (Lines 303-316)

**Refactoring Strategy:**
1. Extract `on_llm_end` to a shared module (e.g., `app/common/on_llm_end_util.py` or similar).
2. Import `on_llm_end` in the identified files.
3. Run tests.

---
### Pattern: `DeploymentConfig` (ClassDef)
Found in 2 locations:
- `deployment/orchestration/master_deployment_coordinator.py` (Lines 25-31)
- `deployment/orchestration/master_deployment_coordinator_backup.py` (Lines 32-38)

**Refactoring Strategy:**
1. Extract `DeploymentConfig` to a shared module (e.g., `app/common/DeploymentConfig_util.py` or similar).
2. Import `DeploymentConfig` in the identified files.
3. Run tests.

---
### Pattern: `_validate_system_health` (AsyncFunctionDef)
Found in 2 locations:
- `deployment/orchestration/master_deployment_coordinator.py` (Lines 152-168)
- `deployment/orchestration/master_deployment_coordinator_backup.py` (Lines 302-320)

**Refactoring Strategy:**
1. Extract `_validate_system_health` to a shared module (e.g., `app/common/_validate_system_health_util.py` or similar).
2. Import `_validate_system_health` in the identified files.
3. Run tests.

---
### Pattern: `DeploymentStatus` (ClassDef)
Found in 2 locations:
- `deployment/orchestration/deployment_state_manager.py` (Lines 22-28)
- `deployment/orchestration/master_deployment_coordinator_original.py` (Lines 32-38)

**Refactoring Strategy:**
1. Extract `DeploymentStatus` to a shared module (e.g., `app/common/DeploymentStatus_util.py` or similar).
2. Import `DeploymentStatus` in the identified files.
3. Run tests.

---
### Pattern: `ServiceType` (ClassDef)
Found in 4 locations:
- `deployment/orchestration/deployment_state_manager.py` (Lines 31-35)
- `deployment/orchestration/deployment_executor.py` (Lines 19-23)
- `deployment/orchestration/master_deployment_coordinator_original.py` (Lines 25-29)
- `deployment/orchestration/deployment_sequencer.py` (Lines 20-24)

**Refactoring Strategy:**
1. Extract `ServiceType` to a shared module (e.g., `app/common/ServiceType_util.py` or similar).
2. Import `ServiceType` in the identified files.
3. Run tests.

---
### Pattern: `RollbackStrategy` (ClassDef)
Found in 2 locations:
- `deployment/rollback/automated_rollback_manager.py` (Lines 32-37)
- `deployment/rollback/rollback_strategies.py` (Lines 18-23)

**Refactoring Strategy:**
1. Extract `RollbackStrategy` to a shared module (e.g., `app/common/RollbackStrategy_util.py` or similar).
2. Import `RollbackStrategy` in the identified files.
3. Run tests.

---
### Pattern: `RollbackStatus` (ClassDef)
Found in 2 locations:
- `deployment/rollback/automated_rollback_manager.py` (Lines 40-46)
- `deployment/rollback/rollback_strategies.py` (Lines 26-32)

**Refactoring Strategy:**
1. Extract `RollbackStatus` to a shared module (e.g., `app/common/RollbackStatus_util.py` or similar).
2. Import `RollbackStatus` in the identified files.
3. Run tests.

---
### Pattern: `AlertChannel` (ClassDef)
Found in 2 locations:
- `deployment/monitoring/alert_channels.py` (Lines 25-30)
- `deployment/monitoring/alert_manager.py` (Lines 33-38)

**Refactoring Strategy:**
1. Extract `AlertChannel` to a shared module (e.g., `app/common/AlertChannel_util.py` or similar).
2. Import `AlertChannel` in the identified files.
3. Run tests.

---
### Pattern: `should_analyze_file` (FunctionDef)
Found in 2 locations:
- `scripts/check-file-compliance.py` (Lines 37-52)
- `scripts/file-size-analysis.py` (Lines 32-47)

**Refactoring Strategy:**
1. Extract `should_analyze_file` to a shared module (e.g., `app/common/should_analyze_file_util.py` or similar).
2. Import `should_analyze_file` in the identified files.
3. Run tests.

---
### Pattern: `should_check_file` (FunctionDef)
Found in 2 locations:
- `scripts/git-hooks/detect-hardcoded-values.py` (Lines 55-83)
- `scripts/git-hooks/check-file-size.py` (Lines 36-64)

**Refactoring Strategy:**
1. Extract `should_check_file` to a shared module (e.g., `app/common/should_check_file_util.py` or similar).
2. Import `should_check_file` in the identified files.
3. Run tests.

---
### Pattern: `LoggerMigrationTool` (ClassDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 19-160)
- `scripts/migration/logger_migration.py` (Lines 19-160)

**Refactoring Strategy:**
1. Extract `LoggerMigrationTool` to a shared module (e.g., `app/common/LoggerMigrationTool_util.py` or similar).
2. Import `LoggerMigrationTool` in the identified files.
3. Run tests.

---
### Pattern: `main` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 163-197)
- `scripts/migration/logger_migration.py` (Lines 163-197)

**Refactoring Strategy:**
1. Extract `main` to a shared module (e.g., `app/common/main_util.py` or similar).
2. Import `main` in the identified files.
3. Run tests.

---
### Pattern: `__init__` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 22-29)
- `scripts/migration/logger_migration.py` (Lines 22-29)

**Refactoring Strategy:**
1. Extract `__init__` to a shared module (e.g., `app/common/__init___util.py` or similar).
2. Import `__init__` in the identified files.
3. Run tests.

---
### Pattern: `find_logger_files` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 31-41)
- `scripts/migration/logger_migration.py` (Lines 31-41)

**Refactoring Strategy:**
1. Extract `find_logger_files` to a shared module (e.g., `app/common/find_logger_files_util.py` or similar).
2. Import `find_logger_files` in the identified files.
3. Run tests.

---
### Pattern: `_should_migrate_file` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 43-59)
- `scripts/migration/logger_migration.py` (Lines 43-59)

**Refactoring Strategy:**
1. Extract `_should_migrate_file` to a shared module (e.g., `app/common/_should_migrate_file_util.py` or similar).
2. Import `_should_migrate_file` in the identified files.
3. Run tests.

---
### Pattern: `migrate_logger_in_file` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 61-116)
- `scripts/migration/logger_migration.py` (Lines 61-116)

**Refactoring Strategy:**
1. Extract `migrate_logger_in_file` to a shared module (e.g., `app/common/migrate_logger_in_file_util.py` or similar).
2. Import `migrate_logger_in_file` in the identified files.
3. Run tests.

---
### Pattern: `_has_structured_logging_opportunities` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 118-126)
- `scripts/migration/logger_migration.py` (Lines 118-126)

**Refactoring Strategy:**
1. Extract `_has_structured_logging_opportunities` to a shared module (e.g., `app/common/_has_structured_logging_opportunities_util.py` or similar).
2. Import `_has_structured_logging_opportunities` in the identified files.
3. Run tests.

---
### Pattern: `migrate_all_loggers` (FunctionDef)
Found in 2 locations:
- `scripts/utilities/logger_migration.py` (Lines 128-160)
- `scripts/migration/logger_migration.py` (Lines 128-160)

**Refactoring Strategy:**
1. Extract `migrate_all_loggers` to a shared module (e.g., `app/common/migrate_all_loggers_util.py` or similar).
2. Import `migrate_all_loggers` in the identified files.
3. Run tests.

---
