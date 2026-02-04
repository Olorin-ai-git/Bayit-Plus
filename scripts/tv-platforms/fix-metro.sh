#!/bin/bash
# Fix Metro Bundler Cache Issues for tvOS App

echo "🧹 Cleaning Metro bundler cache..."

# 1. Stop any running Metro instances
echo "1️⃣ Stopping Metro..."
pkill -f "react-native.*start" || true
pkill -f "metro" || true

# 2. Clear Metro cache
echo "2️⃣ Clearing Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# 3. Clear watchman (if installed)
if command -v watchman &> /dev/null; then
  echo "3️⃣ Clearing watchman..."
  watchman watch-del-all 2>/dev/null || true
fi

# 4. Clean Xcode build folder
echo "4️⃣ Cleaning Xcode build..."
rm -rf tvos/build
rm -rf ~/Library/Developer/Xcode/DerivedData/BayitPlusTVOS-* 2>/dev/null || true

# 5. Reinstall node_modules if needed
if [ "$1" == "--full" ]; then
  echo "5️⃣ Reinstalling node_modules (full reset)..."
  rm -rf node_modules
  npm install
fi

echo "✅ Metro cache cleared!"
echo ""
echo "📱 Next steps:"
echo "1. Start Metro:  npm start -- --reset-cache"
echo "2. In new terminal, run: npm run tvos"

