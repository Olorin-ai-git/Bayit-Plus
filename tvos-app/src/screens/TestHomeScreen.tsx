import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TestHomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bayit+ tvOS</Text>
      <Text style={styles.subtext}>Test Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
  },
  text: {
    color: '#00d9ff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#ffffff',
    fontSize: 24,
    marginTop: 16,
  },
});

export default TestHomeScreen;
