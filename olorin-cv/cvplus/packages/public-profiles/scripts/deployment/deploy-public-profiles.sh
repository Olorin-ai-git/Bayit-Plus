#!/bin/bash
# Public Profiles Deployment Script
# Author: Gil Klainert
# Version: 1.0.0

set -e

echo "🚀 Deploying Public-Profiles Social Features..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment validation
if [ -z "$DEPLOYMENT_ENV" ]; then
    echo -e "${RED}❌ DEPLOYMENT_ENV not set. Use: development, staging, or production${NC}"
    exit 1
fi

echo -e "${BLUE}🌍 Deploying to: $DEPLOYMENT_ENV${NC}"

# Pre-deployment checks
echo -e "${BLUE}🔍 Pre-deployment validation...${NC}"

echo -e "${YELLOW}📋 Checking build status...${NC}"
npm run build:production

echo -e "${YELLOW}🧪 Running final tests...${NC}"
npm run test:deployment

echo -e "${YELLOW}🔒 Security audit...${NC}"
npm run audit:security

echo -e "${YELLOW}🌐 SEO validation...${NC}"
npm run validate:seo

# Deploy social assets
echo -e "${BLUE}📦 Deploying social assets...${NC}"

echo -e "${YELLOW}🎨 Deploying profile templates...${NC}"
npm run deploy:templates

echo -e "${YELLOW}📱 Deploying sharing widgets...${NC}"
npm run deploy:widgets

echo -e "${YELLOW}🖼️ Deploying social media assets...${NC}"
npm run deploy:social-assets

# Configure CDN
echo -e "${BLUE}🌐 Configuring CDN for social features...${NC}"

echo -e "${YELLOW}⚡ Optimizing asset delivery...${NC}"
npm run cdn:configure

echo -e "${YELLOW}🖼️ Setting up image optimization...${NC}"
npm run cdn:optimize-images

# Deploy Firebase Functions
echo -e "${BLUE}☁️ Deploying Firebase Functions...${NC}"

echo -e "${YELLOW}🔧 Deploying social API functions...${NC}"
firebase deploy --only functions:socialMedia,functions:publicProfile

echo -e "${YELLOW}📊 Deploying analytics functions...${NC}"
firebase deploy --only functions:profileAnalytics

echo -e "${YELLOW}🎯 Deploying SEO functions...${NC}"
firebase deploy --only functions:seoOptimization

# Deploy hosting
echo -e "${BLUE}🏠 Deploying static assets...${NC}"
firebase deploy --only hosting

# Post-deployment validation
echo -e "${BLUE}✅ Post-deployment validation...${NC}"

echo -e "${YELLOW}🏥 Health check: Social APIs...${NC}"
npm run healthcheck:social-apis

echo -e "${YELLOW}📈 Health check: Analytics integration...${NC}"
npm run healthcheck:analytics

echo -e "${YELLOW}🔍 Health check: SEO optimization...${NC}"
npm run healthcheck:seo

echo -e "${YELLOW}🌐 Health check: Profile accessibility...${NC}"
npm run healthcheck:accessibility

# Update social platform configurations
echo -e "${BLUE}🔗 Updating social platform configs...${NC}"

echo -e "${YELLOW}🐦 Updating Twitter app configuration...${NC}"
npm run config:update-twitter

echo -e "${YELLOW}💼 Updating LinkedIn app configuration...${NC}"
npm run config:update-linkedin

echo -e "${YELLOW}📘 Updating Facebook app configuration...${NC}"
npm run config:update-facebook

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"
npm run generate:deployment-report

# Notify stakeholders
if [ "$DEPLOYMENT_ENV" = "production" ]; then
    echo -e "${BLUE}📧 Notifying stakeholders...${NC}"
    npm run notify:deployment-success
fi

echo -e "${GREEN}🎉 Public-Profiles deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Social features are now live on $DEPLOYMENT_ENV${NC}"

# Display post-deployment information
echo -e "${BLUE}📋 Post-deployment checklist:${NC}"
echo -e "${YELLOW}  ✓ Verify social sharing functionality${NC}"
echo -e "${YELLOW}  ✓ Test profile accessibility${NC}"
echo -e "${YELLOW}  ✓ Monitor social analytics${NC}"
echo -e "${YELLOW}  ✓ Check SEO optimization${NC}"
echo -e "${YELLOW}  ✓ Validate privacy controls${NC}"