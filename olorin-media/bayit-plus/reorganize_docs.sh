#!/bin/bash
# Documentation Reorganization Script
# Moves 88 root-level markdown files to appropriate subdirectories
# Part of Phase 1.1: Root Directory Cleanup

set -e

echo "Starting documentation reorganization..."
echo "Moving 88 root-level files to appropriate subdirectories"
echo ""

# Create necessary directories
mkdir -p docs/archive/{project-management,implementation-summaries,security-reviews,deployment-guides,phase-reports,plans}
mkdir -p docs/templates

# ACCESSIBILITY - Architecture & Implementation
echo "Moving accessibility documentation..."
mv ACCESSIBILITY_ARCHITECTURE.md docs/architecture/ 2>/dev/null || true
mv ACCESSIBILITY_IMPLEMENTATION_SUMMARY.md docs/implementation/ 2>/dev/null || true

# ADMIN & GUIDES
echo "Moving admin and guide documentation..."
mv ADMIN_CLEANUP_QUICK_START.md docs/guides/ 2>/dev/null || true

# ANDROID - Implementation summaries (archive old phase reports)
echo "Moving Android documentation..."
mv ANDROID_IMPLEMENTATION_STATUS.md docs/implementation/ 2>/dev/null || true
mv ANDROID_PHASE2_READINESS.md docs/archive/phase-reports/ 2>/dev/null || true
mv ANDROID_PROGRESS_REPORT.md docs/archive/phase-reports/ 2>/dev/null || true
mv ANDROID_SESSION_SUMMARY.md docs/archive/implementation-summaries/ 2>/dev/null || true
mv ANDROID_TEST_SUMMARY.md docs/testing/ 2>/dev/null || true

# APP STORE - Deployment guides
echo "Moving App Store documentation..."
mv APP_STORE_METADATA.md docs/deployment/ 2>/dev/null || true
mv APPSTORE_IMPLEMENTATION_SUMMARY.md docs/implementation/ 2>/dev/null || true
mv APPSTORE_QUICKREF.md docs/guides/ 2>/dev/null || true
mv APPSTORE_UPLOAD_GUIDE.md docs/deployment/ 2>/dev/null || true

# AUDIBLE - Reviews and security audits
echo "Moving Audible documentation..."
mv AUDIBLE_API_DOCUMENTATION_SUMMARY.md docs/reviews/ 2>/dev/null || true
mv AUDIBLE_API_REVIEW_SUMMARY.md docs/reviews/ 2>/dev/null || true
mv AUDIBLE_INTEGRATION_IMPLEMENTATION.md docs/implementation/ 2>/dev/null || true
mv AUDIBLE_OAUTH_FIXES_COMPLETE.md docs/implementation/ 2>/dev/null || true
mv AUDIBLE_OAUTH_FIXES.md docs/security/ 2>/dev/null || true
mv AUDIBLE_OAUTH_SECURITY_AUDIT.md docs/security/ 2>/dev/null || true
mv AUDIBLE_OAUTH_SECURITY_REVIEW.md docs/security/ 2>/dev/null || true

# AUDIOBOOK - Implementation phases (archive old phases, keep current)
echo "Moving Audiobook documentation..."
mv AUDIOBOOK_IMPLEMENTATION_COMPLETE.md docs/implementation/ 2>/dev/null || true
mv AUDIOBOOK_IMPLEMENTATION_PROGRESS_PHASE_4.md docs/archive/phase-reports/ 2>/dev/null || true
mv AUDIOBOOK_IMPLEMENTATION_PROGRESS_PHASE_5.md docs/archive/phase-reports/ 2>/dev/null || true
mv AUDIOBOOK_IMPLEMENTATION_PROGRESS_PHASE_6.md docs/archive/phase-reports/ 2>/dev/null || true
mv AUDIOBOOK_IMPLEMENTATION_PROGRESS_PHASE_7.md docs/archive/phase-reports/ 2>/dev/null || true
mv AUDIOBOOK_IMPLEMENTATION_PROGRESS.md docs/archive/implementation-summaries/ 2>/dev/null || true
mv AUDIOBOOKS_COMPLETE_STATUS.md docs/implementation/ 2>/dev/null || true
mv AUDIOBOOKS_PHASES_1_2_3_COMPLETE.md docs/archive/phase-reports/ 2>/dev/null || true
mv AUDIOBOOKS_SECURITY_REVIEW.md docs/security/ 2>/dev/null || true

