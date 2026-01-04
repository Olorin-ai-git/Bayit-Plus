# Investigation Instrumentation Guide

## Overview

This guide explains how to use the comprehensive instrumentation framework to capture detailed visibility into investigation execution. The framework logs all:

- **LLM Interactions**: Full prompts, responses, reasoning, latency
- **Tool Executions**: Input/output, raw data, execution time, records retrieved
- **Agent Decisions**: Decision type, options considered, selected option, reasoning
- **Risk Calculations**: Factors, weights, intermediate scores, final scores
- **Agent Results**: Findings, recommendations, confidence levels

## Quick Start

### 1. Initialize Agent Instrumentation

In your agent code:

```python
from app.service.logging.agent_instrumentation_helper import create_agent_instrumentor

# In your agent function
async def my_fraud_detection_agent(state, config) -> dict:
    investigation_id = config.get("investigation_id")

    # Create instrumentor for your agent
    instrumentor = create_agent_instrumentor(
        agent_name="fraud_detection_agent",
        investigation_id=investigation_id
    )

    # Log agent start
    instrumentor.log_agent_starting({
        "entity_id": "test@example.com",
        "analysis_type": "fraud_detection"
    })

    # ... rest of agent code ...

    # Finalize logs
    instrumentor.finalize_investigation()
```

### 2. Log LLM Interactions

When calling the LLM:

```python
start_time = time.time()

# Call your LLM
response = llm.invoke(prompt)

latency_ms = (time.time() - start_time) * 1000

# Log the interaction
instrumentor.log_llm_reasoning(
    llm_model="gpt-4",
    prompt=prompt,
    response=response,
    reasoning="LLM was asked to analyze fraud patterns",
    latency_ms=latency_ms
)
```

### 3. Log Tool Executions

When executing tools:

```python
import time

tool_name = "fraud_database_query"
tool_input = {"email": "test@example.com"}

start_time = time.time()

try:
    # Execute the tool
    results = query_fraud_database(email="test@example.com")

    execution_time_ms = (time.time() - start_time) * 1000

    # Log execution
    instrumentor.log_tool_execution(
        tool_name=tool_name,
        tool_input=tool_input,
        tool_output={"record_count": len(results)},
        execution_time_ms=execution_time_ms,
        data_retrieved=len(results),
        success=True
    )

except Exception as e:
    execution_time_ms = (time.time() - start_time) * 1000

    instrumentor.log_tool_execution(
        tool_name=tool_name,
        tool_input=tool_input,
        tool_output={"error": str(e)},
        execution_time_ms=execution_time_ms,
        success=False,
        error_message=str(e)
    )
    raise
```

### 4. Log Risk Calculations

When calculating risk scores:

```python
from app.service.logging.risk_instrumentation import RiskFactor

# Build risk factors
risk_factors = [
    RiskFactor(
        name="fraud_history",
        value=75.0,  # Score 0-100
        weight=0.4,  # Weight 0-1
        reasoning="Email has 5 confirmed fraud incidents in past 12 months",
        evidence=["fraud_incident_2024_001", "fraud_incident_2024_005"]
    ),
    RiskFactor(
        name="geographic_anomaly",
        value=45.0,
        weight=0.3,
        reasoning="Login from unusual geographic location",
        evidence=["geo_anomaly_detected_shanghai"]
    ),
    RiskFactor(
        name="velocity_spike",
        value=60.0,
        weight=0.3,
        reasoning="Unusual transaction velocity in past hour",
        evidence=["15_transactions_in_60_minutes"]
    )
]

# Log the risk calculation
final_score = instrumentor.log_risk_calculation(
    entity_id="test@example.com",
    entity_type="email",
    risk_factors=risk_factors,
    calculation_method="weighted_sum",
    final_score=61.5,  # Weighted average
    reasoning="Multi-factor analysis indicates elevated fraud risk due to historical incidents and geographic anomalies",
    confidence=0.87,
    recommendations=["escalate_for_review", "require_mfa", "flag_for_investigation"]
)
```

### 5. Log Agent Decisions

When making decisions:

