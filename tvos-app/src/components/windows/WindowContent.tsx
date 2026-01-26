/**
 * WindowContent - Content renderer for multi-window system
 * Extracted from MultiWindowContainer to keep file under 200 lines
 */

import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import type { Window } from '../../stores/multiWindowStore';
import config from '@/config/appConfig';

interface WindowContentProps {
  window: Window;
  streamUrl?: string;
  loading: boolean;
  error: string | null;
}

export function WindowContent({ window, streamUrl, loading, error }: WindowContentProps) {
  // Render loading state
  if (loading) {
    return (
      <View style={styles.centerContent}>
        <View style={styles.spinner} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const { content_type } = window.content;

  // Render content based on type (placeholder for now - will be replaced with actual TV players)
  switch (content_type) {
    case 'live_channel':
    case 'live':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Stream unavailable</Text>
          </View>
        );
      }
      return (
        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>Live TV Player</Text>
          <Text style={styles.placeholderSubtext}>{window.title}</Text>
          <Text style={styles.placeholderSubtext} numberOfLines={1}>
            {streamUrl}
          </Text>
        </View>
      );

    case 'vod':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Content unavailable</Text>
          </View>
        );
      }
      return (
        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>VOD Player</Text>
          <Text style={styles.placeholderSubtext}>{window.title}</Text>
        </View>
      );

    case 'podcast':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Podcast unavailable</Text>
          </View>
        );
      }
      return (
        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>Podcast Player</Text>
          <Text style={styles.placeholderSubtext}>{window.title}</Text>
        </View>
      );

    case 'radio':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Station unavailable</Text>
          </View>
        );
      }
      return (
        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>Radio Player</Text>
          <Text style={styles.placeholderSubtext}>{window.title}</Text>
        </View>
      );

    case 'iframe':
      if (!window.content.iframe_url) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>iFrame URL not configured</Text>
          </View>
        );
      }
      return (
        <View style={styles.centerContent}>
          <Text style={styles.iframeText}>External content</Text>
          <Pressable style={styles.iframeButton} onPress={() => Linking.openURL(window.content.iframe_url!)}>
            <Text style={styles.iframeButtonText}>Open URL</Text>
          </Pressable>
        </View>
      );

    case 'custom':
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Component "{window.content.component_name}" not available</Text>
        </View>
      );

    default:
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No content configured</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  errorText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', paddingHorizontal: 24, textAlign: 'center' },
  contentPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  placeholderText: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  placeholderSubtext: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  iframeText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  iframeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iframeButtonText: { fontSize: 16, color: '#fff', fontWeight: '500' },
});
