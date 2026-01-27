#!/usr/bin/env bash
# =============================================================================
# Bayit+ Platform Help System
# =============================================================================
#
# Purpose: Display help specific to Bayit+ streaming platform
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
${BOLD}${BLUE}║  Bayit+ Streaming Platform - Command Reference                ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin bayit <command> [options]
  bayit <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin bayit start${NC}              Start all Bayit+ services
  ${GREEN}olorin bayit status${NC}             Check platform status
  ${GREEN}olorin bayit stop${NC}               Stop all services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [platform]                Start services
                                 Platforms: bayit (all), backend, web, mobile, tv, tvos, partner
                                 Example: olorin bayit start backend
                                 Example: olorin bayit start web

  ${GREEN}stop${NC}                           Stop all running services
                                 Example: olorin bayit stop

  ${GREEN}status${NC} [platform]               Check service status and health
                                 Example: olorin bayit status
                                 Example: olorin bayit status backend

  ${GREEN}health${NC} [--fix]                  Run environment health check
                                 Example: olorin bayit health
                                 Example: olorin bayit health --fix

${BOLD}${CYAN}CONTENT MANAGEMENT:${NC}
  ${GREEN}upload-movies${NC} [options]         Upload movies from drive or URL
                                 Examples:
                                   olorin bayit upload-movies --dry-run
                                   olorin bayit upload-movies --url https://example.com/movie.mp4
                                   olorin bayit upload-movies --limit 5
                                 Options:
                                   --dry-run               Simulate upload without saving
                                   --url <url>             Upload from external URL
                                   --limit <num>           Limit number of files
                                   --help                  Show detailed help

  ${GREEN}upload-series${NC} [options]         Upload TV series from drive or URL
                                 Examples:
                                   olorin bayit upload-series --dry-run
                                   olorin bayit upload-series --series "Game of Thrones"
                                   olorin bayit upload-series --url https://example.com/episode.mkv
                                 Options:
                                   --series <name>        Upload specific series
                                   --url <url>            Upload from external URL
                                   --help                  Show detailed help

  ${GREEN}upload${NC}                         Show upload menu
                                 Example: olorin bayit upload

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC} [platform]                Build platform for production
                                 Platforms: bayit (all), web, mobile, tv, tvos, partner, backend
                                 Example: olorin bayit build
                                 Example: olorin bayit build web

  ${GREEN}test${NC} [platform]                 Run tests for platform
                                 Example: olorin bayit test
                                 Example: olorin bayit test backend

  ${GREEN}lint${NC}                           Run linters across all services
                                 Example: olorin bayit lint

${BOLD}${CYAN}SCRIPT DISCOVERY:${NC}
  ${GREEN}script${NC} <query>                  Find and discover scripts
                                 Examples:
                                   olorin bayit script backup
                                   olorin bayit script deploy
                                   olorin bayit script database

${BOLD}${CYAN}ADVANCED FEATURES:${NC}
  ${GREEN}ai${NC} <query>                      Natural language commands (requires NLP enabled)
                                 Examples:
                                   olorin bayit ai "upload movies from usb"
                                   olorin bayit ai "find series about comedy"
                                 Enable with: export OLORIN_NLP_ENABLED=true

  ${GREEN}agent${NC} <name>                    Invoke Claude agents
  ${GREEN}skill${NC} <name>                    Execute skills
  ${GREEN}deploy${NC} <target>                 Deploy to staging/production
  ${GREEN}config${NC}                          Manage configuration

${BOLD}${CYAN}INTERACTIVE MODE:${NC}
  ${GREEN}interactive${NC}, ${GREEN}-i${NC}           Start interactive REPL shell
                                 Example: olorin bayit interactive
                                 Example: olorin bayit -i

${BOLD}${CYAN}HELP & INFO:${NC}
  ${GREEN}help${NC}, ${GREEN}--help${NC}, ${GREEN}-h${NC}       Show this help message
  ${GREEN}--version${NC}, ${GREEN}-v${NC}             Show CLI version

${BOLD}${CYAN}PLATFORMS (Sub-services):${NC}
  ${CYAN}bayit${NC}                          All services (default)
  ${CYAN}backend${NC}                        FastAPI Python backend (port 8090)
  ${CYAN}web${NC}                           Web application (port 3200)
  ${CYAN}mobile${NC}                        Mobile app (iOS/Android)
  ${CYAN}tv${NC}                            TV app (Android TV/Tizen/WebOS)
  ${CYAN}tvos${NC}                          Apple TV (tvOS)
  ${CYAN}partner${NC}                       Partner portal (B2B)

${BOLD}${CYAN}ENVIRONMENT VARIABLES:${NC}
  ${CYAN}BACKEND_PORT${NC}                   Backend API port (default: 8090)
  ${CYAN}WEB_PORT${NC}                       Web app port (default: 3200)
  ${CYAN}OLORIN_NLP_ENABLED${NC}             Enable natural language features (default: false)
  ${CYAN}OLORIN_BACKEND_URL${NC}             Backend URL for NLP (default: http://localhost:8090)

${BOLD}${CYAN}EXAMPLES:${NC}
  # Start all services
  ${GREEN}olorin bayit start${NC}

  # Start backend only
  ${GREEN}olorin bayit start backend${NC}

  # Check status
  ${GREEN}olorin bayit status${NC}

  # Upload movies with dry run
  ${GREEN}olorin bayit upload-movies --dry-run${NC}

  # Upload series
  ${GREEN}olorin bayit upload-series --series "Breaking Bad"${NC}

  # Run tests
  ${GREEN}olorin bayit test${NC}

  # Find deployment scripts
  ${GREEN}olorin bayit script deploy${NC}

  # Stop all services
  ${GREEN}olorin bayit stop${NC}

${BOLD}${CYAN}TROUBLESHOOTING:${NC}
  • Services won't start
    → Run: ${GREEN}olorin bayit health${NC}
    → Check port availability (default 8090, 3200)
    → Ensure dependencies: ${GREEN}npm install && cd backend && poetry install${NC}

  • Port conflicts
    → Set custom ports: ${GREEN}BACKEND_PORT=8091 olorin bayit start backend${NC}

  • Upload fails
    → Check permissions: ${GREEN}olorin bayit health --fix${NC}
    → Verify GCS bucket: ${GREEN}GOOGLE_APPLICATION_CREDENTIALS${NC} env var

  • NLP commands not working
    → Enable NLP: ${GREEN}export OLORIN_NLP_ENABLED=true${NC}
    → Build CLI: ${GREEN}cd cli && npm install && npm run build${NC}

${BOLD}${CYAN}DOCUMENTATION:${NC}
  • Main README:         ./README.md
  • Backend Setup:       ./backend/README.md
  • Web App Docs:        ./web/README.md
  • Upload Guide:        ./docs/content-upload/README.md
  • API Reference:       ./backend/docs/api.md

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} Bayit+ Media Streaming
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
