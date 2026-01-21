#!/bin/bash
# Social Sharing Test Script for Public-Profiles Module
# Author: Gil Klainert
# Version: 1.0.0

set -e

echo "🧪 Testing Public-Profiles Social Sharing Features..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
export NODE_ENV=test
export SOCIAL_TEST_MODE=true

echo -e "${BLUE}📱 Testing social media platform integrations...${NC}"

# Test social platform APIs
echo -e "${YELLOW}🔗 Testing Twitter/X API integration...${NC}"
npm run test:twitter-integration

echo -e "${YELLOW}💼 Testing LinkedIn API integration...${NC}"
npm run test:linkedin-integration

echo -e "${YELLOW}📘 Testing Facebook API integration...${NC}"
npm run test:facebook-integration

echo -e "${YELLOW}📸 Testing Instagram integration...${NC}"
npm run test:instagram-integration

# Test sharing functionality
echo -e "${BLUE}🚀 Testing social sharing widgets...${NC}"

echo -e "${YELLOW}🔗 Testing share button generation...${NC}"
npm run test:share-buttons

echo -e "${YELLOW}📊 Testing social analytics tracking...${NC}"
npm run test:social-analytics

echo -e "${YELLOW}🏷️ Testing social meta tag generation...${NC}"
npm run test:social-meta-tags

# Test Open Graph and Twitter Cards
echo -e "${BLUE}🏷️ Testing social metadata...${NC}"

echo -e "${YELLOW}📖 Testing Open Graph tag generation...${NC}"
npm run test:open-graph

echo -e "${YELLOW}🐦 Testing Twitter Card generation...${NC}"
npm run test:twitter-cards

echo -e "${YELLOW}📱 Testing LinkedIn sharing cards...${NC}"
npm run test:linkedin-cards

# Test social proof features
echo -e "${BLUE}✨ Testing social proof features...${NC}"

echo -e "${YELLOW}👥 Testing social connection displays...${NC}"
npm run test:social-connections

echo -e "${YELLOW}💬 Testing testimonials integration...${NC}"
npm run test:testimonials

echo -e "${YELLOW}🏆 Testing endorsements system...${NC}"
npm run test:endorsements

# Test privacy controls
echo -e "${BLUE}🔒 Testing privacy and security...${NC}"

echo -e "${YELLOW}🛡️ Testing privacy control enforcement...${NC}"
npm run test:privacy-controls

echo -e "${YELLOW}🔐 Testing data sanitization...${NC}"
npm run test:data-sanitization

echo -e "${YELLOW}📊 Testing GDPR compliance...${NC}"
npm run test:gdpr-compliance

# Performance testing
echo -e "${BLUE}⚡ Testing performance...${NC}"

echo -e "${YELLOW}🚀 Testing sharing widget load times...${NC}"
npm run test:widget-performance

echo -e "${YELLOW}📱 Testing mobile sharing experience...${NC}"
npm run test:mobile-sharing

# End-to-end testing
echo -e "${BLUE}🔄 Running end-to-end social tests...${NC}"
npm run test:e2e-social

# Generate test reports
echo -e "${BLUE}📊 Generating social sharing test reports...${NC}"
npm run generate:social-test-report

echo -e "${GREEN}✅ All social sharing tests completed successfully!${NC}"
echo -e "${GREEN}🌐 Social features are ready for production deployment${NC}"