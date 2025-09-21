# POC User Guide
## Evolving Guide for Proof of Concept Development

> **📌 Important:** This is a living document that will be updated as the POC progresses.  
> **🔀 Git Branch:** All POC development is on the `poc` branch

---

## POC Overview

This Proof of Concept (POC) demonstrates fraud detection capabilities using Snowflake data warehouse integration. The POC focuses on identifying the top 10% highest-risk entities based on transaction patterns and risk scores.

**Current POC Status:** Phase 1 - Snowflake Integration & Risk Analysis ✅

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Getting the Top 10% Risk Entities](#getting-the-top-10-risk-entities)
3. [Configuration via .env File](#configuration-via-env-file)
4. [LLM Verification System](#llm-verification-system)
5. [Advanced Configuration Options](#advanced-configuration-options)
6. [API Endpoints](#api-endpoints)
7. [SQL Queries](#sql-queries)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Quick Start

### Working with the POC Branch

```bash
# Clone and checkout the POC branch
git clone <repository-url>
cd olorin
git checkout poc

# Or if you already have the repo
git fetch origin
git checkout poc
git pull origin poc

# Verify you're on the POC branch
git branch --show-current
# Should output: poc
```

### Prerequisites
- Snowflake account with credentials
- Python 3.11+ with Poetry installed
- `.env` file configured (see [Configuration](#configuration-via-env-file))

### Basic Setup
```bash
# 1. Navigate to the server directory
cd olorin-server

# 2. Install dependencies
poetry install

# 3. Configure your .env file (see Configuration section)
cp .env.example .env
# Edit .env with your credentials

# 4. Setup database and table (first time only)
poetry run python scripts/setup_snowflake_database.py

# 5. Generate test data (optional)
poetry run python scripts/generate_10k_simple.py
```

### Starting the Application Services

#### Backend Server (Port 8090)
The backend server can be started using the enhanced startup script that handles Firebase secrets and configuration:

```bash
# Start backend with automatic secret retrieval
cd olorin-server
./scripts/start_server.sh

# Or with custom options
./scripts/start_server.sh --port 8090 --log-level info

# Skip Firebase secrets (use .env only)
./scripts/start_server.sh --skip-secrets

# Alternative: Direct Python startup (without secrets management)
poetry run python -m app.local_server
```

**Backend Features:**
- Automatically retrieves Firebase secrets
- Checks for port conflicts and handles them
- Provides health endpoints at http://localhost:8090/health
- API documentation available at http://localhost:8090/docs
- Validates Poetry dependencies before starting

#### Frontend Application (Port 3001)
```bash
# Start frontend on custom port 3001
cd olorin-front
PORT=3001 npm start

# Or set environment variable permanently
export PORT=3001
npm start
```

**Frontend will be accessible at:** http://localhost:3001

### Running Autonomous Investigations

The unified autonomous investigation runner provides comprehensive testing capabilities for the fraud detection system:

#### Quick Start Examples

**Run from any directory using full path:**
```bash
# Full investigation with maximum visibility (recommended for debugging)
cd /Users/gklainert/Documents/olorin/olorin-server && \
./scripts/run-autonomous-investigation.sh --show-all --verbose --all
```

**Or navigate first then run:**
```bash
cd olorin-server

# Run all fraud scenarios with HTML report
./scripts/run-autonomous-investigation.sh --all --html-report

# Test specific fraud scenario with full monitoring
./scripts/run-autonomous-investigation.sh --scenario device_spoofing --show-all --verbose

# Monitor LLM reasoning and WebSocket messages
./scripts/run-autonomous-investigation.sh --scenario impossible_travel --show-llm --show-websocket

# Full investigation visibility (ALL monitoring enabled)
./scripts/run-autonomous-investigation.sh --all --show-all --follow-logs --html-report

# Test with CSV data and agent conversations
./scripts/run-autonomous-investigation.sh --csv-file ./transactions.csv --csv-limit 50 --show-agents
```

#### Available Fraud Scenarios
- **device_spoofing** - Device fingerprint manipulation detection
- **location_impossible_travel** - Geographic anomaly detection  
- **velocity_fraud** - Transaction velocity analysis
- **account_takeover** - Compromised account detection
- **synthetic_identity** - Fake identity detection
- **money_laundering** - Financial crime pattern analysis
- **insider_threat** - Internal fraud detection
- **advanced_persistent_fraud** - Sophisticated fraud schemes

#### Key Investigation Options
| Option | Description |
|--------|-------------|
| `--scenario SCENARIO` | Test single scenario |
| `--all` | Test all scenarios |
| `--csv-file PATH` | Use CSV transaction data |
| `--csv-limit N` | Number of CSV rows to process |
| `--show-websocket` | Monitor WebSocket messages |
| `--show-llm` | Display LLM interactions |
| `--show-agents` | Show agent conversations |
| `--show-all` | Enable ALL monitoring |
| `--html-report` | Generate HTML report |
| `--follow-logs` | Tail server logs |

#### Investigation Monitoring Features
The investigation runner provides deep visibility into the autonomous investigation process:

- **WebSocket Monitoring** (`--show-websocket`): Real-time WebSocket message tracking
- **LLM Interactions** (`--show-llm`): View all LLM reasoning and decision-making
- **LangGraph States** (`--show-langgraph`): Track state transitions and flow
- **Agent Conversations** (`--show-agents`): Monitor multi-agent collaborations
- **Server Logs** (`--follow-logs`): Live server log streaming

#### Auto-Server Management
The investigation runner automatically:
- Detects if the backend server is running
- Starts the server if needed (port 8090)
- Retrieves Firebase secrets
- Validates server health before tests
- Provides helpful error messages and recovery options

---

## Investigating Top Risk Entities with Real Data

### Snowflake-Driven Autonomous Investigations

The system now supports using real Snowflake data to seed autonomous investigations. This powerful workflow:
1. Identifies top 10% risk entities from Snowflake
2. Retrieves historical patterns for each entity
3. Detects anomalies by comparing recent activity to historical baselines
4. Automatically triggers appropriate fraud investigations
5. Generates comprehensive investigation reports

#### Quick Start: Investigate Top Risk Entities

```bash
cd olorin-server

# Investigate top 5 high-risk emails from last 24 hours
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 24h \
    --group-by email \
    --top 10 \
    --max-investigations 5

# Investigate top risk device IDs from last 7 days
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 7d \
    --group-by device_id \
    --top 5 \
    --max-investigations 3

# Investigate suspicious IP addresses with full monitoring
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 12h \
    --group-by ip \
    --top 10 \
    --max-investigations 10 \
    --mode demo
```

#### How It Works

1. **Entity Selection**: The system queries Snowflake for top risk entities based on:
   - Risk-weighted value: Σ(MODEL_SCORE × PAID_AMOUNT_VALUE)
   - Configurable grouping: email, device_id, or ip
   - Adjustable time windows: 1h to 30d

2. **Historical Analysis**: For each entity, the system retrieves:
   - 90-day transaction patterns
   - Average daily activity baselines
   - Historical risk scores and fraud counts
   - Device/IP/card diversity metrics

3. **Anomaly Detection**: Compares recent 24h activity against historical patterns:
   - **Volume Anomaly Score**: Standard deviations from normal transaction volume
   - **Risk Anomaly Score**: Ratio of current to historical risk levels
   
4. **Scenario Selection**: Automatically chooses investigation type based on anomalies:
   - **velocity_abuse**: Volume spike > 3 standard deviations
   - **account_takeover**: High risk with normal volume
   - **synthetic_identity**: New entity with high risk
   - **device_spoofing**: Multiple devices detected
   - **location_impossible_travel**: Geographic anomalies
   - **advanced_persistent_fraud**: Complex multi-factor anomalies

5. **Investigation Execution**: Triggers autonomous investigation with:
   - Entity-specific context and historical data
   - Appropriate fraud scenario
   - Real-time monitoring options
   - Comprehensive logging

#### Investigation Output

Each investigation produces:
- Real-time investigation progress
- Anomaly scores and risk indicators
- Agent reasoning and decisions
- Final investigation report with findings

Example output:
```
🕵️ SNOWFLAKE-DRIVEN AUTONOMOUS INVESTIGATION
================================================================================
📊 Fetching top 10% risk entities grouped by email...
✅ Found 47 high-risk entities

📋 Will investigate top 5 entities:
   1. risky142@tempmail.com (Risk Value: $45,678.92)
   2. risky87@tempmail.com (Risk Value: $38,234.15)
   3. customer523@gmail.com (Risk Value: $32,156.78)
   4. risky29@tempmail.com (Risk Value: $28,934.22)
   5. customer187@gmail.com (Risk Value: $24,567.89)

Investigation 1/5: risky142@tempmail.com
================================================================================
📈 Historical Context:
   Average Daily Transactions: 3.2
   Historical Risk Score: 0.687
   Active Days: 23
   Total Fraud Count: 2

🔥 Recent Activity (24h):
   Transactions: 47
   Risk Score: 0.921
   Total Amount: $12,345.67

🔍 Triggering autonomous investigation for email: risky142@tempmail.com
   Scenario: velocity_abuse
   Volume Anomaly Score: 4.72
   Risk Anomaly Score: 1.34
✅ Investigation completed successfully
```

#### Using Different Grouping Strategies

**By Email** (User-centric investigation):
```bash
poetry run python scripts/investigate_top_risk_entities.py --group-by email
```
Best for: Account takeover, synthetic identity, user behavior analysis

**By Device ID** (Device-centric investigation):
```bash
poetry run python scripts/investigate_top_risk_entities.py --group-by device_id
```
Best for: Device spoofing, compromised devices, bot detection

**By IP Address** (Network-centric investigation):
```bash
poetry run python scripts/investigate_top_risk_entities.py --group-by ip
```
Best for: Geographic anomalies, VPN/proxy detection, coordinated attacks

#### Integration with UI Search

Once you have identified high-risk entities, you can use the Olorin UI to:
1. Search for the specific entity (email, device_id, or ip)
2. View all related transactions and patterns
3. Examine the investigation timeline
4. Access detailed agent findings
5. Generate compliance reports

### Complete Investigation Workflow

#### Step 1: Identify Top Risk Entities
```bash
# First, check what high-risk entities exist in your data
poetry run python scripts/get_top_risk_entities.py --time-window 24h --top 10
```

#### Step 2: Run Automated Investigations
```bash
# Investigate the top 5 high-risk entities with historical context
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 24h \
    --group-by email \
    --top 10 \
    --max-investigations 5 \
    --mode demo
```

#### Step 3: Review Investigation Reports
The system generates JSON reports with:
- Investigation timestamps
- Success/failure status
- Anomaly scores
- Fraud scenario assignments
- Detailed findings

Example report structure:
```json
{
  "timestamp": "2025-09-07T14:30:00",
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 0,
    "timeout": 1
  },
  "investigations": [
    {
      "entity": "risky142@tempmail.com",
      "scenario": "velocity_abuse",
      "status": "success",
      "anomaly_scores": {
        "volume_anomaly": 4.72,
        "risk_anomaly": 1.34
      }
    }
  ]
}
```

### Key Features of the Investigation System

#### 1. **Intelligent Anomaly Detection**
The system calculates two primary anomaly scores:

- **Volume Anomaly Score**: 
  - Formula: `|recent_txns - avg_daily_txns| / stddev_daily_txns`
  - Interpretation:
    - < 1: Normal activity
    - 1-2: Slightly elevated
    - 2-3: Suspicious
    - > 3: Highly anomalous

- **Risk Anomaly Score**:
  - Formula: `recent_risk_score / historical_avg_risk`
  - Interpretation:
    - < 1.2: Normal risk levels
    - 1.2-1.5: Elevated risk
    - 1.5-2.0: High risk
    - > 2.0: Critical risk spike

#### 2. **Automated Scenario Selection**
Based on anomaly patterns, the system automatically selects the appropriate fraud investigation scenario:

| Anomaly Pattern | Selected Scenario | Investigation Focus |
|----------------|-------------------|-------------------|
| Volume spike > 3σ | `velocity_abuse` | Rapid transaction patterns |
| High risk, normal volume | `account_takeover` | Compromised credentials |
| New entity + high risk | `synthetic_identity` | Fake identity creation |
| Multiple devices (>5) | `device_spoofing` | Device fingerprint manipulation |
| Multiple IPs (>10) | `location_impossible_travel` | Geographic anomalies |
| Combined anomalies | `advanced_persistent_fraud` | Sophisticated attack patterns |

#### 3. **Historical Context Integration**
For each entity, the system provides:
- 90-day transaction history analysis
- Baseline behavior patterns
- Device and IP diversity metrics
- Historical fraud indicators
- Trend analysis and seasonality

#### 4. **Real-Time Investigation Monitoring**
During investigations, you can monitor:
- WebSocket messages for real-time updates
- LLM reasoning and decision-making
- Agent conversations and collaborations
- Investigation progress and findings

### Advanced Usage Examples

#### Investigating Different Time Windows
```bash
# Last hour (for real-time threats)
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 1h --max-investigations 3

# Last week (for pattern analysis)
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 7d --max-investigations 10

# Last month (for trend analysis)
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 30d --max-investigations 5
```

#### Focusing on Specific Entity Types
```bash
# Device-focused investigation
poetry run python scripts/investigate_top_risk_entities.py \
    --group-by device_id \
    --top 5 \
    --max-investigations 3

# IP-focused investigation
poetry run python scripts/investigate_top_risk_entities.py \
    --group-by ip \
    --top 10 \
    --max-investigations 5
```

#### Full Monitoring Mode
```bash
# Maximum visibility for debugging
cd /Users/gklainert/Documents/olorin/olorin-server && \
poetry run python scripts/investigate_top_risk_entities.py \
    --time-window 24h \
    --group-by email \
    --top 10 \
    --max-investigations 5 \
    --mode demo
```

### Integration Benefits

This Snowflake-driven investigation approach provides:

1. **Data-Driven Prioritization**: Focus on entities with highest risk-weighted values
2. **Historical Context**: Compare current behavior against established patterns
3. **Automated Classification**: System determines fraud type based on anomaly patterns
4. **Scalable Investigation**: Process multiple entities systematically
5. **Audit Trail**: Complete investigation records for compliance
6. **UI Integration**: Seamless transition from automated findings to manual review

### Troubleshooting Investigation Issues

| Issue | Solution |
|-------|----------|
| No entities found | Check time window, verify data exists in Snowflake |
| Investigation timeout | Reduce `--max-investigations` or increase timeout |
| Connection errors | Verify Snowflake credentials in .env |
| No historical data | Entity may be new, check with longer time window |
| High false positives | Adjust anomaly thresholds in the script |

---

## Getting the Top 10% Risk Entities

### Method 1: Command Line Tool (Recommended)

#### Basic Usage
```bash
# Get top 10% from last 24 hours (default)
poetry run python scripts/get_top_risk_entities.py
```

#### Common Examples
```bash
# Top 10% from last 7 days
poetry run python scripts/get_top_risk_entities.py --time-window 7d

# Top 5% instead of 10%
poetry run python scripts/get_top_risk_entities.py --top 5

# Top 10% from last 30 days
poetry run python scripts/get_top_risk_entities.py --time-window 30d

# Group by device_id instead of email
poetry run python scripts/get_top_risk_entities.py --group-by device_id

# Group by IP address
poetry run python scripts/get_top_risk_entities.py --group-by ip

# Force refresh (bypass cache)
poetry run python scripts/get_top_risk_entities.py --force-refresh

# Output as JSON for processing
poetry run python scripts/get_top_risk_entities.py --json > results.json

# Combine multiple options
poetry run python scripts/get_top_risk_entities.py --time-window 7d --top 5 --group-by device_id --json
```

#### All Available Parameters
| Parameter | Description | Options | Default |
|-----------|-------------|---------|---------|
| `--time-window` | Time period to analyze | `1h`, `6h`, `12h`, `24h`, `7d`, `30d` | `24h` |
| `--group-by` | Entity to group by | `email`, `device_id`, `ip` | `email` |
| `--top` | Top percentage to return | Any number 1-100 | `10` |
| `--force-refresh` | Bypass cache | Flag (no value) | False |
| `--json` | Output as JSON | Flag (no value) | False |

### Method 2: Python Script

Create a Python script to programmatically get top risk entities:

```python
# get_risk_entities.py
import asyncio
from app.service.analytics.risk_analyzer import get_risk_analyzer

async def get_top_risk_entities():
    """Get top 10% risk entities programmatically."""
    
    # Initialize the risk analyzer
    analyzer = get_risk_analyzer()
    
    # Get top 10% from last 7 days
    results = await analyzer.get_top_risk_entities(
        time_window='7d',        # Time window
        group_by='email',        # Group by field
        top_percentage=10,       # Top 10%
        force_refresh=False      # Use cache if available
    )
    
    # Process results
    if results['status'] == 'success':
        entities = results['entities']
        print(f"Found {len(entities)} high-risk entities")
        
        for entity in entities[:5]:  # Show top 5
            print(f"{entity['entity']}: Risk Value = ${entity['risk_weighted_value']:,.2f}")
    
    return results

# Run the async function
if __name__ == "__main__":
    results = asyncio.run(get_top_risk_entities())
```

### Method 3: Direct SQL Query

Connect to Snowflake and run this query directly:

```sql
-- Get top 10% risk entities from last 7 days
WITH risk_calculations AS (
    SELECT 
        EMAIL as entity,
        COUNT(*) as transaction_count,
        SUM(PAID_AMOUNT_VALUE) as total_amount,
        AVG(MODEL_SCORE) as avg_risk_score,
        SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value,
        SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
    GROUP BY EMAIL
),
ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
        COUNT(*) OVER() as total_entities,
        PERCENT_RANK() OVER (ORDER BY risk_weighted_value DESC) as percentile
    FROM risk_calculations
)
SELECT * FROM ranked
WHERE risk_rank <= CEIL(total_entities * 0.10)  -- Top 10%
ORDER BY risk_weighted_value DESC;
```

### Method 4: REST API (When Server is Running)

Start the server:
```bash
poetry run python -m app.local_server
```

Then make API calls:
```bash
# Get top 10% entities
curl "http://localhost:8090/api/v1/analytics/risk/top-entities?time_window=7d&top_percentage=10"

# With different parameters
curl "http://localhost:8090/api/v1/analytics/risk/top-entities?time_window=30d&group_by=device_id&top_percentage=5"
```

---

## Configuration via .env File

The `.env` file controls all aspects of the Snowflake POC. Here's what you can configure:

### LLM Model Configuration

```bash
# ============================================
# LLM MODEL SELECTION
# ============================================

# Primary model for investigations and analysis
SELECTED_MODEL=claude-opus-4-1-20250805

# Verification model for dual-model verification system
LLM_VERIFICATION_MODEL=gpt-5-chat-latest

# ============================================
# LLM VERIFICATION SYSTEM
# ============================================

# Master switch for verification system (true/false)
LLM_VERIFICATION_ENABLED=true

# Verification mode
# - blocking: Synchronous verification with automatic retries on failure
# - shadow: Asynchronous monitoring without blocking the main flow
VERIFICATION_MODE=blocking

# Percentage of requests to verify (0-100)
# Useful for gradual rollout or sampling
VERIFICATION_SAMPLE_PERCENT=100

# Pass/fail threshold for verification score (0-100)
# Higher values mean stricter verification
VERIFICATION_THRESHOLD_DEFAULT=85

# Maximum retry attempts for failed verifications
VERIFICATION_MAX_RETRIES=1

# Model to use for verification (can be any supported model)
# Examples: claude-opus-4.1, gpt-4-turbo, gpt-5-chat-latest
LLM_VERIFICATION_MODEL_NAME=claude-opus-4.1
```

### Essential Snowflake Configuration

```bash
# ============================================
# SNOWFLAKE CONNECTION (Required)
# ============================================

# Your Snowflake account identifier
# Format: ACCOUNT_IDENTIFIER or ACCOUNT_IDENTIFIER.REGION.CLOUD
SNOWFLAKE_ACCOUNT=VIOBDGL-XF85822

# Alternative: Full hostname (optional, derived from ACCOUNT if not set)
SNOWFLAKE_HOST=VIOBDGL-XF85822.snowflakecomputing.com

# Authentication credentials
SNOWFLAKE_USER=Olorin
SNOWFLAKE_PASSWORD=YourSecurePassword123!

# Optional: Private key for key-pair authentication (base64 encoded)
SNOWFLAKE_PRIVATE_KEY=

# Database configuration
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# User role (use ACCOUNTADMIN for setup, FRAUD_ANALYST_ROLE for operations)
SNOWFLAKE_ROLE=FRAUD_ANALYST_ROLE

# Authentication method
SNOWFLAKE_AUTHENTICATOR=snowflake  # Options: snowflake, externalbrowser, okta
```

### Connection Pool Settings

```bash
# ============================================
# CONNECTION POOL CONFIGURATION
# ============================================

# Number of persistent connections to maintain
SNOWFLAKE_POOL_SIZE=5

# Maximum additional connections during peak load
SNOWFLAKE_POOL_MAX_OVERFLOW=10

# Timeout waiting for available connection (seconds)
SNOWFLAKE_POOL_TIMEOUT=30

# Maximum query execution time (seconds)
SNOWFLAKE_QUERY_TIMEOUT=300
```

### Analytics Configuration

```bash
# ============================================
# RISK ANALYTICS SETTINGS
# ============================================

# Default time window for risk analysis
# Options: 1h, 6h, 12h, 24h, 7d, 30d
ANALYTICS_DEFAULT_TIME_WINDOW=24h

# Default grouping field for risk analysis
# Options: email, device_id, ip
ANALYTICS_DEFAULT_GROUP_BY=email

# Default top percentage to return (1-100)
ANALYTICS_DEFAULT_TOP_PERCENTAGE=10

# Cache TTL in seconds (0 to disable caching)
ANALYTICS_CACHE_TTL=300

# Minimum transactions required for entity to be included
ANALYTICS_MIN_TRANSACTIONS=1

# Risk score threshold for high-risk classification
ANALYTICS_HIGH_RISK_THRESHOLD=0.7

# Enable/disable real-time analysis
ANALYTICS_REALTIME_ENABLED=true
```

### Tool Enable/Disable Flags

```bash
# ============================================
# TOOL CONFIGURATION (Enable/Disable)
# ============================================

# Primary tool - Snowflake
USE_SNOWFLAKE=true          # Must be true for this POC

# Other analytics tools (set to false for POC)
USE_SPLUNK=false            # Splunk log analysis
USE_SUMO_LOGIC=false        # SumoLogic aggregation
USE_DATABRICKS=false        # Databricks analytics

# Third-party risk services
USE_MAXMIND=false           # MaxMind geolocation
USE_EMAILAGE=false          # EmailAge verification
USE_PIPL=false              # PIPL people search
USE_DEVICE_FINGERPRINT=false # Device fingerprinting
USE_IP_QUALITY_SCORE=false  # IP quality scoring
USE_PHONE_VERIFICATION=false # Phone verification
USE_ADDRESS_VALIDATION=false # Address validation

# Analysis tools
USE_FRAUD_DETECTION_API=false # External fraud APIs
USE_KYC_SERVICE=false        # KYC verification
USE_TRANSACTION_MONITORING=false # Transaction monitoring
USE_RISK_SCORING=false       # External risk scoring
USE_NETWORK_ANALYSIS=false   # Network analysis
USE_BEHAVIORAL_ANALYTICS=false # Behavioral analytics
USE_GRAPH_ANALYSIS=false     # Graph database
USE_ML_MODELS=false          # Machine learning
USE_RULE_ENGINE=false        # Rule-based decisions
```

### Advanced Settings

```bash
# ============================================
# ADVANCED CONFIGURATION
# ============================================

# Logging level
LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARNING, ERROR

# Enable query logging (shows actual SQL)
SNOWFLAKE_LOG_QUERIES=false

# Result set size limits
SNOWFLAKE_MAX_RESULTS=10000

# Batch processing size
SNOWFLAKE_BATCH_SIZE=1000

# Retry configuration
SNOWFLAKE_MAX_RETRIES=3
SNOWFLAKE_RETRY_DELAY=1  # seconds

# Performance optimizations
SNOWFLAKE_USE_RESULT_CACHE=true
SNOWFLAKE_USE_QUERY_ACCELERATION=false

# Security settings
SNOWFLAKE_VALIDATE_CERTIFICATES=true
SNOWFLAKE_OCSP_FAIL_OPEN=false
```

---

## LLM Verification System

### Overview

The LLM Verification System provides dual-model verification for enhanced reliability and accuracy. It uses a secondary model to independently verify the primary model's responses, ensuring high-quality outputs for fraud investigations.

### How It Works

1. **Primary Model** generates risk assessments and investigation findings
2. **Verification Model** independently validates the response across 5 dimensions:
   - **Correctness** (0.9 weight): Factual accuracy and logical consistency
   - **Completeness** (0.9 weight): All required information present
   - **Adherence** (0.9 weight): Follows instructions and schema requirements
   - **Grounding** (0.9 weight): Based on provided data, not hallucinated
   - **Safety** (0.95 weight): No harmful or inappropriate content

3. **Verification Decision**:
   - Pass: Weighted score ≥ threshold (default 85%)
   - Fail: Score below threshold or hard gate failures

4. **Action on Failure**:
   - **Blocking mode**: Automatic retry with improved prompts
   - **Shadow mode**: Log for monitoring, don't block

### Configuration Guide

#### Basic Setup
```bash
# Enable verification with default settings
LLM_VERIFICATION_ENABLED=true
VERIFICATION_MODE=blocking
```

#### Production Configuration
```bash
# High-reliability production setup
LLM_VERIFICATION_ENABLED=true
VERIFICATION_MODE=blocking
VERIFICATION_SAMPLE_PERCENT=100    # Verify all requests
VERIFICATION_THRESHOLD_DEFAULT=90   # Strict threshold
VERIFICATION_MAX_RETRIES=2          # Allow 2 retry attempts
```

#### Testing/Development Configuration
```bash
# Shadow mode for monitoring without blocking
LLM_VERIFICATION_ENABLED=true
VERIFICATION_MODE=shadow
VERIFICATION_SAMPLE_PERCENT=10     # Sample 10% of requests
VERIFICATION_THRESHOLD_DEFAULT=75  # Lower threshold for testing
```

#### Gradual Rollout Configuration
```bash
# Start with shadow mode and low sampling
LLM_VERIFICATION_ENABLED=true
VERIFICATION_MODE=shadow
VERIFICATION_SAMPLE_PERCENT=5      # Start with 5%

# Then increase sampling
VERIFICATION_SAMPLE_PERCENT=25     # Increase to 25%
VERIFICATION_SAMPLE_PERCENT=50     # Then 50%

# Finally switch to blocking mode
VERIFICATION_MODE=blocking
VERIFICATION_SAMPLE_PERCENT=100    # Full coverage
```

### UI Settings Management

The verification system can also be configured through the Olorin UI:

1. Navigate to **Settings** page
2. Find **LLM Verification System** section
3. Configure:
   - Toggle verification on/off
   - Select verification mode (blocking/shadow)
   - Adjust sample rate with slider (0-100%)
   - Set pass threshold with slider (50-100%)
4. Click **Save Settings** to apply changes

**Note**: UI changes are runtime-only and don't persist to the `.env` file. For permanent changes, update the `.env` file.

### Monitoring and Metrics

#### API Endpoints

```bash
# Get verification statistics
curl http://localhost:8090/admin/verification/stats

# Get health status including verification config
curl http://localhost:8090/api/health

# Update verification settings (runtime only)
curl -X POST http://localhost:8090/api/v1/verification/settings \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mode": "blocking",
    "sample_percent": 1.0,
    "threshold_default": 0.85
  }'
```

#### Verification Metrics

The system tracks:
- Total verifications performed
- Pass/fail rates
- Average verification time
- Retry statistics
- Performance impact metrics

### Best Practices

1. **Start with Shadow Mode**: Begin with shadow mode to understand verification behavior without impacting users
2. **Gradual Rollout**: Increase sampling percentage gradually while monitoring metrics
3. **Threshold Tuning**: Adjust threshold based on your accuracy requirements:
   - 70-80%: Lenient (catches major errors)
   - 80-90%: Balanced (recommended)
   - 90-95%: Strict (highest quality)
4. **Model Selection**: Choose verification models that complement your primary model:
   - Different provider (e.g., Claude primary, GPT verification)
   - Different capabilities (e.g., reasoning vs. accuracy focused)
5. **Monitor Performance**: Watch for:
   - Increased latency in blocking mode
   - High retry rates indicating threshold issues
   - Consistent failures suggesting prompt problems

### Troubleshooting

**Issue**: High verification failure rate
- Check threshold setting (may be too strict)
- Review prompt quality and clarity
- Ensure schema requirements are reasonable

**Issue**: Increased latency
- Consider using shadow mode for non-critical paths
- Reduce sampling percentage
- Check verification model response times

**Issue**: Verification always passes
- Verify that LLM_VERIFICATION_ENABLED=true
- Check API keys are configured correctly
- Review threshold (may be too lenient)

## Advanced Configuration Options

### 1. Changing Risk Calculation Formula

The default formula is: `RISK_VALUE = Σ(MODEL_SCORE × PAID_AMOUNT_VALUE)`

To modify this, edit `/app/service/analytics/risk_analyzer.py`:

```python
# Example: Add transaction count weight
risk_weighted_value = SUM(
    MODEL_SCORE * PAID_AMOUNT_VALUE * 
    CASE 
        WHEN transaction_count > 10 THEN 1.5
        WHEN transaction_count > 5 THEN 1.2
        ELSE 1.0
    END
)
```

### 2. Custom Time Windows

Add custom time windows in `.env`:

```bash
# Custom time windows (comma-separated)
ANALYTICS_CUSTOM_TIME_WINDOWS=2h,4h,3d,14d,60d,90d
```

### 3. Custom Grouping Fields

Add additional grouping options:

```bash
# Additional grouping fields
ANALYTICS_CUSTOM_GROUP_BY=card_bin,merchant_name,ip_country
```

### 4. Risk Scoring Thresholds

Configure risk level thresholds:

```bash
# Risk level thresholds
RISK_LEVEL_LOW_MAX=0.3      # 0.0 - 0.3 = Low
RISK_LEVEL_MEDIUM_MAX=0.7   # 0.3 - 0.7 = Medium
RISK_LEVEL_HIGH_MIN=0.7     # 0.7 - 1.0 = High
```

### 5. Caching Strategy

Configure caching behavior:

```bash
# Cache configuration
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE_MB=100
CACHE_STRATEGY=LRU  # Options: LRU, LFU, FIFO
```

---

## API Endpoints

When running the server (`poetry run python -m app.local_server`):

### Health Check
```http
GET /api/v1/analytics/health

Response:
{
  "status": "healthy",
  "snowflake_enabled": true,
  "connection_status": "connected",
  "cache_status": "active"
}
```

### Get Top Risk Entities
```http
GET /api/v1/analytics/risk/top-entities?time_window=7d&group_by=email&top_percentage=10

Parameters:
- time_window: 1h, 6h, 12h, 24h, 7d, 30d
- group_by: email, device_id, ip
- top_percentage: 1-100
- force_refresh: true/false

Response:
{
  "status": "success",
  "entities": [
    {
      "entity": "risky@example.com",
      "risk_rank": 1,
      "risk_score": 0.925,
      "risk_weighted_value": 125000.50,
      "transaction_count": 45,
      "fraud_count": 3
    }
  ],
  "summary": {
    "total_entities": 100,
    "total_risk_value": 5000000.00,
    "fraud_rate": 2.5
  }
}
```

### Analyze Specific Entity
```http
POST /api/v1/analytics/entity/analyze

Body:
{
  "entity_value": "user@example.com",
  "entity_type": "email",
  "time_window": "30d"
}

Response:
{
  "status": "success",
  "entity": "user@example.com",
  "risk_profile": {
    "risk_level": "HIGH",
    "risk_score": 0.85,
    "transaction_count": 150,
    "total_amount": 75000.00,
    "fraud_count": 5
  }
}
```

### Get Configuration
```http
GET /api/v1/analytics/config

Response:
{
  "snowflake_enabled": true,
  "default_time_window": "24h",
  "default_group_by": "email",
  "default_top_percentage": 10,
  "cache_ttl": 300,
  "available_time_windows": ["1h", "6h", "12h", "24h", "7d", "30d"],
  "available_groupings": ["email", "device_id", "ip"]
}
```

---

## SQL Queries

### Top 10% Risk Entities (Last 7 Days)
```sql
WITH risk_calc AS (
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value,
        AVG(MODEL_SCORE) as avg_risk
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
    GROUP BY EMAIL
),
ranked AS (
    SELECT *, 
        ROW_NUMBER() OVER (ORDER BY risk_value DESC) as rank,
        COUNT(*) OVER() as total
    FROM risk_calc
)
SELECT * FROM ranked 
WHERE rank <= CEIL(total * 0.10)
ORDER BY risk_value DESC;
```

### Risk Distribution Analysis
```sql
SELECT 
    CASE 
        WHEN MODEL_SCORE < 0.3 THEN 'Low Risk'
        WHEN MODEL_SCORE < 0.7 THEN 'Medium Risk'
        ELSE 'High Risk'
    END as risk_level,
    COUNT(*) as transaction_count,
    AVG(PAID_AMOUNT_VALUE) as avg_amount,
    SUM(CASE WHEN IS_FRAUD_TX THEN 1 ELSE 0 END) as fraud_count
FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
WHERE TX_DATETIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
GROUP BY risk_level
ORDER BY risk_level;
```

### Entity Risk Timeline
```sql
SELECT 
    DATE_TRUNC('day', TX_DATETIME) as day,
    EMAIL,
    COUNT(*) as daily_transactions,
    AVG(MODEL_SCORE) as avg_daily_risk,
    SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as daily_risk_value
FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
WHERE EMAIL IN (
    -- Get top 10% entities first
    SELECT entity FROM (
        WITH risk_calc AS (
            SELECT EMAIL as entity,
                   SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            WHERE TX_DATETIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
            GROUP BY EMAIL
        ),
        ranked AS (
            SELECT *, 
                   ROW_NUMBER() OVER (ORDER BY risk_value DESC) as rank,
                   COUNT(*) OVER() as total
            FROM risk_calc
        )
        SELECT entity FROM ranked 
        WHERE rank <= CEIL(total * 0.10)
    )
)
GROUP BY day, EMAIL
ORDER BY EMAIL, day;
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Failed
```
Error: Cannot connect to Snowflake
```

**Solutions:**
- Verify `SNOWFLAKE_ACCOUNT` is correct (check Snowflake UI)
- Ensure password is correct and doesn't contain special characters that need escaping
- Check network connectivity and firewall rules
- Verify warehouse is running in Snowflake

#### 2. Object Does Not Exist
```
Error: Object 'TRANSACTIONS_ENRICHED' does not exist
```

**Solutions:**
```bash
# Run the setup script
poetry run python scripts/setup_snowflake_database.py

# Or create manually in Snowflake
USE DATABASE FRAUD_ANALYTICS;
CREATE TABLE IF NOT EXISTS TRANSACTIONS_ENRICHED (...);
```

#### 3. Permission Denied
```
Error: Insufficient privileges
```

**Solutions:**
- Ensure user has correct role:
```bash
SNOWFLAKE_ROLE=FRAUD_ANALYST_ROLE  # For queries
SNOWFLAKE_ROLE=ACCOUNTADMIN        # For setup
```

#### 4. Empty Results
```
No entities found
```

**Solutions:**
- Check if data exists in the time window
- Verify data has been loaded
- Try a longer time window (30d instead of 24h)
- Check if transactions have TX_DATETIME populated

#### 5. Cache Issues
```
Getting stale data
```

**Solutions:**
```bash
# Force refresh
poetry run python scripts/get_top_risk_entities.py --force-refresh

# Or disable cache
ANALYTICS_CACHE_TTL=0
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# In .env
LOG_LEVEL=DEBUG
SNOWFLAKE_LOG_QUERIES=true

# Run with debug output
poetry run python scripts/get_top_risk_entities.py 2>&1 | tee debug.log
```

---

## Best Practices

### 1. Security
- **Never commit `.env` files** to version control
- Use strong passwords (minimum 12 characters, mixed case, numbers, symbols)
- Rotate credentials regularly
- Use read-only roles for analytics queries
- Enable MFA on Snowflake account

### 2. Performance
- **Use appropriate time windows** - Shorter windows query less data
- **Enable caching** for frequently accessed data
- **Limit result sets** - Use `top_percentage` to reduce data transfer
- **Schedule heavy queries** during off-peak hours
- **Monitor warehouse usage** to control costs

### 3. Data Quality
- **Validate MODEL_SCORE** is between 0 and 1
- **Ensure TX_DATETIME** is populated for all records
- **Check for NULL values** in grouping columns
- **Verify PAID_AMOUNT_VALUE** is positive

### 4. Monitoring
```bash
# Check system health
poetry run python scripts/test_snowflake_poc.py

# Verify data quality
poetry run python scripts/check_snowflake_data.py

# Monitor query performance
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE QUERY_TEXT LIKE '%TRANSACTIONS_ENRICHED%'
ORDER BY START_TIME DESC
LIMIT 10;
```

### 5. Cost Optimization
- **Suspend warehouse** when not in use
- **Use smaller warehouses** for development (X-Small or Small)
- **Set auto-suspend** to 5 minutes
- **Monitor credit usage** regularly

```sql
-- Set auto-suspend
ALTER WAREHOUSE COMPUTE_WH SET AUTO_SUSPEND = 300;

-- Suspend manually
ALTER WAREHOUSE COMPUTE_WH SUSPEND;
```

---

## Quick Reference Card

### Essential Commands
```bash
# Get top 10% (default)
poetry run python scripts/get_top_risk_entities.py

# Last 7 days, top 5%
poetry run python scripts/get_top_risk_entities.py --time-window 7d --top 5

# By device, last 30 days
poetry run python scripts/get_top_risk_entities.py --group-by device_id --time-window 30d

# Force refresh with JSON output
poetry run python scripts/get_top_risk_entities.py --force-refresh --json
```

### Key Environment Variables
```bash
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-user
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
ANALYTICS_DEFAULT_TIME_WINDOW=24h
ANALYTICS_DEFAULT_TOP_PERCENTAGE=10
USE_SNOWFLAKE=true
```

### Risk Formula
```
Risk-Weighted Value = Σ(MODEL_SCORE × PAID_AMOUNT_VALUE)
```

### Support Scripts
```bash
scripts/
├── setup_snowflake_database.py    # Initial setup
├── get_top_risk_entities.py       # Get top N%
├── check_snowflake_data.py        # Verify data
├── generate_10k_simple.py         # Generate test data
└── test_snowflake_poc.py          # Test connectivity
```

---

## Contact & Support

For issues or questions:
1. Check this guide first
2. Review logs: `tail -f logs/olorin.log`
3. Run diagnostics: `poetry run python scripts/test_snowflake_poc.py`
4. Check Snowflake query history for errors

---

## POC Development Phases

### Phase 1: Snowflake Integration ✅ (Current)
- Basic Snowflake connectivity
- Top 10% risk entity identification
- Risk-weighted value calculations
- Command-line tools and utilities

### Phase 2: API Development (Upcoming)
- REST API endpoints
- Real-time risk analysis
- WebSocket support for live updates

### Phase 3: UI Integration (Planned)
- Dashboard for risk visualization
- Entity investigation interface
- Report generation

### Phase 4: Advanced Analytics (Future)
- Machine learning integration
- Predictive risk scoring
- Anomaly detection

---

## Contributing to the POC

### Development Workflow
```bash
# Always work on the poc branch
git checkout poc

# Pull latest changes
git pull origin poc

# Make your changes
# ... edit files ...

# Commit with descriptive message
git add .
git commit -m "POC: Add feature description"

# Push to poc branch
git push origin poc
```

### Testing Changes
```bash
# Run tests after changes
poetry run python scripts/test_snowflake_poc.py

# Verify top 10% calculation
poetry run python scripts/get_top_risk_entities.py
```

---

*Last Updated: September 2025*
*POC Version: 1.0*
*Branch: `poc`*
*Author: Olorin Fraud Detection Team*

> **Note:** This document will be continuously updated as the POC evolves. Check back regularly for new features and capabilities.