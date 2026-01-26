/**
 * PlayerInfoPanel - Slide-in info panel for TV player
 *
 * Features:
 * - Content metadata display
 * - Related content suggestions
 * - Slide-in animation from right (400ms)
 * - Close button (default focused)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { X } from 'lucide-react-native';
import { config } from '../../config/appConfig';

interface ContentMetadata {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  year?: number;
  rating?: string;
  duration?: number;
  cast?: string[];
  director?: string;
  episode_number?: number;
  season_number?: number;
}

interface PlayerInfoPanelProps {
  metadata: ContentMetadata;
  onClose: () => void;
}

export const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({
  metadata,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Info</Text>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hasTVPreferredFocus
            accessible
            accessibilityLabel="Close info panel"
          >
            <X size={28} color="#ffffff" />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>{metadata.title}</Text>

          {/* Episode Info */}
          {metadata.season_number && metadata.episode_number && (
            <Text style={styles.episodeInfo}>
              Season {metadata.season_number}, Episode {metadata.episode_number}
            </Text>
          )}

          {/* Metadata Row */}
          <View style={styles.metadataRow}>
            {metadata.year && (
              <Text style={styles.metadataItem}>{metadata.year}</Text>
            )}
            {metadata.rating && (
              <Text style={styles.metadataItem}>{metadata.rating}</Text>
            )}
            {metadata.genre && (
              <Text style={styles.metadataItem}>{metadata.genre}</Text>
            )}
          </View>

          {/* Description */}
          {metadata.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{metadata.description}</Text>
            </View>
          )}

          {/* Cast */}
          {metadata.cast && metadata.cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.castText}>{metadata.cast.join(', ')}</Text>
            </View>
          )}

          {/* Director */}
          {metadata.director && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.directorText}>{metadata.director}</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    width: 500,
    height: '100%',
    backgroundColor: 'rgba(20,20,35,0.95)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: config.tv.safeZoneMarginPt,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 32,
    gap: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 48,
  },
  episodeInfo: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#A855F7',
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metadataItem: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  description: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: config.tv.minButtonTextSizePt * 1.5,
  },
  castText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: config.tv.minButtonTextSizePt * 1.4,
  },
  directorText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
});
