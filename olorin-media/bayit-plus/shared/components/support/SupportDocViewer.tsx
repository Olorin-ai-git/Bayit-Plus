/**
 * Support Doc Viewer
 * Markdown documentation viewer component
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

export const SupportDocViewer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { currentDocPath, setCurrentDocPath } = useSupportStore();

  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentDocPath) {
      loadDocument();
    }
  }, [currentDocPath, i18n.language]);

  const loadDocument = async () => {
    if (!currentDocPath) return;

    try {
      setLoading(true);
      setError(null);

      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(`${apiUrl}/docs/${currentDocPath}?language=${language}`);

      if (!response.ok) {
        throw new Error('Document not found');
      }

      const data = await response.json();
      setTitle(data.title || currentDocPath);
      setContent(data.content || '');
    } catch (err) {
      console.error('[SupportDocViewer] Error loading document:', err);
      setError(t('support.docs.loadError', 'Failed to load document'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentDocPath(null);
  };

  // Simple markdown-to-React renderer
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let isInList = false;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <View key={`list-${elements.length}`} className="mb-3 md:mb-4">
            {listItems.map((item, idx) => (
              <View key={idx} className="flex-row items-start mb-1">
                <Text className={`${isTV ? 'text-base' : 'text-sm'} text-purple-500 mr-2 mt-0.5`}>•</Text>
                <Text className={`flex-1 ${isTV ? 'text-base' : 'text-sm'} text-gray-400 ${isTV ? 'leading-6' : 'leading-5'}`} style={{ textAlign }}>{item}</Text>
              </View>
            ))}
          </View>
        );
        listItems = [];
      }
      isInList = false;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        if (isInList) flushList();
        return;
      }

      // Headings
      if (trimmedLine.startsWith('# ')) {
        if (isInList) flushList();
        elements.push(
          <Text key={index} className={`${isTV ? 'text-3xl' : 'text-2xl'} font-bold text-white mt-4 md:mt-6 mb-3 md:mb-4`} style={{ textAlign }}>
            {trimmedLine.substring(2)}
          </Text>
        );
        return;
      }

      if (trimmedLine.startsWith('## ')) {
        if (isInList) flushList();
        elements.push(
          <Text key={index} className={`${isTV ? 'text-2xl' : 'text-lg'} font-semibold text-white mt-4 md:mt-6 mb-2`} style={{ textAlign }}>
            {trimmedLine.substring(3)}
          </Text>
        );
        return;
      }

      if (trimmedLine.startsWith('### ')) {
        if (isInList) flushList();
        elements.push(
          <Text key={index} className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white mt-3 md:mt-4 mb-2`} style={{ textAlign }}>
            {trimmedLine.substring(4)}
          </Text>
        );
        return;
      }

      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        isInList = true;
        listItems.push(trimmedLine.substring(2));
        return;
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmedLine)) {
        isInList = true;
        listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
        return;
      }

      // Regular paragraph
      if (isInList) flushList();

      // Remove markdown formatting for display
      let text = trimmedLine
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1');

      elements.push(
        <Text key={index} className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400 ${isTV ? 'leading-7' : 'leading-6'} mb-3 md:mb-4`} style={{ textAlign }}>
          {text}
        </Text>
      );
    });

    // Flush any remaining list items
    if (isInList) flushList();

    return elements;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 md:gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400`} style={{ textAlign }}>
          {t('support.docs.loading', 'Loading document...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 md:gap-4">
        <Text className={`${isTV ? 'text-5xl' : 'text-4xl'}`}>⚠️</Text>
        <Text className={`${isTV ? 'text-base' : 'text-sm'} text-red-500`} style={{ textAlign }}>{error}</Text>
        <TouchableOpacity className="bg-purple-500 px-4 md:px-6 py-2 md:py-3 rounded-lg mt-3 md:mt-4" onPress={handleBack}>
          <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-black`}>
            {t('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Back button */}
      <TouchableOpacity className="flex-row items-center gap-1 mb-3 md:mb-4" onPress={handleBack}>
        <Text className={`${isTV ? 'text-lg' : 'text-base'} text-purple-500`}>{isRTL ? '→' : '←'}</Text>
        <Text className={`${isTV ? 'text-base' : 'text-sm'} text-purple-500 font-medium`}>
          {t('support.docs.backToList', 'Back to documentation')}
        </Text>
      </TouchableOpacity>

      {/* Document title */}
      <Text className={`${isTV ? 'text-3xl' : 'text-2xl'} font-bold text-white mb-4 md:mb-6`} style={{ textAlign }}>{title}</Text>

      {/* Document content */}
      <GlassView className="flex-1 p-4 md:p-6 rounded-2xl">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-16 md:pb-24"
        >
          {renderMarkdown(content)}
        </ScrollView>
      </GlassView>
    </View>
  );
};

export default SupportDocViewer;
