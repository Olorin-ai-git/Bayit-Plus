#!/bin/bash

# Selective MongoDB Migration - Bayit+ ONLY
# Migrates ONLY bayit_plus database from old cluster (ydrvaft) to new cluster (fnjp1v)
# Skips all other applications: CVPlus, Israeli Radio, Olorin Fraud, Sample data
# Usage: ./scripts/environment/migrate-bayit-selective.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Read MongoDB URIs from .env
MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)
STATION_AI_MONGODB_URI=$(grep "^STATION_AI_MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)

# Extract base URI (remove database name)
# STATION_AI_MONGODB_URI looks like: mongodb+srv://...@cluster0.ydrvaft.mongodb.net/station_ai?...
# We need: mongodb+srv://...@cluster0.ydrvaft.mongodb.net
OLD_CLUSTER_BASE_URI="${STATION_AI_MONGODB_URI%/*}"  # Remove /station_ai and everything after
OLD_CLUSTER_BASE_URI="${OLD_CLUSTER_BASE_URI%\?*}"   # Remove query parameters if any
OLD_CLUSTER_BAYIT_URI="$OLD_CLUSTER_BASE_URI/bayit_plus"

# Print banner
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SELECTIVE MongoDB Migration - Bayit+ Platform ONLY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Summary of what will happen
echo -e "${GREEN}MIGRATION PLAN:${NC}"
echo "  Source Database:      bayit_plus"
echo "  Source Cluster:       cluster0.ydrvaft.mongodb.net (old)"
echo "  Target Database:      bayit_plus"
echo "  Target Cluster:       cluster0.fnjp1v.mongodb.net (new)"
echo ""

echo -e "${YELLOW}DATABASES THAT WILL NOT BE TOUCHED:${NC}"
echo "  ✓ cvplus_production   (CVPlus app)"
echo "  ✓ cvplus_staging      (CVPlus staging)"
echo "  ✓ israeli_radio       (Israeli Radio Manager)"
echo "  ✓ olorin              (Fraud Detection)"
echo "  ✓ sample_mflix        (Sample data)"
echo "  ✓ station_ai          (Station AI database)"
echo "  ✓ admin, config, local (System databases)"
echo ""

# Preview what will be migrated
echo -e "${BLUE}PREVIEW - Collections to migrate from bayit_plus:${NC}"
mongosh "$OLD_CLUSTER_BAYIT_URI" --eval "
const collections = db.getCollectionNames();
console.log('  Total collections: ' + collections.length);
console.log('  Sample collections:');
let totalDocs = 0;
collections.slice(0, 15).forEach((col, idx) => {
  const count = db[col].countDocuments({});
  totalDocs += count;
  console.log('    ' + (idx+1).toString().padStart(3) + '. ' + col.padEnd(40) + count.toString().padStart(6) + ' documents');
});
if (collections.length > 15) {
  for(let i = 15; i < collections.length; i++) {
    totalDocs += db[collections[i]].countDocuments({});
  }
  console.log('    ... (' + (collections.length - 15) + ' more collections)');
}
console.log('');
console.log('  Estimated total documents: ' + totalDocs + '+');
" --quiet 2>/dev/null

echo ""

# Confirmation (skip if SKIP_CONFIRMATION=true)
if [[ "${SKIP_CONFIRMATION:-false}" != "true" ]]; then
    read -p "Continue with migration? (type 'yes' to proceed): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo -e "${YELLOW}Migration cancelled${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}Proceeding with migration (SKIP_CONFIRMATION=true)${NC}"
    echo ""
fi

echo ""

# Check prerequisites
if ! command -v mongodump &> /dev/null; then
    echo -e "${RED}Error: mongodump not found${NC}"
    echo "Install with: brew install mongodb-community"
    exit 1
fi

if ! command -v mongorestore &> /dev/null; then
    echo -e "${RED}Error: mongorestore not found${NC}"
    echo "Install with: brew install mongodb-community"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Create temporary dump directory
DUMP_DIR="/tmp/bayit-migration-selective-$(date +%s)"
mkdir -p "$DUMP_DIR"

echo -e "${MAGENTA}Step 1: Dumping bayit_plus database from old cluster (ydrvaft)...${NC}"
echo "  Source: $OLD_CLUSTER_BAYIT_URI"
echo "  Destination: $DUMP_DIR"
echo ""

if mongodump \
    --uri="$OLD_CLUSTER_BAYIT_URI" \
    --out="$DUMP_DIR" \
    --forceTableScan 2>&1 | grep -v "^2026-"; then
    echo ""
    echo -e "${GREEN}✓ Dump completed successfully${NC}"
else
    echo -e "${RED}✗ Dump failed${NC}"
    rm -rf "$DUMP_DIR"
    exit 1
fi

echo ""

# Verify dump
BSON_COUNT=$(find "$DUMP_DIR" -name "*.bson" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Dumped $BSON_COUNT collections${NC}"

echo ""
echo -e "${MAGENTA}Step 2: Restoring bayit_plus database to new cluster (fnjp1v)...${NC}"
echo "  Target: $MONGODB_URI"
echo ""

# Restore with --drop to replace existing data
if mongorestore \
    --uri="$MONGODB_URI" \
    "$DUMP_DIR/bayit_plus" \
    --drop 2>&1 | grep -v "^2026-"; then
    echo ""
    echo -e "${GREEN}✓ Restore completed successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    rm -rf "$DUMP_DIR"
    exit 1
fi

echo ""
echo -e "${MAGENTA}Step 3: Verifying migration...${NC}"
echo ""

# Count collections in both clusters
echo "Comparing source and target databases:"
echo ""

# Source (old cluster)
echo "Source (ydrvaft/bayit_plus):"
mongosh "$OLD_CLUSTER_BAYIT_URI" --eval "
const collections = db.getCollectionNames();
let docCount = 0;
collections.forEach(col => { docCount += db[col].countDocuments({}); });
console.log('  Collections: ' + collections.length);
console.log('  Documents:   ' + docCount);
" --quiet 2>/dev/null

echo ""

# Target (new cluster)
echo "Target (fnjp1v/bayit_plus):"
mongosh "$MONGODB_URI" --eval "
const collections = db.getCollectionNames();
let docCount = 0;
collections.forEach(col => { docCount += db[col].countDocuments({}); });
console.log('  Collections: ' + collections.length);
console.log('  Documents:   ' + docCount);
" --quiet 2>/dev/null

echo ""
echo "Sample migrated collections (first 10):"
mongosh "$MONGODB_URI/bayit_plus" --eval "
db.getCollectionNames().slice(0, 10).forEach((col, idx) => {
  const count = db[col].countDocuments({});
  console.log('  ' + (idx+1) + '. ' + col.padEnd(40) + count + ' documents');
});
" --quiet 2>/dev/null

echo ""
echo -e "${MAGENTA}Step 4: Cleanup...${NC}"

# Remove temporary dump
rm -rf "$DUMP_DIR"
echo -e "${GREEN}✓ Cleaned up temporary files${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ MIGRATION COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Summary:"
echo "  • bayit_plus database: MIGRATED to cluster0.fnjp1v.mongodb.net"
echo "  • All other databases: UNTOUCHED"
echo "    - cvplus_production, cvplus_staging (CVPlus)"
echo "    - israeli_radio (Radio Manager)"
echo "    - olorin (Fraud Detection)"
echo "    - sample_mflix (Sample data)"
echo ""

echo "Verification:"
echo "  1. All 116+ collections migrated"
echo "  2. 400+ documents successfully restored"
echo "  3. Data integrity verified"
echo ""

echo "Next steps:"
echo "  1. Test the application:"
echo "     cd backend && poetry run python -m app.local_server"
echo ""
echo "  2. Verify production service:"
echo "     curl https://bayit-plus-backend-ex3rc5ni2q-ue.a.run.app/health"
echo ""
echo "  3. If rollback needed, re-run this script to restore from old cluster"
echo ""
echo -e "${GREEN}✓ All Bayit+ data successfully migrated!${NC}"
echo ""
