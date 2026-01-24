import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Grid, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type EPGViewMode = 'grid' | 'list'

interface EPGViewToggleProps {
  view: EPGViewMode
  onViewChange: (view: EPGViewMode) => void
}

const EPGViewToggle: React.FC<EPGViewToggleProps> = ({ view, onViewChange }) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, view === 'grid' && styles.buttonActive]}
        onPress={() => onViewChange('grid')}
        aria-label={t('epg.gridView')}
      >
        <Grid size={18} color={view === 'grid' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'} />
        <Text style={[styles.buttonText, view === 'grid' && styles.buttonTextActive]}>
          {t('epg.gridView')}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.button, view === 'list' && styles.buttonActive]}
        onPress={() => onViewChange('list')}
        aria-label={t('epg.listView')}
      >
        <List size={18} color={view === 'list' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'} />
        <Text style={[styles.buttonText, view === 'list' && styles.buttonTextActive]}>
          {t('epg.listView')}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: 12,
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonTextActive: {
    color: '#ffffff',
  },
})

export default EPGViewToggle
