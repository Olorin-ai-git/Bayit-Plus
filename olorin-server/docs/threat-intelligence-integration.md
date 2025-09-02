# Threat Intelligence Integration Guide

## Overview

The Olorin fraud detection platform has been enhanced with comprehensive threat intelligence capabilities through the integration of multiple industry-leading threat intelligence providers. This integration enables autonomous agents to make more informed decisions by leveraging real-time threat data from AbuseIPDB, VirusTotal, and Shodan.

## Architecture

### Integrated Threat Intelligence Providers

1. **AbuseIPDB**
   - IP reputation and abuse scoring
   - Bulk IP analysis capabilities
   - CIDR block analysis
   - Community-driven threat reporting

2. **VirusTotal**
   - Multi-engine malware scanning
   - Domain reputation analysis
   - File hash verification
   - URL safety validation

3. **Shodan**
   - Infrastructure intelligence
   - Vulnerability discovery
   - Port and service analysis
   - Exploit database integration

4. **Unified Threat Intelligence Aggregator**
   - Multi-source correlation
   - Consensus scoring
   - Intelligent source selection
   - Cross-platform validation

## Tool Registry Integration

All threat intelligence tools are registered in the central tool registry and accessible to autonomous agents:

```python
# Total of 12 threat intelligence tools available:
- abuseipdb_ip_reputation
- abuseipdb_bulk_ip_analysis
- abuseipdb_cidr_analysis
- abuseipdb_report_ip
- virustotal_ip_analysis
- virustotal_domain_analysis
- virustotal_file_analysis
- virustotal_url_analysis
- shodan_infrastructure_analysis
- shodan_search
- shodan_exploit_search
- unified_threat_intelligence
```

## Enhanced Domain Agents

### Network Agent Enhancements
The network agent now prioritizes threat intelligence for comprehensive network analysis:

- **IP Reputation Checks**: Automatically queries AbuseIPDB and VirusTotal for all IP addresses
- **Infrastructure Analysis**: Uses Shodan to gather intelligence about suspicious IPs
- **Multi-source Correlation**: Leverages unified threat intelligence for consensus
- **C2 Detection**: Identifies command and control server connections
- **Geographic Validation**: Verifies IP locations against claimed origins

Key Objectives:
- Check ALL IP addresses against threat databases
- Gather infrastructure intelligence using Shodan
- Detect VPN, proxy, and TOR exit nodes
- Identify botnet and C2 communications
- Analyze port scanning and reconnaissance attempts

### Device Agent Enhancements
The device agent uses threat intelligence for device security assessment:

- **IP Validation**: Checks device IPs against threat databases
- **File Analysis**: Uses VirusTotal for file hash verification
- **Malware Detection**: Scans for known malicious signatures
- **Infrastructure Correlation**: Identifies compromised device networks
- **Tool Detection**: Identifies fraud tools and automation frameworks

Key Objectives:
- Verify device IP reputation
- Scan file hashes for malware
- Detect remote access tools
- Identify device cloning attempts
- Check for jailbreak/root detection bypass

### Location Agent Enhancements
The location agent leverages threat intelligence for geographic validation:

- **Geographic Consistency**: Verifies IP locations match claimed origins
- **VPN/Proxy Detection**: Identifies location masking attempts
- **ISP Validation**: Confirms ISP data matches expected location
- **Risk Region Detection**: Identifies high-risk countries and sanctioned regions
- **Data Center Detection**: Distinguishes residential from commercial IPs

Key Objectives:
- Validate geographic consistency
- Detect location spoofing
- Identify impossible travel
- Check for fraud hotspots
- Verify timezone consistency

### Logs Agent Enhancements
The logs agent uses threat intelligence for behavioral analysis:

- **URL Analysis**: Cross-references accessed domains with VirusTotal
- **IP Monitoring**: Checks all logged IPs against threat databases
- **Attack Pattern Detection**: Identifies known attack signatures
- **C2 Communication**: Detects connections to malicious infrastructure
- **Tool Identification**: Recognizes malicious user agents and tools

