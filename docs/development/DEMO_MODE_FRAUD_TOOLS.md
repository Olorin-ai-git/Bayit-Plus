# Demo Mode Fraud Investigation Tools

## Overview

All fraud investigation tools are now fully integrated into Olorin's demo mode. When running with `?demo=true`, investigators can see and experience the complete fraud investigation workflow with realistic logging and tool execution.

## What's Available in Demo Mode

### 1. **Tool Selection**
All 18 new fraud investigation tools are available in:
- Settings page → Tools per Agent mapping
- Tools sidebar during investigations
- Default tool lists for demo mode

### 2. **Structured Investigation Phases**
Added 5 new investigation phases that demonstrate fraud-specific analysis:

#### **Transaction Analysis Phase** (Duration: 5s)
- **Agent**: Transaction Analysis Agent
- **Tools**: transaction_analysis, payment_intelligence, merchant_intelligence, temporal_analysis
- **Log Messages**:
  - Analyzing payment velocity patterns
  - Detecting unusual transaction amounts
  - Profiling merchant risk levels
  - Identifying temporal anomalies
- **Risk Score**: 91/100

#### **Account Behavior Analysis** (Duration: 4s)
- **Agent**: Account Behavior Agent
- **Tools**: account_behavior, ato_detection, digital_footprint, communication_analysis
- **Log Messages**:
  - Detecting login anomalies (geographic impossibilities)
  - Identifying security setting changes
  - Analyzing communication patterns
  - Checking for account takeover indicators
- **Risk Score**: 94/100

#### **Fraud Ring Detection** (Duration: 5s)
- **Agent**: Graph Analysis Agent
- **Tools**: graph_analysis, identity_verification, fraud_scoring
- **Log Messages**:
  - Building entity relationship graphs
  - Detecting shared attributes across accounts
  - Calculating network centrality scores
  - Identifying coordinated activities
- **Risk Score**: 96/100

#### **Compliance Screening** (Duration: 4s)
- **Agent**: Compliance Agent
- **Tools**: sanctions_screening, regulatory_reporting, case_management
- **Log Messages**:
  - OFAC sanctions list screening
  - PEP database checks
  - AML monitoring alerts
  - SAR filing requirements
- **Risk Score**: 98/100

#### **Final Assessment** (Duration: 3s)
- **Agent**: Investigation Orchestrator
- **Tools**: ml_risk_model, fraud_scoring_engine, decision_tree_analyzer
- **Final Risk Score**: 95/100
- **Critical Alerts**: Account freeze, SAR filing, law enforcement referral

### 3. **RAG Prepared Prompts**
Added 10 new fraud-specific investigation prompts:
- Transaction Velocity Analysis
- Money Laundering Detection
- Account Takeover Investigation
- Fraud Ring Network Analysis
- Sanctions Screening Alert
- Merchant Category Risk Analysis
- Digital Footprint Verification
- Synthetic Identity Detection
- Real-time Fraud Score
- Cryptocurrency Fraud Detection

### 4. **Realistic Demo Experience**

When running an investigation in demo mode:
1. **Tools are visibly used** - Each tool shows in the logs when executed
2. **Progressive risk scoring** - Risk scores increase as fraud indicators are found
3. **Detailed findings** - LLM analysis provides specific fraud patterns detected
4. **Actionable recommendations** - Clear next steps for investigators

## How to Test

1. **Enable Demo Mode**: Add `?demo=true` to the URL
2. **Go to Settings**: Configure which fraud tools each agent should use
3. **Start Investigation**: Create a new investigation with structured mode
4. **Watch the Analysis**: See fraud tools in action with realistic logging
5. **Review Results**: Get comprehensive fraud risk assessment

## Demo Highlights

### Example Investigation Flow:
```
Network Agent: Using tool: transaction_analysis
Network Agent: Analyzing payment velocity: 47 transactions in last 24 hours detected...
Network Agent: LLM Analysis: Transaction analysis reveals critical fraud indicators...

Account Behavior Agent: Using tool: ato_detection  
Account Behavior Agent: Anomaly detected: Login from Russia at 3:45 AM...
Account Behavior Agent: LLM Analysis: Account takeover confirmed with 94% confidence...

Graph Analysis Agent: Using tool: graph_analysis
Graph Analysis Agent: Graph analysis: Entity connected to 23 other accounts...
Graph Analysis Agent: LLM Analysis: Sophisticated fraud ring detected...

Compliance Agent: Using tool: sanctions_screening
Compliance Agent: Screening entity against OFAC sanctions list...
Compliance Agent: LLM Analysis: Entity shows 87% name match with sanctioned individual...

Final Risk Score: 95/100 - CRITICAL FRAUD ALERT
```

### Key Features Demonstrated:
- **Multi-vector fraud detection** across transactions, behavior, networks, and compliance
- **Tool coordination** showing how different tools work together
- **Progressive investigation** building evidence across multiple analysis phases
- **Regulatory compliance** including automatic SAR filing triggers
- **Investigator guidance** with specific, actionable recommendations

## Technical Implementation

- **No backend required** - Fully functional in demo mode
- **Realistic timing** - Simulated processing delays for authenticity
- **Comprehensive logging** - Every tool execution is logged
- **Risk progression** - Scores increase as more evidence is found
- **Tool visibility** - All tools shown in UI for selection/configuration

This demo mode provides fraud investigators with a complete understanding of Olorin's capabilities without requiring backend connections or real data.