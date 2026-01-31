/**
 * CustomIframeWidget Component
 *
 * Widget that accepts a user-pasted URL and renders it in a floating iframe.
 * Includes URL validation against an allowlist of safe domains.
 * Used for watching Israel Film Archive or other approved content.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { X, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

// Allowlist of safe domains that can be embedded
const ALLOWED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'archive.org',
  'www.archive.org',
  'israelfilmarchive.org.il',
  'www.israelfilmarchive.org.il',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
  'kan.org.il',
  'www.kan.org.il',
];

interface CustomIframeWidgetProps {
  onClose: () => void;
  initialUrl?: string;
}

export function CustomIframeWidget({ onClose, initialUrl = '' }: CustomIframeWidgetProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validateUrl = useCallback((url: string): { valid: boolean; error?: string } => {
    if (!url.trim()) {
      return { valid: false, error: t('widgets.urlRequired', 'Please enter a URL') };
    }

    try {
      const parsed = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: t('widgets.invalidProtocol', 'Only HTTP and HTTPS URLs are allowed') };
      }

      // Check domain against allowlist
      const hostname = parsed.hostname.toLowerCase();
      const isAllowed = ALLOWED_DOMAINS.some((domain) =>
        hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return {
          valid: false,
          error: t('widgets.domainNotAllowed', 'This domain is not in the allowed list')
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: t('widgets.invalidUrl', 'Invalid URL format') };
    }
  }, [t]);

  const handleUrlChange = useCallback((text: string) => {
    setUrlInput(text);
    const result = validateUrl(text);
    setIsValid(result.valid);
    setError(result.valid ? null : result.error || null);
  }, [validateUrl]);

  const handleLoadUrl = useCallback(() => {
    const result = validateUrl(urlInput);
    if (result.valid) {
      setActiveUrl(urlInput);
      setError(null);
      logger.info('Custom iframe URL loaded', 'CustomIframeWidget', { url: urlInput });
    } else {
      setError(result.error || t('widgets.invalidUrl'));
    }
  }, [urlInput, validateUrl, t]);

  const handleClose = useCallback(() => {
    logger.info('CustomIframeWidget closed', 'CustomIframeWidget');
    onClose();
  }, [onClose]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <ExternalLink size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.headerTitle}>{t('widgets.customIframe')}</Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* URL Input Section */}
      {!activeUrl && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('widgets.pasteUrl')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.urlInput, error && styles.urlInputError, isValid && styles.urlInputValid]}
              value={urlInput}
              onChangeText={handleUrlChange}
              placeholder="https://archive.org/embed/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Pressable
              onPress={handleLoadUrl}
              style={[styles.loadButton, !isValid && styles.loadButtonDisabled]}
              disabled={!isValid}
            >
              <Text style={styles.loadButtonText}>{t('common.load', 'Load')}</Text>
            </Pressable>
          </View>

          {/* Validation Status */}
          {error && (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={colors.error.DEFAULT} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {isValid && urlInput && (
            <View style={styles.validRow}>
              <CheckCircle size={14} color={colors.success.DEFAULT} />
              <Text style={styles.validText}>{t('widgets.urlValid', 'URL is valid')}</Text>
            </View>
          )}

          {/* Allowed Domains Info */}
          <View style={styles.domainsInfo}>
            <Text style={styles.domainsLabel}>{t('widgets.allowedDomains', 'Allowed domains:')}</Text>
            <Text style={styles.domainsList}>
              youtube.com, archive.org, israelfilmarchive.org.il, vimeo.com, kan.org.il
            </Text>
          </View>
        </View>
      )}

      {/* Iframe Content */}
      {activeUrl && (
        <View style={styles.iframeContainer}>
          <iframe
            src={activeUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="Custom content"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
          {/* Change URL Button */}
          <Pressable
            onPress={() => setActiveUrl(null)}
            style={styles.changeUrlButton}
          >
            <Text style={styles.changeUrlText}>{t('widgets.changeUrl', 'Change URL')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  } as any,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputSection: {
    padding: spacing.md,
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  urlInputError: {
    borderColor: colors.error.DEFAULT,
  },
  urlInputValid: {
    borderColor: colors.success.DEFAULT,
  },
  loadButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  loadButtonDisabled: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  loadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error.DEFAULT,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  validText: {
    fontSize: fontSize.xs,
    color: colors.success.DEFAULT,
  },
  domainsInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  domainsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  domainsList: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  iframeContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  changeUrlButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(8px)',
  } as any,
  changeUrlText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
});

export default CustomIframeWidget;
