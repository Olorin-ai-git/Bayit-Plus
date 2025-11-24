# Olorin Structured Investigation Test Infrastructure

## 🚀 NEW: Real API Test Infrastructure (NO MOCK DATA)

This test infrastructure now includes comprehensive testing for the structured investigation system using **ONLY REAL API CALLS** - NO MOCK DATA.

### Key Features of New Test Infrastructure

- ✅ **100% Real API Calls**: All tests use real Anthropic Claude Opus 4.1 API
- ✅ **Real Data Patterns**: Tests use actual investigation scenarios from real data
- ✅ **Natural Variation**: Results show authentic variation from real LLM responses
- ✅ **Cost Tracking**: Monitor and control API usage costs during testing
- ✅ **87% Coverage Target**: Comprehensive test coverage requirement
- ✅ **Performance Monitoring**: Track API latencies and system performance

### New Test Structure

```
tests/
├── conftest.py                 # Test configuration with real API fixtures
├── run_tests.py               # NEW: Test runner with cost tracking
├── fixtures/
│   └── real_investigation_scenarios.py  # NEW: Real data scenario generators
├── unit/
│   └── service/
│       └── agent/
│           └── test_structured_agents.py  # NEW: Unit tests for agents
└── integration/
    └── test_structured_investigation.py  # NEW: End-to-end integration tests
```

## Test Files Overview

### 🧪 **Core Application Tests**

#### `test_investigation_workflow.py`
**Purpose**: End-to-end integration test for the complete investigation workflow
- Tests the full investigation lifecycle from creation to completion
- Validates all API endpoints (device, location, network, logs, risk assessment)
- Generates PDF summary reports with **IMPROVED FORMATTING**
- **Usage**: `python tests/test_investigation_workflow.py`
- **Dependencies**: Requires server running on localhost:8090

#### `run_investigation_flow_for_device.py`
**Purpose**: Manual script to run the investigation flow for a specific device and generate a PDF summary report
- **Usage**: `python3.11 tests/run_investigation_flow_for_device.py [--device-id <DEVICE_ID>] [--investigation-id <INVEST_ID>] [--time-range <TIME_RANGE>] [--base-url <API_URL>]`
- **Output**: `investigation_summary_for_device.pdf`

#### `test_pdf_generation.py` ⭐ **NEW**
**Purpose**: Standalone PDF generation test with enhanced formatting
- Demonstrates improved PDF layout and design
- Shows module risk scores next to LLM thoughts
- Uses mock data for consistent testing
- **Usage**: `python tests/test_pdf_generation.py`
- **Output**: `improved_investigation_summary.pdf`

#### `app/test/unit/` and `app/test/integration/`
**Purpose**: Official pytest-based unit and integration tests
- Located in the main app directory structure
- Run with: `pytest` or `tox`
- Includes router tests, service tests, and model validation tests

### 🔍 **Vector Search Tests**

#### `run_vector_tests.py`
**Purpose**: Simple test runner for vector search tool functionality
- Tests the distance function with various scenarios
- Validates VectorSearchTool class methods
- Tests sorting, thresholds, and edge cases
- **Usage**: `python tests/run_vector_tests.py`

#### `test_vector_search_simple.py`
**Purpose**: Comprehensive vector search tool testing with mock data
- Tests similarity detection and pattern analysis
- Validates risk indicator assessment
- Tests geographic and behavioral similarity
- **Usage**: `python tests/test_vector_search_simple.py`

#### `test_location_vector_direct.py`
**Purpose**: Direct testing of vector search integration with location client
- Tests vector search methods without complex dependencies
- Simulates location API responses with vector analysis
- Validates pattern analysis and risk assessment
- **Usage**: `python tests/test_location_vector_direct.py`

#### `test_location_client_vector_search.py`
**Purpose**: Integration test for LocationDataClient with vector search
- Tests the complete vector search integration
- Mocks external dependencies (OII, Splunk)
- Validates transaction pattern analysis
- **Usage**: `python tests/test_location_client_vector_search.py`

