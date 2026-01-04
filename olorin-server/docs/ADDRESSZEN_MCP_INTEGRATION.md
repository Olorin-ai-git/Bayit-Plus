# AddressZen MCP Server Integration

## Overview

AddressZen MCP server has been integrated into Olorin for enhanced address validation and location intelligence during fraud investigations.

## Configuration

### MCP Server Configuration

The AddressZen MCP server is configured in `~/.cursor/mcp.json` using the HTTP stream API format:

```json
{
  "Addresszen-qian34": {
    "url": "https://backend.composio.dev/v3/mcp/c3b42f91-737e-4d31-9271-bfbc17bcc12c/mcp?include_composio_helper_actions=true"
  }
}
```

### Environment Variables

Add the following to your `.env` file for reference (optional, as MCP server is configured via Cursor):

```bash
# AddressZen MCP Server Configuration (HTTP Stream API)
# Note: AddressZen is configured via Cursor MCP config (~/.cursor/mcp.json)
# This variable is for reference/documentation only
COMPOSIO_ADDRESSZEN_MCP_URL=https://backend.composio.dev/v3/mcp/c3b42f91-737e-4d31-9271-bfbc17bcc12c/mcp?include_composio_helper_actions=true
```

## Integration with Location Agent

The AddressZen MCP server is automatically available to the location agent through the MCP integration system. The location agent processes AddressZen tool results in the following ways:

### 1. Location Signal Extraction

The location agent automatically extracts AddressZen-specific location signals:

**Address Fields:**
- `address`, `address_line1`, `address_line2`
- `postal_code`, `zip_code`
- `state`, `state_code`, `province`, `county`
- `street`, `street_number`
- `formatted_address`, `address_components`
- `place_id`, `location_type`

**Risk Indicators:**
- `address_validation`, `address_verified`
- `address_risk`, `deliverability`
- `address_risk_score`, `deliverability_score`
- `validation_score`, `address_confidence`
- `address_match_score`, `fraud_risk`

### 2. Location Risk Assessment

AddressZen results are processed by `_process_location_signals()` which:

1. **Extracts location indicators**: Address components, validation status, risk scores
2. **Calculates risk level**: Based on address validation, deliverability, and risk scores
3. **Adds evidence**: Address validation results, risk indicators, and scores
4. **Adjusts risk score**: High-risk addresses increase risk, validated safe addresses reduce risk

### 3. Tool Result Processing

AddressZen tool results are automatically included in `tool_results` and processed by:

- `_analyze_geolocation_intelligence()`: Processes all tool results for location signals
- `_extract_location_signals()`: Extracts AddressZen-specific fields
- `_process_location_signals()`: Calculates risk adjustments based on AddressZen data

## Usage

AddressZen tools are automatically available to the orchestrator and location agent. The agent will:

1. **Discover AddressZen tools** via MCP integration
2. **Execute AddressZen actions** when address validation is needed
3. **Process AddressZen results** in location analysis
4. **Include AddressZen evidence** in location domain findings

## Example Tool Result Processing

When AddressZen returns address validation results, the location agent will:

```python
# AddressZen result example
{
    "address": "123 Main St, New York, NY 10001",
    "address_validation": "validated",
    "address_risk_score": 0.3,
    "deliverability": "high",
    "formatted_address": "123 Main St, New York, NY 10001, USA"
}

# Location agent extracts:
location_signals = {
    "location_address": "123 Main St, New York, NY 10001",
    "location_state_code": "NY",
    "location_postal_code": "10001",
    "score_address_risk_score": 0.3,
    "location_address_validation": "validated",
    "location_deliverability": "high"
}

# Risk assessment:
# - Low address_risk_score (0.3) → reduces location risk
# - High deliverability → safe location indicator
# - Validated address → reduces risk
```

## Troubleshooting

### AddressZen Tools Not Available

1. **Check MCP configuration**: Verify `~/.cursor/mcp.json` contains AddressZen configuration
2. **Restart Cursor**: MCP servers are loaded at Cursor startup
3. **Check MCP logs**: Look for AddressZen connection errors in Cursor logs

### AddressZen Results Not Processed

1. **Verify tool execution**: Check that AddressZen tools are being called during investigation
2. **Check tool_results**: Verify AddressZen results are in `state["tool_results"]`
3. **Review location agent logs**: Check for AddressZen signal extraction logs

## Related Files

- **MCP Configuration**: `~/.cursor/mcp.json`
- **Location Agent**: `app/service/agent/orchestration/domain_agents/location_agent.py`
- **Tool Registry**: `app/service/agent/tools/tool_registry.py`
- **MCP Client Manager**: `app/service/agent/mcp_client/mcp_client_manager.py`

