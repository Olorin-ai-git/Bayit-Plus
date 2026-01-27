import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { GlassView, GlassInput } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';

interface StreamUrlInputProps {
  value?: string;
  onChange: (url: string) => void;
  onStreamTypeChange?: (type: 'hls' | 'dash' | 'audio') => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  onError?: (error: string | null) => void;
}

export function StreamUrlInput({
  value = '',
  onChange,
  onStreamTypeChange,
  label,
  placeholder = 'https://example.com/stream.m3u8',
  required = true,
  onError,
}: StreamUrlInputProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [url, setUrl] = useState(value);
  const [streamType, setStreamType] = useState<'hls' | 'dash' | 'audio'>('hls');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(value);
  }, [value]);

  const detectStreamType = (urlString: string): 'hls' | 'dash' | 'audio' => {
    const lower = urlString.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('hls')) return 'hls';
    if (lower.includes('.mpd') || lower.includes('dash')) return 'dash';
    if (lower.includes('.mp3') || lower.includes('.aac') || lower.includes('audio')) return 'audio';
    return 'hls';
  };

  const validateUrl = (urlString: string) => {
    setError(null);
    setIsValid(false);

    if (!urlString.trim()) {
      if (required) {
        const msg = t('admin.content.streamUrlInput.errors.required');
        setError(msg);
        onError?.(msg);
      }
      return;
    }

    try {
      new URL(urlString);
    } catch {
      const msg = t('admin.content.streamUrlInput.errors.invalidFormat');
      setError(msg);
      onError?.(msg);
      return;
    }

    const detected = detectStreamType(urlString);
    setStreamType(detected);
    onStreamTypeChange?.(detected);
    setIsValid(true);
    onError?.(null);
  };

  const handleChange = (newUrl: string) => {
    setUrl(newUrl);
    onChange(newUrl);
    validateUrl(newUrl);
  };

  const handleTypeChange = (type: 'hls' | 'dash' | 'audio') => {
    setStreamType(type);
    onStreamTypeChange?.(type);
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStreamTypeIcon = (type: string) => {
    switch (type) {
      case 'hls': return 'live';
      case 'dash': return 'vod';
      case 'audio': return 'radio';
      default: return 'live';
    }
  };

  return (
    <View style={styles.container}>
      <GlassInput
        label={label}
        value={url}
        onChangeText={handleChange}
        placeholder={placeholder}
        error={error}
        rightIcon={url ? <Copy size={16} color={colors.textMuted} /> : undefined}
        onRightIconPress={url ? handleCopy : undefined}
      />

      {copied && (
        <View style={styles.copiedContainer}>
          <Text style={styles.copiedText}>
            {t('admin.content.streamUrlInput.copied')}
          </Text>
        </View>
      )}

      {url && (
        <View style={styles.typeSection}>
          <Text style={[styles.typeLabel, isRTL && styles.textRTL]}>
            {t('admin.content.streamUrlInput.streamType')}
          </Text>
          <View style={styles.typeButtons}>
            {(['hls', 'dash', 'audio'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => handleTypeChange(type)}
                style={styles.typeButtonWrapper}
              >
                <GlassView
                  style={[
                    styles.typeButton,
                    streamType === type && styles.typeButtonActive,
                  ]}
                  intensity={streamType === type ? 'high' : 'low'}
                  borderColor={streamType === type ? colors.primary : undefined}
                >
                  <NativeIcon
                    name={getStreamTypeIcon(type)}
                    size="sm"
                    color={streamType === type ? colors.primary : colors.textMuted}
                  />
                  <Text style={[
                    styles.typeText,
                    { color: streamType === type ? colors.primary : colors.textMuted },
                  ]}>
                    {type.toUpperCase()}
                  </Text>
                </GlassView>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {error && (
        <GlassView style={styles.errorContainer} intensity="low">
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </GlassView>
      )}

      {isValid && url && (
        <GlassView style={styles.successContainer} intensity="low">
          <CheckCircle size={16} color={colors.success} />
          <Text style={styles.successText}>
            {t('admin.content.streamUrlInput.validUrl', { type: streamType.toUpperCase() })}
          </Text>
        </GlassView>
      )}

      <GlassView style={styles.helpContainer} intensity="low">
        <Text style={[styles.helpTitle, isRTL && styles.textRTL]}>
          {t('admin.content.streamUrlInput.supportedFormats.title')}
        </Text>
        <View style={styles.helpList}>
          <Text style={[styles.helpItem, isRTL && styles.textRTL]}>
            • {t('admin.content.streamUrlInput.supportedFormats.hls')}
          </Text>
          <Text style={[styles.helpItem, isRTL && styles.textRTL]}>
            • {t('admin.content.streamUrlInput.supportedFormats.dash')}
          </Text>
          <Text style={[styles.helpItem, isRTL && styles.textRTL]}>
            • {t('admin.content.streamUrlInput.supportedFormats.audio')}
          </Text>
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  copiedContainer: {
    marginTop: 4,
    paddingHorizontal: 8,
  },
  copiedText: {
    fontSize: 12,
    color: colors.success.DEFAULT,
  },
  typeSection: {
    marginTop: spacing.md,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.text,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButtonWrapper: {
    flex: 1,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    marginTop: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error.DEFAULT,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    marginTop: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: colors.success.DEFAULT,
  },
  helpContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  helpTitle: {
    fontSize: 12,
    marginBottom: 4,
    color: colors.textMuted,
  },
  helpList: {
    gap: 4,
  },
  helpItem: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  textRTL: {
    textAlign: 'right',
  },
});
