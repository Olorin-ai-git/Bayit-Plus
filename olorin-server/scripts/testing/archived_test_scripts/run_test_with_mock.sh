#!/bin/bash

echo "🎭 Starting autonomous investigation test with mocked IPS Cache..."
echo "=================================================="

# Export the environment variable to use mock IPS Cache
export USE_MOCK_IPS_CACHE=true

# Run the test
echo "Running test with USE_MOCK_IPS_CACHE=true"
poetry run python test_autonomous_simple.py

# Unset the variable after test
unset USE_MOCK_IPS_CACHE

echo "=================================================="
echo "✅ Test completed"