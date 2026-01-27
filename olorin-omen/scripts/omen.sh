#!/usr/bin/env bash
set -euo pipefail
readonly RED=$'\033[0;31m'
readonly BLUE=$'\033[0;34m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-help}"
shift || true
case "$COMMAND" in
    help|--help|-h) exec "$SCRIPT_DIR/omen-help.sh" ;;
    --version|-v) echo "Olorin Omen Platform CLI v1.0.0"; exit 0 ;;
    *) echo -e "${RED}✖${NC} Unknown command: $COMMAND"; echo -e "${BLUE}ℹ${NC} Run: olorin omen --help"; exit 1 ;;
esac
