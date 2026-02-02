#!/bin/bash
# Fix CORS configuration for bayit-plus-media-new bucket

BUCKET="bayit-plus-media-new"

echo "======================================================================"
echo "Configuring CORS for GCS bucket: $BUCKET"
echo "======================================================================"

# Create CORS configuration file
cat > /tmp/cors-config.json <<'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Range", "Accept-Ranges"],
    "maxAgeSeconds": 3600
  }
]
EOF

echo ""
echo "Applying CORS configuration..."
gsutil cors set /tmp/cors-config.json gs://$BUCKET

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Verifying..."
    gsutil cors get gs://$BUCKET
    echo ""
    echo "======================================================================"
    echo "✅ Done! The HLS stream should now be accessible from web browsers."
    echo "======================================================================"
else
    echo ""
    echo "❌ Failed to apply CORS configuration."
    echo "   Make sure you have permissions to modify the bucket."
fi

# Clean up
rm -f /tmp/cors-config.json
