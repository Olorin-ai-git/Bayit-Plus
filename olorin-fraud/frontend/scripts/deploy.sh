#!/bin/bash

# Olorin Frontend Deployment Script
# This script builds and deploys the Olorin frontend to Firebase hosting

set -e  # Exit on any error

echo "🚀 Starting Olorin Frontend Deployment"
echo "======================================"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Make sure you're in the olorin-front directory."
  exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "❌ Error: Firebase CLI not found. Installing..."
  npm install -g firebase-tools
fi

# Set environment variables for production build
export NODE_ENV=production
export REACT_APP_FIREBASE_PROJECT_ID=olorin-ai
export REACT_APP_FIREBASE_AUTH_DOMAIN=olorin-ai.firebaseapp.com
export REACT_APP_FIREBASE_MEASUREMENT_ID=G-HM69PZF9QE

# Default to production API URL if not set
if [ -z "$REACT_APP_API_BASE_URL" ]; then
  export REACT_APP_API_BASE_URL=https://olorin-server.herokuapp.com
  echo "📡 Using default API URL: $REACT_APP_API_BASE_URL"
else
  echo "📡 Using API URL: $REACT_APP_API_BASE_URL"
fi

echo ""
echo "🔧 Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build successful!"
echo ""

echo "🚀 Deploying to Firebase hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed!"
  exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo "🌐 Application URL: https://olorin-ai.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/olorin-ai/overview"
echo ""
echo "🎉 Deployment completed successfully!" 