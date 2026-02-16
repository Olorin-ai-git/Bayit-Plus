/**
 * Avatar Movie Studio - Main Page
 *
 * Flagship admin feature for managing VOD avatar interactions.
 */
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Film, PlayCircle, AlertTriangle } from 'lucide-react'
import { GlassPageHeader, GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import ContentLibraryView from './ContentLibraryView'
import StudioEditor from './StudioEditor'
import { useAvatarStudioStore } from '@/stores/avatarStudioStore'
import { useAvatarMeshStore } from '@/stores/avatarMeshStore'
import { useAuthStore } from '@/stores/authStore'

type Tab = 'library' | 'editor'

export default function AvatarMovieStudioPage() {
  const { t } = useTranslation('admin')
  const { isRTL } = useDirection()
  const [activeTab, setActiveTab] = useState<Tab>('library')
  const [hasAvatar, setHasAvatar] = useState(false)
  const [checkingAvatar, setCheckingAvatar] = useState(true)
  const { selectedMovie, clearSelectedMovie } = useAvatarStudioStore()
  const { mesh, fetchMeshStatus } = useAvatarMeshStore()
  const { user } = useAuthStore()

  useEffect(() => {
    const checkForAvatar = async () => {
      if (!user) {
        setCheckingAvatar(false)
        return
      }

      try {
        await fetchMeshStatus(user.id)
        setHasAvatar(mesh?.status === 'ready')
      } catch (error) {
        setHasAvatar(false)
      } finally {
        setCheckingAvatar(false)
      }
    }

    checkForAvatar()
  }, [user, fetchMeshStatus, mesh])

  const handleOpenEditor = () => {
    if (!hasAvatar) return
    setActiveTab('editor')
  }

  const handleCloseEditor = () => {
    clearSelectedMovie()
    setActiveTab('library')
  }

  const tabs = [
    { key: 'library' as Tab, labelKey: 'avatarStudio.contentLibrary', icon: Film },
    { key: 'editor' as Tab, labelKey: 'avatarStudio.studioEditor', icon: PlayCircle, disabled: !selectedMovie },
  ]

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('avatarStudio.title', 'Avatar Movie Studio')}
        subtitle={t('avatarStudio.subtitle', 'Create AI-powered interactive moments across your content library')}
        icon={<Film size={32} color={colors.primary.DEFAULT} />}
      />

      {!checkingAvatar && !hasAvatar && (
        <GlassView style={styles.warningBanner}>
          <AlertTriangle size={24} color={colors.warning.DEFAULT} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              {t('avatarStudio.noAvatarTitle', 'Avatar Required')}
            </Text>
            <Text style={styles.warningText}>
              {t('avatarStudio.noAvatarMessage', 'You need to create your avatar first before using the Avatar Movie Studio. Please visit the Avatar Creation page to set up your 3D avatar.')}
            </Text>
          </View>
        </GlassView>
      )}

      <View style={[styles.tabBar, isRTL && styles.tabBarRTL]}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const isDisabled = tab.disabled

          return (
            <GlassButton
              key={tab.key}
              title={t(tab.labelKey, tab.key)}
              variant={isActive ? 'primary' : 'ghost'}
              onPress={() => !isDisabled && setActiveTab(tab.key)}
              icon={<Icon size={20} color={isActive ? colors.text : colors.textSecondary} />}
              disabled={isDisabled}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            />
          )
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {activeTab === 'library' && (
          <ContentLibraryView onOpenEditor={handleOpenEditor} disabled={!hasAvatar} />
        )}
        {activeTab === 'editor' && selectedMovie && hasAvatar && (
          <StudioEditor onClose={handleCloseEditor} />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warning.DEFAULT + '15',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.DEFAULT,
  },
  warningContent: {
    flex: 1,
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
  },
  warningText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: colors.glassDark,
  },
  tabBarRTL: {
    flexDirection: 'row-reverse',
  },
  tabButton: {
    flex: 1,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
})
