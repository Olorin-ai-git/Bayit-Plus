#!/usr/bin/env bash
# =============================================================================
# Olorin Fraud Detection Platform Help System
# =============================================================================
#
# Purpose: Display help specific to Olorin Fraud Detection platform
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
${BOLD}${BLUE}║  Olorin Fraud Detection - Command Reference                   ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin fraud <command> [options]
  fraud <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin fraud start${NC}              Start fraud detection services
  ${GREEN}olorin fraud status${NC}             Check platform status
  ${GREEN}olorin fraud stop${NC}               Stop all services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [service]                 Start services
                                 Services: backend, frontend, all
                                 Example: olorin fraud start backend
                                 Example: olorin fraud start frontend

  ${GREEN}stop${NC}                           Stop all running services
                                 Example: olorin fraud stop

  ${GREEN}status${NC} [service]                Check service status
                                 Example: olorin fraud status
                                 Example: olorin fraud status backend

  ${GREEN}health${NC} [--fix]                  Run environment health check
                                 Example: olorin fraud health
                                 Example: olorin fraud health --fix

${BOLD}${CYAN}INVESTIGATION TOOLS:${NC}
  ${GREEN}investigate${NC} <id>                Analyze fraud case
                                 Example: olorin fraud investigate case-12345

  ${GREEN}query${NC} <filter>                  Query investigations
                                 Example: olorin fraud query "status:open"

  ${GREEN}export${NC} <format>                 Export investigation data
                                 Example: olorin fraud export pdf

${BOLD}${CYAN}AI AGENT FEATURES:${NC}
  ${GREEN}agent${NC} <command>                 Invoke fraud detection agents
                                 Example: olorin fraud agent analyze

  ${GREEN}anomaly-detection${NC}               Run anomaly detection
                                 Example: olorin fraud anomaly-detection

  ${GREEN}pattern-analysis${NC}                Analyze fraud patterns
                                 Example: olorin fraud pattern-analysis

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC} [service]                 Build for production
                                 Services: backend, frontend, all
                                 Example: olorin fraud build
                                 Example: olorin fraud build backend

  ${GREEN}test${NC} [service]                  Run tests
                                 Example: olorin fraud test
                                 Example: olorin fraud test backend

  ${GREEN}lint${NC}                           Run linters
                                 Example: olorin fraud lint

${BOLD}${CYAN}DATABASE OPERATIONS:${NC}
  ${GREEN}db-migrate${NC}                      Run database migrations
                                 Example: olorin fraud db-migrate

  ${GREEN}db-seed${NC}                        Seed database with test data
                                 Example: olorin fraud db-seed

  ${GREEN}db-reset${NC}                       Reset database (dev only)
                                 Example: olorin fraud db-reset

${BOLD}${CYAN}ADVANCED FEATURES:${NC}
  ${GREEN}deploy${NC} <target>                 Deploy to staging/production
                                 Example: olorin fraud deploy staging

  ${GREEN}config${NC}                          Manage configuration
  ${GREEN}script${NC} <query>                  Find scripts
                                 Example: olorin fraud script deploy

${BOLD}${CYAN}INTERACTIVE MODE:${NC}
  ${GREEN}interactive${NC}, ${GREEN}-i${NC}           Start interactive REPL
                                 Example: olorin fraud interactive

${BOLD}${CYAN}HELP & INFO:${NC}
  ${GREEN}help${NC}, ${GREEN}--help${NC}, ${GREEN}-h${NC}       Show this help message
  ${GREEN}--version${NC}, ${GREEN}-v${NC}             Show CLI version

${BOLD}${CYAN}SERVICES:${NC}
  ${CYAN}backend${NC}                        FastAPI Python backend (port 8091)
  ${CYAN}frontend${NC}                       React/TypeScript frontend (port 3201)

${BOLD}${CYAN}ENVIRONMENT VARIABLES:${NC}
  ${CYAN}FRAUD_BACKEND_PORT${NC}             Backend API port (default: 8091)
  ${CYAN}FRAUD_FRONTEND_PORT${NC}            Frontend port (default: 3201)
  ${CYAN}FRAUD_DB_URL${NC}                   Database connection URL
  ${CYAN}ANTHROPIC_API_KEY${NC}              Claude API key (for AI agents)

${BOLD}${CYAN}EXAMPLES:${NC}
  # Start all services
  ${GREEN}olorin fraud start${NC}

  # Start backend only
  ${GREEN}olorin fraud start backend${NC}

  # Check status
  ${GREEN}olorin fraud status${NC}

  # Run tests
  ${GREEN}olorin fraud test${NC}

  # Investigate a case
  ${GREEN}olorin fraud investigate case-12345${NC}

  # Export to PDF
  ${GREEN}olorin fraud export pdf${NC}

  # Stop services
  ${GREEN}olorin fraud stop${NC}

${BOLD}${CYAN}TROUBLESHOOTING:${NC}
  • Services won't start
    → Run: ${GREEN}olorin fraud health${NC}
    → Check ports: 8091 (backend), 3201 (frontend)
    → Ensure dependencies: ${GREEN}npm install && cd backend && poetry install${NC}

  • Port conflicts
    → Set custom ports: ${GREEN}FRAUD_BACKEND_PORT=8092 olorin fraud start${NC}

  • Database errors
    → Check connection: ${GREEN}olorin fraud health${NC}
    → Migrate schema: ${GREEN}olorin fraud db-migrate${NC}
    → Reset for dev: ${GREEN}olorin fraud db-reset${NC}

  • AI agents not responding
    → Check API key: ${GREEN}echo \$ANTHROPIC_API_KEY${NC}
    → Verify backend: ${GREEN}curl http://localhost:8091/health${NC}

${BOLD}${CYAN}DOCUMENTATION:${NC}
  • Main README:         ./README.md
  • Backend Setup:       ./backend/README.md
  • Frontend Docs:       ./frontend/README.md
  • API Reference:       ./backend/docs/api.md
  • Agent Documentation: ./backend/docs/agents.md

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} Olorin Fraud Detection
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
