/**
 * Shared Components Stub
 * Temporary implementation until monorepo is configured
 */

import React from 'react';
import { View, Text, StyleSheet, ViewProps, TextProps, Pressable } from 'react-native';

// Export from mobile components where available
export { GlassView, GlassButton, GlassModal, GlassBadge } from '../../../shared/components/ui';
export { GlassCategoryPill } from '../../../shared/components/ui';

// Stub components
export const AnimatedLogo: React.FC<any> = () => null;

export const ContentRow: React.FC<any> = ({ items = [], title = '', columns = 2 }) => {
  return (
    <View style={{ padding: 16 }}>
      {title && <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12, color: '#fff' }}>{title}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.slice(0, 6).map((item: any, index: number) => (
          <View key={index} style={{ width: `${100 / columns}%`, padding: 4 }}>
            <View style={{ height: 150, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const GlassCarousel: React.FC<any> = ({ items = [], height = 200 }) => {
  return (
    <View style={{ height, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, margin: 16 }}>
      <Text style={{ color: '#fff', padding: 20 }}>Hero Carousel</Text>
    </View>
  );
};

export const FeaturedCarousel: React.FC<any> = (props) => <GlassCarousel {...props} />;

export const TrendingRow: React.FC<any> = (props) => <ContentRow title="Trending" {...props} />;

export const MorningRitualCard: React.FC<any> = () => {
  return (
    <View style={{ margin: 16, padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Morning Ritual</Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>Start your day with Jewish wisdom</Text>
    </View>
  );
};

export const GlassStatCard: React.FC<any> = ({ title, value, icon, style }) => {
  return (
    <View style={[{ padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }, style]}>
      {icon && <Text style={{ fontSize: 24, marginBottom: 8 }}>{icon}</Text>}
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{title}</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', marginTop: 4 }}>{value}</Text>
    </View>
  );
};
