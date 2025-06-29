# OLORIN MCP Custom Prompt Usage Guide

## Overview

The Enhanced OLORIN MCP Server now supports **custom prompts**, allowing users to send any prompt directly to the system instead of being limited to pre-defined prompts. This feature provides maximum flexibility for fraud investigators and risk analysts to ask specific questions and get tailored responses.

## Current Limitation vs. Enhanced Solution

### ❌ Current System (Limited)
- Only 5 pre-defined prompts available
- Users must choose from fixed options
- No ability to ask custom questions
- Limited flexibility for specific use cases

### ✅ Enhanced System (Custom Prompts)
- Execute any custom prompt directly
- Create and save reusable prompt templates
- Template management with parameters
- Comprehensive examples and guidance
- Maintains all existing functionality

## Features

### 1. Direct Custom Prompt Execution
Send any prompt directly to the system with optional context and parameters.

### 2. Prompt Template Management
- Create reusable templates with parameters
- Save frequently used prompts
- Execute templates with dynamic values
- Delete and manage templates

### 3. Built-in Examples
- Pre-built examples for common use cases
- Usage instructions and best practices
- Parameter guidance

### 4. Enhanced Server Status
- Real-time statistics on prompt usage
- Capability reporting
- Template management status

## API Endpoints

### Execute Custom Prompt
```http
POST /prompts/custom
Content-Type: application/json

{
  "prompt_text": "Your custom prompt here",
  "context": {
    "key1": "value1",
    "key2": "value2"
  },
  "max_tokens": 2000,
  "temperature": 0.7
}
```

### Create Prompt Template
```http
POST /prompts/templates/create
Content-Type: application/json

{
  "name": "template_name",
  "template": "Template with {parameter1} and {parameter2}",
  "description": "Description of what this template does",
  "parameters": ["parameter1", "parameter2"],
  "category": "fraud_investigation"
}
```

### Execute Template
```http
POST /prompts/templates/{template_name}/execute
Content-Type: application/json

{
  "parameter1": "value1",
  "parameter2": "value2"
}
```

### List Templates
```http
GET /prompts/templates
```

### Get Examples
```http
GET /prompts/examples
```

### Enhanced Status
```http
GET /status/enhanced
```

## Usage Examples

### 1. Basic Custom Prompt

```python
import httpx

async def execute_custom_prompt():
    async with httpx.AsyncClient() as client:
                 response = await client.post(
             "http://localhost:3000/prompts/custom",
            json={
                "prompt_text": "I need to investigate suspicious login activity for user ID 12345. The user logged in from 5 different countries within 2 hours. Please provide a systematic investigation approach using available OLORIN tools.",
                "context": {
                    "user_id": "12345",
                    "time_window": "2 hours",
                    "locations": ["US", "UK", "Germany", "Japan", "Brazil"]
                }
            }
        )
        return response.json()
```

### 2. Create and Use Template

```python
# Create template
template_data = {
    "name": "user_risk_assessment",
    "template": "Assess the risk level for user {user_id} based on activities: {activities}. Consider account age: {account_age}. Provide risk score 1-100.",
    "description": "Template for user risk assessment",
    "parameters": ["user_id", "activities", "account_age"],
    "category": "risk_assessment"
}

# Create the template
await client.post("/prompts/templates/create", json=template_data)

# Execute the template
template_args = {
    "user_id": "USER_789",
    "activities": "Multiple failed logins, unusual transactions",
    "account_age": "6 months"
}

response = await client.post(
    "/prompts/templates/user_risk_assessment/execute",
    json=template_args
)
```

## Real-World Use Cases

### 1. Fraud Investigation
```json
{
  "prompt_text": "Analyze transaction pattern: User made 50 micro-transactions under $1 followed by one large $5000 transaction. All within 30 minutes. What fraud indicators should I investigate?",
  "context": {
    "transaction_count": 50,
    "amount_pattern": "micro then large",
    "time_window": "30 minutes",
    "large_amount": 5000
  }
}
```

### 2. Risk Assessment
```json
{
  "prompt_text": "New customer opened account with fake SSN, provided PO Box address, and immediately tried to transfer $10K. What's the risk level and what should I do?",
  "context": {
    "customer_type": "new",
    "red_flags": ["fake SSN", "PO Box", "immediate large transfer"],
    "amount": 10000
  }
}
```

