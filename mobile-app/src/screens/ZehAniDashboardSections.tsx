import React from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import { styles } from './ZehAniDashboardScreen.styles';

interface VocabularyWord {
  word_he: string;
  transliteration: string;
  translation: string;
}

interface MagicMirrorGreeting {
  greeting_text_he: string;
  greeting_text_en: string;
  vocabulary_words: VocabularyWord[];
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

export const GreetingCard: React.FC<{
  greeting: MagicMirrorGreeting; textAlign: any; flexDirection: any; t: any;
}> = ({ greeting, textAlign, flexDirection, t }) => (
  <View style={styles.greetingCard}>
    <Text style={[styles.greetingTextHe, { textAlign }]}>{greeting.greeting_text_he}</Text>
    <Text style={[styles.greetingTextEn, { textAlign }]}>{greeting.greeting_text_en}</Text>
    {greeting.vocabulary_words.length > 0 && (
      <View style={styles.vocabSection}>
        <Text style={[styles.vocabTitle, { textAlign }]}>{t('zehAni.dashboard.vocabOfDay')}</Text>
        {greeting.vocabulary_words.map((word, index) => (
          <View key={index} style={[styles.vocabRow, { flexDirection }]}>
            <Text style={styles.vocabWordHe}>{word.word_he}</Text>
            <Text style={styles.vocabTranslit}>{word.transliteration}</Text>
            <Text style={styles.vocabTranslation}>{word.translation}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

export const HighlightsSection: React.FC<{
  highlights: HighlightReel[]; textAlign: any; t: any;
}> = ({ highlights, textAlign, t }) => (
  <>
    <Text style={[styles.sectionTitle, { textAlign }]}>{t('zehAni.dashboard.highlights')}</Text>
    {highlights.length === 0 ? (
      <Text style={[styles.emptyText, { textAlign }]}>{t('zehAni.dashboard.noHighlights')}</Text>
    ) : (
      <FlatList
        data={highlights}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.highlightCard}>
            {item.thumbnail_url && (
              <Image source={{ uri: item.thumbnail_url }} style={styles.highlightThumbnail} />
            )}
            <View style={styles.highlightContent}>
              <Text style={[styles.highlightTitle, { textAlign }]}>{item.title}</Text>
              <Text style={[styles.highlightStatus, { textAlign }]}>
                {t(`zehAni.dashboard.status.${item.status}`)}
              </Text>
            </View>
          </View>
        )}
      />
    )}
  </>
);

export const ContactsSection: React.FC<{
  contacts: ContactsSummary | null; textAlign: any; flexDirection: any; t: any;
}> = ({ contacts, textAlign, flexDirection, t }) => (
  <>
    <Text style={[styles.sectionTitle, { textAlign }]}>{t('zehAni.dashboard.contacts')}</Text>
    {contacts ? (
      <View style={styles.contactsCard}>
        <View style={[styles.contactRow, { flexDirection }]}>
          <Text style={[styles.contactLabel, { textAlign }]}>{t('zehAni.dashboard.totalContacts')}</Text>
          <Text style={styles.contactValue}>{contacts.total_count}</Text>
        </View>
        <View style={[styles.contactRow, { flexDirection }]}>
          <Text style={[styles.contactLabel, { textAlign }]}>{t('zehAni.dashboard.activeContacts')}</Text>
          <Text style={styles.contactValue}>{contacts.active_count}</Text>
        </View>
      </View>
    ) : (
      <Text style={[styles.emptyText, { textAlign }]}>{t('zehAni.dashboard.noContactsData')}</Text>
    )}
  </>
);

export const FeedbackSection: React.FC<{
  feedback: FeedbackItem[]; textAlign: any; flexDirection: any; t: any;
}> = ({ feedback, textAlign, flexDirection, t }) => (
  <>
    <Text style={[styles.sectionTitle, { textAlign }]}>{t('zehAni.dashboard.feedback')}</Text>
    {feedback.length === 0 ? (
      <Text style={[styles.emptyText, { textAlign }]}>{t('zehAni.dashboard.noFeedback')}</Text>
    ) : (
      <View style={styles.feedbackList}>
        {feedback.map((item) => (
          <View key={item.id} style={styles.feedbackCard}>
            <View style={[styles.feedbackHeader, { flexDirection }]}>
              <Text style={[styles.feedbackSender, { textAlign }]}>{item.sender_name}</Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            <Text style={[styles.feedbackPreview, { textAlign }]} numberOfLines={2}>
              {item.preview_text}
            </Text>
          </View>
        ))}
      </View>
    )}
  </>
);
