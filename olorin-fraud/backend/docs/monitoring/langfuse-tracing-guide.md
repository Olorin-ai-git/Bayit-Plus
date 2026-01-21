# Langfuse Tracing Integration Guide

## Overview

Langfuse provides comprehensive observability for LangChain applications, enabling you to trace, monitor, and debug AI agent executions in the Olorin fraud detection system.

## Configuration

### Credentials

The Langfuse integration is configured with the following credentials:

```python
langfuse = Langfuse(
    secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
    public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
    host="https://us.cloud.langfuse.com"
)
```

### Dashboard Access

View your traces at: https://us.cloud.langfuse.com

## Integration Points

### 1. Langfuse Tracing Module

Located at: `app/service/agent/orchestration/langfuse_tracing.py`

Key features:
- `LangfuseTracer` class for managing traces
- Integration with LangChain callbacks
- Context managers for investigation tracing
- Decorators for agent execution tracing

### 2. Integration Module

Located at: `app/service/agent/langfuse_integration.py`

Provides:
- Helper functions to enhance agents with tracing
- Config enhancement with Langfuse callbacks
- Pre-configured agent wrappers

## Usage Examples

### Basic Initialization

```python
from app.service.agent.langfuse_integration import initialize_langfuse

# Initialize at application startup
tracer = initialize_langfuse()
```

### Tracing an Investigation

```python
from app.service.agent.orchestration.langfuse_tracing import get_langfuse_tracer

tracer = get_langfuse_tracer()

# Use context manager for investigation tracing
with tracer.trace_investigation(
    investigation_id="inv_123",
    user_id="user_456",
    metadata={"entity_type": "transaction"}
) as trace_context:
    # Your investigation code here
    handler = trace_context["handler"]
    # Use handler with LangChain models
```

### Adding Tracing to LangChain Models

```python
from langchain_openai import ChatOpenAI
from app.service.agent.langfuse_integration import add_langfuse_to_config

# Create config with Langfuse
config = add_langfuse_to_config(
    investigation_id="inv_123",
    user_id="user_456",
    agent_name="fraud_detector"
)

# Use with LangChain model
llm = ChatOpenAI(callbacks=config["callbacks"])
```

### Tracing Agent Execution

```python
from app.service.agent.langfuse_integration import trace_agent_execution

@trace_agent_execution("network_agent")
async def network_agent(state, config):
    # Agent logic here
    return result
```

### Logging Tool Usage

```python
tracer.log_tool_usage(
    tool_name="splunk_search",
    input_data={"query": "error logs"},
    output_data={"results": 10},
    duration=2.5,
    trace_id=trace_id
)
```

### Adding Scores

```python
tracer.score_investigation(
    trace_id=trace_id,
    score_name="accuracy",
    value=0.95,
    comment="High accuracy detection"
)
```

## Integration with Existing Agents

### Network Agent

```python
from app.service.agent.langfuse_integration import enhance_network_agent_with_langfuse

# Enhance existing agent
traced_network_agent = enhance_network_agent_with_langfuse(network_agent)
```

### Device Agent

```python
from app.service.agent.langfuse_integration import enhance_device_agent_with_langfuse

traced_device_agent = enhance_device_agent_with_langfuse(device_agent)
```

## Testing

Run the test scripts to verify integration:

```bash
# Test without OpenAI (recommended for testing)
poetry run python test_langfuse_no_openai.py

# Simple test with basic functionality
poetry run python test_langfuse_simple.py

# Full integration test (requires OpenAI API)
poetry run python test_langfuse_integration.py
```

## Benefits

1. **Complete Visibility**: Track every step of fraud investigations
2. **Performance Monitoring**: Identify bottlenecks and slow operations
3. **Error Tracking**: Capture and debug failures
4. **Agent Analytics**: Analyze agent performance and decision-making
5. **Cost Tracking**: Monitor LLM usage and costs
6. **Debugging**: Detailed traces for troubleshooting

## Best Practices

1. **Use Context Managers**: Wrap investigations in trace contexts
2. **Add Meaningful Metadata**: Include investigation IDs, user IDs, and entity information
3. **Score Important Metrics**: Add scores for accuracy, confidence, and performance
4. **Trace All Agents**: Ensure all agents have tracing enabled
5. **Monitor Performance**: Regular review traces to identify optimization opportunities

## Dashboard Features

In the Langfuse dashboard, you can:

- View investigation traces with full execution flow
- Analyze agent performance metrics
- Track error rates and recovery patterns
- Monitor LLM token usage and costs
- Export data for further analysis
- Set up alerts for anomalies

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify credentials and network connectivity
2. **Missing Traces**: Ensure `flush()` is called after operations
3. **Performance Impact**: Tracing adds minimal overhead (<50ms per trace)

### Debug Mode

Enable debug logging:

```python
tracer = init_langfuse_tracing(debug=True)
```

## Future Enhancements

- [ ] Add custom dashboards for fraud detection metrics
- [ ] Implement automated performance alerts
- [ ] Create investigation replay functionality
- [ ] Add A/B testing for agent strategies
- [ ] Integrate with alerting systems

## Support

For issues or questions:
- Check Langfuse documentation: https://langfuse.com/docs
- Review test scripts for examples
- Contact the Olorin development team