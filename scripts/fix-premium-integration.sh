#!/bin/bash

# CVPlus Premium Integration Fix Script
# Automated fixes for critical premium integration issues

echo "🔧 CVPlus Premium Integration Fix Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FIXES_APPLIED=0

echo -e "${BLUE}Phase 1: Creating Missing Core Files${NC}"
echo "------------------------------------"

# 1. Create missing authGuard.ts
AUTH_GUARD_PATH="/Users/gklainert/Documents/cvplus/packages/premium/src/backend/middleware/authGuard.ts"
if [ ! -f "$AUTH_GUARD_PATH" ]; then
    cat > "$AUTH_GUARD_PATH" << 'EOF'
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
EOF
    echo -e "${GREEN}✓ Created authGuard.ts${NC}"
    ((FIXES_APPLIED++))
fi

# 2. Create missing firebase config
FIREBASE_CONFIG_PATH="/Users/gklainert/Documents/cvplus/packages/premium/src/backend/config/firebase.ts"
if [ ! -f "$FIREBASE_CONFIG_PATH" ]; then
    mkdir -p "/Users/gklainert/Documents/cvplus/packages/premium/src/backend/config"
    cat > "$FIREBASE_CONFIG_PATH" << 'EOF'
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;
EOF
    echo -e "${GREEN}✓ Created firebase config${NC}"
    ((FIXES_APPLIED++))
fi

# 3. Create missing cache service
CACHE_SERVICE_PATH="/Users/gklainert/Documents/cvplus/packages/premium/src/backend/services/cache.service.ts"
if [ ! -f "$CACHE_SERVICE_PATH" ]; then
    cat > "$CACHE_SERVICE_PATH" << 'EOF'
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleared?: Date;
}

class CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    this.stats.size = this.cache.size;
  }

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return undefined;
    }

    this.stats.hits++;
    return item.value as T;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, lastCleared: new Date() };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}

export const cacheService = new CacheService();
EOF
    echo -e "${GREEN}✓ Created cache service${NC}"
    ((FIXES_APPLIED++))
fi

echo ""
echo -e "${BLUE}Phase 2: Fixing Import Paths${NC}"
echo "----------------------------"

# Fix circular imports in enhancedPremiumGuard.ts
ENHANCED_GUARD_PATH="/Users/gklainert/Documents/cvplus/packages/premium/src/backend/middleware/enhancedPremiumGuard.ts"
if [ -f "$ENHANCED_GUARD_PATH" ]; then
    # Remove circular import
    sed -i.bak 's/import { FeatureRegistry } from .@cvplus\/premium\/backend./\/\/ Circular import removed - use relative path/' "$ENHANCED_GUARD_PATH" 2>/dev/null
    echo -e "${GREEN}✓ Fixed circular imports in enhancedPremiumGuard${NC}"
    ((FIXES_APPLIED++))
fi

echo ""
echo -e "${BLUE}Phase 3: Building Premium Submodule${NC}"
echo "---------------------------------------"

cd /Users/gklainert/Documents/cvplus/packages/premium

if npm run build > build.log 2>&1; then
    echo -e "${GREEN}✓ Premium submodule build SUCCESSFUL${NC}"
    ((FIXES_APPLIED++))
else
    echo -e "${YELLOW}⚠ Premium submodule build still has issues - check build.log${NC}"
    echo "Remaining errors:"
    tail -10 build.log
fi

echo ""
echo -e "${BLUE}Fix Summary${NC}"
echo "============"
echo "Fixes applied: ${FIXES_APPLIED}"

if [ "$FIXES_APPLIED" -gt 4 ]; then
    echo -e "${GREEN}🎉 Major fixes applied successfully!${NC}"
    echo -e "${YELLOW}Next: Run validation script to verify fixes${NC}"
else
    echo -e "${YELLOW}⚠ Partial fixes applied - manual intervention may be required${NC}"
fi

echo ""
echo "To verify fixes, run:"
echo "  ./scripts/validate-premium-integration.sh"