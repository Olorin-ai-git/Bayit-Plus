# Server Startup and Analysis Sequence Flow

**Author**: Documentation  
**Date**: 2025-11-14  
**Purpose**: Simple explanation of what happens when the server starts and runs the analysis sequence

---

## Overview

When the Olorin server starts, it performs a comprehensive initialization sequence that includes database setup, service initialization, and automatic risk analysis. This document explains the complete flow from server startup through the final zip package creation.

---

## Part 1: Server Startup Sequence

### Step 1: Application Initialization
When the FastAPI server starts, the `on_startup()` function is called. This is where all the magic begins.

**What happens:**
- The server logs "🚀 Starting Olorin application..."
- Validates log stream configuration (for live log viewing)
- Initializes the database connection
- Sets up all required database tables
- Verifies database schema and indexes

**Key Point**: The server ensures all infrastructure is ready before accepting requests.

---

### Step 2: Database Provider Setup
The server connects to the data source (Snowflake or PostgreSQL).

**What happens:**
- Determines which database provider to use (from environment variables)
- Establishes connection to Snowflake or PostgreSQL
- Validates schema parity (ensures database structure matches expectations)
- Stores the database provider in application state for later use

**Key Point**: This is where the server gets access to transaction data.

---

### Step 3: Service Initialization
Multiple services are initialized to support investigations.

**What happens:**
- **Performance System**: Sets up monitoring and optimization
- **Agent System**: Initializes the AI agent framework (LangGraph)
- **RAG System**: Sets up retrieval-augmented generation for knowledge base
- **Anomaly Detection**: Configures fraud pattern detection
- **Detection Scheduler**: Starts background job scheduler

**Key Point**: All these services work together to enable intelligent fraud investigation.

---

## Part 2: Risk Analyzer - The Heart of Startup Analysis

### What is the Risk Analyzer?

The **Risk Analyzer** is a service that automatically identifies high-risk entities (like suspicious email addresses, IP addresses, or user IDs) from transaction data. It runs automatically when the server starts.

### Step 4: Background Risk Analysis Task

