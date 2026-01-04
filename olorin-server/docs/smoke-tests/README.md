# Olorin Smoke Test System

The Olorin Smoke Test System provides comprehensive validation of all external API dependencies before running expensive fraud investigations. This system ensures that critical services like Snowflake, threat intelligence APIs, and logging systems are operational and properly configured.

## Overview

The smoke test system validates:
- **Connectivity**: Basic network connectivity to external services
- **Authentication**: API keys and credentials are valid
- **Basic Functionality**: Core operations work as expected
- **Rate Limiting**: Service rate limits are respected
- **Response Times**: Services respond within acceptable timeframes

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Smoke Test Runner                │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   Snowflake │  │  AbuseIPDB  │              │
│  │ Smoke Tests │  │ Smoke Tests │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ VirusTotal  │  │    Shodan   │              │
│  │ Smoke Tests │  │ Smoke Tests │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  ┌─────────────┐                                │
│  │   Splunk    │                                │
│  │ Smoke Tests │                                │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Command Line   │         │   REST API      │
│     Runner      │         │   Endpoints     │
└─────────────────┘         └─────────────────┘
```

## Services Tested

### Critical Services (Block investigations if failed)
1. **Snowflake Data Warehouse**
   - Connection to fraud analytics database
   - Query execution capabilities
   - Data access permissions
   
2. **Splunk Log Analysis**
   - SIEM connectivity
   - Search functionality
   - Index access permissions

### High Priority Services (Warn but allow investigations)
3. **AbuseIPDB Threat Intelligence**
   - IP reputation checking
   - Bulk analysis capabilities
   - Rate limiting compliance

4. **VirusTotal Threat Analysis**
   - IP/domain/file analysis
   - Vendor result aggregation
   - API quota monitoring

5. **Shodan Infrastructure Intelligence**
   - Host information lookup
   - Search capabilities
   - DNS resolution services

## Usage

### Command Line Interface

#### Run All Smoke Tests
```bash
# Full smoke test suite
poetry run python scripts/smoke_tests/run_smoke_tests.py

# Quick health check (critical services only)
poetry run python scripts/smoke_tests/run_smoke_tests.py --quick

# Test specific services
poetry run python scripts/smoke_tests/run_smoke_tests.py --services snowflake abuseipdb

# Generate JSON report
poetry run python scripts/smoke_tests/run_smoke_tests.py --json --output smoke_test_report.json
```

#### Check Investigation Blocking Status
```bash
# Exit code 1 if investigations should be blocked
poetry run python scripts/smoke_tests/run_smoke_tests.py --check-blocking

# Use in scripts
if poetry run python scripts/smoke_tests/run_smoke_tests.py --check-blocking --silent; then
    echo "✅ Investigations can proceed"
    ./run_investigation.sh
else
    echo "🚫 Critical services down - blocking investigations"
    exit 1
fi
```

#### Silent and Verbose Modes
```bash
# Silent mode (minimal output)
poetry run python scripts/smoke_tests/run_smoke_tests.py --silent

# Verbose mode (detailed logging)
poetry run python scripts/smoke_tests/run_smoke_tests.py --verbose

# Sequential execution (slower but more stable)
poetry run python scripts/smoke_tests/run_smoke_tests.py --sequential
```

### REST API Endpoints

#### Quick Health Check
```bash
curl http://localhost:8090/smoke-tests/health
```

Response:
```json
{
  "status": "healthy",
  "message": "Critical services check: 2 healthy, 0 failed",
  "timestamp": "2025-09-10T10:30:00Z",
  "healthy_services": ["Snowflake", "Splunk"],
  "critical_failures": [],
  "should_block_investigations": false
}
```

#### Full Smoke Test Suite
```bash
curl -X POST http://localhost:8090/smoke-tests/run \\
  -H "Content-Type: application/json" \\
  -d '{
    "services": ["snowflake", "abuseipdb"],
    "parallel": true,
    "timeout_seconds": 300
  }'
```

#### Get Last Test Results
```bash
curl http://localhost:8090/smoke-tests/status
```

#### List Available Services
```bash
curl http://localhost:8090/smoke-tests/services
```

#### Validate Configuration
```bash
curl -X POST http://localhost:8090/smoke-tests/validate-configuration
```

## Configuration

### Environment Variables

Enable/disable services using these environment variables:

```bash
# Critical Services
USE_SNOWFLAKE=true                    # Snowflake data warehouse
USE_SPLUNK=true                       # Splunk log analysis

# Threat Intelligence Services  
USE_ABUSEIPDB_IP_REPUTATION=true      # AbuseIPDB IP checks
USE_ABUSEIPDB_BULK_ANALYSIS=true      # AbuseIPDB bulk analysis
USE_VIRUSTOTAL_IP_ANALYSIS=true       # VirusTotal IP analysis
USE_VIRUSTOTAL_DOMAIN_ANALYSIS=true   # VirusTotal domain analysis
USE_SHODAN_INFRASTRUCTURE=true        # Shodan infrastructure analysis
USE_SHODAN_SEARCH=true                # Shodan search capabilities
```

### API Keys and Credentials

Configure API keys in your `.env` file:

```bash
# Snowflake Connection
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-user
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# Threat Intelligence API Keys
ABUSEIPDB_API_KEY=your-abuseipdb-key
VIRUSTOTAL_API_KEY=your-virustotal-key  
SHODAN_API_KEY=your-shodan-key

