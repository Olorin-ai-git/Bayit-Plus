import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { GlassCard, LoadingIndicator, ErrorView } from '../components/glass'
import { theme } from '../theme'
import api from '@bayit/shared-services/api'
import { log } from '@bayit/shared-services/logger.native'

interface Beta500Credits {
  userId: string
  credits: number
  usedCredits: number
  resetDate: string
  features: {
    aiSearch: boolean
    aiRecommendations: boolean
    liveDubbing: boolean
    autoCatchUp: boolean
  }
}

interface FeatureUsage {
  name: string
  enabled: boolean
  icon: string
  description: string
}

export default function Beta500Screen() {
  const [credits, setCredits] = useState<Beta500Credits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCredits = async () => {
    try {
      setError(null)
      const response = await api.get('/beta500/credits')
      setCredits(response)
      log.info('Beta 500 credits fetched', { credits: response.credits })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to fetch credits'
      log.error('Failed to fetch Beta 500 credits', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCredits()
  }

  if (loading) {
    return <LoadingIndicator message="Loading Beta 500 credits..." />
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchCredits} />
  }

  if (!credits) {
    return <ErrorView message="No credit data available" onRetry={fetchCredits} />
  }

  const remainingCredits = credits.credits - credits.usedCredits
  const usagePercentage = (credits.usedCredits / credits.credits) * 100

  const features: FeatureUsage[] = [
    {
      name: 'AI Search',
      enabled: credits.features.aiSearch,
      icon: '🔍',
      description: 'Smart content discovery with AI-powered search'
    },
    {
      name: 'AI Recommendations',
      enabled: credits.features.aiRecommendations,
      icon: '✨',
      description: 'Personalized content suggestions based on your taste'
    },
    {
      name: 'Live Dubbing',
      enabled: credits.features.liveDubbing,
      icon: '🎙️',
      description: 'Real-time translation and dubbing for live content'
    },
    {
      name: 'Auto Catch-Up',
      enabled: credits.features.autoCatchUp,
      icon: '📺',
      description: 'AI-generated summaries of missed content'
    }
  ]

  const resetDate = new Date(credits.resetDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
      }
    >
      <View style={styles.content}>
        {/* Credits Overview */}
        <GlassCard style={styles.creditsCard}>
          <Text style={styles.badge}>BETA 500</Text>
          <Text style={styles.creditsTitle}>AI Credits</Text>
          <Text style={styles.creditsAmount}>{remainingCredits.toLocaleString()}</Text>
          <Text style={styles.creditsSubtitle}>credits remaining</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${usagePercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {credits.usedCredits.toLocaleString()} / {credits.credits.toLocaleString()} used
            </Text>
          </View>

          <Text style={styles.resetText}>Resets on {resetDate}</Text>
        </GlassCard>

        {/* Features */}
        <Text style={styles.sectionTitle}>Available Features</Text>
        {features.map((feature) => (
          <GlassCard key={feature.name} style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                feature.enabled ? styles.statusEnabled : styles.statusDisabled
              ]}>
                <Text style={styles.statusText}>
                  {feature.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          </GlassCard>
        ))}

        {/* Info */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Beta 500</Text>
          <Text style={styles.infoText}>
            You're part of an exclusive group of 500 beta testers with early access to AI-powered 
            features. Your credits refresh monthly and can be used across all AI features.
          </Text>
        </GlassCard>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  creditsCard: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  badge: {
    ...theme.typography.labelSmall,
    color: theme.colors.accent,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  creditsTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  creditsAmount: {
    ...theme.typography.displayLarge,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  creditsSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  progressContainer: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  resetText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  featureCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  featureDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  statusEnabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    ...theme.typography.labelSmall,
    color: theme.colors.text,
    fontWeight: '600',
  },
  infoCard: {
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  infoTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
})
