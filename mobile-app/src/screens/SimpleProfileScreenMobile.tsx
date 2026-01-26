import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export function ProfileScreenMobile() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>
      <Text style={styles.subtitle}>Account Settings</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>User Name: Viewer</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardText}>Preferences: Dark Mode Enabled</Text>
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
