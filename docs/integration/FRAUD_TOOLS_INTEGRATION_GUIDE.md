# Fraud Investigation Tools Integration Guide

## Overview

This guide provides comprehensive instructions for integrating new fraud investigation tools into the Olorin platform. Olorin is designed as a fraud investigation assistant for human investigators, with all tools visible and selectable through the UI.

## Architecture Overview

### Tool Categories
1. **Olorin Tools** - Specialized fraud investigation tools
2. **MCP Tools** - General-purpose tools and integrations

### Key Components
- **Frontend**: Tool selection UI in Settings page
- **Backend**: Tool execution via AI agents
- **Storage**: Tool configurations and user preferences

## Added Fraud Investigation Tools

### Transaction & Payment Analysis
1. **Transaction Pattern Analysis** (`transaction_analysis`)
   - Velocity checks and amount anomaly detection
   - Pattern-based fraud detection (card testing, etc.)
   - Historical baseline comparison

2. **Payment Method Intelligence** (`payment_intelligence`)
   - BIN analysis and card verification
   - Payment method risk scoring
   - Issuer bank verification

### Identity & Account Security
3. **Account Behavior Analytics** (`account_behavior`)
   - Login pattern analysis
   - Spending behavior monitoring
   - Device/browser change detection

4. **Identity Verification Suite** (`identity_verification`)
   - KYC compliance checks
   - Document verification
   - Biometric analysis

5. **Account Takeover Detection** (`ato_detection`)
   - Credential stuffing detection
   - Session hijacking analysis
   - Unauthorized access monitoring

### Advanced Analytics
6. **ML Fraud Risk Scoring** (`fraud_scoring`)
   - Real-time risk scoring
   - Explainable AI insights
   - Multi-factor risk assessment

7. **Relationship Graph Analysis** (`graph_analysis`)
   - Fraud ring detection
   - Entity relationship mapping
   - Network centrality analysis

8. **Temporal Pattern Detection** (`temporal_analysis`)
   - Time-series fraud pattern analysis
   - Frequency-based anomaly detection

### Compliance & Intelligence
9. **Sanctions & Watchlist Check** (`sanctions_screening`)
   - Global sanctions list screening
   - PEP (Politically Exposed Persons) checks
   - Regulatory compliance

10. **Digital Footprint Analysis** (`digital_footprint`)
    - Online presence verification
    - Social media analysis
    - Digital behavior patterns

### External Integrations
11. **Merchant Risk Intelligence** (`merchant_intelligence`)
    - Merchant reputation analysis
    - Business verification
    - Transaction pattern analysis

12. **Communication Pattern Analysis** (`communication_analysis`)
    - Social engineering detection
    - Suspicious communication patterns

## Integration Steps

### 1. Frontend Integration (Already Completed)

The tools have been added to `/src/mock/tools-by-category.json`:

```json
{
  "olorin_tools": [
    {
      "name": "transaction_analysis",
      "display_name": "Transaction Pattern Analysis",
      "description": "Analyzes payment transactions for velocity, amount anomalies, and suspicious patterns"
    },
    // ... other tools
  ]
}
```

### 2. Backend Implementation

Use the templates in `/app/tools/fraud_investigation_tools.py`:

```python
from app.tools.fraud_investigation_tools import execute_tool, ToolResult

# Execute a single tool
result = await execute_tool(
    tool_name="transaction_analysis",
    entity_id="user123",
    entity_type="user_id",
    params={"time_range": "last_30_days"}
)

# Execute multiple tools in parallel
results = await execute_tools_parallel(
    tool_names=["transaction_analysis", "account_behavior", "fraud_scoring"],
    entity_id="user123",
    entity_type="user_id",
    params={}
)
```

### 3. Agent Integration

Update agents to use the new tools:

```python
# In your agent implementation
async def analyze_with_tools(self, entity_id: str, tools: List[str]):
    results = []
    
    for tool_name in tools:
        if tool_name in FRAUD_INVESTIGATION_TOOLS:
            result = await execute_tool(tool_name, entity_id, "user_id", {})
            results.append(result)
    
    return self.format_results(results)
```

