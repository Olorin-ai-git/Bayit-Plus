#!/usr/bin/env bash
set -euo pipefail
readonly RED=$'\033[0;31m'
readonly GREEN=$'\033[0;32m'
readonly BLUE=$'\033[0;34m'
readonly CYAN=$'\033[0;36m'
readonly BOLD=$'\033[1m'
readonly NC=$'\033[0m'

cat << EOF
${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}
${BOLD}${BLUE}║  Station AI - Audio AI Platform - Command Reference           ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin stationai <command> [options]
  stationai <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin stationai start${NC}            Start Station AI services
  ${GREEN}olorin stationai status${NC}           Check platform status
  ${GREEN}olorin stationai stop${NC}             Stop services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [service]                 Start services (backend, web, all)
  ${GREEN}stop${NC}                           Stop all running services
  ${GREEN}status${NC} [service]                Check service status
  ${GREEN}health${NC} [--fix]                  Run health check

${BOLD}${CYAN}AI FEATURES:${NC}
  ${GREEN}transcribe${NC} <audio>              Transcribe audio files
  ${GREEN}analyze${NC} <audio>                 Analyze audio content
  ${GREEN}generate${NC} <prompt>               Generate audio from text
  ${GREEN}podcast${NC}                        Podcast management tools

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC}                         Build for production
  ${GREEN}test${NC}                          Run tests
  ${GREEN}lint${NC}                         Run linters

${BOLD}${CYAN}DEPLOYMENT:${NC}
  ${GREEN}deploy${NC} <target>               Deploy (staging/production)
  ${GREEN}status${NC}                        Deployment status
  ${GREEN}rollback${NC}                      Rollback deployment

${BOLD}${CYAN}SERVICES:${NC}
  ${CYAN}backend${NC}                        FastAPI backend (port 8094)
  ${CYAN}web${NC}                           Web dashboard (port 3500)

${BOLD}${CYAN}EXAMPLES:${NC}
  ${GREEN}olorin stationai start${NC}
  ${GREEN}olorin stationai transcribe audio.mp3${NC}
  ${GREEN}olorin stationai status${NC}
  ${GREEN}olorin stationai stop${NC}

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} Station AI - Audio AI Platform
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
