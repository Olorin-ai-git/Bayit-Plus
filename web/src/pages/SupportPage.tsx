/**
 * Support Page
 * Web wrapper for the shared SupportScreen component
 */

import { View } from 'react-native';
import { SupportPortal } from '@bayit/shared/components/support';

export default function SupportPage() {
  return (
    <View className="flex-1 bg-black">
      <SupportPortal />
    </View>
  );
}