```python
# Decision to escalate based on risk
if final_score > 75:
    instrumentor.log_threshold_decision(
        entity_id="test@example.com",
        risk_score=final_score,
        threshold=75.0,
        decision="escalate",
        reasoning="Risk score exceeds escalation threshold due to combination of fraud history and geographic anomalies",
        action_items=[
            "create_investigation_ticket",
            "notify_fraud_team",
            "block_account_temporarily"
        ]
    )
elif final_score > 50:
    instrumentor.log_threshold_decision(
        entity_id="test@example.com",
        risk_score=final_score,
        threshold=50.0,
        decision="investigate",
        reasoning="Risk score indicates need for further investigation",
        action_items=["manual_review", "contact_user"]
    )
```

### 6. Log Final Results

When agent completes:

```python
instrumentor.log_agent_result(
    entity_id="test@example.com",
    final_risk_score=61.5,
    findings=[
        {
            "type": "fraud_history",
            "severity": "high",
            "description": "5 confirmed fraud incidents in 12 months"
        },
        {
            "type": "geographic_anomaly",
            "severity": "medium",
            "description": "Login from Shanghai (user normally from USA)"
        }
    ],
    recommendations=[
        "Escalate for manual investigation",
        "Require multi-factor authentication",
        "Monitor account for 30 days"
    ],
    confidence=0.87,
    tools_used=["fraud_database_query", "geo_analysis", "velocity_analyzer"],
    execution_time_ms=2341.5
)
```

## Log File Format

### Text Log File
Location: `./investigation_logs/investigation_{investigation_id}.log`

Each entry is a JSON line containing:
```json
{
  "type": "llm_call",
  "data": {
    "timestamp": "2025-11-04T10:30:45.123456",
    "agent_name": "fraud_detection_agent",
    "llm_model": "gpt-4",
    "prompt": "...",
    "response": "...",
    "latency_ms": 1234.5,
    ...
  }
}
```

### JSON Summary File
Location: `./investigation_logs/investigation_{investigation_id}.json`

Contains complete structured summary:
```json
{
  "investigation_id": "INV-12345",
  "start_time": "2025-11-04T10:30:00",
  "end_time": "2025-11-04T10:35:00",
  "summary": {
    "total_llm_interactions": 12,
    "total_tool_executions": 8,
    "total_agent_decisions": 5,
    "total_risk_calculations": 3,
    "total_agent_results": 1,
    "total_errors": 0
  },
  "llm_interactions": [...],
  "tool_executions": [...],
  "agent_decisions": [...],
  "risk_calculations": [...],
  "agent_results": [...],
  "errors": [],
  "events": [...]
}
```

## Environment Configuration

### Log Directory

Set custom log directory via environment variable:
```bash
export INVESTIGATION_LOG_DIR="/var/log/olorin/investigations"
```

Default: `./investigation_logs`

## Example: Complete Agent with Instrumentation

