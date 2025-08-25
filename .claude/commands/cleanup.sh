#!/bin/bash

# CVPlus Cleanup Command
# Global command to clean and clear database and caches
# Usage: /cleanup [level] [options]

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
CVPLUS_DIR="/Users/gklainert/Documents/cvplus"
CLEANUP_SCRIPT="$CVPLUS_DIR/scripts/cleanup/cleanup-tool.js"
CLEANUP_WRAPPER="$CVPLUS_DIR/scripts/cleanup/cleanup.sh"
BACKUP_DIR="$HOME/.cvplus-backups"
AUDIT_DIR="$HOME/.cvplus-audit"

# Show header
echo -e "${BOLD}${MAGENTA}"
echo "=================================================="
echo "        CVPlus Cleanup Tool v1.0                "
echo "=================================================="
echo -e "${NC}"

# Check if CVPlus directory exists
if [ ! -d "$CVPLUS_DIR" ]; then
  echo -e "${RED}❌ Error: CVPlus directory not found at $CVPLUS_DIR${NC}"
  echo "Please ensure CVPlus is installed at the correct location."
  exit 1
fi

# Parse arguments
LEVEL="safe"
DRY_RUN=false
USER_ID=""
COLLECTIONS=""
HELP=false
BACKUP_ONLY=false
ROLLBACK=false
LIST_BACKUPS=false
BACKUP_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    safe|moderate|aggressive)
      LEVEL="$1"
      shift
      ;;
    --dry-run|-d)
      DRY_RUN=true
      shift
      ;;
    --user|-u)
      USER_ID="$2"
      shift 2
      ;;
    --collections|-c)
      COLLECTIONS="$2"
      shift 2
      ;;
    --backup-only)
      BACKUP_ONLY=true
      shift
      ;;
    --rollback|-r)
      ROLLBACK=true
      BACKUP_ID="$2"
      shift 2
      ;;
    --list-backups|-l)
      LIST_BACKUPS=true
      shift
      ;;
    --help|-h)
      HELP=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      HELP=true
      shift
      ;;
  esac
done

# Show help if requested
if [ "$HELP" = true ]; then
  echo -e "${CYAN}Usage:${NC} /cleanup [level] [options]"
  echo ""
  echo -e "${CYAN}Cleanup Levels:${NC}"
  echo "  safe        Clean temporary files, logs, and caches (default)"
  echo "  moderate    Clean generated content and non-essential data"
  echo "  aggressive  Clean all data including user records (requires confirmations)"
  echo ""
  echo -e "${CYAN}Options:${NC}"
  echo "  -d, --dry-run         Preview operations without executing"
  echo "  -u, --user USER_ID    Target specific user for cleanup"
  echo "  -c, --collections     Comma-separated list of collections to clean"
  echo "  --backup-only         Create backup without cleaning"
  echo "  -r, --rollback ID     Restore from a specific backup"
  echo "  -l, --list-backups    List all available backups"
  echo "  -h, --help           Show this help message"
  echo ""
  echo -e "${CYAN}Examples:${NC}"
  echo "  /cleanup                        # Safe cleanup (default)"
  echo "  /cleanup moderate               # Moderate cleanup"
  echo "  /cleanup aggressive --dry-run   # Preview aggressive cleanup"
  echo "  /cleanup moderate --user USER123 # Clean specific user data"
  echo "  /cleanup --rollback abc123      # Restore from backup"
  echo "  /cleanup --list-backups         # Show available backups"
  echo ""
  echo -e "${YELLOW}⚠️  Warning:${NC}"
  echo "  Aggressive cleanup will DELETE ALL DATA and requires multiple confirmations."
  echo "  Always use --dry-run first to preview operations."
  echo ""
  exit 0
fi

# Handle special operations
if [ "$LIST_BACKUPS" = true ]; then
  echo -e "${CYAN}📦 Available Backups:${NC}"
  echo ""
  
  if [ -d "$BACKUP_DIR" ]; then
    # List backups with details
    for backup in $(ls -1t "$BACKUP_DIR" 2>/dev/null | head -20); do
      if [ -f "$BACKUP_DIR/$backup/manifest.json" ]; then
        # Extract backup info
        DATE=$(echo "$backup" | sed 's/backup-//' | sed 's/-/ /g' | awk '{print $1"-"$2"-"$3" "$4":"$5":"$6}')
        SIZE=$(du -sh "$BACKUP_DIR/$backup" 2>/dev/null | cut -f1)
        
        # Try to get description from manifest
        DESC=$(grep -o '"description":"[^"]*' "$BACKUP_DIR/$backup/manifest.json" 2>/dev/null | cut -d'"' -f4)
        
        echo -e "${GREEN}📁 $backup${NC}"
        echo "   Date: $DATE"
        echo "   Size: $SIZE"
        if [ -n "$DESC" ]; then
          echo "   Description: $DESC"
        fi
        echo ""
      fi
    done
    
    TOTAL=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)
    echo -e "${BLUE}Total backups: $TOTAL${NC}"
  else
    echo -e "${YELLOW}No backups found.${NC}"
  fi
  exit 0
fi

