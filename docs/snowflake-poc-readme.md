# Snowflake POC Implementation Guide

## Overview

This document provides a comprehensive guide for the Snowflake POC implementation in the Olorin fraud detection platform. The implementation enables real-time risk analytics using Snowflake data warehouse with a 300+ column transaction enrichment schema.

## Quick Start

### 1. Configuration

Copy the `.env.example` file and configure your Snowflake credentials:

```bash
cd olorin-server
cp .env.example .env
```

Edit `.env` with your Snowflake details:

```bash
# Enable Snowflake (disable all other tools)
USE_SNOWFLAKE=true
USE_SPLUNK=false
USE_DATABRICKS=false
USE_SUMO_LOGIC=false
# ... all other tools set to false

# Snowflake Connection
SNOWFLAKE_ACCOUNT=your-account.region.snowflakecomputing.com
SNOWFLAKE_USER=Olorin
SNOWFLAKE_PASSWORD=your_secure_password
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# Analytics Configuration
ANALYTICS_DEFAULT_TIME_WINDOW=24h
ANALYTICS_DEFAULT_GROUP_BY=email
ANALYTICS_DEFAULT_TOP_PERCENTAGE=10
ANALYTICS_CACHE_TTL=300
```

### 2. Install Dependencies

The required dependencies are already in `pyproject.toml`:

```bash
poetry install
```

### 3. Test Configuration

Run the test script to verify your setup:

```bash
cd olorin-server
poetry run python scripts/test_snowflake_poc.py
```

### 4. Start the Application

```bash
poetry run python -m app.local_server
```

The application will:
1. Load configuration from `.env` (with Firebase as fallback)
2. Connect to Snowflake on startup
3. Load top risk entities automatically
4. Cache results for quick API access

## Architecture

### Configuration Priority

The system uses a dual configuration strategy:

```
.env file (Priority 1) → Firebase Secrets (Priority 2) → Warning (No default)
```

- `.env` values always override Firebase when both exist
- Missing values generate warnings but don't crash the application
- No hardcoded defaults - explicit configuration required

### Component Structure

```
olorin-server/
├── app/
│   ├── service/
│   │   ├── config_loader.py          # Dual configuration loader
│   │   ├── config_secrets.py         # Secret enhancement
│   │   ├── analytics/
│   │   │   └── risk_analyzer.py      # Risk analytics engine
│   │   └── agent/
│   │       └── tools/
│   │           ├── tool_config.py    # Tool enable/disable
│   │           └── snowflake_tool/
│   │               ├── client.py     # Smart client switcher
│   │               └── real_client.py # Production Snowflake client
│   └── api/
│       └── routes/
│           └── analytics.py          # API endpoints
├── scripts/
│   └── test_snowflake_poc.py        # Comprehensive test suite
└── .env.example                      # Configuration template
```

## API Endpoints

### Health Check
```bash
GET /api/v1/analytics/health

Response:
{
  "status": "healthy",
  "snowflake_enabled": true,
  "message": "Analytics service is operational"
}
```

### Get Top Risk Entities
```bash
GET /api/v1/analytics/risk/top-entities?time_window=24h&group_by=email&top_percentage=10

Response:
{
  "status": "success",
  "entities": [
    {
      "entity": "user@example.com",
      "risk_rank": 1,
      "risk_score": 0.85,
      "risk_weighted_value": 25000.00,
      "transaction_count": 50,
      "total_amount": 30000.00,
      "fraud_count": 2
    }
  ],
  "summary": {
    "total_entities": 10,
    "total_risk_value": 150000.00,
    "total_transactions": 500,
    "fraud_rate": 2.5
  }
}
```

### Analyze Specific Entity
```bash
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
  "profile": {
    "transaction_count": 150,
    "total_amount": 75000.00,
    "avg_risk_score": 0.65,
    "fraud_count": 3,
    "unique_merchants": 25,
    "unique_devices": 5
  },
  "risk_assessment": {
    "risk_level": "HIGH",
    "risk_score": 0.65,
    "fraud_rate": 2.0
  }
}
```

### Get Configuration
```bash
GET /api/v1/analytics/config

Response:
{
  "snowflake_enabled": true,
  "default_time_window": "24h",
  "default_group_by": "email",
  "default_top_percentage": 10,
  "cache_ttl": 300,
  "available_groupings": ["email", "device_id", "ip"],
  "available_time_windows": ["1h", "6h", "12h", "24h", "7d", "30d"]
}
```

## Risk Analytics Algorithm

The system calculates risk using the formula:

```
risk_weighted_value = Σ(MODEL_SCORE × PAID_AMOUNT_VALUE)
```

Entities are ranked by their risk-weighted value and the top N% are returned based on configuration.

### Query Example

