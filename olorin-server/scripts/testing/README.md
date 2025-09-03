# Autonomous Investigation Test Scripts

This directory contains scripts for running comprehensive autonomous investigation tests with enhanced reporting, multiple output formats, and extensive validation capabilities.

## 🚀 NEW: Unified Test Runner (Recommended)

### `unified_autonomous_test_runner.py` & `run_unified_tests.sh`
**The comprehensive, production-ready solution that consolidates all testing functionality.**

#### Quick Start Examples:
```bash
# Single scenario test with HTML report
./scripts/testing/run_unified_tests.sh --scenario device_spoofing --html-report --open-report

# Test all scenarios concurrently
./scripts/testing/run_unified_tests.sh --all --concurrent 5 --format html --output-dir ./reports

# CSV-based testing with real transaction data
./scripts/testing/run_unified_tests.sh --csv-file /path/to/transactions.csv --csv-limit 100 --all --verbose

# Performance benchmarking
./scripts/testing/run_unified_tests.sh --all --concurrent 1 --log-level debug --timeout 600
```

#### Key Features:
- ✅ **Multiple Output Formats**: HTML, JSON, Markdown, Terminal reports
- ✅ **CSV-Based Testing**: Use real transaction data for realistic scenarios  
- ✅ **Concurrent Execution**: Run multiple tests simultaneously for faster completion
- ✅ **Interactive HTML Reports**: Rich visualizations with charts and performance metrics
- ✅ **Comprehensive Validation**: Multi-dimensional quality scoring with recommendations
- ✅ **Real-Time Monitoring**: Progress tracking and WebSocket event monitoring
- ✅ **Performance Analysis**: Agent timing, throughput, and resource utilization metrics
- ✅ **Error Recovery**: Detailed error analysis with recovery suggestions

#### Available Test Scenarios:
- `device_spoofing` - Device fingerprint spoofing detection
- `impossible_travel` - Geographic impossibility detection
- `account_takeover` - Account compromise pattern recognition
- `synthetic_identity` - Artificial identity detection
- `velocity_fraud` - Rapid transaction pattern analysis
- `location_anomaly` - Suspicious location activity detection
- `device_fingerprint_mismatch` - Device inconsistency detection
- `behavioral_anomaly` - Unusual behavior pattern identification

## Legacy Test Scripts (Deprecated - Use Unified Runner Instead)

### `run_single_scenario.sh`
Run a single fraud detection scenario:
```bash
./scripts/testing/run_single_scenario.sh 1              # Run scenario 1
./scripts/testing/run_single_scenario.sh 2 --verbose    # Run scenario 2 with verbose output
```

### `run_all_scenarios.sh`  
Run all 10 fraud detection scenarios:
```bash
./scripts/testing/run_all_scenarios.sh                  # Run all scenarios
./scripts/testing/run_all_scenarios.sh --verbose        # Run with verbose output
./scripts/testing/run_all_scenarios.sh --save          # Save results to JSON file
```

### `run_autonomous_tests.sh`
Flexible test runner with custom options:
```bash
./scripts/testing/run_autonomous_tests.sh --scenarios 3 --verbose
./scripts/testing/run_autonomous_tests.sh --scenarios 1 --save
```

## Features

- ✅ Automatically retrieves Anthropic API key from Firebase secrets
- ✅ Sets up proper Python path and environment variables
- ✅ No secrets hardcoded in scripts
- ✅ Supports verbose output and result saving
- ✅ Error handling for missing API keys

## Requirements

- Firebase CLI must be installed and authenticated
- Access to `olorin-ai` Firebase project
- Poetry environment set up in the olorin-server directory

## Usage Notes

All scripts automatically:
1. Retrieve the Anthropic API key from Firebase secrets using `firebase functions:secrets:access`
2. Set up the required environment variables
3. Configure the Python path
4. Run the autonomous investigation tests

No manual environment variable setup is required.