**What happens:**
1. **Task Scheduling**: A background task is created (doesn't block server startup)
2. **Risk Analyzer Creation**: The system creates a `RiskAnalyzer` instance
3. **Database Connection**: Connects to Snowflake/PostgreSQL
4. **Risk Query Execution**: Runs sophisticated SQL queries to find risky entities

**The Risk Analyzer's Job:**
- Analyzes transaction data from the past 14 days (configurable)
- Groups transactions by entity type (email, IP, device_id, etc.)
- Calculates risk scores based on:
  - Transaction amounts
  - Fraud flags
  - Model scores
  - Transaction patterns
- Identifies the top 10% riskiest entities
- **Filters out private/internal IPs** (only analyzes public/external IPs)

**Key Point**: The analyzer finds the "needles in the haystack" - the most suspicious entities worth investigating.

---

### Step 5: Top Risk Entities Retrieval

**What happens:**
- The analyzer queries the database for high-risk patterns
- Calculates risk-weighted transaction values
- Ranks entities by risk score
- Returns a list of top risk entities with:
  - Entity value (email, IP, etc.)
  - Risk score
  - Transaction count
  - Total transaction value
  - Fraud indicators

**Example Output:**
```json
{
  "status": "success",
  "entities": [
    {
      "entity_value": "suspicious@example.com",
      "risk_score": 0.95,
      "transaction_count": 150,
      "total_amount": 50000.00,
      "fraud_count": 12
    },
    ...
  ]
}
```

**Key Point**: These are the entities that need immediate investigation.

---

## Part 3: Automatic Investigation Sequence

### Step 6: Auto-Comparison Trigger

Once the top risk entities are identified, the system automatically runs investigations on the **top 3 riskiest entities**.

**What happens:**
1. **Entity Selection**: Picks the 3 highest-risk entities from the analyzer results
2. **Investigation Creation**: Creates a new investigation for each entity
3. **Investigation Execution**: Runs the complete investigation workflow

---

### Step 7: Investigation Workflow (For Each Entity)

Each investigation follows this sequence:

#### Phase 1: Initialization
- Creates investigation ID
- Sets up investigation state
- Configures date range (default: 7 days lookback)
- Prepares for data collection

#### Phase 2: Snowflake Analysis (Mandatory)
- Queries transaction database for the entity
- Analyzes transaction patterns
- Identifies anomalies and suspicious activity
- Extracts key metrics (transaction counts, amounts, fraud flags)

**Key Point**: This is the foundation - all other analysis builds on this data.

#### Phase 3: Tool Execution
- Based on Snowflake findings, selects appropriate tools
- Executes external tools like:
  - Threat intelligence lookups
  - IP reputation checks
  - Device fingerprinting
  - Email validation
- Collects additional evidence

**Key Point**: Tools provide external context that Snowflake data alone can't provide.

#### Phase 4: Domain Analysis (6 Specialized Agents)

Six specialized AI agents analyze different aspects:

1. **Network Agent**: Analyzes IP addresses, VPN usage, geographic patterns
2. **Device Agent**: Examines device fingerprints, browser spoofing, device consistency
3. **Location Agent**: Detects impossible travel, geographic anomalies
4. **Logs Agent**: Analyzes transaction timing, velocity bursts, error patterns
5. **Authentication Agent**: Reviews login patterns, MFA bypass attempts
6. **Merchant Agent**: Examines merchant patterns, transaction clustering

**Each Agent:**
- Receives Snowflake data and tool results
- Uses LLM to analyze evidence
- Generates risk score (0.0 to 1.0)
- Identifies risk indicators
- Provides recommendations

**Key Point**: Each agent is an expert in its domain, providing specialized analysis.

#### Phase 5: Risk Assessment & Summary
- Synthesizes findings from all agents
- Calculates overall risk score
- Generates comprehensive report
- Creates recommendations

**Key Point**: This is where all the pieces come together into a complete picture.

---

### Step 8: Investigation Results Storage

**What happens:**
- Each investigation creates a folder: `logs/structured_investigations/{investigation_id}/`
- Stores:
  - `metadata.json`: Investigation configuration and summary
  - `findings.json`: Complete domain findings from all agents
  - `progress.json`: Real-time progress updates
  - `events.json`: Event log of investigation steps
  - `chain_of_thought.json`: AI reasoning chains (if enabled)
  - `tool_executions.json`: Results from external tools
  - `report.html`: Human-readable investigation report

**Key Point**: Everything is saved for later review and analysis.

---

## Part 4: Comparison Report Generation

### Step 9: Comparison Analysis

After all 3 investigations complete, the system generates comparison reports.

**What happens:**
- Compares findings across the 3 investigations
- Identifies common patterns
- Highlights differences
- Generates HTML comparison reports

**Each Comparison Report Contains:**
- Side-by-side comparison of risk scores
- Common risk indicators across entities
- Unique findings per entity
- Visual charts and graphs
- Recommendations

**Key Point**: Comparison reports help identify systemic fraud patterns.

---

## Part 5: Startup Analysis Report

### Step 10: Startup Report Generation

The system generates a comprehensive startup analysis report.

**What happens:**
- Analyzes server startup performance
- Documents all initialized services
- Records configuration settings
- Lists any warnings or errors
- Provides system health metrics

**Report Includes:**
- Startup duration
- Services initialized
- Database connection status
- Configuration validation results
- System readiness assessment

**Key Point**: This report helps diagnose startup issues and verify system health.

---

## Part 6: Final Zip Package Creation

### Step 11: Package Assembly

Once all investigations and reports are complete, the system creates a final zip package.

**What happens:**
1. **Waits for Completion**: Ensures all investigations and reports are finished
2. **Collects Files**: Gathers all investigation folders and reports
3. **Creates Zip Archive**: Packages everything into a single zip file

---

### What's Inside the Final Zip Package?

The zip file contains a complete snapshot of the startup analysis:

#### 📁 Directory Structure:
```
comparison_package_YYYYMMDD_HHMMSS.zip
│
├── investigations/
│   ├── investigation_1_{investigation_id}/
│   │   ├── metadata.json
│   │   ├── findings.json
│   │   ├── progress.json
│   │   ├── events.json
│   │   ├── chain_of_thought.json
│   │   ├── tool_executions.json
│   │   └── report.html
│   │
│   ├── investigation_2_{investigation_id}/
│   │   └── [same structure]
│   │
│   └── investigation_3_{investigation_id}/
│       └── [same structure]
│
├── comparison_reports/
│   ├── comparison_1_{entity_type}_{entity_value}.html
│   ├── comparison_2_{entity_type}_{entity_value}.html
│   └── comparison_3_{entity_type}_{entity_value}.html
│
├── summary.html
│   └── [Overview of all 3 investigations with links]
│
└── startup_analysis_report.html
    └── [Server startup health and configuration report]
```

---

### Detailed Contents:

#### 1. Investigation Folders (3 folders)
Each folder contains:

- **metadata.json**: Investigation configuration, entity info, timestamps
- **findings.json**: Complete analysis results from all 6 domain agents
- **progress.json**: Step-by-step progress through investigation phases
- **events.json**: Chronological log of all investigation events
- **chain_of_thought.json**: AI reasoning chains showing how conclusions were reached
- **tool_executions.json**: Results from external tools (threat intel, IP checks, etc.)
- **report.html**: Beautiful HTML report with:
  - Executive summary
  - Risk scores per domain
  - Risk indicators
  - Evidence details
  - Recommendations
  - Visualizations

#### 2. Comparison Reports (3 HTML files)
Each comparison report shows:
- Entity details and risk scores
- Side-by-side comparison of findings
- Common patterns across entities
- Unique indicators per entity
- Visual charts comparing risk levels

#### 3. Summary HTML
A master index page that:
- Lists all 3 investigations
- Provides links to individual reports
- Shows overall statistics
- Highlights key findings
- Includes navigation between reports

#### 4. Startup Analysis Report
Comprehensive server startup documentation:
- Startup duration and performance
- Services initialized (database, agents, RAG, etc.)
- Configuration validation results
- System health metrics
- Any warnings or errors encountered

---

## Complete Flow Summary

Here's the complete sequence in simple terms:

1. **Server Starts** → Initializes database, services, and infrastructure
2. **Risk Analyzer Runs** → Analyzes transaction data to find risky entities
3. **Top 3 Entities Selected** → Picks the riskiest entities for investigation
4. **3 Investigations Run** → Each follows the complete investigation workflow:
   - Snowflake analysis
   - Tool execution
   - 6 domain agents analyze
   - Risk assessment
   - Report generation
5. **Comparison Reports Created** → Compares findings across investigations
6. **Startup Report Generated** → Documents server health and configuration
7. **Zip Package Created** → Packages everything into a single archive

**Total Time**: Typically 2-5 minutes depending on:
- Database query speed
- Number of transactions analyzed
- Tool execution time
- LLM processing time

---

## Key Concepts Explained Simply

### Risk Analyzer
**Think of it as**: A smart scanner that looks through millions of transactions and says "These 3 entities look really suspicious - investigate them!"

### Domain Agents
**Think of them as**: Six specialized detectives, each expert in one area:
- Network detective: Knows about IPs and networks
- Device detective: Understands devices and browsers
- Location detective: Spots impossible travel
- Logs detective: Finds timing patterns
- Auth detective: Catches login anomalies
- Merchant detective: Sees transaction patterns

### Investigation Workflow
**Think of it as**: A systematic investigation process:
1. Gather evidence (Snowflake data)
2. Get external intel (tools)
3. Have experts analyze (domain agents)
4. Synthesize findings (risk assessment)
5. Write report (summary)

### Zip Package
**Think of it as**: A complete case file containing:
- All investigation reports
- All evidence collected
- Comparison analysis
- System health report
- Everything needed to understand what was found

---

## Why This Matters

This automated process:
- **Proactively identifies threats** before they cause damage
- **Provides comprehensive analysis** using multiple data sources
- **Documents everything** for audit and review
- **Enables rapid response** to emerging fraud patterns
- **Creates actionable intelligence** for security teams

---

## Conclusion

The server startup sequence is a sophisticated, automated fraud detection pipeline that:
1. Starts the server and initializes all services
2. Analyzes transaction data to find risky entities
3. Runs complete investigations on the top risks
4. Generates comprehensive reports
5. Packages everything for review

All of this happens automatically when the server starts, providing security teams with immediate insights into the highest-risk entities in their transaction data.

---

**Location**: The final zip package is saved in `artifacts/comparisons/auto_startup/` directory with a timestamped filename like `comparison_package_20251114_143022.zip`.

