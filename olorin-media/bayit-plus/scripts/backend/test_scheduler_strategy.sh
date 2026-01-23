#!/bin/bash
# Test the New Scheduler Strategy Locally
# Simulates what Cloud Scheduler will do

set -e

cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════════╗"
echo "║   Test New Scheduler Strategy Locally        ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check if backend is running
if ! curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Backend is not running at http://localhost:8000"
    echo "   Start it first:"
    echo "   cd backend && poetry run uvicorn app.main:app --reload"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Menu
echo "Select test to run:"
echo ""
echo "  1. Weekly Comprehensive Scan (200 iterations, \$15 budget)"
echo "  2. Daily Maintenance Scan (100 iterations, \$5 budget)"
echo "  3. Both (Weekly first, then Daily)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔄 Running Weekly Comprehensive Scan..."
        echo ""
        poetry run python scripts/trigger_audit.py \
            --iterations 200 \
            --budget 15.0
        ;;
    2)
        echo ""
        echo "🔄 Running Daily Maintenance Scan..."
        echo ""
        poetry run python scripts/trigger_audit.py \
            --iterations 100 \
            --budget 5.0
        ;;
    3)
        echo ""
        echo "🔄 Running Weekly Comprehensive Scan first..."
        echo ""
        poetry run python scripts/trigger_audit.py \
            --iterations 200 \
            --budget 15.0
        
        echo ""
        echo "⏳ Waiting 10 seconds before daily scan..."
        sleep 10
        
        echo ""
        echo "🔄 Running Daily Maintenance Scan..."
        echo ""
        poetry run python scripts/trigger_audit.py \
            --iterations 100 \
            --budget 5.0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              ✅ TEST COMPLETE!                ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📊 View results:"
echo "   poetry run python scripts/view_audit_results.py"
echo ""
echo "📈 Check library status:"
echo "   poetry run python scripts/check_library_status.py"
echo ""
echo "🚀 If tests passed, deploy to Cloud Scheduler:"
echo "   ./scripts/update_cloud_schedulers.sh"