# BETA 500 - Implementation progress
echo "Moving Beta 500 documentation..."
mv BETA_500_IMPLEMENTATION_PROGRESS.md docs/implementation/ 2>/dev/null || true
mv BETA_500_REVISED_PLAN.md docs/plans/ 2>/dev/null || true

# BUILD & FIXES
echo "Moving build and fix documentation..."
mv BUILD_FIX_SUMMARY.md docs/implementation/ 2>/dev/null || true

# Keep CHANGELOG in docs root
echo "Moving changelog..."
mv CHANGELOG.md docs/ 2>/dev/null || true

# CLAUDE.md stays in root (project instructions)

# COST DASHBOARD - Deployment
echo "Moving cost dashboard documentation..."
mv COST_DASHBOARD_DEPLOYMENT_CHECKLIST.md docs/deployment/ 2>/dev/null || true
mv COST_DASHBOARD_FINAL_SUMMARY.md docs/implementation/ 2>/dev/null || true
mv COST_DASHBOARD_VERIFICATION.md docs/deployment/ 2>/dev/null || true

# DEBUG & DEPLOYMENT
echo "Moving debug and deployment documentation..."
mv DEBUG_PLAYBACK_401.md docs/troubleshooting/ 2>/dev/null || true
mv DEPLOYMENT_VERIFICATION_2026-01-28.md docs/deployment/ 2>/dev/null || true
mv DEPLOYMENT.md docs/deployment/ 2>/dev/null || true

# E2E TESTING
echo "Moving E2E testing documentation..."
mv E2E_TEST_EXECUTION_GUIDE.md docs/testing/ 2>/dev/null || true
mv EMULATOR_SETUP_GUIDE.md docs/guides/ 2>/dev/null || true

# EXECUTIVE SUMMARY
echo "Moving executive summaries..."
mv EXECUTIVE_SUMMARY.md docs/archive/project-management/ 2>/dev/null || true

# FIXES
echo "Moving fix documentation..."
mv FIXES_2026-01-28.md docs/implementation/ 2>/dev/null || true

# GEOLOCATION
echo "Moving geolocation documentation..."
mv GEOLOCATION_IMPLEMENTATION_COMPLETE.md docs/implementation/ 2>/dev/null || true

# GLASS COMPONENTS
echo "Moving Glass UI documentation..."
mv GLASS_EMPTY_STATE_IMPLEMENTATION_SUMMARY.md docs/implementation/ 2>/dev/null || true

# GOOGLE PLAY
echo "Moving Google Play documentation..."
mv GOOGLEPLAY_UPLOAD_GUIDE.md docs/deployment/ 2>/dev/null || true

# ICON SYSTEM
echo "Moving icon system documentation..."
mv ICON_SYSTEM_CHECKLIST.md docs/technical/ 2>/dev/null || true
mv ICON_SYSTEM_IMPLEMENTATION.md docs/implementation/ 2>/dev/null || true

# IMPLEMENTATION DOCS
echo "Moving implementation documentation..."
mv IMPLEMENTATION_CHECKLIST.md docs/guides/ 2>/dev/null || true
mv IMPLEMENTATION_COMPLETE.md docs/archive/implementation-summaries/ 2>/dev/null || true
mv IMPLEMENTATION_SUMMARY.md docs/archive/implementation-summaries/ 2>/dev/null || true

# LIVE TRIVIA
echo "Moving live trivia documentation..."
mv LIVE_TRIVIA_IMPLEMENTATION_STATUS.md docs/implementation/ 2>/dev/null || true
mv LIVE_TRIVIA_PRODUCTION_READY.md docs/deployment/ 2>/dev/null || true

# LOCATION FEATURE
echo "Moving location feature documentation..."
mv LOCATION_FEATURE_DEPLOYED.md docs/deployment/ 2>/dev/null || true

# PHASE DELIVERABLES (archive)
echo "Moving phase deliverables..."
mv PHASE_2_DELIVERABLES.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE_3_READY_TO_START.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE_5_MOBILE_APP_COMPLETE.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE_6_TVOS_APP_COMPLETE.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE_7_LOCALIZATION_COMPLETE.md docs/archive/phase-reports/ 2>/dev/null || true