Key Objectives:
- Analyze URLs for malicious domains
- Detect automated bot behavior
- Identify credential stuffing attempts
- Monitor data exfiltration patterns
- Detect API abuse patterns

### Risk Agent Enhancements
The risk agent aggregates all threat intelligence for comprehensive risk scoring:

- **Multi-source Aggregation**: Uses unified threat intelligence tool
- **Consensus Analysis**: Evaluates agreement between providers
- **Weighted Scoring**: Calculates risk based on confidence levels
- **Critical Threat Prioritization**: Highlights immediate risks
- **Executive Reporting**: Provides threat intelligence context

Key Objectives:
- Aggregate threat signals from all sources
- Calculate consensus threat scores
- Prioritize critical threats
- Generate risk-based recommendations
- Create executive summaries with threat context

## Implementation Details

### Tool Access Pattern
All agents access threat intelligence tools through the standard tool registry:

```python
from app.service.agent.agent import tools

# Tools are automatically available to agents
threat_intel_tools = [t for t in tools if 'threat' in t.name.lower()]
```

### Autonomous Tool Selection
Agents use LLM-driven decision making to autonomously select appropriate threat intelligence tools based on:
- Investigation context
- Available data indicators
- Specific objectives
- Risk signals detected

### API Key Management
All threat intelligence API keys are securely managed through Firebase Secrets:
- `ABUSEIPDB_API_KEY`
- `VIRUSTOTAL_API_KEY` 
- `SHODAN_API_KEY`

## Usage Examples

### Example 1: Network Investigation with Threat Intelligence
```python
# Network agent automatically uses threat intelligence
specific_objectives = [
    "Check ALL IP addresses against AbuseIPDB",
    "Use Shodan for infrastructure analysis",
    "Query VirusTotal for IP reputation"
]
```

### Example 2: Unified Threat Analysis
```python
# Risk agent aggregates threat intelligence
specific_objectives = [
    "Use unified_threat_intelligence tool",
    "Correlate findings from all providers",
    "Calculate consensus threat score"
]
```

## Benefits

1. **Enhanced Detection Accuracy**
   - Multi-source validation reduces false positives
   - Consensus scoring improves confidence
   - Real-time threat data ensures current intelligence

2. **Comprehensive Coverage**
   - IP reputation from multiple angles
   - Infrastructure vulnerability assessment
   - Malware and phishing detection
   - Geographic validation

3. **Automated Analysis**
   - Agents autonomously query threat intelligence
   - Intelligent tool selection based on context
   - Correlation across multiple data sources

4. **Actionable Intelligence**
   - Specific threat indicators identified
   - Risk-based prioritization
   - Clear recommendations for action

## Monitoring and Maintenance

### Tool Availability
Monitor tool registration in logs:
```
INFO - AbuseIPDB IP reputation tool registered
INFO - VirusTotal domain analysis tool registered
INFO - Shodan infrastructure analysis tool registered
```

### API Usage
Track API calls to manage quotas:
- AbuseIPDB: 1000 requests/day (free tier)
- VirusTotal: 500 requests/day (free tier)
- Shodan: 100 requests/month (free tier)

### Performance Metrics
- Tool response times
- Cache hit rates
- Correlation accuracy
- Detection improvements

## Future Enhancements

1. **Additional Providers**
   - Integrate AlienVault OTX
   - Add Recorded Future
   - Include CrowdStrike Falcon

2. **Advanced Correlation**
   - Machine learning for pattern recognition
   - Temporal correlation of threats
   - Predictive threat modeling

3. **Automated Response**
   - Auto-blocking of confirmed threats
   - Incident response automation
   - Real-time alerting

## Conclusion

The threat intelligence integration significantly enhances Olorin's fraud detection capabilities by providing autonomous agents with real-time, multi-source threat data. This enables more accurate risk assessments, faster threat detection, and comprehensive fraud investigation capabilities.