# Splunk Configuration
SPLUNK_HOST=splunk.example.com
SPLUNK_USERNAME=your-username
SPLUNK_PASSWORD=your-password
```

## Test Categories

### Connectivity Tests
- Network reachability to service endpoints
- Basic HTTP/HTTPS connectivity
- DNS resolution verification
- Firewall and proxy compatibility

### Authentication Tests
- API key validation
- Credential verification
- Session establishment
- Permission validation

### Functionality Tests
- Basic query/request execution
- Data retrieval verification
- Response format validation
- Error handling verification

### Performance Tests
- Response time measurement
- Rate limiting compliance
- Timeout handling
- Concurrent connection testing

## Exit Codes

The command-line runner uses the following exit codes:

- **0**: All tests passed successfully
- **1**: Critical failures - investigations should be blocked
- **2**: Critical failures - non-blocking 
- **3**: Non-critical failures - investigations can proceed
- **4**: Timeout occurred
- **5**: Unexpected error
- **130**: Interrupted by user (SIGINT)

## Integration with Investigations

### Pre-Investigation Checks
```python
from app.service.smoke_tests.smoke_test_runner import SmokeTestRunner

async def run_investigation(investigation_request):
    # Quick health check before starting
    runner = SmokeTestRunner()
    health = await runner.run_quick_health_check()
    
    if health.get('should_block_investigations'):
        raise InvestigationBlockedError(
            f"Critical services down: {health.get('critical_failures')}"
        )
    
    # Proceed with investigation
    return await execute_investigation(investigation_request)
```

### Automated Monitoring
```bash
#!/bin/bash
# monitoring/check_services.sh

# Run smoke tests every 5 minutes
while true; do
    if poetry run python scripts/smoke_tests/run_smoke_tests.py --quick --silent; then
        echo "$(date): ✅ Services healthy"
    else
        echo "$(date): ❌ Service issues detected"
        # Send alert to monitoring system
        curl -X POST https://monitoring.example.com/alert \\
          -d "Critical Olorin services are down"
    fi
    sleep 300
done
```

## Troubleshooting

### Common Issues

#### Snowflake Connection Failed
```
Error: Failed to connect to Snowflake
```

**Solutions:**
1. Verify `SNOWFLAKE_ACCOUNT` and `SNOWFLAKE_HOST` are correct
2. Check network connectivity to Snowflake
3. Validate username/password credentials
4. Ensure warehouse is running and accessible

#### API Key Authentication Failed
```
Error: Invalid API key
```

**Solutions:**
1. Verify API keys are correctly set in `.env`
2. Check API key permissions and quotas
3. Ensure API keys haven't expired
4. Test API keys directly with service documentation

#### Rate Limiting Issues
```
Error: Rate limit exceeded
```

**Solutions:**
1. Reduce test frequency
2. Use `--sequential` flag to slow down tests
3. Check API plan limits
4. Implement backoff strategies

#### Timeout Errors
```
Error: Smoke tests timed out after 300 seconds
```

**Solutions:**
1. Increase timeout with `--timeout` parameter
2. Check network latency to services
3. Use `--sequential` to avoid resource contention
4. Verify services are not experiencing outages

## Development

### Adding New Service Tests

1. Create smoke test class extending `BaseSmokeTest`:

```python
# app/service/smoke_tests/new_service_smoke_test.py
from .base_smoke_test import BaseSmokeTest
from .models import SmokeTestResult, SmokeTestSeverity

class NewServiceSmokeTest(BaseSmokeTest):
    def __init__(self, enabled: bool = True):
        super().__init__("NewService", enabled)
    
    async def run_connectivity_test(self) -> SmokeTestResult:
        # Implement connectivity test
        pass
    
    async def run_authentication_test(self) -> SmokeTestResult:
        # Implement authentication test  
        pass
    
    async def run_basic_functionality_test(self) -> SmokeTestResult:
        # Implement functionality test
        pass
```

2. Add service to `SmokeTestRunner`:

```python
# app/service/smoke_tests/smoke_test_runner.py
def _load_service_configurations(self) -> dict:
    return {
        # ... existing services ...
        "newservice": {
            "enabled": os.getenv("USE_NEW_SERVICE", "false").lower() == "true",
            "severity": SmokeTestSeverity.HIGH,
            "description": "New service description"
        }
    }

def _create_smoke_test_instance(self, service_name: str, enabled: bool):
    test_classes = {
        # ... existing classes ...
        "newservice": NewServiceSmokeTest,
    }
    # ... rest of method ...
```

### Running Tests During Development

```bash
# Test specific service during development
poetry run python scripts/smoke_tests/run_smoke_tests.py --services newservice --verbose

# Quick validation
poetry run python scripts/smoke_tests/run_smoke_tests.py --quick --json
```

## Monitoring and Alerting

### Metrics and Dashboards

The smoke test system provides metrics for:
- Test success/failure rates
- Response times per service
- Service availability percentages
- Investigation blocking events

### Alert Conditions

Set up alerts for:
- Critical service failures (immediate)
- High response times (warning)
- Authentication failures (urgent)
- Investigation blocking events (critical)

### Log Analysis

Smoke test logs include:
- Structured JSON format for parsing
- Service-specific error details
- Performance metrics
- Configuration validation results

```json
{
  "timestamp": "2025-09-10T10:30:00Z",
  "level": "ERROR",
  "service": "snowflake",
  "test": "connectivity_test",
  "error": "Connection timeout after 30 seconds",
  "response_time_ms": 30000,
  "should_block_investigations": true
}
```

## Best Practices

1. **Run Before Every Investigation**: Always check critical services before starting expensive investigations
2. **Monitor Continuously**: Set up automated monitoring with alerts
3. **Test During Maintenance**: Validate services after maintenance windows
4. **Performance Baseline**: Track response times to detect degradation
5. **Documentation**: Keep API key documentation up to date
6. **Graceful Degradation**: Design investigations to handle non-critical service failures
7. **Recovery Procedures**: Document steps to recover from service failures