if [ "$ROLLBACK" = true ]; then
  if [ -z "$BACKUP_ID" ]; then
    echo -e "${RED}❌ Error: Backup ID required for rollback${NC}"
    echo "Usage: /cleanup --rollback <backup-id>"
    echo "Use '/cleanup --list-backups' to see available backups"
    exit 1
  fi
  
  echo -e "${CYAN}🔄 Initiating rollback from backup: $BACKUP_ID${NC}"
  echo ""
  
  # Check if wrapper script exists
  if [ -f "$CLEANUP_WRAPPER" ]; then
    bash "$CLEANUP_WRAPPER" rollback "$BACKUP_ID"
  else
    echo -e "${RED}❌ Error: Cleanup wrapper script not found${NC}"
    echo "Expected at: $CLEANUP_WRAPPER"
    exit 1
  fi
  exit $?
fi

# Check if cleanup script exists
if [ ! -f "$CLEANUP_SCRIPT" ]; then
  echo -e "${YELLOW}⚠️ Cleanup script not found. Creating it now...${NC}"
  
  # Create the cleanup directory
  mkdir -p "$CVPLUS_DIR/scripts/cleanup"
  
  # Check if we should use the wrapper script
  if [ -f "$CLEANUP_WRAPPER" ]; then
    echo -e "${GREEN}✅ Using cleanup wrapper script${NC}"
  else
    echo -e "${RED}❌ Error: Cleanup scripts not found${NC}"
    echo "Please ensure the cleanup tool is properly installed."
    exit 1
  fi
fi

# Construct the cleanup command
if [ -f "$CLEANUP_WRAPPER" ]; then
  # Use the wrapper script for convenience
  echo -e "${CYAN}🧹 Starting cleanup operation...${NC}"
  echo -e "${BLUE}Level: ${BOLD}$LEVEL${NC}"
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Mode: DRY RUN (preview only)${NC}"
  fi
  
  if [ -n "$USER_ID" ]; then
    echo -e "${BLUE}Target User: $USER_ID${NC}"
  fi
  
  if [ -n "$COLLECTIONS" ]; then
    echo -e "${BLUE}Target Collections: $COLLECTIONS${NC}"
  fi
  
  echo ""
  
  # Build the command
  if [ "$DRY_RUN" = true ]; then
    bash "$CLEANUP_WRAPPER" dry-run "$LEVEL"
  elif [ "$BACKUP_ONLY" = true ]; then
    bash "$CLEANUP_WRAPPER" backup
  else
    # Build the node command with options
    CMD="node $CLEANUP_SCRIPT --level $LEVEL"
    
    if [ -n "$USER_ID" ]; then
      CMD="$CMD --user-id $USER_ID"
    fi
    
    if [ -n "$COLLECTIONS" ]; then
      CMD="$CMD --collections $COLLECTIONS"
    fi
    
    # Execute the command
    cd "$CVPLUS_DIR"
    eval $CMD
  fi
  
  EXIT_STATUS=$?
elif [ -f "$CLEANUP_SCRIPT" ]; then
  # Use the main cleanup script directly
  echo -e "${CYAN}🧹 Starting cleanup operation...${NC}"
  echo -e "${BLUE}Level: ${BOLD}$LEVEL${NC}"
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Mode: DRY RUN (preview only)${NC}"
  fi
  
  echo ""
  
  # Build command
  CMD="node $CLEANUP_SCRIPT --level $LEVEL"
  
  if [ "$DRY_RUN" = true ]; then
    CMD="$CMD --dry-run"
  fi
  
  if [ -n "$USER_ID" ]; then
    CMD="$CMD --user-id $USER_ID"
  fi
  
  if [ -n "$COLLECTIONS" ]; then
    CMD="$CMD --collections $COLLECTIONS"
  fi
  
  # Execute
  cd "$CVPLUS_DIR"
  eval $CMD
  EXIT_STATUS=$?
else
  echo -e "${RED}❌ Error: Cleanup tool not properly installed${NC}"
  exit 1
fi

# Show completion status
echo ""
echo -e "${CYAN}=================================================${NC}"

if [ $EXIT_STATUS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ Cleanup completed successfully${NC}"
  
  # Show helpful follow-up commands
  echo ""
  echo -e "${CYAN}Useful follow-up commands:${NC}"
  echo "  /cleanup --list-backups    # View available backups"
  echo "  /verify --quick            # Verify system health"
  
  if [ "$LEVEL" != "safe" ] && [ "$DRY_RUN" = false ]; then
    echo ""
    echo -e "${YELLOW}💡 Tip: A backup was created. Use '/cleanup --rollback <id>' if needed.${NC}"
  fi
else
  echo -e "${RED}${BOLD}❌ Cleanup completed with errors (exit code: $EXIT_STATUS)${NC}"
  
  if [ "$LEVEL" = "aggressive" ]; then
    echo ""
    echo -e "${YELLOW}⚠️ If the aggressive cleanup was interrupted, you may need to:${NC}"
    echo "  1. Check for partial backups in $BACKUP_DIR"
    echo "  2. Use '/cleanup --rollback <id>' to restore"
    echo "  3. Run '/verify' to check system status"
  fi
fi

# Show audit log location
if [ -d "$AUDIT_DIR" ] && [ "$DRY_RUN" = false ]; then
  LATEST_AUDIT=$(ls -1t "$AUDIT_DIR" 2>/dev/null | head -1)
  if [ -n "$LATEST_AUDIT" ]; then
    echo ""
    echo -e "${BLUE}📝 Audit log: $AUDIT_DIR/$LATEST_AUDIT${NC}"
  fi
fi

exit $EXIT_STATUS