```sql
WITH risk_calculations AS (
  SELECT 
    email as entity,
    COUNT(*) as transaction_count,
    SUM(PAID_AMOUNT_VALUE) as total_amount,
    AVG(MODEL_SCORE) as avg_risk_score,
    SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value
  FROM TRANSACTIONS_ENRICHED
  WHERE TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
  GROUP BY email
)
SELECT * FROM risk_calculations
WHERE risk_rank <= CEIL(total_entities * 0.10)
ORDER BY risk_weighted_value DESC
```

## Tool Management

### Enable/Disable Tools

All tools are controlled via environment variables:

```bash
USE_SNOWFLAKE=true       # Enable Snowflake
USE_SPLUNK=false         # Disable Splunk
USE_DATABRICKS=false     # Disable Databricks
USE_SUMO_LOGIC=false     # Disable SumoLogic
USE_MAXMIND=false        # Disable MaxMind
# ... etc
```

### Tool Registry

The tool registry automatically registers/skips tools based on their USE_* flags:

```python
# In tool_registry.py
if os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true':
    # Register Snowflake tool
else:
    # Skip Snowflake tool
```

## Performance Features

### Connection Pooling
- Pool size: 5 connections (configurable)
- Max overflow: 10 connections
- Timeout: 30 seconds

### Caching
- Results cached for 5 minutes (configurable)
- Cache key: `{time_window}_{group_by}_{top_percentage}`
- Force refresh available via API parameter

### Async Execution
- All Snowflake queries run asynchronously
- Thread pool executor for blocking operations
- Non-blocking API endpoints

## Testing

### Unit Testing
```bash
poetry run pytest test/unit/test_snowflake_client.py
poetry run pytest test/unit/test_risk_analyzer.py
```

### Integration Testing
```bash
poetry run python scripts/test_snowflake_poc.py
```

### Manual Testing
```bash
# Test with curl
curl http://localhost:8090/api/v1/analytics/health

# Test with Python
python -c "
import httpx
response = httpx.get('http://localhost:8090/api/v1/analytics/risk/top-entities')
print(response.json())
"
```

## Troubleshooting

### Connection Issues

1. **Check credentials in .env**:
   ```bash
   cat .env | grep SNOWFLAKE
   ```

2. **Verify Snowflake is enabled**:
   ```bash
   echo $USE_SNOWFLAKE  # Should be "true"
   ```

3. **Check logs**:
   ```bash
   tail -f logs/olorin.log | grep -i snowflake
   ```

### Missing Configuration

If you see warnings about missing configuration:

1. Check `.env` file exists and is readable
2. Verify all required fields are set
3. Check for typos in environment variable names
4. Ensure no trailing spaces in values

### Mock vs Real Client

The system automatically switches between mock and real clients:

- **Real Client**: When `USE_SNOWFLAKE=true` and `snowflake-connector-python` is installed
- **Mock Client**: When `USE_SNOWFLAKE=false` or dependencies missing

To force real client:
```bash
USE_SNOWFLAKE=true poetry run python -m app.local_server
```

## Security Considerations

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong passwords** - Rotate credentials regularly
3. **Limit warehouse size** - Control query costs
4. **Use read-only roles** - Principle of least privilege
5. **Enable query timeouts** - Prevent runaway queries

## Next Steps

### Phase 1: Testing (Current)
- ✅ Configuration management
- ✅ Connection testing
- ✅ Basic risk analytics
- ✅ API endpoints

### Phase 2: Enhancement
- [ ] Add more grouping options (merchant, device fingerprint)
- [ ] Implement trend analysis (week-over-week changes)
- [ ] Add alerting for high-risk entities
- [ ] Create dashboard visualizations

### Phase 3: Production
- [ ] Set up production Snowflake account
- [ ] Configure VPC peering/PrivateLink
- [ ] Implement query optimization
- [ ] Add comprehensive monitoring

## Support

For issues or questions:
1. Check the test script output: `poetry run python scripts/test_snowflake_poc.py`
2. Review logs: `tail -f logs/olorin.log`
3. Verify configuration: `cat .env | grep -E "(SNOWFLAKE|ANALYTICS)"`

## Appendix: Schema Reference

The `TRANSACTIONS_ENRICHED` table contains 300+ columns including:

### Key Risk Columns
- `TX_ID_KEY` - Transaction identifier
- `MODEL_SCORE` - Fraud risk score (0-1)
- `IS_FRAUD_TX` - Confirmed fraud flag
- `PAID_AMOUNT_VALUE` - Transaction amount
- `TX_DATETIME` - Transaction timestamp

### Entity Columns
- `EMAIL` - User email
- `DEVICE_ID` - Device identifier
- `IP` - IP address
- `CARD_BIN` - Card BIN
- `MERCHANT_NAME` - Merchant

### Risk Indicators
- `NSURE_LAST_DECISION` - Approval decision
- `MAXMIND_RISK_SCORE` - MaxMind risk
- `FRAUD_RULES_TRIGGERED` - Triggered rules
- `DISPUTE_STATUS` - Dispute information
- `KYC_STATUS` - KYC verification

For the complete 300+ column schema, see `/docs/plans/2025-09-06-snowflake-poc-implementation-plan.md`