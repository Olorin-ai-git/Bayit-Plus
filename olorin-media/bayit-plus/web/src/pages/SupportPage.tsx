/**
 * Support Page
 * Web wrapper for the shared SupportScreen component
 */

import { View, StyleSheet } from 'react-native';
import { SupportPortal } from '@bayit/shared/components/support';
import { colors } from '@olorin/design-tokens';

export default function SupportPage() {
  return (
    <View style={styles.container}>
      <SupportPortal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
