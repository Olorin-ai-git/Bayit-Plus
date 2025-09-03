# Archived Test Scripts - Migration Notice

## Overview
These test scripts have been archived as of 2025-09-02 and replaced with a unified test runner system.

## ⚠️ IMPORTANT: These Scripts Are Deprecated
All the scripts in this directory have been consolidated into a single, more powerful unified test runner.

## 🚀 New Unified Test Runner Location
**Main Script**: `/olorin-server/scripts/testing/unified_autonomous_test_runner.py`  
**Shell Wrapper**: `/olorin-server/scripts/testing/run_unified_tests.sh`

## 📁 Archived Scripts
The following scripts have been archived and should no longer be used:

1. **run_autonomous_test.sh** - Basic shell wrapper for single scenarios
2. **run-autonomous-tests.sh** - CSV-based test runner shell script
3. **run_autonomous_tests.py** - Standalone Python test runner with CSV support
4. **test_autonomous_simple.py** - Simple autonomous test script
5. **test_autonomous_with_mocks.py** - Test script with mock data
6. **run_autonomous_tests_with_html.py** - Test runner with HTML report generation
7. **autonomous_test_runner.py** - Original Python test runner
8. **autonomous_investigation_test_runner.py** - Comprehensive test runner (from app/test/)
9. **complete_autonomous_test.py** - Complete test suite (from tests/autonomous/)
10. **enhanced_autonomous_investigation_test.py** - Enhanced test suite (from tests/autonomous/)
11. **simplified_autonomous_test.py** - Simplified test suite (from tests/autonomous/)
12. **run_test_with_mock.sh** - Shell script for running tests with mocked IPS Cache

## 🔄 Migration Guide

### Old Script → New Command Mapping

#### run_autonomous_test.sh
```bash
# OLD:
./run_autonomous_test.sh device_spoofing
./run_autonomous_test.sh --all

# NEW:
./scripts/testing/run_unified_tests.sh --scenario device_spoofing
./scripts/testing/run_unified_tests.sh --all
```

#### run-autonomous-tests.sh (CSV-based)
```bash
# OLD:
./run-autonomous-tests.sh --csv-file /path/to/file.csv --csv-limit 100

# NEW:
./scripts/testing/run_unified_tests.sh --csv-file /path/to/file.csv --csv-limit 100
```

#### Python scripts directly
```bash
# OLD:
poetry run python run_autonomous_tests.py --csv-file /path/to/file.csv

# NEW:
./scripts/testing/run_unified_tests.sh --csv-file /path/to/file.csv
# OR directly:
poetry run python scripts/testing/unified_autonomous_test_runner.py --csv-file /path/to/file.csv
```

#### run_test_with_mock.sh (Mock IPS Cache)
```bash
# OLD:
./run_test_with_mock.sh

# NEW:
./scripts/testing/run_unified_tests.sh --scenario device_spoofing --mock-ips-cache
# OR for all scenarios with mock:
./scripts/testing/run_unified_tests.sh --all --mock-ips-cache
```

## ✨ New Features in Unified Test Runner

The unified test runner provides significant improvements:

### Enhanced Reporting
- **Multiple output formats**: HTML, JSON, Markdown, Terminal
- **Rich HTML reports** with interactive charts and visualizations
- **Detailed metrics**: Agent performance, journey tracking, token usage, cost analysis
- **Comprehensive validation**: Multi-dimensional quality scoring

### Advanced CLI Options
- `--scenario <name>` - Test single scenario
- `--all` - Test all scenarios
- `--csv-file <path>` - Use CSV data source
- `--csv-limit <n>` - Limit CSV rows
- `--concurrent <n>` - Number of concurrent tests
- `--output-format <format>` - Output format selection
- `--output-dir <path>` - Custom output directory
- `--html-report` - Generate HTML report
- `--open-report` - Auto-open HTML report in browser
- `--timeout <seconds>` - Custom timeout
- `--log-level <level>` - Logging level control
- `--mode <mode>` - Test mode (mock, demo, live)

### Better Performance
- Concurrent test execution
- Optimized resource management
- Proper session handling
- Memory-efficient processing

### Production Ready
- Comprehensive error handling
- Environment validation
- Dependency checking
- Resource cleanup

## 📚 Documentation
For complete documentation on the unified test runner, see:
- `/scripts/testing/README.md` - Complete usage guide
- `/scripts/testing/run_unified_tests.sh --help` - CLI help

## ⚠️ Do Not Use These Archived Scripts
These scripts are kept only for historical reference. All functionality has been preserved and enhanced in the unified test runner.

## 📅 Archive Date
- **Archived**: 2025-09-02
- **Reason**: Consolidation into unified test runner
- **Migration**: All features preserved and enhanced

## 🆘 Support
If you need help migrating from old scripts to the new unified test runner:
1. Check the migration examples above
2. Run `./scripts/testing/run_unified_tests.sh --help`
3. Review the README in `/scripts/testing/README.md`

---
*Note: These archived scripts should not be modified or used in production. They are retained only for reference purposes.*