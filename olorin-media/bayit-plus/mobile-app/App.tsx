import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default class App extends React.Component {
  render() {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>BayitPlus</Text>
        <Text style={{ color: '#4a9eff', fontSize: 18, marginTop: 16 }}>Mobile App</Text>
      </View>
    );
  }
}
