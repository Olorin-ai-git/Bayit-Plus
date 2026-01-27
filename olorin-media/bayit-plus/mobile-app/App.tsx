import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#FFFF00', fontSize: 40, fontWeight: 'bold' }}>BAYITPLUS</Text>
      <Text style={{ color: '#00FF00', fontSize: 20, marginTop: 20 }}>App Running</Text>
    </View>
  );
}
