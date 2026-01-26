#!/bin/bash

# MongoDB CLI Helper Script
# Provides convenient commands for managing Bayit+ and Station AI MongoDB instances
# Usage: ./scripts/environment/mongodb-cli.sh <command> [options]

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
source "$SCRIPT_DIR/export-mongodb-vars.sh" 2>/dev/null || {
    echo -e "${RED}Error: Could not load MongoDB environment variables${NC}"
    exit 1
}

# Functions
print_usage() {
    cat << EOF
MongoDB CLI Helper - Bayit+ and Station AI

Usage: ./scripts/environment/mongodb-cli.sh <command> [options]

Commands:
  bayit-connect           Connect to Bayit+ MongoDB cluster
  bayit-shell             Open MongoDB shell for Bayit+
  bayit-list-dbs          List databases in Bayit+ cluster
  bayit-info              Show Bayit+ cluster info

  station-connect         Connect to Station AI MongoDB cluster
  station-shell           Open MongoDB shell for Station AI
  station-list-dbs        List databases in Station AI cluster
  station-info            Show Station AI cluster info

  verify-connections      Verify both connections work
  show-env                Show MongoDB environment variables
  show-secrets            Show Cloud Run secrets
  help                    Show this help message

Examples:
  ./scripts/environment/mongodb-cli.sh bayit-shell
  ./scripts/environment/mongodb-cli.sh bayit-list-dbs
  ./scripts/environment/mongodb-cli.sh verify-connections
EOF
}

verify_mongosh_installed() {
    if ! command -v mongosh &> /dev/null; then
        echo -e "${YELLOW}Warning: mongosh not installed${NC}"
        echo "Install with: brew install mongosh (macOS) or apt-get install mongosh (Linux)"
        return 1
    fi
    return 0
}

verify_python_installed() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Error: python3 not found${NC}"
        return 1
    fi
    return 0
}

# Command handlers
cmd_bayit_connect() {
    echo -e "${BLUE}Connecting to Bayit+ cluster...${NC}"
    echo "Connection string: mongodb+srv://admin_db_user:***@cluster0.fnjp1v.mongodb.net"
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('MONGODB_URI')
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.server_info()
    print("\033[32m✓ Successfully connected to Bayit+ cluster\033[0m")
    print(f"Server info: {client.server_info()}")
    client.close()
except Exception as e:
    print(f"\033[31m✗ Connection failed: {e}\033[0m")
    exit(1)
EOF
}

cmd_bayit_shell() {
    if ! verify_mongosh_installed; then
        return 1
    fi
    echo -e "${BLUE}Opening MongoDB shell for Bayit+ (cluster0.fnjp1v)...${NC}"
    mongosh "$MONGODB_URI"
}

cmd_bayit_list_dbs() {
    echo -e "${BLUE}Listing databases in Bayit+ cluster...${NC}"
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('MONGODB_URI')
try:
    client = MongoClient(uri)
    dbs = client.list_database_names()
    print(f"\n\033[32m✓ Databases in Bayit+ cluster:\033[0m")
    for db in dbs:
        print(f"  - {db}")
    client.close()
except Exception as e:
    print(f"\033[31m✗ Error: {e}\033[0m")
    exit(1)
EOF
}

cmd_bayit_info() {
    echo -e "${BLUE}Bayit+ Cluster Information${NC}"
    echo "================================"
    echo "Cluster: cluster0.fnjp1v.mongodb.net"
    echo "Database: $MONGODB_DB_NAME"
    echo "Connection string: ${MONGODB_URI%?????????????????????????????????????????}"
    echo ""
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('MONGODB_URI')
try:
    client = MongoClient(uri)
    info = client.server_info()
    print(f"Status: \033[32mConnected\033[0m")
    print(f"MongoDB Version: {info.get('version', 'Unknown')}")

    db = client[os.getenv('MONGODB_DB_NAME')]
    collections = db.list_collection_names()
    print(f"Collections: {len(collections)}")
    for col in collections[:5]:
        count = db[col].count_documents({})
        print(f"  - {col}: {count} documents")
    if len(collections) > 5:
        print(f"  ... and {len(collections) - 5} more collections")

    client.close()
except Exception as e:
    print(f"\033[31m✗ Error: {e}\033[0m")
    exit(1)
EOF
}

cmd_station_connect() {
    echo -e "${BLUE}Connecting to Station AI cluster...${NC}"
    echo "Connection string: mongodb+srv://admin_db_user:***@cluster0.ydrvaft.mongodb.net"
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('STATION_AI_MONGODB_URI')
if not uri:
    print("\033[31m✗ STATION_AI_MONGODB_URI not configured\033[0m")
    exit(1)

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.server_info()
    print("\033[32m✓ Successfully connected to Station AI cluster\033[0m")
    print(f"Server info: {client.server_info()}")
    client.close()
except Exception as e:
    print(f"\033[31m✗ Connection failed: {e}\033[0m")
    exit(1)
EOF
}

cmd_station_shell() {
    if ! verify_mongosh_installed; then
        return 1
    fi
    if [[ -z "${STATION_AI_MONGODB_URI:-}" ]]; then
        echo -e "${RED}Error: STATION_AI_MONGODB_URI not configured${NC}"
        return 1
    fi
    echo -e "${BLUE}Opening MongoDB shell for Station AI (cluster0.ydrvaft)...${NC}"
    mongosh "$STATION_AI_MONGODB_URI"
}

