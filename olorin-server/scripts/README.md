# Scripts Directory Organization

This directory contains organized Python scripts for the Olorin fraud detection platform. All scripts have been organized into logical subdirectories for better maintainability.

## Directory Structure

### 🔧 debugging/
Scripts for system diagnostics, debugging, and troubleshooting:
- `verify_async_fix.py` - Verification script for async/await fixes in agent execution
- `debug_agent_tools.py` - Debug script for agent tools and registry functionality  
- `debug_performance_metrics.py` - Performance analysis and metrics collection
- `diagnose_secrets.py` - Firebase Secret Manager diagnostics
- `check_missing_secrets.py` - Identifies missing secrets from Firebase Secret Manager

### 📊 reporting/
Scripts for report generation and test data creation:
<<<<<<< HEAD
- `html_report_generator.py` - HTML report generation for autonomous investigations
=======
- `html_report_generator.py` - HTML report generation for structured investigations
>>>>>>> 001-modify-analyzer-method
- `create_test_investigation.py` - Creates sample investigation data for testing

### 🖥️ server/
Scripts for server deployment and application entry points:
- `main.py` - Simple FastAPI app for Firebase App Hosting deployment
- `simple_main.py` - Minimal FastAPI backend version

### 🧪 testing/
<<<<<<< HEAD
Scripts for autonomous investigation testing:
- `unified_autonomous_test_runner.py` - Comprehensive test suite for investigations
=======
Scripts for structured investigation testing:
- `unified_structured_test_runner.py` - Comprehensive test suite for investigations
>>>>>>> 001-modify-analyzer-method
- `test_clean_graph.py` - Graph-based testing framework
- And other testing utilities...

### 🔍 investigation/
Scripts for running and managing investigations:
- Investigation automation scripts
- Entity analysis tools

### ⚡ performance/
Scripts for performance monitoring and optimization:
- Performance benchmarking tools
- Metrics collection utilities

### ✅ validation/
Scripts for data validation and verification:
- Schema validation tools
- Data integrity checks

## Migration Notes

The following scripts were moved from the root directory to maintain better organization:

**From root → debugging/**
- verify_async_fix.py
- debug_agent_tools.py  
- debug_performance_metrics.py
- diagnose_secrets.py
- check_missing_secrets.py

**From root → reporting/**
- html_report_generator.py
- create_test_investigation.py

**From root → server/**
- main.py
- simple_main.py

## Updated References

The following files have been updated to reference the new script locations:
- `Dockerfile` - Updated paths for main.py and simple_main.py
- `simple.Dockerfile` - Updated copy paths for server scripts
- `deployment/validate-deployment.sh` - Updated validation paths

## Usage

To run scripts from their new locations, use the full path:

```bash
# Debugging scripts
poetry run python scripts/debugging/check_missing_secrets.py
poetry run python scripts/debugging/diagnose_secrets.py

# Reporting scripts  
poetry run python scripts/reporting/html_report_generator.py

# Server scripts
python scripts/server/main.py
python scripts/server/simple_main.py

# Testing scripts
<<<<<<< HEAD
poetry run python scripts/testing/unified_autonomous_test_runner.py --help
=======
poetry run python scripts/testing/unified_structured_test_runner.py --help
>>>>>>> 001-modify-analyzer-method
```

## Benefits

1. **Better Organization**: Scripts are logically grouped by functionality
2. **Easier Maintenance**: Related scripts are located together
3. **Cleaner Root Directory**: Eliminates clutter from the main project root
4. **Improved Navigation**: Developers can quickly find relevant utilities
5. **Consistent Structure**: Follows standard project organization patterns