### 3. Data Anomaly Investigation
```json
{
  "prompt_text": "Our system detected 1000% increase in failed login attempts from IP range 192.168.1.0/24 between 2-4 AM. How should I investigate this using Splunk?",
  "context": {
    "anomaly": "failed login spike",
    "increase": "1000%",
    "ip_range": "192.168.1.0/24",
    "time": "2-4 AM"
  }
}
```

## Response Format

All custom prompts return structured responses:

```json
{
  "success": true,
  "content": "Detailed analysis and recommendations...",
  "metadata": {
    "prompt_length": 150,
    "context_keys": ["user_id", "time_window"],
    "max_tokens": 2000,
    "temperature": 0.7,
    "timestamp": 1704067200.0
  },
  "execution_time_ms": 1250
}
```

## Best Practices

### 1. Provide Context
Always include relevant context to get better responses:
```json
{
  "prompt_text": "Your question here",
  "context": {
    "user_id": "specific_id",
    "time_frame": "specific_period",
    "relevant_data": "specific_values"
  }
}
```

### 2. Be Specific
Instead of: "Is this fraud?"
Use: "User logged in from 3 countries in 1 hour and made large transfers. Analyze fraud risk."

### 3. Use Templates for Repeated Tasks
Create templates for common investigations you perform regularly.

### 4. Leverage Available Tools
Reference specific OLORIN tools in your prompts:
- "Use Splunk to analyze..."
- "Check with OII tool for..."
- "Use Chronos for temporal analysis..."

## Integration with Existing System

The enhanced server maintains full compatibility with the existing system:

- All existing endpoints still work
- Pre-defined prompts remain available
- Tool execution unchanged
- WebSocket functionality preserved

## Getting Started

1. **Start Comprehensive Server**:
   ```bash
   python app/mcp/comprehensive_mcp_server.py
   ```

2. **Test Custom Prompts**:
   ```bash
   python tests/test_custom_prompts.py
   ```

3. **Check Server Status**:
   ```bash
   curl http://localhost:3000/health
   ```

## Migration Guide

### From Current System
1. Current code using pre-defined prompts continues to work
2. Add custom prompt calls where needed
3. Gradually migrate to templates for repeated use cases
4. Server runs on port 3000 with integrated custom prompt functionality

### Example Migration
```python
# Old way - limited to pre-defined prompts
response = await client.post("/prompts/get", json={
    "name": "fraud_investigation_prompt",
    "arguments": {"user_query": "investigate user"}
})

# New way - unlimited custom prompts
response = await client.post("/prompts/custom", json={
    "prompt_text": "Investigate user 12345 for account takeover. Check login patterns, device changes, and transaction anomalies in last 7 days.",
    "context": {
        "user_id": "12345",
        "investigation_type": "account_takeover",
        "time_window": "7 days"
    }
})
```

## Troubleshooting

### Common Issues

1. **Server Not Responding**
   - Check if comprehensive server is running on port 3000
   - Verify no port conflicts

2. **Template Not Found**
   - List templates first: `GET /prompts/templates`
   - Check template name spelling

3. **Parameter Errors**
   - Ensure all required template parameters are provided
   - Check parameter names match template definition

### Debug Information

Enable debug logging to see detailed execution:
```python
import logging
logging.basicConfig(level=logging.INFO)
```

## Security Considerations

1. **Input Validation**: All prompts are validated before execution
2. **Context Sanitization**: Context data is sanitized to prevent injection
3. **Rate Limiting**: Consider implementing rate limiting for production use
4. **Authentication**: Add authentication for production deployment

## Future Enhancements

Planned features for future versions:
- LLM integration with OpenAI/Claude APIs
- Prompt history and analytics
- Advanced template features
- Collaborative prompt sharing
- Performance optimization

## Support

For questions or issues:
1. Check the test suite for examples
2. Review server logs for error details
3. Use `/prompts/examples` for guidance
4. Check `/status/enhanced` for system status

---

**Note**: This enhanced system provides unlimited flexibility while maintaining all existing functionality. Users can now ask any question and get tailored responses for their specific investigation needs. 