/**
 * WindowLayoutSelector - TV layout selection modal
 * Grid 2x2, Sidebar, or Fullscreen layout modes
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Grid3x3, Sidebar, Maximize } from 'lucide-react-native';
import { useMultiWindowStore } from '../../stores/multiWindowStore';
import type { TVLayout } from '../../stores/multiWindowStore';
import config from '@/config/appConfig';

interface WindowLayoutSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const layoutOptions = [
  { id: 'grid2x2' as TVLayout, title: 'Grid 2x2', description: '4 equal windows', icon: <Grid3x3 size={64} color="#fff" /> },
  { id: 'sidebar3' as TVLayout, title: 'Sidebar', description: '1 large + 3 small', icon: <Sidebar size={64} color="#fff" /> },
  { id: 'fullscreen' as TVLayout, title: 'Fullscreen', description: '1 fullscreen', icon: <Maximize size={64} color="#fff" /> },
];

export default function WindowLayoutSelector({ visible, onClose }: WindowLayoutSelectorProps) {
  const layoutMode = useMultiWindowStore((state) => state.layoutMode);
  const setLayoutMode = useMultiWindowStore((state) => state.setLayoutMode);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleSelectLayout = (layout: TVLayout) => {
    setLayoutMode(layout);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Window Layout</Text>
            <Text style={styles.headerSubtitle}>Choose window arrangement</Text>
          </View>
          <View style={styles.optionsContainer}>
            {layoutOptions.map((option, index) => (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  layoutMode === option.id && styles.optionCardSelected,
                  focusedIndex === index && styles.optionCardFocused,
                ]}
                onPress={() => handleSelectLayout(option.id)}
                onFocus={() => setFocusedIndex(index)}
                hasTVPreferredFocus={index === 0}
              >
                <View style={styles.iconContainer}>{option.icon}</View>
                <View style={styles.textContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {layoutMode === option.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedText}>Active</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Arrow keys: navigate • Select: choose • Menu: close</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '70%', maxWidth: 1200, backgroundColor: 'rgba(20,20,35,0.95)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 48 },
  header: { marginBottom: 40, alignItems: 'center' },
  headerTitle: { fontSize: config.tv.minTitleTextSizePt, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  headerSubtitle: { fontSize: config.tv.minBodyTextSizePt, color: 'rgba(255,255,255,0.7)' },
  optionsContainer: { gap: 24 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', padding: 24, minHeight: 140 },
  optionCardSelected: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.5)' },
  optionCardFocused: { borderWidth: 4, borderColor: '#A855F7', transform: [{ scale: 1.05 }] },
  iconContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, marginRight: 24 },
  textContainer: { flex: 1 },
  optionTitle: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  optionDescription: { fontSize: config.tv.minBodyTextSizePt, color: 'rgba(255,255,255,0.7)' },
  selectedBadge: { backgroundColor: 'rgba(168,85,247,0.8)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  selectedText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 20, color: 'rgba(255,255,255,0.5)' },
  closeButton: { marginTop: 24, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeButtonText: { fontSize: config.tv.minButtonTextSizePt, fontWeight: '600', color: '#fff' },
});
