I# Diff Summary: graph-fix vs smart-id

| File path | Insertions | Deletions |
| --------- | ---------: | --------: |
| README.md | 16 | 0 |
| app/README.md | 2 | 2 |
| app/models/agent_context.py | 21 | 2 |
| app/persistence/async_ips_redis.py | 5 | 3 |
| app/router/agent_router_helper.py | 26 | 11 |
| app/router/api_router.py | 14 | 22 |
| app/router/device_router.py | 1 | 1 |
| app/router/location_router.py | 1 | 1 |
| app/router/logs_router.py | 2 | 1 |
| app/router/network_router.py | 2 | 1 |
| app/service/agent/agent.py | 308 | 22 |
| app/service/agent/tools/cdc_tool/cdc_tool.py | 31 | 4 |
| app/service/agent/tools/qb_tool/customer_tools.py | 21 | 2 |
| app/service/agent/tools/qb_tool/qbo_service.py | 3 | 3 |
| app/service/agent/tools/retriever_tool/retriever_tool.py | 36 | 9 |
| app/service/agent_service.py | 112 | 62 |
| app/service/base_llm_risk_service.py | 12 | 0 |
| app/service/config.py | 2 | 0 |
| app/service/llm_device_risk_service.py | 14 | 0 |
| app/service/llm_location_risk_service.py | 4 | 0 |
| app/service/llm_logs_risk_service.py | 14 | 0 |
| app/service/logs_analysis_service.py | 35 | 27 |
| app/service/network_analysis_service.py | 34 | 21 |
| app/test/adapters/test_upi_client.py | 1 | 1 |
| app/test/integration/test_agent_eval.py | 0 | 245 |
| app/test/unit/router/test_agent_router.py | 28 | 0 |
| app/test/unit/router/test_logs_router.py | 60 | 47 |
| app/test/unit/service/agent/test_agent.py | 5 | 2 |
| app/test/unit/service/agent/test_kk_dash_client.py | 11 | 11 |
| app/test/unit/service/agent/test_location_data_client.py | 27 | 7 |
| app/test/unit/service/agent/tools/cdc_tool/test_cdc_tool.py | 2 | 2 |
| app/test/unit/service/agent/tools/test_chronos_tool.py | 7 | 7 |
| app/test/unit/service/test_agent_service.py | 2 | 4 |
| app/test/unit/service/test_device_analysis_service.py | 2 | 2 |
| app/test/unit/test_error_handling.py | 1 | 0 |
| app/utils/idps_utils.py | 5 | 1 |
| conftest.py | 0 | 136 |
| pyproject.toml | 5 | 3 |
| pytest.ini | 2 | 0 |
| scripts/generate_architecture.sh | 26 | 0 |
| tests/run_investigation_flow_for_device.py | 18 | 0 |
| tests/test_agent_router.py | 356 | 0 |
| tests/test_agent_router_helper.py | 68 | 0 |
| tests/test_comment_router.py | 82 | 0 |
| tests/test_device_router.py | 845 | 0 |
| tests/test_location_router.py | 128 | 0 |
| tests/test_logs_router.py | 831 | 0 |
| tests/test_network_router.py | 775 | 0 |

*Summary: 48 files changed, 4003 insertions(+), 662 deletions(-).*