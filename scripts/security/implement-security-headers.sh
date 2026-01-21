#!/bin/bash

# CVPlus Security Headers Implementation Script
# Author: Gil Klainert
# Date: 2025-08-22
# Description: Implements comprehensive security headers for Firebase Hosting

set -e

echo "🔒 CVPlus Security Headers Implementation"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLI not found. Please install it first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Firebase CLI found${NC}"
}

# Function to backup current firebase.json
backup_firebase_config() {
    if [ -f "firebase.json" ]; then
        BACKUP_FILE="firebase.json.backup.$(date +%Y%m%d_%H%M%S)"
        cp firebase.json "$BACKUP_FILE"
        echo -e "${GREEN}✅ Backed up firebase.json to $BACKUP_FILE${NC}"
    fi
}

# Function to update firebase.json with security headers
update_firebase_config() {
    echo -e "${YELLOW}📝 Updating firebase.json with security headers...${NC}"
    
    # Read current firebase.json
    if [ ! -f "firebase.json" ]; then
        echo -e "${RED}❌ firebase.json not found${NC}"
        exit 1
    fi
    
    # Create Node.js script to update configuration
    cat > update-security-headers.js << 'EOJS'
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));

// Ensure hosting configuration exists
if (!config.hosting) {
    config.hosting = {};
}

// Add security headers
config.hosting.headers = [
    {
        source: '**',
        headers: [
            // Content Security Policy
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://*.cloudflare.com https://js.stripe.com https://checkout.stripe.com",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.stripe.com",
                    "font-src 'self' data: https://fonts.gstatic.com",
                    "img-src 'self' data: blob: https: http:",
                    "media-src 'self' blob: https:",
                    "connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://api.anthropic.com https://api.stripe.com https://checkout.stripe.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com",
                    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://hooks.stripe.com https://calendly.com",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'none'",
                    "upgrade-insecure-requests"
                ].join('; ')
            },
            // Strict Transport Security
            {
                key: 'Strict-Transport-Security',
                value: 'max-age=31536000; includeSubDomains; preload'
            },
            // X-Frame-Options
            {
                key: 'X-Frame-Options',
                value: 'SAMEORIGIN'
            },
            // X-Content-Type-Options
            {
                key: 'X-Content-Type-Options',
                value: 'nosniff'
            },
            // X-XSS-Protection
            {
                key: 'X-XSS-Protection',
                value: '1; mode=block'
            },
            // Referrer-Policy
            {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin'
            },
            // Permissions-Policy
            {
                key: 'Permissions-Policy',
                value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
            }
        ]
    },
    // Special headers for service worker
    {
        source: '/sw.js',
        headers: [
            {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate'
            },
            {
                key: 'Service-Worker-Allowed',
                value: '/'
            }
        ]
    },
    // Headers for static assets
    {
        source: '**/*.@(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)',
        headers: [
            {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable'
            }
        ]
    }
];

// Write updated configuration
fs.writeFileSync('firebase.json', JSON.stringify(config, null, 2));
console.log('✅ firebase.json updated successfully');
EOJS
    
    # Run the Node.js script
    node update-security-headers.js || {
        echo -e "${RED}❌ Failed to update firebase.json${NC}"
        exit 1
    }
    
    # Clean up temporary script
    rm update-security-headers.js
    
    echo -e "${GREEN}✅ Security headers added to firebase.json${NC}"
}

# Function to validate the configuration
validate_config() {
    echo -e "${YELLOW}🔍 Validating configuration...${NC}"
    
    # Check if firebase.json is valid JSON
    if node -e "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✅ firebase.json is valid${NC}"
    else
        echo -e "${RED}❌ firebase.json is invalid JSON${NC}"
        exit 1
    fi
}

# Function to create security report
create_report() {
    echo -e "${YELLOW}📊 Creating security headers report...${NC}"
    
    REPORT_FILE="docs/security/security-headers-report-$(date +%Y%m%d).md"
    mkdir -p docs/security
    
    cat > "$REPORT_FILE" << EOREPORT
# Security Headers Implementation Report

**Date:** $(date)
**Project:** CVPlus
**Author:** Gil Klainert

## Implemented Headers

### 1. Content Security Policy (CSP)
- Restricts resource loading to trusted sources
- Prevents XSS attacks
- Configured for Firebase, Stripe, and Anthropic APIs

### 2. Strict-Transport-Security (HSTS)
- Forces HTTPS connections
- Max age: 1 year
- Includes subdomains

### 3. X-Frame-Options
- Set to SAMEORIGIN
- Prevents clickjacking attacks

### 4. X-Content-Type-Options
- Set to nosniff
- Prevents MIME type sniffing

### 5. X-XSS-Protection
- Enables XSS filter in browsers
- Mode: block

### 6. Referrer-Policy
- Set to strict-origin-when-cross-origin
- Controls referrer information

### 7. Permissions-Policy
- Disables unused browser features
- Reduces attack surface

## Testing Checklist
- [ ] CSP violations checked in browser console
- [ ] HTTPS redirect working
- [ ] Frame blocking tested
- [ ] Headers visible in browser DevTools
- [ ] No functionality broken

## Notes
- All external services whitelisted in CSP
- Stripe checkout iframe explicitly allowed
- Service worker headers configured separately
EOREPORT
    
    echo -e "${GREEN}✅ Report saved to $REPORT_FILE${NC}"
}

# Main execution flow
main() {
    echo -e "${YELLOW}Starting security headers implementation...${NC}"
    echo
    
    # Navigate to project root
    cd "$(dirname "$0")/../.."
    
    # Step 1: Check prerequisites
    check_firebase_cli
    
    # Step 2: Backup current configuration
    backup_firebase_config
    
    # Step 3: Update firebase.json
    update_firebase_config
    
    # Step 4: Validate configuration
    validate_config
    
    # Step 5: Generate report
    create_report
    
    echo
    echo -e "${GREEN}🎉 Security headers implementation complete!${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "  1. Review the updated firebase.json"
    echo "  2. Test locally with firebase serve"
    echo "  3. Deploy to staging for testing"
    echo "  4. Check browser console for CSP violations"
    echo "  5. Deploy to production when ready"
}

# Run main function
main "$@"
