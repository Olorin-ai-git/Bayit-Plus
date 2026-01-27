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
${BOLD}${BLUE}║  Israeli Radio Manager - Radio Platform - Command Reference  ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin radio <command> [options]
  radio <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin radio start${NC}              Start radio platform services
  ${GREEN}olorin radio status${NC}             Check platform status
  ${GREEN}olorin radio stop${NC}               Stop services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [service]                 Start services (backend, web, all)
  ${GREEN}stop${NC}                           Stop all running services
  ${GREEN}status${NC} [service]                Check service status
  ${GREEN}health${NC} [--fix]                  Run health check

${BOLD}${CYAN}STATION MANAGEMENT:${NC}
  ${GREEN}station-create${NC} <name>          Create new radio station
  ${GREEN}station-list${NC}                   List all stations
  ${GREEN}station-update${NC} <id> <data>     Update station info
  ${GREEN}station-delete${NC} <id>            Delete station

${BOLD}${CYAN}BROADCAST MANAGEMENT:${NC}
  ${GREEN}broadcast-start${NC} <station>      Start broadcast
  ${GREEN}broadcast-stop${NC} <station>       Stop broadcast
  ${GREEN}broadcast-schedule${NC} <file>      Schedule broadcasts
  ${GREEN}broadcast-monitor${NC}              Monitor all broadcasts

${BOLD}${CYAN}CONTENT MANAGEMENT:${NC}
  ${GREEN}upload-episode${NC} <file>          Upload episode
  ${GREEN}upload-playlist${NC} <file>         Upload playlist
  ${GREEN}sync-metadata${NC}                  Sync metadata

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC}                         Build for production
  ${GREEN}test${NC}                          Run tests
  ${GREEN}lint${NC}                         Run linters

${BOLD}${CYAN}DEPLOYMENT:${NC}
  ${GREEN}deploy${NC} <target>               Deploy (staging/production)
  ${GREEN}status${NC}                        Deployment status
  ${GREEN}rollback${NC}                      Rollback deployment

${BOLD}${CYAN}SERVICES:${NC}
  ${CYAN}backend${NC}                        FastAPI backend (port 8095)
  ${CYAN}web${NC}                           Web dashboard (port 3600)

${BOLD}${CYAN}EXAMPLES:${NC}
  ${GREEN}olorin radio start${NC}
  ${GREEN}olorin radio station-create "Radio 88"${NC}
  ${GREEN}olorin radio broadcast-start "Radio 88"${NC}
  ${GREEN}olorin radio upload-episode episode.mp3${NC}
  ${GREEN}olorin radio status${NC}
  ${GREEN}olorin radio stop${NC}

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} Israeli Radio Manager
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
