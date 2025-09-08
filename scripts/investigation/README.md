# Investigation Scenario Scripts

This directory contains comprehensive investigation scenario scripts that **integrate with the existing Olorin autonomous investigation infrastructure**. These tools provide scenario templates and simplified interfaces while leveraging the proven `run-autonomous-investigation.sh` orchestration system.

## 🔗 Integration with Existing Infrastructure

**IMPORTANT**: These scripts are designed to work **with** the existing Olorin infrastructure, not replace it:
- **`run-autonomous-investigation.sh`** - Main orchestration script (handles server startup, monitoring, secrets)
- **`unified_autonomous_test_runner.py`** - Core investigation execution engine  
- **New scenario templates** - Add structured scenario support to existing system

## 📋 Scripts Overview

### 1. Scenario Investigation Runner (`scenario_investigation_runner.py`)
**Main investigation template system with pre-defined fraud scenarios**

**Features:**
- 8 pre-defined investigation scenarios (account takeover, payment fraud, etc.)
- Mock and live mode support
- HTML report generation with interactive visualizations
- Real-time progress tracking
- Custom scenario creation
- Integration with unified autonomous test runner

**Usage Examples:**
```bash
# List available scenarios
python scenario_investigation_runner.py --list-scenarios

# Run account takeover investigation (mock mode)
python scenario_investigation_runner.py --scenario account-takeover --mode mock --verbose

# Run with HTML report
python scenario_investigation_runner.py --scenario payment-fraud --html-report --open-report

# Custom investigation
python scenario_investigation_runner.py --custom --entity-id user_12345 --risk-level high --scenario-type identity_fraud
```

**Available Scenarios:**
- `account-takeover` - Account takeover investigation (7 min, high risk)
- `payment-fraud` - Payment fraud analysis (10 min, critical risk) 
- `identity-fraud` - Identity fraud detection (12 min, critical risk)
- `authentication-brute-force` - Brute force attack analysis (6 min, high risk)
- `impossible-travel` - Impossible travel detection (8 min, high risk)
- `credential-stuffing` - Credential stuffing investigation (9 min, high risk)
- `money-laundering` - Money laundering investigation (15 min, critical risk)
- `device-spoofing` - Device spoofing detection (6 min, medium risk)

### 2. Batch Investigation Runner (`batch_investigation_runner.py`)
**Run multiple investigations in batch with concurrent processing**

**Features:**
- Batch processing of multiple investigations
- CSV file input support
- Concurrent execution (configurable workers)
- Comprehensive batch reporting with performance analytics
- Cost tracking for live mode
- HTML reports with charts and statistics

**Usage Examples:**
```bash
# Run all scenarios in mock mode
python batch_investigation_runner.py --all-scenarios --mode mock

# Run from CSV file with 3 concurrent workers
python batch_investigation_runner.py --csv-file investigations.csv --concurrent 3

# Run specific scenarios with analytics
python batch_investigation_runner.py --scenario-types account-takeover,payment-fraud --count 5 --html-report --analytics

# High-throughput batch testing
python batch_investigation_runner.py --all-scenarios --concurrent 5 --timeout 180
```

### 3. Quick Investigation Launcher (`quick_investigation_launcher.py`)
**Streamlined launcher for quick investigations with shortcuts**

**Features:**
- Simple command interface with shortcuts
- Interactive mode selection
- Quick batch testing
- Instant results summary
- User-friendly shortcuts for common scenarios

**Usage Examples:**
```bash
# Quick account takeover check
python quick_investigation_launcher.py takeover user_123

# Payment fraud with live APIs (requires approval)
python quick_investigation_launcher.py payment user_456 --live

# High risk assessment
python quick_investigation_launcher.py high user_789

# Interactive mode
python quick_investigation_launcher.py --interactive

# Quick batch of common scenarios
python quick_investigation_launcher.py --quick-batch

# List all shortcuts
python quick_investigation_launcher.py --shortcuts
```

**Available Shortcuts:**
- **Fraud Scenarios:** `takeover`, `payment`, `identity`, `brute`, `travel`, `stuffing`, `laundering`, `device`
- **Risk Levels:** `low`, `med`, `high`, `crit`
- **Special:** `demo`, `test`, `quick`

### 4. CSV Scenario Generator (`csv_scenario_generator.py`)
**Generate CSV files with investigation scenarios for batch testing**

### 5. **🔗 Integration Runner (`integration_runner.py`)**
**RECOMMENDED: Bridge between scenario templates and existing infrastructure**

**Features:**
- Validates existing infrastructure components
- Generates proper bash script arguments for scenarios
- Integrates scenario templates with existing monitoring
- Maintains compatibility with all existing features

### 6. **🚀 Scenario Runner (`run_scenario.sh`)**
**RECOMMENDED: Easy-to-use wrapper for existing infrastructure**

**Features:**
- Simple interface for running scenarios via existing infrastructure
- Uses proven `run-autonomous-investigation.sh` orchestration
- Maintains all existing monitoring and reporting capabilities
- Provides scenario-based configuration

**Features:**
- Generate realistic test datasets
- Configurable scenario types and risk distributions
- Data validation and quality checks
- Multiple export formats (CSV, JSON)
- Metadata inclusion for tracking

