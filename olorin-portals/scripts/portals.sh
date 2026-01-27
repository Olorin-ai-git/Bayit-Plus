#!/usr/bin/env bash
set -euo pipefail
readonly RED=$'\033[0;31m'
readonly BLUE=$'\033[0;34m'
readonly NC=$'\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-help}"

case "$COMMAND" in
    omen|fraud|main|station|streaming)
        # Specific portal - show help
        case "$COMMAND" in
            omen)
                exec bash "/Users/olorin/Documents/olorin/olorin-omen/scripts/omen-help.sh"
                ;;
            *)
                echo "Portal: $COMMAND (help coming soon)"
                exit 0
                ;;
        esac
        ;;
    help|--help|-h)
        # Show general portals help
        echo "Olorin Portals - Multi-portal platform"
        echo "Portals: omen, fraud, main, station, streaming"
        echo ""
        echo "Usage: olorin portals <portal_name>"
        echo "       olorin portals omen      Show Omen portal help"
        exit 0
        ;;
    --version|-v)
        echo "Olorin Portals Platform CLI v1.0.0"
        exit 0
        ;;
    *)
        echo -e "${RED}✖${NC} Unknown command: $COMMAND"
        echo -e "${BLUE}ℹ${NC} Run: olorin portals --help"
        exit 1
        ;;
esac