```python
import time
from app.service.logging.agent_instrumentation_helper import create_agent_instrumentor
from app.service.logging.risk_instrumentation import RiskFactor

async def instrumented_fraud_detection_agent(state, config) -> dict:
    """Example agent with full instrumentation"""

    investigation_id = config.get("investigation_id", "unknown")
    entity_id = config.get("entity_id", "unknown")

    # Create instrumentor
    instr = create_agent_instrumentor(
        agent_name="fraud_detection_agent",
        investigation_id=investigation_id
    )

    try:
        # Log start
        instr.log_agent_starting({"entity_id": entity_id})

        # Tool 1: Query fraud database
        start_time = time.time()
        fraud_records = query_fraud_db(entity_id)
        instr.log_tool_execution(
            tool_name="fraud_database",
            tool_input={"entity_id": entity_id},
            tool_output={"found": len(fraud_records) > 0},
            execution_time_ms=(time.time() - start_time) * 1000,
            data_retrieved=len(fraud_records)
        )

        # Tool 2: Geo analysis
        start_time = time.time()
        geo_anomalies = check_geographic_anomalies(entity_id)
        instr.log_tool_execution(
            tool_name="geo_analyzer",
            tool_input={"entity_id": entity_id},
            tool_output={"anomalies_found": len(geo_anomalies) > 0},
            execution_time_ms=(time.time() - start_time) * 1000,
            data_retrieved=len(geo_anomalies)
        )

        # LLM reasoning
        prompt = f"Analyze fraud risk for {entity_id} given:\n- Fraud records: {len(fraud_records)}\n- Geo anomalies: {len(geo_anomalies)}"
        llm_response = await llm.ainvoke(prompt)
        instr.log_llm_reasoning(
            llm_model="gpt-4",
            prompt=prompt,
            response=llm_response,
            reasoning="Used LLM to synthesize fraud and geo data"
        )

        # Risk calculation
        risk_factors = [
            RiskFactor(
                name="fraud_history",
                value=float(len(fraud_records) * 10),  # Scale to 0-100
                weight=0.5,
                reasoning=f"Found {len(fraud_records)} fraud incidents",
                evidence=[r["id"] for r in fraud_records[:3]]
            ),
            RiskFactor(
                name="geographic_anomaly",
                value=float(len(geo_anomalies) * 20),
                weight=0.5,
                reasoning=f"Found {len(geo_anomalies)} geographic anomalies",
                evidence=[a["id"] for a in geo_anomalies[:3]]
            )
        ]

        final_score = instr.log_risk_calculation(
            entity_id=entity_id,
            entity_type="email",
            risk_factors=risk_factors,
            calculation_method="weighted_sum",
            final_score=60.0,
            reasoning="Multi-factor fraud risk assessment",
            confidence=0.85
        )

        # Decision
        if final_score > 70:
            instr.log_threshold_decision(
                entity_id=entity_id,
                risk_score=final_score,
                threshold=70.0,
                decision="escalate",
                reasoning="Risk exceeds escalation threshold",
                action_items=["create_ticket", "notify_team"]
            )

        # Final result
        instr.log_agent_result(
            entity_id=entity_id,
            final_risk_score=final_score,
            findings=[
                {"type": "fraud_history", "records": len(fraud_records)},
                {"type": "geo_anomaly", "count": len(geo_anomalies)}
            ],
            recommendations=["manual_review", "mfa_required"],
            confidence=0.85,
            tools_used=["fraud_database", "geo_analyzer"],
            execution_time_ms=2500.0
        )

        # Get log files
        logs = instr.get_log_files()
        print(f"Investigation logs saved to: {logs}")

        return {
            "status": "complete",
            "risk_score": final_score,
            "logs": logs
        }

    except Exception as e:
        instr.log_error(
            error_type="agent_execution_error",
            error_message=str(e),
            context={"entity_id": entity_id}
        )
        raise

    finally:
        # Always finalize
        instr.finalize_investigation()
```

## Analyzing Logs

### Using Python to Parse JSON Logs

```python
import json

def analyze_investigation_logs(json_file_path):
    """Analyze investigation logs"""
    with open(json_file_path, 'r') as f:
        data = json.load(f)

    print(f"Investigation: {data['investigation_id']}")
    print(f"Duration: {data['start_time']} to {data['end_time']}")

    summary = data['summary']
    print(f"\nSummary:")
    print(f"  LLM Interactions: {summary['total_llm_interactions']}")
    print(f"  Tool Executions: {summary['total_tool_executions']}")
    print(f"  Risk Calculations: {summary['total_risk_calculations']}")

    # Show all LLM reasoning
    print(f"\nLLM Interactions:")
    for llm in data['llm_interactions']:
        print(f"  - {llm['agent_name']} ({llm['latency_ms']:.0f}ms)")

    # Show all tool results
    print(f"\nTools Used:")
    for tool in data['tool_executions']:
        print(f"  - {tool['tool_name']}: {tool['data_retrieved']} records")

    # Show risk scores
    print(f"\nRisk Calculations:")
    for risk in data['risk_calculations']:
        print(f"  - {risk['entity_id']}: {risk['final_score']:.1f} (confidence: {risk['confidence']:.1%})")

# Usage
analyze_investigation_logs("./investigation_logs/investigation_INV-12345.json")
```

## Best Practices

1. **Always Finalize**: Call `instrumentor.finalize_investigation()` in a finally block
2. **Measure Performance**: Use `time.time()` to measure all operations
3. **Provide Context**: Include relevant context in all logging calls
4. **Capture Evidence**: Log evidence that supports risk calculations
5. **Log Errors**: Always log errors with context for debugging
6. **Use Confidence**: Provide confidence scores for all assessments

## Performance Considerations

- Instrumentation adds minimal overhead (~1-5% latency)
- Log files grow ~100KB per investigation
- JSON summary is generated at finalization
- Consider archiving old logs after 90 days
