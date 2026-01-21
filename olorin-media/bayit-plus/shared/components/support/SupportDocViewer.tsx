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
  StyleSheet,
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
          <View key={`list-${elements.length}`} style={styles.list}>
            {listItems.map((item, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={[styles.listText, { textAlign }]}>{item}</Text>
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
          <Text key={index} style={[styles.heading1, { textAlign }]}>
            {trimmedLine.substring(2)}
          </Text>
        );
        return;
      }

      if (trimmedLine.startsWith('## ')) {
        if (isInList) flushList();
        elements.push(
          <Text key={index} style={[styles.heading2, { textAlign }]}>
            {trimmedLine.substring(3)}
          </Text>
        );
        return;
      }

      if (trimmedLine.startsWith('### ')) {
        if (isInList) flushList();
        elements.push(
          <Text key={index} style={[styles.heading3, { textAlign }]}>
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
        <Text key={index} style={[styles.paragraph, { textAlign }]}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { textAlign }]}>
          {t('support.docs.loading', 'Loading document...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>
            {t('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backLink} onPress={handleBack}>
        <Text style={styles.backLinkIcon}>{isRTL ? '→' : '←'}</Text>
        <Text style={styles.backLinkText}>
          {t('support.docs.backToList', 'Back to documentation')}
        </Text>
      </TouchableOpacity>

      {/* Document title */}
      <Text style={[styles.docTitle, { textAlign }]}>{title}</Text>

      {/* Document content */}
      <GlassView style={styles.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentScroll}
        >
          {renderMarkdown(content)}
        </ScrollView>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backLinkIcon: {
    fontSize: isTV ? 18 : 16,
    color: colors.primary,
  },
  backLinkText: {
    fontSize: isTV ? 16 : 14,
    color: colors.primary,
    fontWeight: '500',
  },
  docTitle: {
    fontSize: isTV ? 28 : 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  contentScroll: {
    paddingBottom: spacing.xl,
  },
  heading1: {
    fontSize: isTV ? 26 : 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heading2: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 26 : 22,
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  listBullet: {
    fontSize: isTV ? 16 : 14,
    color: colors.primary,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 24 : 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorIcon: {
    fontSize: isTV ? 48 : 36,
  },
  errorText: {
    fontSize: isTV ? 16 : 14,
    color: colors.error,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  backButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
});

export default SupportDocViewer;
