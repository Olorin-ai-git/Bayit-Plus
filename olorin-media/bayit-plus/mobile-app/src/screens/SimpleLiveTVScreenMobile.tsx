import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export function LiveTVScreenMobile() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📺 Live TV</Text>
      <Text style={styles.subtitle}>Watch Live Channels</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>Channel 1 - Live Stream Active</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardText}>Channel 2 - Coming Up</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#ccc',
  },
});
