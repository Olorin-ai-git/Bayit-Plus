# Olorin Smoke Tests - Operational Guide

## Quick Start

### 1. Basic Health Check (30 seconds)
```bash
# Quick check of critical services
cd /Users/gklainert/Documents/olorin/olorin-server
poetry run python scripts/smoke_tests/run_smoke_tests.py --quick
```

### 2. Full Smoke Test Suite (2-5 minutes)
```bash
# Comprehensive test of all enabled services
poetry run python scripts/smoke_tests/run_smoke_tests.py
```

### 3. Before Running Investigations
```bash
# Check if investigations should be blocked
if poetry run python scripts/smoke_tests/run_smoke_tests.py --check-blocking --silent; then
    echo "✅ Safe to run investigations"
    # Run your investigation here
else
    echo "🚫 Critical services down - investigations blocked"
fi
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8090/smoke-tests/health | jq '.'
```

### Full Test Suite
```bash
curl -X POST http://localhost:8090/smoke-tests/run \\
     -H "Content-Type: application/json" \\
     -d '{"parallel": true, "timeout_seconds": 300}' | jq '.'
```

### Service List
```bash
curl http://localhost:8090/smoke-tests/services | jq '.'
```

## Troubleshooting Common Issues

### Snowflake Connection Errors

**Error**: `Failed to connect to Snowflake`

**Check**:
```bash
# Verify configuration
grep SNOWFLAKE .env | head -5

# Test specific Snowflake connection
poetry run python scripts/smoke_tests/run_smoke_tests.py --services snowflake --verbose
```

**Fix**:
1. Verify `SNOWFLAKE_ACCOUNT` is correct
2. Check network connectivity: `ping VIOBDGL-XF85822.snowflakecomputing.com`
3. Validate credentials are not expired

### API Key Authentication Failures

**Error**: `Invalid API key` or `Authentication failed`

**Check**:
```bash
# Verify API keys are set
echo "AbuseIPDB: ${ABUSEIPDB_API_KEY:0:10}..."
echo "VirusTotal: ${VIRUSTOTAL_API_KEY:0:10}..."  
echo "Shodan: ${SHODAN_API_KEY:0:10}..."
```

**Fix**:
1. Regenerate API keys from service providers
2. Update `.env` file with new keys
3. Restart application

### Rate Limiting Issues

**Error**: `Rate limit exceeded`

**Check**:
```bash
# Run tests sequentially to avoid rate limits
poetry run python scripts/smoke_tests/run_smoke_tests.py --sequential
```

**Fix**:
1. Reduce test frequency
2. Upgrade API plans for higher limits
3. Implement request throttling

### Service Timeouts

**Error**: `Test timed out after X seconds`

**Check**:
```bash
# Increase timeout and test individual services
poetry run python scripts/smoke_tests/run_smoke_tests.py --services snowflake --timeout 600
```

**Fix**:
1. Check network latency to services
2. Verify services are not experiencing outages
3. Consider upgrading network connectivity

## Monitoring Integration

### Continuous Monitoring Script
```bash
#!/bin/bash
# scripts/monitor_services.sh

LOGFILE="/var/log/olorin_health.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    if poetry run python scripts/smoke_tests/run_smoke_tests.py --quick --silent; then
        echo "[$TIMESTAMP] ✅ Services healthy" >> $LOGFILE
    else
        EXIT_CODE=$?
        echo "[$TIMESTAMP] ❌ Service issues detected (exit code: $EXIT_CODE)" >> $LOGFILE
        
        # Send alert (customize for your alerting system)
        if [ $EXIT_CODE -eq 1 ]; then
            echo "[$TIMESTAMP] 🚨 CRITICAL: Investigations blocked" >> $LOGFILE
            # curl -X POST https://your-alerting-system/alert -d "Olorin critical services down"
        fi
    fi
    
    sleep 300  # Check every 5 minutes
done
```

### Cron Job Setup
```bash
# Add to crontab (crontab -e)
*/5 * * * * cd /path/to/olorin-server && poetry run python scripts/smoke_tests/run_smoke_tests.py --quick --silent || logger "Olorin services unhealthy"
```

