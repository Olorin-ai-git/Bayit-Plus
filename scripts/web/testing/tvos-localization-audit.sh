#!/bin/bash
# tvOS Localization Audit Script
# Captures screenshots of the Bayit+ TV app in all supported languages

set -e

SIMULATOR_NAME="${TVOS_SIMULATOR_NAME:-Apple TV 4K (3rd generation)}"
APP_BUNDLE_ID="${TVOS_BUNDLE_ID:-com.bayit.plus.tv}"
SCREENSHOT_DIR="screenshots/tvos"
LANGUAGES=("he" "en" "es" "zh" "fr" "it" "hi" "ta" "bn" "ja")

# Screens to capture
SCREENS=(
  "home"
  "vod"
  "live"
  "radio"
  "settings"
)

echo "🖥️  Bayit+ tvOS Localization Audit"
echo "=================================="
echo ""

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"

# Find simulator UDID
SIMULATOR_UDID=$(xcrun simctl list devices available | grep "$SIMULATOR_NAME" | grep -oE "[A-F0-9-]{36}" | head -1)

if [ -z "$SIMULATOR_UDID" ]; then
  echo "❌ Simulator not found: $SIMULATOR_NAME"
  echo ""
  echo "Available tvOS simulators:"
  xcrun simctl list devices available | grep -i "tv"
  exit 1
fi

echo "📱 Simulator: $SIMULATOR_NAME"
echo "   UDID: $SIMULATOR_UDID"
echo ""

# Check if simulator is booted
BOOT_STATUS=$(xcrun simctl list devices | grep "$SIMULATOR_UDID" | grep -o "(Booted)" || true)
if [ -z "$BOOT_STATUS" ]; then
  echo "🔄 Booting simulator..."
  xcrun simctl boot "$SIMULATOR_UDID"
  sleep 10
  echo "✅ Simulator booted"
else
  echo "✅ Simulator already running"
fi

# Function to take screenshot
take_screenshot() {
  local lang=$1
  local screen=$2
  local filename="${SCREENSHOT_DIR}/${screen}-${lang}.png"

  echo "   📸 Capturing: $screen"
  xcrun simctl io "$SIMULATOR_UDID" screenshot "$filename" 2>/dev/null

  # Optimize PNG if pngquant is available
  if command -v pngquant &> /dev/null; then
    pngquant --force --quality=80-100 --output "$filename" "$filename" 2>/dev/null || true
  fi
}

# Function to set language
set_language() {
  local lang=$1
  echo ""
  echo "🌐 Setting language: $lang"

  # Set simulator language preferences
  xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLanguages -array "$lang"

  case $lang in
    "he")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "he_IL"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool YES
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool YES
      ;;
    "en")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "en_US"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "es")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "es_ES"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "zh")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "zh_CN"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "fr")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "fr_FR"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "it")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "it_IT"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "hi")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "hi_IN"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "ta")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "ta_IN"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "bn")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "bn_BD"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
    "ja")
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleLocale -string "ja_JP"
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain AppleTextDirection -bool NO
      xcrun simctl spawn "$SIMULATOR_UDID" defaults write -globalDomain NSForceRightToLeftWritingDirection -bool NO
      ;;
  esac

  # Terminate and relaunch app to apply language
  xcrun simctl terminate "$SIMULATOR_UDID" "$APP_BUNDLE_ID" 2>/dev/null || true
  sleep 1

  echo "   🚀 Launching app..."
  xcrun simctl launch "$SIMULATOR_UDID" "$APP_BUNDLE_ID" 2>/dev/null || {
    echo "   ⚠️  Could not launch app. Make sure it's installed."
    echo "   Install with: xcrun simctl install $SIMULATOR_UDID /path/to/app.app"
    return 1
  }

  sleep 5
}

# Function to navigate using simctl remote commands
navigate_to_screen() {
  local screen=$1

  # Press menu to ensure we're at a known state
  xcrun simctl io "$SIMULATOR_UDID" sendkey menu 2>/dev/null || true
  sleep 0.5

  case $screen in
    "home")
      # Already at home after menu press
      sleep 1
      ;;
    "vod")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "live")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "radio")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      sleep 0.3
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "settings")
      # Navigate to settings (usually at the end or via menu)
      xcrun simctl io "$SIMULATOR_UDID" sendkey menu
      sleep 0.5
      for i in {1..5}; do
        xcrun simctl io "$SIMULATOR_UDID" sendkey down
        sleep 0.2
      done
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
  esac
}

