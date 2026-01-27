#!/usr/bin/env bash
# =============================================================================
# CV Plus Platform Help System
# =============================================================================
#
# Purpose: Display help specific to CV Plus resume builder platform
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED=$'\033[0;31m'
readonly GREEN=$'\033[0;32m'
readonly YELLOW=$'\033[1;33m'
readonly BLUE=$'\033[0;34m'
readonly CYAN=$'\033[0;36m'
readonly MAGENTA=$'\033[0;35m'
readonly BOLD=$'\033[1m'
readonly NC=$'\033[0m'

cat << EOF
${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}
${BOLD}${BLUE}║  CV Plus - Professional Resume Builder - Command Reference   ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin cvplus <command> [options]
  cvplus <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin cvplus start${NC}             Start CV Plus services
  ${GREEN}olorin cvplus status${NC}            Check platform status
  ${GREEN}olorin cvplus stop${NC}              Stop all services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [service]                 Start services
                                 Services: web, backend, all
                                 Example: olorin cvplus start web
                                 Example: olorin cvplus start backend

  ${GREEN}stop${NC}                           Stop all running services
                                 Example: olorin cvplus stop

  ${GREEN}status${NC} [service]                Check service status
                                 Example: olorin cvplus status

  ${GREEN}health${NC} [--fix]                  Run environment health check
                                 Example: olorin cvplus health --fix

${BOLD}${CYAN}RESUME MANAGEMENT:${NC}
  ${GREEN}export${NC} <format>                 Export resume in format
                                 Formats: pdf, docx, json
                                 Example: olorin cvplus export pdf
                                 Example: olorin cvplus export docx

  ${GREEN}template${NC} <name>                 Use resume template
                                 Example: olorin cvplus template professional
                                 Example: olorin cvplus template creative

  ${GREEN}ai-enhance${NC}                      AI-powered resume enhancements
                                 Example: olorin cvplus ai-enhance

  ${GREEN}validate${NC}                       Validate resume content
                                 Example: olorin cvplus validate

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC} [service]                 Build for production
                                 Example: olorin cvplus build
                                 Example: olorin cvplus build web

  ${GREEN}test${NC} [service]                  Run tests
                                 Example: olorin cvplus test

  ${GREEN}lint${NC}                           Run linters
                                 Example: olorin cvplus lint

${BOLD}${CYAN}DATABASE OPERATIONS:${NC}
  ${GREEN}db-migrate${NC}                      Run database migrations
                                 Example: olorin cvplus db-migrate

  ${GREEN}db-seed${NC}                        Seed with sample templates
                                 Example: olorin cvplus db-seed

  ${GREEN}db-reset${NC}                       Reset database (dev only)
                                 Example: olorin cvplus db-reset

${BOLD}${CYAN}USER MANAGEMENT:${NC}
  ${GREEN}user-create${NC} <email>            Create new user
                                 Example: olorin cvplus user-create user@example.com

  ${GREEN}user-delete${NC} <email>            Delete user account
                                 Example: olorin cvplus user-delete user@example.com

  ${GREEN}user-reset${NC} <email>             Reset user password
                                 Example: olorin cvplus user-reset user@example.com

${BOLD}${CYAN}ADVANCED FEATURES:${NC}
  ${GREEN}deploy${NC} <target>                Deploy to staging/production
                                 Example: olorin cvplus deploy staging

  ${GREEN}config${NC}                         Manage configuration
  ${GREEN}script${NC} <query>                 Find scripts
                                 Example: olorin cvplus script backup

${BOLD}${CYAN}INTERACTIVE MODE:${NC}
  ${GREEN}interactive${NC}, ${GREEN}-i${NC}           Start interactive REPL
                                 Example: olorin cvplus interactive

${BOLD}${CYAN}HELP & INFO:${NC}
  ${GREEN}help${NC}, ${GREEN}--help${NC}, ${GREEN}-h${NC}       Show this help message
  ${GREEN}--version${NC}, ${GREEN}-v${NC}             Show CLI version

${BOLD}${CYAN}SERVICES:${NC}
  ${CYAN}web${NC}                           React/TypeScript web app (port 3300)
  ${CYAN}backend${NC}                        FastAPI Python backend (port 8092)

${BOLD}${CYAN}ENVIRONMENT VARIABLES:${NC}
  ${CYAN}CVPLUS_WEB_PORT${NC}                Web app port (default: 3300)
  ${CYAN}CVPLUS_BACKEND_PORT${NC}            Backend API port (default: 8092)
  ${CYAN}CVPLUS_DB_URL${NC}                  Database connection URL
  ${CYAN}ANTHROPIC_API_KEY${NC}              Claude API key (for AI enhancements)

${BOLD}${CYAN}EXAMPLES:${NC}
  # Start all services
  ${GREEN}olorin cvplus start${NC}

  # Export resume as PDF
  ${GREEN}olorin cvplus export pdf${NC}

  # Use professional template
  ${GREEN}olorin cvplus template professional${NC}

  # AI-enhance your resume
  ${GREEN}olorin cvplus ai-enhance${NC}

  # Run tests
  ${GREEN}olorin cvplus test${NC}

  # Check status
  ${GREEN}olorin cvplus status${NC}

  # Stop services
  ${GREEN}olorin cvplus stop${NC}

${BOLD}${CYAN}TROUBLESHOOTING:${NC}
  • Services won't start
    → Run: ${GREEN}olorin cvplus health${NC}
    → Check ports: 3300 (web), 8092 (backend)
    → Install dependencies: ${GREEN}npm install && cd backend && poetry install${NC}

  • Port conflicts
    → Set custom ports: ${GREEN}CVPLUS_WEB_PORT=3301 olorin cvplus start${NC}

  • Database errors
    → Run migrations: ${GREEN}olorin cvplus db-migrate${NC}
    → Seed templates: ${GREEN}olorin cvplus db-seed${NC}
    → Reset (dev): ${GREEN}olorin cvplus db-reset${NC}

  • AI features not working
    → Check API key: ${GREEN}echo \$ANTHROPIC_API_KEY${NC}
    → Verify backend: ${GREEN}curl http://localhost:8092/health${NC}

${BOLD}${CYAN}DOCUMENTATION:${NC}
  • Main README:         ./README.md
  • Backend Docs:        ./cvplus/backend/README.md
  • Frontend Docs:       ./cvplus/web/README.md
  • API Reference:       ./cvplus/backend/docs/api.md
  • Template Guide:      ./docs/templates.md

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} CV Plus - Professional Resume Builder
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
