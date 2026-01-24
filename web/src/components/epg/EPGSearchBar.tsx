import React, { useState } from 'react'
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, Sparkles, Filter, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import EPGSmartSearch from './EPGSmartSearch'

interface EPGSearchBarProps {
  onSearch: (query: string, useLLM: boolean) => Promise<void>
  onClear?: () => void
  isSearching: boolean
}

const EPGSearchBar: React.FC<EPGSearchBarProps> = ({
  onSearch,
  onClear,
  isSearching
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  const handleSubmit = () => {
    if (query.trim() && !isSearching) {
      onSearch(query, false)
    }
  }

  const handleClear = () => {
    setQuery('')
    if (onClear) {
      onClear()
    }
  }

  const handleSmartSearch = async (smartQuery: string) => {
    await onSearch(smartQuery, true)
    setShowSmartSearch(false)
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Search size={18} color="rgba(255, 255, 255, 0.4)" />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('epg.searchPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            editable={!isSearching}
            onSubmitEditing={handleSubmit}
            style={styles.searchInput}
          />
          {query && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              aria-label={t('common.clear')}
            >
              <X size={16} color="rgba(255, 255, 255, 0.6)" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setShowSmartSearch(true)}
          style={[
            styles.smartButton,
            isPremium ? styles.smartButtonPremium : styles.smartButtonBasic,
          ]}
        >
          <Sparkles size={18} color="#ffffff" />
          <Text style={styles.smartButtonText}>{t('epg.smartSearch')}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={styles.filterButton}
          aria-label={t('common.filters')}
        >
          <Filter size={18} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.filterButtonText}>{t('common.filters')}</Text>
        </Pressable>
      </View>

      {showSmartSearch && (
        <EPGSmartSearch
          onSearch={handleSmartSearch}
          isSearching={isSearching}
          onClose={() => setShowSmartSearch(false)}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchIconContainer: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 48,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
    padding: 4,
    borderRadius: 8,
  },
  smartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: '500',
  },
  smartButtonPremium: {
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  smartButtonBasic: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  smartButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  filterButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
})

export default EPGSearchBar
