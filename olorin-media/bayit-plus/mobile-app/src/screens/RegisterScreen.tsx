import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const RegisterScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Register Screen</Text>
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
    color: '#fff',
    fontSize: 18,
  },
});
