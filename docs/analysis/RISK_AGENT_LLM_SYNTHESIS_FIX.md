# Risk Agent LLM Synthesis Fix

## Problem Identified

The risk agent was **NOT using LLM synthesis** despite having domain LLM analyses available. It was only:
1. Calculating numeric risk scores algorithmically
2. Generating simple narratives without LLM synthesis
3. NOT accumulating LLM thoughts from domain agents
4. NOT detecting cross-domain patterns
5. NOT extracting specific values for recommendations

## Solution Implemented

### 1. Added LLM Synthesis Function

Created `_synthesize_with_llm()` function that:
- Collects all domain LLM analyses and risk scores
- Formats domain analyses for synthesis prompt
- Detects patterns in transaction data (velocity bursts, identical amounts, IP rotation)
- Calls LLM with comprehensive synthesis prompt
- Parses LLM response into structured format

### 2. Enhanced Pattern Detection

Added `_detect_patterns_in_data()` function that automatically detects:
- **Velocity bursts**: Multiple transactions within 5 minutes
- **Identical amount patterns**: Same amount appearing multiple times
- **Burst patterns**: Identical amounts in rapid succession
- **IP rotation**: Same device using multiple IPs

### 3. Comprehensive Synthesis Prompt

The synthesis prompt now instructs LLM to:
1. **Cross-Domain Pattern Detection**: Identify contradictions (e.g., device consistency + IP rotation)
2. **Velocity & Amount Analysis**: Detect bursts and clustering patterns
3. **Extract Specific Values**: Extract exact IPs, devices, emails for recommendations
4. **Data Gap Analysis**: List missing data sources and their impact
5. **Prioritized Recommendations**: Provide specific, actionable steps with exact values

### 4. Integration with Risk Agent

Modified `risk_agent_node()` to:
- Call `_synthesize_with_llm()` after basic domain aggregation
- Store LLM synthesis results in `risk_findings["llm_analysis"]`
- Update narrative, recommendations, and risk_factors from LLM synthesis
- Fallback to algorithmic synthesis if LLM fails

## Key Features

### Pattern Detection
- Automatically detects velocity bursts (transactions within 5 minutes)
- Identifies identical amount patterns
- Correlates timing with IP/device changes
- Flags IP rotation with same device

### Cross-Domain Synthesis
- Collects LLM analyses from all domains (network, device, location, logs, authentication)
- Identifies contradictions and correlations
- Explains why patterns are suspicious

### Actionable Recommendations
- Extracts specific values (IPs, devices, emails) from analyses
- Provides prioritized recommendations with exact values
- Formats as actionable checklists

### Data Gap Analysis
- Lists missing data sources
- Explains impact on confidence
- Prioritizes critical gaps

## Expected Improvements

After this fix, the risk agent will:

1. **Detect Patterns**: Identify velocity bursts and amount clustering automatically
2. **Synthesize Cross-Domain**: Explain contradictions like device consistency + IP rotation
3. **Extract Specifics**: Provide exact IPs, devices, emails in recommendations
4. **Prioritize Actions**: Order recommendations by criticality with specific values
5. **Emphasize Gaps**: Clearly list missing data and its impact

## Example Output

**Before:**
```
Risk Score: 0.52
Recommendations:
- Execute external tool analysis
- Behavioral investigation
```

**After:**
```
Risk Score: 0.52 (Moderate Risk)

KEY PATTERNS IDENTIFIED:
1. Velocity Burst A: 3x $250,024 in 2 minutes (09:13-09:15 UTC) on IP 2404:c0:2910::99:43cc
2. Velocity Burst B: 2x $301,263 in 1 minute (06:11-06:12 UTC) on IP 2404:c0:2910::8e:2237
3. Cross-Domain Contradiction: Single device (eff407b2-9d35-46a6-879d-6bc4ab) but multiple IPs from same /48 subnet

CRITICAL DATA GAPS:
- IP Reputation: Cannot verify VPN/proxy status for 2404:c0:2910::99:43cc and 2404:c0:2910::8e:2237
- Device Reputation: Cannot check if eff407b2-9d35-46a6-879d-6bc4ab seen on other accounts
- Email Reputation: Cannot verify breach/exposure for nlala1282@gmail.com
Impact: Confidence reduced from 0.8 to 0.65

PRIORITIZED RECOMMENDATIONS:
1. [CRITICAL] IP Reputation Check:
   - 2404:c0:2910::99:43cc (Burst A)
   - 2404:c0:2910::8e:2237 (Burst B)
   - /48 subnet: 2404:c0:2910::/48
   - Check: VPN/proxy status, datacenter classification, abuse history

2. [HIGH] Device Fingerprint Reputation:
   - Device: eff407b2-9d35-46a6-879d-6bc4ab
   - Check: Seen on other accounts? Dispute history? Last 30-60 days

3. [HIGH] Email Risk Signals:
   - Email: nlala1282@gmail.com
   - Check: Breach/exposure, first-seen date, cross-merchant velocity
```

## Files Modified

- `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py`
  - Added `_synthesize_with_llm()` function
  - Added `_format_domain_analyses_for_synthesis()` function
  - Added `_detect_patterns_in_data()` function
  - Added `_format_tool_results_for_synthesis()` function
  - Added `_parse_synthesis_response()` function
  - Added `_extract_section()` helper function
  - Modified `risk_agent_node()` to call LLM synthesis

## Next Steps

1. **Test the implementation** with real investigation data
2. **Add pattern detection to domain prompts** (Todo #2)
3. **Enhance evidence analyzer** to extract specific values (Todo #3)
4. **Improve data gap reporting** with specific impact statements (Todo #4)

