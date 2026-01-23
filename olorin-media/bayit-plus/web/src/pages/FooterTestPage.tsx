/**
 * Footer Test Page
 *
 * Minimal page for testing the migrated Footer in isolation
 * WITHOUT the full Layout (to avoid Header/Sidebar StyleSheet issues)
 */

import { View } from 'react-native';
import Footer from '../components/layout/Footer';
import { FeatureFlagProvider } from '../providers/FeatureFlagProvider';

export default function FooterTestPage() {
  return (
    <FeatureFlagProvider>
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', minHeight: '100vh' }}>
        {/* Content Area */}
        <View style={{ flex: 1, paddingTop: 100, paddingHorizontal: 20 }}>
          <h1 style={{ color: 'white', textAlign: 'center' }}>Footer Test Page</h1>
          <p style={{ color: '#888', textAlign: 'center' }}>
            This page tests the migrated Footer component in isolation.
          </p>
        </View>

        {/* Footer at bottom */}
        <Footer />
      </View>
    </FeatureFlagProvider>
  );
}
