import React from 'react';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredTier?: 'free' | 'pro' | 'enterprise';
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  fallback = <div className="text-gray-600">Premium feature required</div>,
  requiredTier = 'pro',
}) => {
  // Note: Integration point for actual premium service
  const isPremium = false;

  if (!isPremium) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export const ExternalDataSourcesGate: React.FC<PremiumGateProps> = PremiumGate;
