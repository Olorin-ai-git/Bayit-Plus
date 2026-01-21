/**
 * Premium Guard Middleware
 * Protects premium features and validates subscriptions
 */

import { Request, Response, NextFunction } from 'express';

export interface PremiumRequest extends Request {
  user?: {
    uid: string;
    email: string;
    subscriptionTier?: 'free' | 'premium' | 'enterprise';
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled';
  };
}

export const premiumGuard = (requiredTier: 'premium' | 'enterprise' = 'premium') => {
  return (req: PremiumRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userTier = req.user.subscriptionTier || 'free';
    const isAuthorized = checkTierAccess(userTier, requiredTier);

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        requiredTier,
        currentTier: userTier
      });
    }

    next();
  };
};

function checkTierAccess(userTier: string, requiredTier: string): boolean {
  const tierHierarchy = {
    'free': 0,
    'premium': 1,
    'enterprise': 2
  };

  const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] || 0;
  const requiredLevel = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 0;

  return userLevel >= requiredLevel;
}

export default premiumGuard;