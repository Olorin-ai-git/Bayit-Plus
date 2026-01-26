#!/bin/bash

# MongoDB Data Migration Script
# Migrates Bayit+ data from old cluster (ydrvaft) to new cluster (fnjp1v)
# Usage: ./scripts/environment/migrate-mongodb.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  MongoDB Data Migration - Bayit+ Streaming${NC}"
    echo -e "${BLUE}  From: cluster0.ydrvaft.mongodb.net (OLD)${NC}"
    echo -e "${BLUE}  To:   cluster0.fnjp1v.mongodb.net (NEW)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_prerequisites() {
    local missing=0

    if ! command -v mongodump &> /dev/null; then
        echo -e "${RED}✗ mongodump not found${NC}"
        echo "  Install with: brew install mongodb-community (macOS)"
        missing=1
    fi

    if ! command -v mongorestore &> /dev/null; then
        echo -e "${RED}✗ mongorestore not found${NC}"
        echo "  Install with: brew install mongodb-community (macOS)"
        missing=1
    fi

    if [[ $missing -eq 1 ]]; then
        echo ""
        echo -e "${YELLOW}Please install MongoDB tools and try again${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ All prerequisites met${NC}"
    return 0
}

# MongoDB credentials (from environment or .env)
source "$SCRIPT_DIR/export-mongodb-vars.sh" 2>/dev/null || {
    echo -e "${RED}Error: Could not load MongoDB environment variables${NC}"
    exit 1
}

print_header

# Confirm action
echo -e "${YELLOW}⚠️  WARNING: This will overwrite data in the NEW cluster!${NC}"
echo ""
echo "Source (OLD): cluster0.ydrvaft.mongodb.net/bayit_plus"
echo "Target (NEW): cluster0.fnjp1v.mongodb.net/bayit_plus"
echo ""
read -p "Continue? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""

# Check prerequisites
if ! check_prerequisites; then
    exit 1
fi

echo ""

# Use Station AI connection as source (old Bayit+ cluster)
SOURCE_URI="$STATION_AI_MONGODB_URI"
SOURCE_DB="$STATION_AI_MONGODB_DB_NAME"

# Use Bayit+ connection as target (new cluster)
TARGET_URI="$MONGODB_URI"
TARGET_DB="$MONGODB_DB_NAME"

# Create temporary dump directory
DUMP_DIR="/tmp/bayit-migration-$(date +%s)"
mkdir -p "$DUMP_DIR"

echo -e "${BLUE}Step 1: Dumping data from old cluster...${NC}"
echo "  URI: ${SOURCE_URI%?????????????????????????????????????????}..."
echo "  DB: $SOURCE_DB"
echo "  Dump location: $DUMP_DIR"
echo ""

if mongodump --uri="$SOURCE_URI/$SOURCE_DB" --out="$DUMP_DIR" --forceTableScan; then
    echo -e "${GREEN}✓ Dump completed${NC}"
else
    echo -e "${RED}✗ Dump failed${NC}"
    exit 1
fi

echo ""

# Count collections
DUMP_PATH="$DUMP_DIR/$SOURCE_DB"
COLLECTION_COUNT=$(find "$DUMP_PATH" -name "*.bson" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Dumped $COLLECTION_COUNT collections${NC}"

echo ""
echo -e "${BLUE}Step 2: Restoring data to new cluster...${NC}"
echo "  URI: ${TARGET_URI%?????????????????????????????????????????}..."
echo "  DB: $TARGET_DB"
echo ""

if mongorestore --uri="$TARGET_URI" --db="$TARGET_DB" "$DUMP_PATH" --drop; then
    echo -e "${GREEN}✓ Restore completed${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Verifying migration...${NC}"

# Count documents in target database
if command -v mongosh &> /dev/null; then
    DOC_COUNT=$(mongosh "$TARGET_URI/$TARGET_DB" --eval "db.getCollectionNames().reduce((sum, col) => sum + db[col].countDocuments({}), 0)" --quiet 2>/dev/null || echo "unknown")
    if [[ "$DOC_COUNT" != "unknown" ]]; then
        echo -e "${GREEN}✓ Target database has $DOC_COUNT documents${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Step 4: Cleanup...${NC}"

# Remove temporary dump
rm -rf "$DUMP_DIR"
echo -e "${GREEN}✓ Cleaned up temporary files${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify data in new cluster:"
echo "     ./scripts/environment/mongodb-cli.sh bayit-info"
echo ""
echo "  2. Test application with new cluster:"
echo "     poetry run python -m app.local_server"
echo ""
echo "  3. Once verified, deploy to Cloud Run:"
echo "     ./deployment/scripts/deploy_server.sh"
echo ""
echo "  4. Keep old cluster as backup (station_ai database)"
echo "     ./scripts/environment/mongodb-cli.sh station-info"
echo ""