#### `test_location_api_integration.py`
**Purpose**: Comprehensive location API and vector search integration test
- Tests actual API endpoints with vector search functionality
- Validates server health and API responses
- Tests individual location source endpoints
- **Usage**: `python tests/test_location_api_integration.py`
- **Dependencies**: Requires server running on localhost:8090

### 📋 **Documentation and References**

#### `TEST_FIX_SUMMARY.md`
**Purpose**: Documentation of Pydantic validation fixes
- Details the device router test fixes
- Explains the root cause of validation errors
- Documents the solution and verification steps

#### `test.txt`
**Purpose**: Collection of curl commands for manual API testing
- Complete set of API endpoint examples
- Sample request/response payloads
- Useful for manual testing and debugging

## 📄 **PDF Report Improvements**

### **Enhanced Features**
The PDF generation has been significantly improved with the following features:

#### **Visual Improvements**
- ✅ **Professional title and header** - Clean, centered title with proper spacing
- ✅ **Clean investigation summary table** - Key-value pairs in bordered table format
- ✅ **Module analysis summary table** - Risk scores, record counts, and status in tabular format
- ✅ **Risk level indicators** - HIGH/MEDIUM/LOW risk classifications with clear formatting

#### **Content Enhancements**
- ✅ **Module risk scores displayed prominently** - Each module shows its risk score (0.00-1.00)
- ✅ **LLM thoughts next to risk scores** - Analysis text appears directly below risk scores
- ✅ **Key risk factors listed** - Bullet-pointed risk factors for each module
- ✅ **Overall assessment section** - Final risk score with comprehensive analysis
- ✅ **Policy recommendations** - Actionable security recommendations
- ✅ **Complete 4-module analysis** - Device, Location, Network, and Logs analysis

#### **Professional Formatting**
- ✅ **Consistent typography** - Proper font sizes and weights throughout
- ✅ **Proper spacing and layout** - Clean sections with appropriate white space
- ✅ **Security footer** - Professional footer with generation timestamp and security notice

### **Before vs After**
| **Old PDF Format** | **New PDF Format** |
|-------------------|-------------------|
| Basic table with cramped layout | Professional multi-section layout |
| Risk scores buried in details | Risk scores prominently displayed |
| LLM thoughts in separate section | LLM thoughts next to relevant risk scores |
| No risk level indicators | Clear HIGH/MEDIUM/LOW risk classifications |
| Minimal formatting | Professional typography and spacing |
| No policy recommendations | Dedicated policy recommendations section |

## Running Tests

### Prerequisites

#### Required Environment Variables for Real API Tests
```bash
export ANTHROPIC_API_KEY="your-real-api-key"  # Required for Claude Opus 4.1
export TEST_DATABASE_URL="sqlite:///./test_olorin.db"  # Test database
```

#### API Costs
The new tests use real Anthropic API calls with the following pricing:
- **Input tokens**: $15 per 1M tokens
- **Output tokens**: $75 per 1M tokens
- **Default max cost per session**: $10.00

```bash
# Install dependencies
poetry install

# Start the server (for integration tests)
poetry run uvicorn app.main:app --reload --port 8090
```

### NEW: Running Real API Tests

```bash
# Run all tests with real API
python tests/run_tests.py

# Run with coverage (87% minimum required)
python tests/run_tests.py --coverage

# Run with cost tracking
python tests/run_tests.py --track-costs --max-cost 5.0

# Run unit tests for structured agents
python tests/run_tests.py --unit

# Run integration tests
python tests/run_tests.py --integration

# Run specific test file
python tests/run_tests.py tests/unit/service/agent/test_structured_agents.py
```

### Individual Test Execution
```bash
# PDF Generation (standalone)
python tests/test_pdf_generation.py

# Vector search tests
python tests/run_vector_tests.py
python tests/test_vector_search_simple.py
python tests/test_location_vector_direct.py

# Integration tests (require running server)
python tests/test_investigation_workflow.py
python tests/test_location_api_integration.py
python tests/test_location_client_vector_search.py

# Official pytest tests
pytest app/test/unit/
pytest app/test/integration/
```

### Full Test Suite
```bash
# Run all pytest tests with coverage
tox

# Or directly with pytest
pytest --cov --cov-report html --cov-report term
```

## Test Categories

