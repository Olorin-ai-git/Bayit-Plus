#!/bin/bash

echo "🎉 FINAL DATA COMPLETENESS VERIFICATION"
echo "======================================="
echo ""
echo "Running comprehensive verification of all populated data..."
echo ""

# Run the verification script in live mode
USE_SNOWFLAKE=true poetry run python scripts/verify_all_columns_data.py

echo ""
echo "✅ Verification complete!"
echo ""
echo "Expected results after successful population:"
echo "- Total columns: 333"
echo "- Columns with 100% completeness: 52 (up from 14)"
echo "- Average completeness: ~95% (up from 26.92%)"
echo "- Issues found: 0 (down from 38)"
echo ""
echo "🚀 Data population successful if all 38 previously missing columns now show 100% completeness!"