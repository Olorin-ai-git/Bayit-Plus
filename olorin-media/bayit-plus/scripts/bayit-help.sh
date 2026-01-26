#!/usr/bin/env bash
# =============================================================================
# Olorin CLI Help System
# =============================================================================
#
# Purpose: Display comprehensive help for Olorin CLI
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

cat << EOF
${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}
${BOLD}${BLUE}║  Olorin CLI - Unified tooling for Olorin ecosystem           ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin <command> [platform] [options]

${BOLD}${CYAN}COMMON COMMANDS (Fast Path):${NC}
  ${GREEN}start${NC} [platform]     Start development servers
                        Platforms: bayit, backend, web, mobile, tv, tvos, partner
                        Example: olorin start bayit

  ${GREEN}stop${NC} [platform]      Stop running services
                        Example: olorin stop

  ${GREEN}status${NC} [platform]    Check service status and health
                        Example: olorin status bayit

  ${GREEN}build${NC} [platform]     Build platform for production
                        Example: olorin build web

  ${GREEN}test${NC} [platform]      Run tests
                        Example: olorin test backend

  ${GREEN}lint${NC}                 Run linters across all workspaces
                        Example: olorin lint

${BOLD}${CYAN}CONTENT UPLOAD:${NC}
  ${GREEN}upload-movies${NC} [opts] Upload movies from drive or URL to GCS/MongoDB
                        Example: olorin upload-movies --dry-run
                        Example: olorin upload-movies --url https://example.com/movie.mp4
                        Example: olorin upload-movies --limit 5

  ${GREEN}upload-series${NC} [opts] Upload TV series from drive or URL
                        Example: olorin upload-series --dry-run
                        Example: olorin upload-series --series "Game of Thrones"
                        Example: olorin upload-series --url https://example.com/episode.mkv

  ${GREEN}upload${NC}               Show upload command menu
                        Example: olorin upload

${BOLD}${CYAN}SCRIPT DISCOVERY:${NC}
  ${GREEN}script${NC} [query]       Discover and execute scripts
                        Example: olorin script backup
                        Example: olorin script backend deploy
                        Example: olorin script --recent

${BOLD}${CYAN}SYSTEM COMMANDS:${NC}
  ${GREEN}health${NC} [--fix]       Run environment health checks
                        Example: olorin health
                        Example: olorin health --fix

  ${GREEN}--help${NC}, ${GREEN}-h${NC}           Show this help message

  ${GREEN}--version${NC}, ${GREEN}-v${NC}        Show CLI version

${BOLD}${CYAN}INTERACTIVE MODE:${NC}
  ${GREEN}interactive${NC}, ${GREEN}-i${NC}    Start interactive REPL mode
                        Features: command history, NLP parsing, tab completion
                        Example: olorin interactive
                        Example: olorin -i

${BOLD}${CYAN}AI/NLP COMMANDS (Natural Language):${NC}
  ${GREEN}ai ask${NC} <query>       Execute natural language command
                        Example: olorin ai ask "upload family ties from usb"
                        Example: olorin ai "find series about jewish holidays"

  ${GREEN}ai search${NC} <query>    Search content with natural language
                        Example: olorin ai search "kids educational content"
                        Example: olorin ai search "comedy series" --type series

  ${GREEN}ai health${NC}            Check NLP service health
                        Example: olorin ai health

  ${GREEN}ai voice${NC}             Voice command mode (requires microphone)
                        Example: olorin ai voice --language en

${BOLD}${CYAN}ADVANCED COMMANDS:${NC}
  ${GREEN}agent${NC} <name>         Invoke Claude agents
  ${GREEN}skill${NC} <name>         Execute skills
  ${GREEN}deploy${NC} <target>      Deploy to staging/production
  ${GREEN}config${NC}               Manage configuration

${BOLD}${CYAN}PLATFORM OPTIONS:${NC}
  ${CYAN}bayit${NC}                 All Bayit+ services (default)
  ${CYAN}backend${NC}               Backend API only (FastAPI + Poetry)
  ${CYAN}web${NC}                   Web application
  ${CYAN}mobile${NC}                Mobile app (iOS/Android)
  ${CYAN}tv${NC}                    TV app (Android TV/Tizen/WebOS)
  ${CYAN}tvos${NC}                  Apple TV (tvOS)
  ${CYAN}partner${NC}               Partner portal (B2B)

${BOLD}${CYAN}ENVIRONMENT VARIABLES:${NC}
  ${CYAN}OLORIN_PLATFORM${NC}       Default platform (default: bayit)
  ${CYAN}BACKEND_PORT${NC}          Backend port (default: 8090)
  ${CYAN}WEB_PORT${NC}              Web app port (default: 3200)
  ${CYAN}CLAUDE_DIR${NC}            .claude directory path (default: ~/.claude)

  ${BOLD}${MAGENTA}NLP Features:${NC}
  ${CYAN}OLORIN_NLP_ENABLED${NC}    Enable natural language processing (default: false)
  ${CYAN}OLORIN_BACKEND_URL${NC}    Backend URL for NLP API (default: http://localhost:8090)
  ${CYAN}ANTHROPIC_API_KEY${NC}     Anthropic Claude API key (required for NLP)

${BOLD}${CYAN}EXAMPLES:${NC}
  # Start all Bayit+ services
  ${GREEN}olorin start bayit${NC}

  # Start backend only
  ${GREEN}olorin start backend${NC}

  # Check platform status
  ${GREEN}olorin status${NC}

  # Find and run backup scripts
  ${GREEN}olorin script backup${NC}

  # Run health check
  ${GREEN}olorin health${NC}

  # Stop all services
  ${GREEN}olorin stop${NC}

  # Build web app
  ${GREEN}olorin build web${NC}

  # Run all tests
  ${GREEN}olorin test${NC}

  # Upload movies from external drive
  ${GREEN}olorin upload-movies --dry-run${NC}

  # Upload movie from URL
  ${GREEN}olorin upload-movies --url https://example.com/movie.mp4${NC}

  # Upload TV series
  ${GREEN}olorin upload-series --series "Breaking Bad"${NC}

${BOLD}${CYAN}QUICK START:${NC}
  1. Run health check:     ${GREEN}olorin health${NC}
  2. Start platform:       ${GREEN}olorin start bayit${NC}
  3. Check status:         ${GREEN}olorin status${NC}
  4. Stop when done:       ${GREEN}olorin stop${NC}

${BOLD}${CYAN}DOCUMENTATION:${NC}
  • Main README:           ./README.md
  • Scripts README:        ./scripts/README.md
  • CLI Implementation:    (Phase 1 - Bash Router complete)
  • .claude Integration:   ~/.claude/CLAUDE.md

${BOLD}${CYAN}TROUBLESHOOTING:${NC}
  • Health check fails:    Run ${GREEN}olorin health --fix${NC}
  • Services won't start:  Check ${GREEN}olorin status${NC} first
  • Port conflicts:        Set custom ports via env vars
  • Dependencies missing:  Run ${GREEN}npm install${NC} and ${GREEN}cd backend && poetry install${NC}

${BOLD}${CYAN}SUPPORT:${NC}
  • GitHub Issues:         https://github.com/anthropics/claude-code/issues
  • Internal Docs:         See ./docs/README.md

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0 (Phase 1 - Bash Router)
${BOLD}Platform:${NC} Bayit+ Media
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
