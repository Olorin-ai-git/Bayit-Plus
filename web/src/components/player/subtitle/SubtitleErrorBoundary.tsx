/**
 * SubtitleErrorBoundary Component
 * Catches errors in subtitle components and provides recovery UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { GlassButton } from '@bayit/glass'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import logger from '@/utils/logger'

interface SubtitleErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  fallbackMessage?: string
}

interface SubtitleErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class SubtitleErrorBoundary extends Component<
  SubtitleErrorBoundaryProps,
  SubtitleErrorBoundaryState
> {
  constructor(props: SubtitleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): SubtitleErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Subtitle component error', 'SubtitleErrorBoundary', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    })
  }

  handleRetry = (): void => {
    const { onRetry } = this.props
    this.setState({ hasError: false, error: null })
    if (onRetry) {
      onRetry()
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallbackMessage } = this.props

    if (hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Icon name="warning" size="lg" color={colors.warning.DEFAULT} />
            </View>
            <Text style={styles.title}>{i18n.t('subtitles.error.title')}</Text>
            <Text style={styles.message}>
              {fallbackMessage || i18n.t('subtitles.error.defaultMessage')}
            </Text>
            {error && __DEV__ && (
              <Text style={styles.errorDetail}>{error.message}</Text>
            )}
            <GlassButton
              variant="secondary"
              size="sm"
              onPress={this.handleRetry}
              style={styles.retryButton}
            >
              <Icon name="refresh" size="sm" color={colors.text} />
              <Text style={styles.retryText}>{i18n.t('subtitles.error.retry')}</Text>
            </GlassButton>
          </View>
        </View>
      )
    }

    return children
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: '10%',
    right: '10%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.warning[400],
    maxWidth: 320,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorDetail: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
    maxWidth: 280,
    overflow: 'hidden',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
})
