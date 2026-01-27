#!/usr/bin/env bash
set -euo pipefail
readonly RED=$'\033[0;31m'
readonly GREEN=$'\033[0;32m'
readonly BLUE=$'\033[0;34m'
readonly NC=$'\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    help|--help|-h) exec "$SCRIPT_DIR/fraud-help.sh" ;;
    --version|-v) echo "Olorin Fraud Detection Platform CLI v1.0.0"; exit 0 ;;
    *) echo -e "${RED}✖${NC} Unknown command: $COMMAND"; echo -e "${BLUE}ℹ${NC} Run: olorin fraud --help"; exit 1 ;;
esac
