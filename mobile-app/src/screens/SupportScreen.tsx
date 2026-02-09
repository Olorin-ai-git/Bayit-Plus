import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const SupportScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Support Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.Background.primary,
  },
  text: {
    color: Colors.white,
    fontSize: 18,
  },
});
