# Tests Directory

This directory contains all test files for the Olorin application, including unit tests, integration tests, and test utilities.

## Test Files Overview

### 🧪 **Core Application Tests**

#### `test_investigation_workflow.py`
**Purpose**: End-to-end integration test for the complete investigation workflow
- Tests the full investigation lifecycle from creation to completion
- Validates all API endpoints (device, location, network, logs, risk assessment)
- Generates PDF summary reports with **IMPROVED FORMATTING**
- **Usage**: `python tests/test_investigation_workflow.py`
- **Dependencies**: Requires server running on localhost:8000

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
- **Dependencies**: Requires server running on localhost:8000

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
```bash
# Install dependencies
poetry install

# Start the server (for integration tests)
poetry run uvicorn app.main:app --reload --port 8000
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
- `run_vector_tests.py` - Vector search tool unit tests
- `test_vector_search_simple.py` - Comprehensive vector search testing
- `test_pdf_generation.py` - PDF generation with mock data
- `app/test/unit/` - Official unit tests

### 🟡 **Integration Tests**
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

- **Minimum Coverage**: 30% (configured in `tox.ini`)
- **Target Coverage**: 50%+ for production readiness
- **Exclusions**: External API tools, mock files, test files

## Troubleshooting

### Common Issues

1. **Server Not Running**: Integration tests require the server on port 8000
2. **Missing Dependencies**: Run `poetry install` to install all dependencies
3. **Import Errors**: Ensure you're running from the project root directory
4. **Coverage Failures**: Check `tox.ini` for coverage thresholds
5. **PDF Generation Issues**: Ensure `DejaVuSans.ttf` font file exists in project root

### Debug Commands
```bash
# Check server health
curl http://localhost:8000/health

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
4. Add mock data if needed
5. Update this README if adding new test categories
6. For PDF-related changes, test with `test_pdf_generation.py` first

- All investigation comment API tests use the /comment endpoint (not /chat)
- The router is now comment_router (not chat_router) 