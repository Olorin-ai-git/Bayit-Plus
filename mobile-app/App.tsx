/**
 * Bayit+ iOS Mobile App
 * Main app entry point - MINIMAL TEST VERSION
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bayit+ Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default App;