**Usage Examples:**
```bash
# Generate 100 mixed scenarios
python csv_scenario_generator.py --count 100 --output scenarios.csv

# Generate specific scenario types
python csv_scenario_generator.py --scenario-types account_takeover,payment_fraud --count 50

# Risk-stratified dataset
python csv_scenario_generator.py --risk-distribution low:20,medium:50,high:25,critical:5 --count 1000

# Generate with metadata and validation
python csv_scenario_generator.py --count 500 --format both --metadata --validate
```

## 🚀 Quick Start Guide

### 🔗 RECOMMENDED: Use Existing Infrastructure Integration

**The easiest way to run investigations is using the new scenario wrapper with existing infrastructure:**

```bash
# Simple account takeover check (uses existing infrastructure)
./scripts/investigation/run_scenario.sh account-takeover

# With specific entity ID
./scripts/investigation/run_scenario.sh payment-fraud --entity-id user_123

# List all available scenarios
./scripts/investigation/run_scenario.sh --list

# Validate infrastructure
./scripts/investigation/run_scenario.sh --validate
```

### 📋 Alternative: Direct Scenario Scripts

```bash
# Using standalone scenario runner (limited functionality)
python scripts/investigation/scenario_investigation_runner.py --scenario account-takeover --mode mock

# Quick launcher with shortcuts
python scripts/investigation/quick_investigation_launcher.py takeover user_123
```

### 2. Generate Test Data and Run Batch
```bash
# Generate test scenarios
python csv_scenario_generator.py --count 50 --output test_data.csv --validate

# Run batch investigation
python batch_investigation_runner.py --csv-file test_data.csv --concurrent 3 --html-report
```

### 3. Interactive Investigation
```bash
# Launch interactive mode
python quick_investigation_launcher.py --interactive
```

## ⚠️ Important Safety Notes

### Mock vs Live Mode
- **Mock Mode** (default): Uses test mode with no real API costs
- **Live Mode**: Uses real Anthropic APIs and **costs real money**
- Live mode requires explicit approval: `I APPROVE LIVE MODE COSTS`

### Live Mode Cost Estimates
- Single investigation: ~$0.15-0.25
- Batch of 100: ~$15-25
- Always verify approval prompts before proceeding

## 📊 Report Generation

### HTML Reports
All scripts support HTML report generation with:
- Interactive charts and visualizations
- Performance metrics and analytics
- Risk assessment summaries
- Detailed technical information
- Mobile-responsive design

### Report Types
1. **Single Investigation Reports** - Detailed analysis of one investigation
2. **Batch Reports** - Comprehensive analytics across multiple investigations
3. **Performance Reports** - Execution metrics and throughput analysis

## 🔧 Integration with Olorin

### Dependencies
These scripts integrate with:
- `unified_autonomous_test_runner.py` - Core test execution engine
- `real_investigation_scenarios.py` - Scenario data generation
- Olorin's autonomous agent system
- WebSocket monitoring and progress tracking

### File Structure
```
scripts/investigation/
├── scenario_investigation_runner.py    # Main scenario runner
├── batch_investigation_runner.py       # Batch processing
├── quick_investigation_launcher.py     # Quick launcher
├── csv_scenario_generator.py          # Data generation
├── README.md                          # This documentation
└── reports/                           # Generated reports
    ├── investigation_*.html           # Single investigation reports  
    ├── batch_report_*.html            # Batch reports
    └── *.json                         # Raw data exports
```

## 🎯 Use Cases

### Development & Testing
```bash
# Quick development test
python quick_investigation_launcher.py test user_dev

# Comprehensive testing suite
python batch_investigation_runner.py --all-scenarios --mode mock --html-report
```

### Performance Benchmarking
```bash
# Generate large test dataset
python csv_scenario_generator.py --count 1000 --output benchmark_data.csv

# High-throughput benchmark
python batch_investigation_runner.py --csv-file benchmark_data.csv --concurrent 10 --analytics
```

### Security Validation
```bash
# Critical risk scenarios
python scenario_investigation_runner.py --custom --entity-id suspicious_user --risk-level critical --scenario-type money_laundering

# Comprehensive security audit
python batch_investigation_runner.py --scenario-types money_laundering,identity_fraud --count 20 --html-report
```

### Demo & Presentation
```bash
# Interactive demo
python quick_investigation_launcher.py --interactive

# Quick demonstration batch
python quick_investigation_launcher.py --quick-batch
```

## 🔍 Troubleshooting

### Common Issues
1. **Import Errors**: Ensure you're running from the correct directory with proper Python path
2. **Live Mode Costs**: Always use mock mode for testing unless explicitly approved
3. **Concurrent Workers**: Reduce `--concurrent` value if experiencing resource issues
4. **Report Generation**: Check output directory permissions for HTML report creation

### Debug Mode
Add `--verbose` to any command for detailed logging and error information.

### Log Files
Check `app/service/logging` for detailed execution logs and error traces.

## 📈 Performance Metrics

### Typical Execution Times (Mock Mode)
- Single investigation: 2-8 seconds
- Batch of 10: 15-45 seconds (sequential)
- Batch of 10: 8-15 seconds (3 workers)
- Report generation: 1-3 seconds

### Throughput Estimates
- Sequential: ~120 investigations/hour
- Concurrent (3 workers): ~200-300 investigations/hour
- High concurrency (5+ workers): ~400+ investigations/hour

## 🤝 Contributing

When adding new scenarios or features:
1. Follow existing naming conventions
2. Include comprehensive documentation
3. Add validation and error handling
4. Test in both mock and live modes
5. Update this README with new capabilities

---

**Author:** Gil Klainert  
**Created:** 2025-09-08  
**Version:** 1.0.0