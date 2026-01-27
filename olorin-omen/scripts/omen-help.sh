#!/usr/bin/env bash
set -euo pipefail
readonly RED=$'\033[0;31m'
readonly GREEN=$'\033[0;32m'
readonly YELLOW=$'\033[1;33m'
readonly BLUE=$'\033[0;34m'
readonly CYAN=$'\033[0;36m'
readonly BOLD=$'\033[1m'
readonly NC=$'\033[0m'

cat << EOF
${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}
${BOLD}${BLUE}║  Olorin Omen - Marketing Portal - Command Reference          ║${NC}
${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}

${BOLD}${CYAN}USAGE:${NC}
  olorin omen <command> [options]
  omen <command> [options]

${BOLD}${CYAN}QUICK START:${NC}
  ${GREEN}olorin omen start${NC}              Start Omen marketing portal
  ${GREEN}olorin omen status${NC}             Check platform status
  ${GREEN}olorin omen stop${NC}               Stop services

${BOLD}${CYAN}SERVICE MANAGEMENT:${NC}
  ${GREEN}start${NC} [service]                 Start services
                                 Services: web, backend, all
                                 Example: olorin omen start web

  ${GREEN}stop${NC}                           Stop all running services
  ${GREEN}status${NC} [service]                Check service status
  ${GREEN}health${NC} [--fix]                  Run health check

${BOLD}${CYAN}CONTENT MANAGEMENT:${NC}
  ${GREEN}publish${NC} <page>                 Publish page content
  ${GREEN}draft${NC} <page>                   Create draft
  ${GREEN}sync${NC}                          Sync with content source
  ${GREEN}preview${NC} <page>                 Preview page

${BOLD}${CYAN}LOCALIZATION:${NC}
  ${GREEN}translate${NC} <lang>               Generate translations
                                 Languages: en, es, fr, de, ja, zh, he, ar
                                 Example: olorin omen translate es

  ${GREEN}validate-i18n${NC}                  Validate localization
                                 Example: olorin omen validate-i18n

${BOLD}${CYAN}BUILD & TESTING:${NC}
  ${GREEN}build${NC}                         Build for production
  ${GREEN}test${NC}                          Run tests
  ${GREEN}lint${NC}                         Run linters

${BOLD}${CYAN}SEO & ANALYTICS:${NC}
  ${GREEN}sitemap${NC}                       Generate XML sitemap
  ${GREEN}seo-check${NC}                     Run SEO validation
  ${GREEN}analytics${NC}                     View analytics data

${BOLD}${CYAN}DEPLOYMENT:${NC}
  ${GREEN}deploy${NC} <target>               Deploy (staging/production)
  ${GREEN}rollback${NC}                      Rollback deployment
  ${GREEN}status${NC}                        Deployment status

${BOLD}${CYAN}SERVICES:${NC}
  ${CYAN}web${NC}                           Next.js web portal (port 3400)
  ${CYAN}backend${NC}                        FastAPI backend (port 8093)

${BOLD}${CYAN}EXAMPLES:${NC}
  ${GREEN}olorin omen start${NC}
  ${GREEN}olorin omen publish home${NC}
  ${GREEN}olorin omen translate es${NC}
  ${GREEN}olorin omen deploy staging${NC}
  ${GREEN}olorin omen status${NC}
  ${GREEN}olorin omen stop${NC}

${BOLD}${CYAN}HELP & INFO:${NC}
  ${GREEN}help${NC}, ${GREEN}--help${NC}, ${GREEN}-h${NC}       Show this help message
  ${GREEN}--version${NC}, ${GREEN}-v${NC}             Show CLI version

${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BOLD}Version:${NC} 1.0.0
${BOLD}Platform:${NC} Olorin Omen - Marketing Portal
${BOLD}Status:${NC} ${GREEN}Production Ready${NC}

EOF