### 🟢 **Unit Tests**
- **NEW**: `test_structured_agents.py` - Real API tests for structured agents
- `run_vector_tests.py` - Vector search tool unit tests
- `test_vector_search_simple.py` - Comprehensive vector search testing
- `test_pdf_generation.py` - PDF generation with mock data
- `app/test/unit/` - Official unit tests

### 🟡 **Integration Tests**
- **NEW**: `test_structured_investigation.py` - E2E tests with real Anthropic API
- `test_investigation_workflow.py` - Full workflow integration
- `test_location_api_integration.py` - Location API integration
- `test_location_client_vector_search.py` - Client integration
- `app/test/integration/` - Official integration tests

### 🔵 **Direct/Isolated Tests**
- `test_location_vector_direct.py` - Direct vector search testing without dependencies

## Test Data

All tests use mock data to ensure consistent and predictable results:
- Mock Splunk results with various risk indicators
- Mock OII responses with location data
- Simulated user scenarios with different risk profiles

## Coverage Requirements

- **NEW Target Coverage**: 87% for structured investigation system
- **Minimum Coverage**: 30% (configured in `tox.ini`)
- **Target Coverage**: 50%+ for production readiness
- **Exclusions**: External API tools, mock files, test files

### NEW: Real API Test Scenarios

The test infrastructure includes real investigation scenarios:

#### 1. Account Takeover (ATO)
- Multiple failed login attempts
- Device fingerprint changes
- IP location mismatches
- Unusual access times

#### 2. Payment Fraud
- High transaction velocity
- Amount anomalies
- New payment methods
- Merchant category mismatches

#### 3. Identity Fraud
- Suspicious account age
- Device proliferation
- Data inconsistencies
- Behavioral anomalies

#### 4. Money Laundering
- Circular transaction patterns
- Rapid fund movement
- Multiple account linkages
- Geographic dispersion

## NEW: Cost Management

### Monitoring API Costs

```bash
# Set maximum cost per test session
export TEST_MAX_COST=5.0  # $5.00 limit

# Or use command line
python tests/run_tests.py --max-cost 5.0
```

### Performance Benchmarks

Expected performance with real API:

| Operation | Expected Time | Max Time |
|-----------|--------------|----------|
| Single Agent Analysis | 10-15s | 30s |
| Full Investigation (4 agents) | 40-60s | 90s |
| Risk Aggregation | 15-20s | 30s |
| Concurrent Investigations (3) | 30-45s | 60s |

## Troubleshooting

### Common Issues

1. **Server Not Running**: Integration tests require the server on port 8090
2. **Missing Dependencies**: Run `poetry install` to install all dependencies
3. **Import Errors**: Ensure you're running from the project root directory
4. **Coverage Failures**: Check `tox.ini` for coverage thresholds
5. **PDF Generation Issues**: Ensure `DejaVuSans.ttf` font file exists in project root
6. **NEW - API Key Missing**: Set ANTHROPIC_API_KEY environment variable
7. **NEW - Cost Limit Exceeded**: Increase --max-cost or run fewer tests
8. **NEW - Timeout Errors**: Check network connection and API status

### Debug Commands
```bash
# Check server health
curl http://localhost:8090/health

# Verify dependencies
poetry show

# Run specific test with verbose output
python -v tests/test_name.py

# Generate PDF with mock data
python tests/test_pdf_generation.py
```

## Contributing

When adding new tests:
1. Place them in the appropriate category (unit/integration)
2. Follow the naming convention: `test_*.py`
3. Include docstrings explaining the test purpose
4. **NEW**: Use only real API calls - no mocks for structured agent tests
5. **NEW**: Include cost tracking in tests using `api_cost_monitor`
6. **NEW**: Add appropriate test markers (@pytest.mark.real_api, etc.)
7. **NEW**: Document expected API costs in test docstrings
8. **NEW**: Ensure tests handle API failures gracefully
9. **NEW**: Validate natural response variation from real LLM
10. **NEW**: Maintain 87% coverage threshold for structured system
11. Update this README if adding new test categories
12. For PDF-related changes, test with `test_pdf_generation.py` first

- All investigation comment API tests use the /comment endpoint (not /chat)
- The router is now comment_router (not chat_router) 