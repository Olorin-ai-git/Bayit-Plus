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
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { X } from 'lucide-react-native';
import styles from './styles/PlayerInfoPanel.styles';

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
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 300, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { onClose(); });
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Info</Text>
          <Pressable
            style={styles.closeButton} onPress={handleClose}
            hasTVPreferredFocus accessible accessibilityLabel="Close info panel"
          >
            <X size={28} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{metadata.title}</Text>

          {metadata.season_number && metadata.episode_number && (
            <Text style={styles.episodeInfo}>
              Season {metadata.season_number}, Episode {metadata.episode_number}
            </Text>
          )}

          <View style={styles.metadataRow}>
            {metadata.year && <Text style={styles.metadataItem}>{metadata.year}</Text>}
            {metadata.rating && <Text style={styles.metadataItem}>{metadata.rating}</Text>}
            {metadata.genre && <Text style={styles.metadataItem}>{metadata.genre}</Text>}
          </View>

          {metadata.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{metadata.description}</Text>
            </View>
          )}

          {metadata.cast && metadata.cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.castText}>{metadata.cast.join(', ')}</Text>
            </View>
          )}

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
