/**
 * LLMSearchModal Component
 *
 * Natural language search modal with Claude AI interpretation.
 * Premium feature with example queries and interpretation display.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';

interface LLMSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string, results: any) => void;
  isPremium: boolean;
}

// Example queries are now translated via t() keys
const getExampleQueries = (t: any) => [
  t('search.exampleQuery1'),
  t('search.exampleQuery2'),
  t('search.exampleQuery3'),
  t('search.exampleQuery4')
];

export function LLMSearchModal({
  visible,
  onClose,
  onSearch,
  isPremium
}: LLMSearchModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [interpretation, setInterpretation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { api } = await import('../../services/api/client');
      const data = await api.post('/search/llm', {
        query,
        include_user_context: true,
        limit: 20,
      });

      if (data.success) {
        setInterpretation(data.interpretation);
        onSearch(query, data);
      } else {
        throw new Error(data.error || t('search.searchFailed'));
      }
    } catch (err: any) {
      if (err?.status === 403 || err?.detail?.includes?.('premium')) {
        setError(t('search.premiumRequired'));
      } else {
        setError(err.message || t('search.searchFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const handleClose = () => {
    setQuery('');
    setInterpretation(null);
    setError(null);
    onClose();
  };

  if (!isPremium) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-md">
            <View className="items-center mb-4">
              <NativeIcon name="lock" size="3xl" color="#ffffff" />
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-4">
              {t('search.premiumFeature')}
            </Text>
            <Text className="text-white/80 text-center mb-6">
              {t('search.smartSearchDescription')}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="bg-yellow-500 px-6 py-4 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-black font-bold text-center text-lg">{t('search.upgradeToPremium')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClose}
              className="mt-4"
              activeOpacity={0.7}
            >
              <Text className="text-white/60 text-center">{t('search.maybeLater')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80">
        <View className="flex-1 bg-black/40 backdrop-blur-xl mt-20 rounded-t-3xl border-t border-white/20">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              <NativeIcon name="cpu" size="xl" color="#a855f7" />
              <Text className="text-white text-xl font-bold">{t('search.smartSearch')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center bg-white/10 rounded-full"
              activeOpacity={0.7}
            >
              <NativeIcon name="x" size="lg" color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Description */}
            <Text className="text-white/80 text-base mb-4">
              {t('search.smartSearchHint')}
            </Text>

            {/* Query Input */}
            <View className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-4 mb-4">
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('search.smartSearchPlaceholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                numberOfLines={3}
                className="text-white text-base min-h-20"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Search Button */}
            <TouchableOpacity
              onPress={executeSearch}
              disabled={!query.trim() || loading}
              className={`
                bg-purple-500 px-6 py-4 rounded-full mb-6
                ${(!query.trim() || loading) ? 'opacity-50' : ''}
              `}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-center text-lg">{t('search.searchWithAI')}</Text>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-4">
                <Text className="text-red-300 text-center">{error}</Text>
              </View>
            )}

            {/* Interpretation Display */}
            {interpretation && (
              <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
                <Text className="text-blue-300 font-semibold mb-2">{t('search.aiInterpretation')}</Text>
                <Text className="text-white/80 mb-3">{interpretation.text}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white/60 text-sm">{t('search.confidence')}</Text>
                  <View className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-blue-500"
                      style={{ width: `${interpretation.confidence * 100}%` }}
                    />
                  </View>
                  <Text className="text-white/60 text-sm">{Math.round(interpretation.confidence * 100)}%</Text>
                </View>
              </View>
            )}

            {/* Example Queries */}
            <Text className="text-white font-semibold mb-3">{t('search.exampleQueries')}</Text>
            {getExampleQueries(t).map((example, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleExampleClick(example)}
                className="bg-white/5 border border-white/10 rounded-xl p-3 mb-2"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm">{example}</Text>
              </TouchableOpacity>
            ))}

            {/* Disclaimer */}
            <View className="bg-white/5 rounded-2xl p-4 mt-6">
              <Text className="text-white/60 text-xs text-center">
                {t('search.poweredByAI')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default LLMSearchModal;
