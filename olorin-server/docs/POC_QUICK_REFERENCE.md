# Snowflake POC - Quick Reference Card

## 🎯 Getting Top 10% Risk Entities

### Command Line (Most Common)
```bash
# Default: Top 10% from last 24 hours
poetry run python scripts/get_top_risk_entities.py

# Top 10% from last 7 days
poetry run python scripts/get_top_risk_entities.py --time-window 7d

# Top 5% instead of 10%
poetry run python scripts/get_top_risk_entities.py --top 5

# Group by device_id
poetry run python scripts/get_top_risk_entities.py --group-by device_id

# JSON output
poetry run python scripts/get_top_risk_entities.py --json > results.json

# Force refresh (bypass cache)
poetry run python scripts/get_top_risk_entities.py --force-refresh
```

### Parameters Quick Reference
| Flag | Options | Default |
|------|---------|---------|
| `--time-window` | `1h`, `6h`, `12h`, `24h`, `7d`, `30d` | `24h` |
| `--group-by` | `email`, `device_id`, `ip_address` | `email` |
| `--top` | 1-100 (percentage) | `10` |
| `--force-refresh` | (flag only) | False |
| `--json` | (flag only) | False |

---

## 📝 Essential .env Configuration

### Minimum Required Settings
```bash
# Snowflake Connection (REQUIRED)
SNOWFLAKE_ACCOUNT=VIOBDGL-XF85822
SNOWFLAKE_USER=Olorin
SNOWFLAKE_PASSWORD=YourPassword123!
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS

# Enable Snowflake (REQUIRED)
USE_SNOWFLAKE=true
```

### Commonly Changed Settings
```bash
# Analytics Defaults
ANALYTICS_DEFAULT_TIME_WINDOW=24h    # Change default time window
ANALYTICS_DEFAULT_GROUP_BY=email     # Change default grouping
ANALYTICS_DEFAULT_TOP_PERCENTAGE=10  # Change default percentage
ANALYTICS_CACHE_TTL=300              # Cache duration in seconds (0=off)

# Connection Pool
SNOWFLAKE_POOL_SIZE=5                # Number of connections
SNOWFLAKE_QUERY_TIMEOUT=300          # Query timeout in seconds

# Optional Settings
SNOWFLAKE_WAREHOUSE=COMPUTE_WH       # Warehouse to use
SNOWFLAKE_ROLE=FRAUD_ANALYST_ROLE    # User role
SNOWFLAKE_SCHEMA=PUBLIC              # Database schema
```

---

## 🔧 Key Scripts

```bash
# Setup & Maintenance
scripts/setup_snowflake_database.py     # Initial database setup
scripts/check_snowflake_data.py         # Check data statistics
scripts/test_snowflake_poc.py           # Test connection & config

# Data Generation
scripts/generate_10k_simple.py          # Generate 10,000 test records
scripts/add_more_test_data.py           # Add additional test data

# Risk Analysis
scripts/get_top_risk_entities.py        # Get top N% risk entities
scripts/test_direct_query.py            # Test SQL queries directly
```

---

## 📊 Risk Calculation Formula

```
Risk-Weighted Value = Σ(MODEL_SCORE × PAID_AMOUNT_VALUE)
```

**Where:**
- `MODEL_SCORE` = Fraud risk score (0.0 to 1.0)
- `PAID_AMOUNT_VALUE` = Transaction amount in dollars
- Higher value = Higher risk entity

**Process:**
1. Calculate risk-weighted value for each entity
2. Rank all entities by this value
3. Return top N% (e.g., top 10%)

---

## 🚀 Common Workflows

### First Time Setup
```bash
cd olorin-server
poetry install
cp .env.example .env
# Edit .env with your credentials
poetry run python scripts/setup_snowflake_database.py
poetry run python scripts/generate_10k_simple.py
```

### Daily Risk Analysis
```bash
# Morning check - last 24 hours
poetry run python scripts/get_top_risk_entities.py

# Weekly review - last 7 days, top 5%
poetry run python scripts/get_top_risk_entities.py --time-window 7d --top 5

# Monthly report - JSON format
poetry run python scripts/get_top_risk_entities.py --time-window 30d --json > monthly_report.json
```

### Troubleshooting
```bash
# Test connection
poetry run python scripts/test_snowflake_poc.py

# Check data
poetry run python scripts/check_snowflake_data.py

# View logs
tail -f logs/olorin.log

# Force refresh if getting stale data
poetry run python scripts/get_top_risk_entities.py --force-refresh
```

---

## 🔍 Direct SQL Queries

### Get Top 10% (Basic)
```sql
WITH risk AS (
    SELECT EMAIL,
           SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
    GROUP BY EMAIL
),
ranked AS (
    SELECT *, 
           ROW_NUMBER() OVER (ORDER BY risk_value DESC) as rank,
           COUNT(*) OVER() as total
    FROM risk
)
SELECT * FROM ranked 
WHERE rank <= CEIL(total * 0.10);
```

### Check Data Stats
```sql
SELECT COUNT(*) as total,
       AVG(MODEL_SCORE) as avg_risk,
       COUNT(DISTINCT EMAIL) as unique_users
FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP());
```

---

## ⚡ Performance Tips

1. **Use shorter time windows** for faster queries
2. **Enable caching** (`ANALYTICS_CACHE_TTL=300`)
3. **Group by indexed fields** (email, device_id)
4. **Limit percentage** when possible (top 5% vs 10%)
5. **Schedule heavy queries** during off-peak hours

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Object does not exist" | Run `setup_snowflake_database.py` |
| "Connection failed" | Check SNOWFLAKE_ACCOUNT in .env |
| "Permission denied" | Set SNOWFLAKE_ROLE=ACCOUNTADMIN |
| "No results" | Try longer time window or check data |
| "Stale data" | Use `--force-refresh` flag |

---

## 📞 Quick Support

```bash
# Diagnostic command - run this first for issues
poetry run python scripts/test_snowflake_poc.py

# Check what data exists
poetry run python scripts/check_snowflake_data.py

# View recent errors
grep ERROR logs/olorin.log | tail -20
```

---

**Version:** 1.0 | **Updated:** September 2025