cmd_station_list_dbs() {
    echo -e "${BLUE}Listing databases in Station AI cluster...${NC}"
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('STATION_AI_MONGODB_URI')
if not uri:
    print("\033[31m✗ STATION_AI_MONGODB_URI not configured\033[0m")
    exit(1)

try:
    client = MongoClient(uri)
    dbs = client.list_database_names()
    print(f"\n\033[32m✓ Databases in Station AI cluster:\033[0m")
    for db in dbs:
        print(f"  - {db}")
    client.close()
except Exception as e:
    print(f"\033[31m✗ Error: {e}\033[0m")
    exit(1)
EOF
}

cmd_station_info() {
    echo -e "${BLUE}Station AI Cluster Information${NC}"
    echo "================================"
    echo "Cluster: cluster0.ydrvaft.mongodb.net"
    echo "Database: $STATION_AI_MONGODB_DB_NAME"
    echo "Connection string: ${STATION_AI_MONGODB_URI%?????????????????????????????????????????}"
    echo ""
    python3 << EOF
from pymongo import MongoClient
import os

uri = os.getenv('STATION_AI_MONGODB_URI')
if not uri:
    print("\033[31m✗ STATION_AI_MONGODB_URI not configured\033[0m")
    exit(1)

try:
    client = MongoClient(uri)
    info = client.server_info()
    print(f"Status: \033[32mConnected\033[0m")
    print(f"MongoDB Version: {info.get('version', 'Unknown')}")

    db = client[os.getenv('STATION_AI_MONGODB_DB_NAME')]
    collections = db.list_collection_names()
    print(f"Collections: {len(collections)}")
    for col in collections[:5]:
        count = db[col].count_documents({})
        print(f"  - {col}: {count} documents")
    if len(collections) > 5:
        print(f"  ... and {len(collections) - 5} more collections")

    client.close()
except Exception as e:
    print(f"\033[31m✗ Error: {e}\033[0m")
    exit(1)
EOF
}

cmd_verify_connections() {
    echo -e "${BLUE}Verifying MongoDB connections...${NC}\n"

    if verify_python_installed; then
        python3 << EOF
from pymongo import MongoClient
import os

# Bayit+ connection
uri_bayit = os.getenv('MONGODB_URI')
uri_station = os.getenv('STATION_AI_MONGODB_URI')

print("Testing Bayit+ cluster (cluster0.fnjp1v)...")
try:
    client = MongoClient(uri_bayit, serverSelectionTimeoutMS=5000)
    client.server_info()
    print("  \033[32m✓ Bayit+ cluster: CONNECTED\033[0m")
    client.close()
except Exception as e:
    print(f"  \033[31m✗ Bayit+ cluster: FAILED - {e}\033[0m")

if uri_station:
    print("\nTesting Station AI cluster (cluster0.ydrvaft)...")
    try:
        client = MongoClient(uri_station, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("  \033[32m✓ Station AI cluster: CONNECTED\033[0m")
        client.close()
    except Exception as e:
        print(f"  \033[31m✗ Station AI cluster: FAILED - {e}\033[0m")
else:
    print("\nStation AI cluster not configured")

print("\n\033[32m✓ Connection verification complete\033[0m")
EOF
    fi
}

cmd_show_env() {
    echo -e "${BLUE}MongoDB Environment Variables${NC}"
    echo "==============================="
    echo "MONGODB_URI:"
    echo "  Cluster: cluster0.fnjp1v.mongodb.net"
    echo "  Database: $MONGODB_DB_NAME"
    if [[ ${#MONGODB_URI} -gt 50 ]]; then
        echo "  Value: ${MONGODB_URI:0:50}...${MONGODB_URI: -20}"
    fi
    echo ""

    if [[ -n "${STATION_AI_MONGODB_URI:-}" ]]; then
        echo "STATION_AI_MONGODB_URI:"
        echo "  Cluster: cluster0.ydrvaft.mongodb.net"
        echo "  Database: $STATION_AI_MONGODB_DB_NAME"
        if [[ ${#STATION_AI_MONGODB_URI} -gt 50 ]]; then
            echo "  Value: ${STATION_AI_MONGODB_URI:0:50}...${STATION_AI_MONGODB_URI: -20}"
        fi
    else
        echo "STATION_AI_MONGODB_URI: (not configured)"
    fi
}

cmd_show_secrets() {
    echo -e "${BLUE}Google Cloud Secrets${NC}"
    echo "===================="
    echo ""
    echo "Bayit+ secrets:"
    gcloud secrets list --filter="name:bayit-mongodb" --format="value(name)" 2>/dev/null || echo "  (No secrets found - deploy with deploy_server.sh)"
    echo ""
    echo "Station AI secrets:"
    gcloud secrets list --filter="name:station-ai-mongodb" --format="value(name)" 2>/dev/null || echo "  (No secrets found - deploy with deploy_server.sh)"
}

# Main
if [[ $# -eq 0 ]]; then
    print_usage
    exit 0
fi

case "$1" in
    bayit-connect)
        cmd_bayit_connect
        ;;
    bayit-shell)
        cmd_bayit_shell
        ;;
    bayit-list-dbs)
        cmd_bayit_list_dbs
        ;;
    bayit-info)
        cmd_bayit_info
        ;;
    station-connect)
        cmd_station_connect
        ;;
    station-shell)
        cmd_station_shell
        ;;
    station-list-dbs)
        cmd_station_list_dbs
        ;;
    station-info)
        cmd_station_info
        ;;
    verify-connections)
        cmd_verify_connections
        ;;
    show-env)
        cmd_show_env
        ;;
    show-secrets)
        cmd_show_secrets
        ;;
    help)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        print_usage
        exit 1
        ;;
esac
