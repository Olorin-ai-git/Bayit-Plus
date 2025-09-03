# test-auto Command - Autonomous Investigation Testing

## Overview
The `test-auto` command orchestrates comprehensive testing of the Olorin autonomous investigation system using the python-tests-expert subagent. It runs all test scenarios, automatically fixes failures, and provides detailed step-by-step reporting with log citations.

## Command Syntax
```
test-auto [options]
```

## Options
- `--verbose`: Enable detailed output during test execution
- `--no-fix`: Skip automatic fixing of failed tests
- `--report-only`: Generate report from the last test run
- `--phase <name>`: Run only a specific test phase
- `--csv-file <path>`: Path to CSV file containing transaction data for realistic testing
- `--csv-limit <number>`: Maximum number of transactions to load from CSV (default: 50)

## Test Phases

### Phase 1: Unit Tests - Autonomous Agents
- Tests individual agent components in isolation
- Validates Device, Network, Location, and Logs agents
- Ensures proper initialization and configuration

### Phase 2: Integration Tests - Autonomous Investigation
- Tests complete investigation workflow
- Validates multi-agent coordination
- Ensures proper data flow between components

### Phase 3: WebSocket Real-time Updates
- Tests WebSocket connection establishment
- Validates real-time progress updates
- Ensures proper message formatting

### Phase 4: Agent Orchestration
- Tests LangGraph orchestration
- Validates agent state transitions
- Ensures proper error propagation

### Phase 5: Error Scenarios
- Tests error handling mechanisms
- Validates recovery strategies
- Ensures graceful degradation

### Phase 6: Performance Testing
- Validates response time requirements
- Tests concurrent investigation handling
- Ensures scalability limits

### Phase 7: Firebase Secrets Integration
- Tests secret retrieval
- Validates caching mechanisms
- Ensures no environment variable overrides

### Phase 8: Endpoint Coverage
- Tests all 52+ API endpoints
- Validates authentication flows
- Ensures proper error responses

## Automatic Fix Mechanism

When tests fail, the system:
1. Analyzes failure patterns in test output
2. Identifies common issues (imports, assertions, timeouts)
3. Applies targeted fixes
4. Re-runs tests to verify fixes
5. Documents all changes in the report

## Report Structure

### Executive Summary
- Test environment details
- Overall pass/fail statistics
- Critical findings

### Phase-by-Phase Analysis
Each phase includes:
- Description and objectives
- Start/end timestamps
- Pass/fail status
- Applied fixes (if any)
- Relevant log excerpts

### Detailed Logs Section
- **Critical Errors**: Full stack traces with line numbers
- **Warnings**: Deprecation notices and potential issues
- **Assertions**: All test assertions with actual vs expected values
- **Performance Metrics**: Response times and resource usage

### Coverage Analysis
- Line coverage percentage
- Branch coverage details
- Uncovered code sections
- Recommendations for improvement

### Citations Format
Every step includes:
```
[TIMESTAMP] [PHASE] [COMPONENT] Action taken
  └─ Source: filename.py:line_number
  └─ Log: [Log excerpt showing evidence]
  └─ Result: [Outcome of the action]
```

## Example Usage

### Run full test suite with automatic fixes
```bash
test-auto --verbose
```

### Run with CSV transaction data for realistic testing
```bash
test-auto --csv-file /path/to/transactions.csv --csv-limit 100
```

### Run with CSV data and verbose output
```bash
test-auto --csv-file /Users/gklainert/Documents/olorin/transaction_dataset_10k.csv --csv-limit 500 --verbose
```

### Run specific phase without fixes
```bash
test-auto --phase Integration_Tests_Autonomous --no-fix
```

### Generate report from last run
```bash
test-auto --report-only
```

## CSV Transaction Data Integration

When using `--csv-file`, the test suite:
1. **Loads Real Transaction Data**: Reads transaction records from CSV files
2. **Extracts User Profiles**: Groups transactions by unique user ID for realistic scenarios
3. **Generates Test Cases**: Uses actual transaction patterns for investigation testing
4. **Validates Performance**: Tests system behavior with real data volumes
5. **Reports Data Metrics**: Includes CSV data statistics in test reports

### CSV File Requirements
- Must contain columns: `TX_ID_KEY`, `UNIQUE_USER_ID`, `EMAIL`, `FIRST_NAME`, `APP_ID`, `TX_DATETIME`
- Should use CSV format with header row
- Supports large datasets (tested with 10k+ transactions)

## Integration with python-tests-expert

The command leverages the python-tests-expert subagent to:
1. **Analyze Repository**: Complete codebase analysis before testing
2. **Plan Execution**: Strategic test ordering based on dependencies
3. **Execute Tests**: Run tests with proper environment setup (including CSV data)
4. **Fix Failures**: Apply intelligent fixes based on failure patterns
5. **Generate Reports**: Create comprehensive documentation with CSV metrics

## Success Criteria

Tests are considered successful when:
- All 8 phases pass without manual intervention
- Coverage exceeds 30% threshold
- No critical errors remain unfixed
- Performance benchmarks are met:
  - Health endpoints: < 100ms
  - Authentication: < 500ms
  - Analysis endpoints: < 30s
  - Agent invocation: < 2 minutes

## Output Locations

- **Report**: `/reports/test-runs/autonomous_investigation_test_report_[timestamp].md`
- **Logs**: `/reports/test-runs/test_logs_[timestamp].log`
- **Coverage**: `/htmlcov/index.html`

## Troubleshooting

### Common Issues and Solutions

1. **Server Not Running**
   - Automatically starts the server
   - Waits for health check confirmation

2. **Missing Dependencies**
   - Runs `poetry install` automatically
   - Validates Python 3.11 environment

3. **External Service Timeouts**
   - Applies mock fixtures
   - Increases timeout thresholds

4. **Firebase Secrets Errors**
   - Mocks Firebase CLI calls
   - Uses test secret values

## Implementation Details

The command executes through:
1. Shell script: `/scripts/tools/test_autonomous_investigation.sh`
2. Python test orchestrator using pytest
3. python-tests-expert subagent for intelligent analysis
4. Automatic report generation with markdown formatting

## Related Commands

- `test`: Run basic test suite
- `coverage`: Generate coverage report only
- `fix`: Fix failing tests without running full suite