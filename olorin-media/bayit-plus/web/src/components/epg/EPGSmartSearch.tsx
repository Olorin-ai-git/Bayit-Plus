import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, Modal, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, Sparkles, X, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface EPGSmartSearchProps {
  onSearch: (query: string) => Promise<void>
  isSearching: boolean
  onClose: () => void
}

const EPGSmartSearch: React.FC<EPGSmartSearchProps> = ({
  onSearch,
  isSearching,
  onClose
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')

  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  const exampleQueries = [
    t('epg.exampleQuery1'),
    t('epg.exampleQuery2'),
    t('epg.exampleQuery3'),
    t('epg.exampleQuery4')
  ]

  const handleSubmit = () => {
    if (query.trim() && !isSearching) {
      onSearch(query)
    }
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    onSearch(example)
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Sparkles size={24} color="#a855f7" />
              </View>
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>{t('epg.smartSearch')}</Text>
                  {isPremium && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSubtitle}>{t('epg.smartSearchSubtitle')}</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              aria-label={t('common.close')}
            >
              <X size={24} color="rgba(255, 255, 255, 0.8)" />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {!isPremium && (
              <View style={styles.premiumGate}>
                <View style={styles.premiumGateContent}>
                  <AlertCircle size={20} color="#f59e0b" />
                  <View style={styles.premiumGateText}>
                    <Text style={styles.premiumGateTitle}>
                      {t('epg.premiumRequired')}
                    </Text>
                    <Text style={styles.premiumGateMessage}>
                      {t('epg.premiumRequiredMessage')}
                    </Text>
                    <Pressable style={styles.upgradeButton}>
                      <Text style={styles.upgradeButtonText}>{t('common.upgrade')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.searchForm}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  {isSearching ? (
                    <Loader2 size={20} color="#a855f7" />
                  ) : (
                    <Search size={20} color="rgba(255, 255, 255, 0.4)" />
                  )}
                </View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('epg.smartSearchPlaceholder')}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  editable={isPremium && !isSearching}
                  onSubmitEditing={handleSubmit}
                  style={styles.input}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!query.trim() || !isPremium || isSearching}
                style={({ pressed }) => [
                  styles.searchButton,
                  (!query.trim() || !isPremium || isSearching) && styles.searchButtonDisabled,
                  pressed && styles.searchButtonPressed,
                ]}
              >
                {isSearching ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.searchButtonText}>{t('epg.searching')}</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} color="#ffffff" />
                    <Text style={styles.searchButtonText}>{t('epg.searchWithAI')}</Text>
                  </>
                )}
              </Pressable>
            </View>

            {isPremium && !isSearching && (
              <View style={styles.examples}>
                <Text style={styles.examplesTitle}>{t('epg.tryThese')}:</Text>
                <View style={styles.examplesList}>
                  {exampleQueries.map((example, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleExampleClick(example)}
                      style={styles.exampleButton}
                    >
                      <Sparkles size={14} color="#a855f7" />
                      <Text style={styles.exampleText} numberOfLines={1}>
                        {example}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>{t('epg.aiDisclaimer')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    width: '100%',
    maxWidth: 672,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(16px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    padding: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    padding: 24,
  },
  premiumGate: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
  },
  premiumGateContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  premiumGateText: {
    flex: 1,
  },
  premiumGateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  premiumGateMessage: {
    fontSize: 14,
    color: 'rgba(251, 191, 36, 0.8)',
    marginBottom: 12,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  searchForm: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  input: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#a855f7',
    borderRadius: 12,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonPressed: {
    opacity: 0.9,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  examples: {
    marginTop: 24,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },
  examplesList: {
    gap: 8,
  },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  exampleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
})

export default EPGSmartSearch