### 4. API Endpoint Updates

Add tool results to agent responses:

```python
@router.post("/api/agent/invoke")
async def invoke_agent(request: AgentRequest):
    # Get tools from request
    tools = request.tools or []
    
    # Execute fraud investigation tools
    tool_results = await execute_tools_parallel(
        tool_names=tools,
        entity_id=request.entity_id,
        entity_type=request.entity_type,
        params=request.params
    )
    
    # Combine with agent analysis
    agent_result = await agent.analyze(request)
    agent_result.tool_results = tool_results
    
    return agent_result
```

## Tool Result Format

All tools return a standardized `ToolResult`:

```python
class ToolResult(BaseModel):
    tool_name: str                    # Tool identifier
    timestamp: datetime               # Execution timestamp
    status: str                      # success/failure/partial
    data: Dict[str, Any]            # Tool-specific results
    risk_indicators: List[str]       # Key risk findings
    confidence_score: float          # 0.0-1.0 confidence
    recommendations: List[str]       # Actionable recommendations
    metadata: Dict[str, Any]        # Additional metadata
```

## UI Integration

### Settings Page
Tools automatically appear in the Settings page under "Tools per Agent":
- Users can enable/disable tools per agent
- Tools are categorized (Investigation Tools vs MCP Tools)
- Settings persist to backend

### Investigation Flow
1. User selects tools in Settings or per-investigation
2. Tools are passed to agents during investigation
3. Results display in agent detail tables
4. Risk indicators highlight in the UI

## Best Practices

### Tool Development
1. **Single Responsibility**: Each tool should focus on one aspect of fraud analysis
2. **Async Implementation**: Use async/await for performance
3. **Error Handling**: Gracefully handle failures with partial results
4. **Standardized Output**: Always return ToolResult format

### Performance
1. **Parallel Execution**: Run independent tools concurrently
2. **Caching**: Cache results for repeated queries
3. **Timeouts**: Implement reasonable timeouts (30s default)
4. **Rate Limiting**: Respect external API limits

### Security
1. **Input Validation**: Validate all parameters
2. **Authentication**: Ensure proper user authentication
3. **Audit Logging**: Log all tool executions
4. **Data Privacy**: Handle PII according to regulations

## Testing

### Unit Tests
```python
async def test_transaction_analysis():
    tool = TransactionAnalysisTool()
    result = await tool.analyze("user123", "user_id", {})
    
    assert result.tool_name == "transaction_analysis"
    assert 0 <= result.confidence_score <= 1
    assert isinstance(result.risk_indicators, list)
```

### Integration Tests
```python
async def test_agent_with_tools():
    tools = ["transaction_analysis", "fraud_scoring"]
    result = await agent.analyze_with_tools("user123", tools)
    
    assert len(result.tool_results) == 2
    assert all(r.status == "success" for r in result.tool_results)
```

## Deployment Checklist

- [ ] Update backend `/api/settings/tools-by-category` endpoint
- [ ] Implement tool classes in `fraud_investigation_tools.py`
- [ ] Update agent code to execute selected tools
- [ ] Add tool result rendering in frontend
- [ ] Configure tool permissions and access control
- [ ] Set up monitoring and alerting
- [ ] Document tool-specific parameters
- [ ] Train investigation team on new tools

## Monitoring & Maintenance

### Metrics to Track
- Tool execution time
- Success/failure rates
- Confidence score distribution
- False positive rates

### Regular Updates
- Review and update risk indicators
- Retrain ML models monthly
- Update threat intelligence feeds
- Audit tool effectiveness

## Support

For questions or issues:
1. Check tool logs in `/var/log/olorin/tools/`
2. Review tool-specific documentation
3. Contact the development team

## Future Enhancements

1. **Custom Tool Builder**: UI for creating custom investigation tools
2. **Tool Marketplace**: Share tools between organizations
3. **AI Tool Recommendations**: ML-based tool selection
4. **Real-time Collaboration**: Multi-investigator tool sharing
5. **Advanced Visualizations**: Graph-based fraud ring visualization