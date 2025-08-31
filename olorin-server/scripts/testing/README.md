# Autonomous Investigation Test Scripts

This directory contains scripts for running autonomous investigation tests that automatically handle API key retrieval from Firebase secrets.

## Available Scripts

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