### Systemd Service
```ini
# /etc/systemd/system/olorin-health-monitor.service
[Unit]
Description=Olorin Health Monitor
After=network.target

[Service]
Type=simple
User=olorin
WorkingDirectory=/path/to/olorin-server
ExecStart=/path/to/scripts/monitor_services.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

## Performance Benchmarks

### Expected Response Times
- **Snowflake Connection**: < 5 seconds
- **API Authentication**: < 2 seconds  
- **Basic Functionality**: < 10 seconds
- **Full Test Suite**: < 120 seconds (parallel), < 300 seconds (sequential)

### Service-Specific Benchmarks

**Snowflake**:
- Connection establishment: < 10 seconds
- Simple query execution: < 5 seconds
- Data access validation: < 3 seconds

**Threat Intelligence APIs**:
- IP reputation check: < 3 seconds
- Domain analysis: < 5 seconds
- Bulk operations: < 30 seconds

**Splunk**:
- Authentication: < 2 seconds
- Search execution: < 10 seconds
- Index access: < 5 seconds

## Emergency Procedures

### 1. All Services Down
```bash
# Quick diagnosis
poetry run python scripts/smoke_tests/run_smoke_tests.py --verbose

# Check network connectivity
ping google.com
nslookup snowflake.com

# Verify configuration
poetry run python scripts/smoke_tests/run_smoke_tests.py --validate-configuration
```

### 2. Snowflake Down (Critical)
1. **Verify Snowflake Status**: Check https://status.snowflake.com
2. **Test Connection Manually**:
   ```bash
   poetry run python -c "
   from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
   import asyncio
   async def test():
       client = RealSnowflakeClient()
       return await client.test_connection()
   print(asyncio.run(test()))
   "
   ```
3. **Fallback**: Switch to mock mode temporarily if available

### 3. API Key Expired
1. **Identify expired keys**:
   ```bash
   poetry run python scripts/smoke_tests/run_smoke_tests.py --services abuseipdb virustotal shodan
   ```
2. **Regenerate keys** from service provider dashboards
3. **Update configuration** and restart services

### 4. Network Issues
1. **Test basic connectivity**:
   ```bash
   curl -I https://api.abuseipdb.com
   curl -I https://www.virustotal.com
   curl -I https://api.shodan.io
   ```
2. **Check DNS resolution**:
   ```bash
   nslookup api.abuseipdb.com
   nslookup www.virustotal.com
   nslookup api.shodan.io
   ```
3. **Verify firewall rules** allow outbound HTTPS traffic

## Integration Checklist

### Pre-Deployment
- [ ] All required API keys configured in `.env`
- [ ] Configuration validation passes
- [ ] All enabled services pass smoke tests
- [ ] Response times within acceptable limits
- [ ] Monitoring and alerting configured

### Pre-Investigation
- [ ] Quick health check passes (critical services)
- [ ] No investigation-blocking failures detected
- [ ] Adequate response times for investigation SLAs

### Post-Maintenance
- [ ] Full smoke test suite after service updates
- [ ] Configuration changes validated
- [ ] Performance regression testing completed
- [ ] Monitoring systems updated if needed

### Weekly Operations
- [ ] Review smoke test failure patterns
- [ ] Check API usage quotas and limits
- [ ] Update API keys before expiration
- [ ] Performance trend analysis

## Alerting Guidelines

### Critical Alerts (Immediate Response)
- Snowflake connection failures
- All threat intelligence APIs down
- Investigation-blocking service failures
- Authentication failures across multiple services

### Warning Alerts (Response within 2 hours)
- Single API service degradation
- Response times above thresholds
- Non-critical service failures
- Configuration validation warnings

### Info Alerts (Daily Review)
- Service performance trends
- API quota usage reports
- Test success rate summaries
- Configuration changes detected

## Contact Information

### Service Providers
- **Snowflake Support**: https://support.snowflake.com
- **AbuseIPDB**: support@abuseipdb.com
- **VirusTotal**: support@virustotal.com  
- **Shodan**: help@shodan.io
- **Splunk**: support@splunk.com

### Internal Escalation
1. **Level 1**: Development Team
2. **Level 2**: Infrastructure Team  
3. **Level 3**: Service Owners
4. **Emergency**: On-call Manager