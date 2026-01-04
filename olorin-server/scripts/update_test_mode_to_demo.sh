#!/bin/bash
# Script to update all TEST_MODE == "mock" references to TEST_MODE == "demo"

echo "🔄 Updating TEST_MODE references from 'mock' to 'demo'..."

# Array of files that need to be updated
files=(
    "app/persistence/async_ips_redis.py"
    "app/service/agent/orchestration/clean_graph_builder.py"
    "app/service/agent/orchestration/hybrid/hybrid_state_schema.py"
    "app/service/agent/orchestration/domain_agents/network_agent.py"
    "app/service/agent/orchestration/hybrid/advanced_safety_manager.py"
    "app/service/agent/orchestration/hybrid/safety_threshold_config.py"
    "app/service/agent/orchestration/hybrid/state/enums_and_constants.py"
    "app/service/agent/orchestration/hybrid/safety/limiters/dynamic_limits_calculator.py"
    "app/service/agent/tools/snowflake_tool/client.py"
    "app/service/agent/orchestration/graph_builder.py"
    "app/service/agent/orchestration/orchestrator_graph.py"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Updating $file..."
        # Replace == "mock" with == "demo"
        sed -i.bak 's/== "mock"/== "demo"/g' "$file"
        # Replace == '\''mock'\'' with == '\''demo'\''
        sed -i.bak "s/== 'mock'/== 'demo'/g" "$file"
        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "🎉 All files updated!"
echo "📋 Backup files created with .bak extension"
