/**
 * Shared Components Stub
 *
 * DEVELOPMENT STUB ONLY - DO NOT USE IN PRODUCTION
 *
 * This stub exists for build compatibility when the shared directory is unavailable.
 * All components render error messages to ensure proper configuration before deployment.
 *
 * To use real components, ensure the shared directory is correctly linked
 * in metro.config.js.
 */

import React from 'react';
import { View, Text } from 'react-native';

const STUB_MESSAGE = 'Stub component. Link shared directory.';

const StubComponent: React.FC<{ name: string }> = ({ name }) => (
  <View style={{ padding: 16, backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 8, margin: 4 }}>
    <Text style={{ color: '#ff6b6b', fontSize: 12, textAlign: 'center' }}>
      [{name}] {STUB_MESSAGE}
    </Text>
  </View>
);

// Export from mobile components where available
export { GlassView, GlassButton, GlassModal, GlassBadge } from '../../../shared/components/ui';
export { GlassCategoryPill } from '../../../shared/components/ui';

// Stub components - render error messages
export const AnimatedLogo: React.FC = () => <StubComponent name="AnimatedLogo" />;
export const ContentRow: React.FC = () => <StubComponent name="ContentRow" />;
export const GlassCarousel: React.FC = () => <StubComponent name="GlassCarousel" />;
export const FeaturedCarousel: React.FC = () => <StubComponent name="FeaturedCarousel" />;
export const TrendingRow: React.FC = () => <StubComponent name="TrendingRow" />;
export const MorningRitualCard: React.FC = () => <StubComponent name="MorningRitualCard" />;
export const GlassStatCard: React.FC = () => <StubComponent name="GlassStatCard" />;