# PHASE 2 PROGRESS (archive)
echo "Moving Phase 2 documentation..."
mv PHASE2_1_COMPLETION_SUMMARY.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_1_PROGRESS.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_2_PROGRESS.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_3_PROGRESS.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_4_PROGRESS.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_COMPLETION_SUMMARY.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE2_STATUS_UPDATE.md docs/archive/phase-reports/ 2>/dev/null || true

# PHASE 3 & 4 (archive)
echo "Moving Phase 3 & 4 documentation..."
mv PHASE3_COMPLETION_SUMMARY.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE4_COMPLETION_SUMMARY.md docs/archive/phase-reports/ 2>/dev/null || true
mv PHASE4_E2E_EXECUTION_STATUS.md docs/archive/phase-reports/ 2>/dev/null || true

# PHASE 5 LAUNCH PLAN
echo "Moving Phase 5 documentation..."
mv PHASE5_LAUNCH_PLAN.md docs/plans/ 2>/dev/null || true

# PLAYBACK
echo "Moving playback documentation..."
mv PLAYBACK_SESSION_RETRY_IMPLEMENTATION.md docs/implementation/ 2>/dev/null || true

# PRODUCTION
echo "Moving production documentation..."
mv PRODUCTION_DEPLOYMENT_READY.md docs/deployment/ 2>/dev/null || true

# PROJECT STATUS (archive)
echo "Moving project status documentation..."
mv PROJECT_STATUS_COMPLETE.md docs/archive/project-management/ 2>/dev/null || true
mv PROJECT_STATUS_PHASE4_COMPLETE.md docs/archive/project-management/ 2>/dev/null || true

# REMEDIATION
echo "Moving remediation documentation..."
mv REMEDIATION_ROADMAP.md docs/plans/ 2>/dev/null || true

# SECRETS MIGRATION
echo "Moving secrets documentation..."
mv SECRETS_MIGRATION_CHECKLIST.md docs/deployment/ 2>/dev/null || true

# SECURITY ASSESSMENTS
echo "Moving security documentation..."
mv SECURITY_ASSESSMENT_INDEX.md docs/security/ 2>/dev/null || true
mv SECURITY_ASSESSMENT_LOCATION_FEATURE.md docs/security/ 2>/dev/null || true
mv SECURITY_ASSESSMENT_SUMMARY.md docs/security/ 2>/dev/null || true
mv SECURITY_AUDIT_SUMMARY.md docs/security/ 2>/dev/null || true
mv SECURITY_REMEDIATION_PLAN.md docs/security/ 2>/dev/null || true
mv SECURITY_REVIEW_SUMMARY.md docs/security/ 2>/dev/null || true

# SESSION SUMMARIES (archive)
echo "Moving session summaries..."
mv SESSION_SUMMARY_2026-01-28.md docs/archive/implementation-summaries/ 2>/dev/null || true
mv SESSION3_EXECUTIVE_SUMMARY.md docs/archive/implementation-summaries/ 2>/dev/null || true

# TESTFLIGHT
echo "Moving TestFlight documentation..."
mv TESTFLIGHT_READY.md docs/deployment/ 2>/dev/null || true
mv TESTFLIGHT_STATUS.md docs/deployment/ 2>/dev/null || true

# THREAT MODEL
echo "Moving threat model documentation..."
mv THREAT_MODEL_LOCATION_FEATURE.md docs/security/ 2>/dev/null || true

# UI LAYOUTS
echo "Moving UI documentation..."
mv UI_SCREEN_LAYOUTS.md docs/technical/ 2>/dev/null || true

echo ""
echo "Reorganization complete!"
echo ""
echo "Summary:"
echo "- Moved architecture docs to docs/architecture/"
echo "- Moved implementation docs to docs/implementation/"
echo "- Moved security docs to docs/security/"
echo "- Moved deployment docs to docs/deployment/"
echo "- Moved testing docs to docs/testing/"
echo "- Moved guides to docs/guides/"
echo "- Moved plans to docs/plans/"
echo "- Archived old phase reports to docs/archive/"
echo "- Moved CHANGELOG.md to docs/"
echo "- Kept CLAUDE.md in root (project instructions)"
echo ""
echo "Next steps:"
echo "1. Run: git status (to verify moves)"
echo "2. Update docs/README.md index"
echo "3. Update docs/DOCUMENTATION_INDEX.md"
echo "4. Verify zero root-level .md files (except CLAUDE.md)"
