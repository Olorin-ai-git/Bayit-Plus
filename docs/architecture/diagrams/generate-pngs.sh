#!/bin/bash
# Generate PNG diagrams from Mermaid source files
# Requires: npm install -g @mermaid-js/mermaid-cli

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/png"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if mmdc is installed
if ! command -v mmdc &> /dev/null; then
    echo "Installing @mermaid-js/mermaid-cli..."
    npm install -g @mermaid-js/mermaid-cli
fi

# Mermaid config for dark theme
cat > "$SCRIPT_DIR/mermaid-config.json" << 'EOF'
{
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#8b5cf6",
    "primaryTextColor": "#ffffff",
    "primaryBorderColor": "#6d28d9",
    "lineColor": "#00d4ff",
    "secondaryColor": "#1a1a25",
    "tertiaryColor": "#12121a",
    "background": "#0a0a0f",
    "mainBkg": "#1a1a25",
    "secondBkg": "#12121a",
    "textColor": "#ffffff",
    "nodeBorder": "#2a2a3a"
  },
  "flowchart": {
    "curve": "basis",
    "padding": 20
  },
  "sequence": {
    "mirrorActors": false,
    "bottomMarginAdj": 10,
    "messageMargin": 35
  }
}
EOF

echo "Generating PNG diagrams..."

# Generate each diagram
for mmd_file in "$SCRIPT_DIR"/*.mmd; do
    filename=$(basename "$mmd_file" .mmd)
    echo "  Processing: $filename"
    mmdc -i "$mmd_file" -o "$OUTPUT_DIR/$filename.png" -c "$SCRIPT_DIR/mermaid-config.json" -b transparent -w 1920 -H 1080
done

echo ""
echo "Generated PNG files:"
ls -la "$OUTPUT_DIR"/*.png 2>/dev/null || echo "  No PNG files generated"

echo ""
echo "Done! PNG files are in: $OUTPUT_DIR"
