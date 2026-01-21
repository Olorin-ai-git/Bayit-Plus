#!/bin/bash
set -e

# Configuration
TV_IP="${TV_IP:-192.168.1.165}"
TV_PORT="26101"
APP_ID="AprZAARz4r.BayitPlus"
PROFILE_NAME="BAYITPLUS"

TIZEN_STUDIO="$HOME/tizen-studio"
TIZEN_CLI="$TIZEN_STUDIO/tools/ide/bin/tizen"
SDB="$TIZEN_STUDIO/tools/sdb"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/../web"

echo "🚀 Deploying Bayit+ to Samsung TV ($TV_IP)..."

# Step 1: Build
echo ""
echo "📦 Step 1/4: Building for Tizen..."
cd "$WEB_DIR"
npm run build:tizen

# Step 2: Prepare package
echo ""
echo "📋 Step 2/4: Preparing package..."
cd "$SCRIPT_DIR"
cp config.xml dist/
cp icon.png dist/

# Step 3: Sign package
echo ""
echo "🔐 Step 3/4: Signing package..."
"$TIZEN_CLI" package -t wgt -s "$PROFILE_NAME" -- dist

# Step 4: Connect and install
echo ""
echo "📲 Step 4/4: Installing on TV..."
"$SDB" connect "$TV_IP:$TV_PORT" 2>/dev/null || true
"$TIZEN_CLI" install -n dist/Bayit+.wgt -s "$TV_IP:$TV_PORT"

# Launch
echo ""
echo "🎬 Launching app..."
"$TIZEN_CLI" run -p "$APP_ID" -s "$TV_IP:$TV_PORT"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Commands:"
echo "  Launch:  $TIZEN_CLI run -p $APP_ID -s $TV_IP:$TV_PORT"
echo "  Debug:   $TIZEN_CLI debug -p $APP_ID -s $TV_IP:$TV_PORT"
echo "  Uninstall: $TIZEN_CLI uninstall -p $APP_ID -s $TV_IP:$TV_PORT"
