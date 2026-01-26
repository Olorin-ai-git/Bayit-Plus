import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export function HomeScreenMobile() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏠 Home</Text>
      <Text style={styles.subtitle}>Featured Content</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome to BayitPlus</Text>
        <Text style={styles.cardText}>Your streaming experience starts here</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a9eff',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#ccc',
  },
});