# Main audit loop
for lang in "${LANGUAGES[@]}"; do
  if set_language "$lang"; then
    echo "   📋 Capturing screens..."

    for screen in "${SCREENS[@]}"; do
      navigate_to_screen "$screen"
      take_screenshot "$lang" "$screen"
    done

    echo "   ✅ Done with $lang"
  fi
done

echo ""
echo "=================================="
echo "✅ Audit complete!"
echo ""

# Generate comparison HTML
echo "📄 Generating comparison report..."

cat > "$SCREENSHOT_DIR/comparison.html" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tvOS Localization Comparison - Bayit+</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 40px;
      margin: 0;
      min-height: 100vh;
    }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #6B21A8, #9333EA);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      text-align: center;
      color: #888;
      margin-bottom: 40px;
    }
    .screen-group {
      margin-bottom: 60px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 30px;
    }
    .screen-group h2 {
      border-bottom: 2px solid #6B21A8;
      padding-bottom: 15px;
      margin-bottom: 25px;
      font-size: 1.5rem;
    }
    .comparison {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 20px;
    }
    .lang-screenshot {
      text-align: center;
    }
    .lang-screenshot img {
      width: 100%;
      border: 3px solid #333;
      border-radius: 12px;
      transition: transform 0.3s, border-color 0.3s;
      cursor: zoom-in;
    }
    .lang-screenshot img:hover {
      transform: scale(1.02);
      border-color: #6B21A8;
    }
    .lang-screenshot h3 {
      margin: 15px 0 5px;
      font-size: 1.1rem;
    }
    .lang-label {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .lang-he { background: #065f46; }
    .lang-en { background: #1e40af; }
    .lang-es { background: #b45309; }
    .lang-zh { background: #dc2626; }
    .lang-fr { background: #7c3aed; }
    .lang-it { background: #059669; }
    .lang-hi { background: #d97706; }
    .lang-ta { background: #0891b2; }
    .lang-bn { background: #4f46e5; }
    .lang-ja { background: #be185d; }
    .rtl-badge {
      background: #dc2626;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      margin-left: 8px;
    }
    @media (max-width: 1200px) {
      .comparison { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <h1>🖥️ tvOS Localization Audit</h1>
  <p class="subtitle">Bayit+ TV App - Visual Comparison Across Languages</p>
HTMLHEAD

for screen in "${SCREENS[@]}"; do
  screen_title=$(echo "$screen" | sed 's/.*/\u&/')
  cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
  <div class="screen-group">
    <h2>📺 ${screen_title}</h2>
    <div class="comparison">
EOF

  for lang in "${LANGUAGES[@]}"; do
    lang_upper=$(echo "$lang" | tr '[:lower:]' '[:upper:]')
    rtl_badge=""
    if [ "$lang" == "he" ]; then
      rtl_badge='<span class="rtl-badge">RTL</span>'
    fi

    cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
      <div class="lang-screenshot">
        <img src="${screen}-${lang}.png" alt="${screen} in ${lang}" loading="lazy">
        <h3><span class="lang-label lang-${lang}">${lang_upper}</span>${rtl_badge}</h3>
      </div>
EOF
  done

  cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
    </div>
  </div>
EOF
done

cat >> "$SCREENSHOT_DIR/comparison.html" << 'HTMLFOOT'
  <script>
    // Click to zoom
    document.querySelectorAll('.lang-screenshot img').forEach(img => {
      img.addEventListener('click', () => {
        if (img.style.position === 'fixed') {
          img.style = '';
        } else {
          img.style.position = 'fixed';
          img.style.top = '50%';
          img.style.left = '50%';
          img.style.transform = 'translate(-50%, -50%)';
          img.style.maxWidth = '90vw';
          img.style.maxHeight = '90vh';
          img.style.zIndex = '9999';
          img.style.cursor = 'zoom-out';
        }
      });
    });
  </script>
</body>
</html>
HTMLFOOT

echo "📁 Screenshots saved to: $SCREENSHOT_DIR"
echo "📄 Comparison report: $SCREENSHOT_DIR/comparison.html"
echo ""

# Open the comparison report
if [ "$(uname)" == "Darwin" ]; then
  open "$SCREENSHOT_DIR/comparison.html"
fi

echo "🎉 Done!"
