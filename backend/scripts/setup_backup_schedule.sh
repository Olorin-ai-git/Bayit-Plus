#!/bin/bash
# Setup script to schedule automatic daily backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_FILE="$SCRIPT_DIR/com.bayitplus.backup.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
INSTALLED_PLIST="$LAUNCH_AGENTS_DIR/com.bayitplus.backup.plist"

echo "🔧 Setting up automatic database backups..."
echo ""

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Check if already installed
if [ -f "$INSTALLED_PLIST" ]; then
    echo "⚠️  Backup schedule already exists. Unloading old schedule..."
    launchctl unload "$INSTALLED_PLIST" 2>/dev/null
    rm "$INSTALLED_PLIST"
fi

# Copy plist to LaunchAgents
echo "📋 Installing launch agent..."
cp "$PLIST_FILE" "$INSTALLED_PLIST"

# Set proper permissions
chmod 644 "$INSTALLED_PLIST"

# Load the launch agent
echo "🚀 Loading launch agent..."
if launchctl load "$INSTALLED_PLIST"; then
    echo ""
    echo "✅ Automatic backups configured successfully!"
    echo ""
    echo "📅 Backup Schedule:"
    echo "   - Runs daily at 3:00 AM"
    echo "   - Keeps backups for 30 days"
    echo "   - Location: $(dirname "$SCRIPT_DIR")/backups"
    echo ""
    echo "📝 Logs:"
    echo "   - Backup log: $(dirname "$SCRIPT_DIR")/backups/backup.log"
    echo "   - Error log: $(dirname "$SCRIPT_DIR")/backups/backup_stderr.log"
    echo ""
    echo "🔧 Management Commands:"
    echo "   - Run backup now: $SCRIPT_DIR/backup_database.sh"
    echo "   - View status: launchctl list | grep bayitplus"
    echo "   - Disable: launchctl unload $INSTALLED_PLIST"
    echo "   - Enable: launchctl load $INSTALLED_PLIST"
    echo ""
else
    echo ""
    echo "❌ Failed to load launch agent"
    echo "Try running with: launchctl load -w $INSTALLED_PLIST"
    exit 1
fi
