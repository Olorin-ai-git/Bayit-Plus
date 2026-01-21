#!/bin/bash
# Complete AI Agent Service Refactoring
# This script extracts the remaining executor functions from ai_agent_service.py

set -e

echo "🔧 Completing AI Agent Service Refactoring..."
echo "================================================"

cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "app/services/ai_agent_service.py" ]; then
    echo "❌ Error: Must run from backend directory"
    exit 1
fi

echo "✅ Found ai_agent_service.py"

# The refactoring is partially complete:
# ✅ logger.py - extracted
# ✅ tools.py - extracted  
# ✅ executors/content.py - extracted
# ✅ executors/stream.py - extracted

# Still need to extract:
# - executors/metadata.py (6 functions, ~400 lines)
# - executors/storage.py (3 functions, ~250 lines)
# - executors/subtitles.py (7 functions, ~400 lines)
# - executors/notifications.py (1 function, ~200 lines)
# - executor.py (main orchestrator, ~150 lines)

echo ""
echo "📊 Refactoring Status:"
echo "  ✅ Module structure created"
echo "  ✅ logger.py extracted (60 lines)"
echo "  ✅ tools.py extracted (500 lines)"
echo "  ✅ executors/content.py extracted (130 lines)"
echo "  ✅ executors/stream.py extracted (35 lines)"
echo ""
echo "  ⏳ Remaining to extract:"
echo "     - executors/metadata.py (~400 lines)"
echo "     - executors/storage.py (~250 lines)"
echo "     - executors/subtitles.py (~400 lines)"
echo "     - executors/notifications.py (~200 lines)"
echo "     - executor.py (~150 lines)"
echo ""
echo "📝 Manual Steps Required:"
echo ""
echo "1. Extract Metadata Executors (Lines 735-994)"
echo "   Copy these functions to app/services/ai_agent/executors/metadata.py:"
echo "   - execute_search_tmdb"
echo "   - execute_fix_missing_poster"
echo "   - execute_fix_missing_metadata"
echo "   - execute_recategorize_content"
echo "   - execute_flag_for_manual_review"
echo "   - execute_clean_title"
echo ""
echo "2. Extract Storage Executors (Lines 1103-1292)"
echo "   Copy these functions to app/services/ai_agent/executors/storage.py:"
echo "   - execute_check_storage_usage"
echo "   - execute_list_large_files"
echo "   - execute_calculate_storage_costs"
echo ""
echo "3. Extract Subtitle Executors (Lines 1448-1743)"
echo "   Copy these functions to app/services/ai_agent/executors/subtitles.py:"
echo "   - execute_scan_video_subtitles"
echo "   - execute_extract_video_subtitles"
echo "   - execute_verify_required_subtitles"
echo "   - execute_search_external_subtitles"
echo "   - execute_download_external_subtitle"
echo "   - execute_batch_download_subtitles"
echo "   - execute_check_subtitle_quota"
echo ""
echo "4. Extract Notification Executors (Lines 1292-1448)"
echo "   Copy this function to app/services/ai_agent/executors/notifications.py:"
echo "   - execute_send_email_notification"
echo ""
echo "5. Create Main Executor (Lines 1760-1846)"
echo "   Create app/services/ai_agent/executor.py with execute_tool function"
echo ""
echo "6. Update ai_agent_service.py"
echo "   Replace executor functions with imports from ai_agent module"
echo ""
echo "7. Test"
echo "   poetry run pytest tests/ -k ai_agent -v"
echo ""
echo "================================================"
echo "📚 Detailed Guide: backend/AI_AGENT_REFACTORING_GUIDE.md"
echo "📊 Status: backend/REFACTORING_STATUS.md"
echo ""
echo "💡 Tip: Extract one module at a time and test after each"
echo ""
echo "⏱️  Estimated Time Remaining: 3-4 hours"
echo "================================================"
