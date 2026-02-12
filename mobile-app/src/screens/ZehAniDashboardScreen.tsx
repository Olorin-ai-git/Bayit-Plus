import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../../shared/hooks/useDirection';
import { Colors } from '../theme/colors';
import api from '../services/api';
import logger from '../utils/logger';
import { styles } from './ZehAniDashboardScreen.styles';
import {
  GreetingCard,
  HighlightsSection,
  ContactsSection,
  FeedbackSection,
} from './ZehAniDashboardSections';

const dashboardLogger = logger.scope('ZehAniDashboard');

interface MagicMirrorGreeting {
  greeting_text_he: string;
  greeting_text_en: string;
  vocabulary_words: { word_he: string; transliteration: string; translation: string }[];
}

interface HighlightReel {
  id: string;
  title: string;
  thumbnail_url?: string;
  status: 'ready' | 'processing' | 'failed';
  created_at: string;
}

interface ContactsSummary {
  total_count: number;
  active_count: number;
}

interface FeedbackItem {
  id: string;
  sender_name: string;
  preview_text: string;
  received_at: string;
  is_read: boolean;
}

export const ZehAniDashboardScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();
  const { profileId } = route.params;

  const [greeting, setGreeting] = useState<MagicMirrorGreeting | null>(null);
  const [highlights, setHighlights] = useState<HighlightReel[]>([]);
  const [contacts, setContacts] = useState<ContactsSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [profileId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [greetingRes, highlightsRes, contactsRes, feedbackRes] =
        await Promise.allSettled([
          api.get(`/zeh-ani/magic-mirror/${profileId}`),
          api.get(`/zeh-ani/highlights/${profileId}`),
          api.get(`/zeh-ani/contacts/${profileId}`),
          api.get(`/zeh-ani/feedback/${profileId}`, { params: { limit: 3 } }),
        ]);

      if (greetingRes.status === 'fulfilled') setGreeting(greetingRes.value);
      else dashboardLogger.error('Failed to load greeting', { profileId });

      if (highlightsRes.status === 'fulfilled') setHighlights(highlightsRes.value.items || []);
      else dashboardLogger.error('Failed to load highlights', { profileId });

      if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value);
      else dashboardLogger.error('Failed to load contacts', { profileId });

      if (feedbackRes.status === 'fulfilled') setFeedback(feedbackRes.value.items || []);
      else dashboardLogger.error('Failed to load feedback', { profileId });

      dashboardLogger.info('Dashboard loaded', { profileId });
    } catch (err: any) {
      setError(err?.message || t('zehAni.dashboard.errors.loadFailed'));
      dashboardLogger.error('Dashboard load failed', { profileId, error: err });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !greeting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.Primary.p500} />
          <Text style={styles.loadingText}>{t('zehAni.dashboard.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !greeting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageTitle, { textAlign }]}>
          {t('zehAni.dashboard.title')}
        </Text>

        {greeting && (
          <GreetingCard
            greeting={greeting}
            textAlign={textAlign}
            flexDirection={flexDirection}
            t={t}
          />
        )}

        <HighlightsSection highlights={highlights} textAlign={textAlign} t={t} />

        <ContactsSection
          contacts={contacts}
          textAlign={textAlign}
          flexDirection={flexDirection}
          t={t}
        />

        <FeedbackSection
          feedback={feedback}
          textAlign={textAlign}
          flexDirection={flexDirection}
          t={t}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ZehAniDashboardScreen;
