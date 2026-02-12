import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.Text.primary,
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: Colors.Error.default,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.Primary.default,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.Text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: 20,
  },
  greetingCard: {
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.Glass.whiteMedium,
  },
  greetingTextHe: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: 8,
  },
  greetingTextEn: {
    fontSize: 16,
    color: Colors.Text.secondary,
    marginBottom: 16,
  },
  vocabSection: {
    marginTop: 12,
  },
  vocabTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Primary.p500,
    marginBottom: 8,
  },
  vocabRow: {
    paddingVertical: 6,
  },
  vocabWordHe: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginRight: 8,
  },
  vocabTranslit: {
    fontSize: 14,
    color: Colors.Text.muted,
    marginRight: 8,
  },
  vocabTranslation: {
    fontSize: 14,
    color: Colors.Text.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.Text.muted,
    marginBottom: 16,
  },
  highlightCard: {
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.Glass.whiteLight,
  },
  highlightThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.Glass.bgLight,
  },
  highlightContent: {
    padding: 16,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 4,
  },
  highlightStatus: {
    fontSize: 14,
    color: Colors.Text.secondary,
    marginBottom: 8,
  },
  shareButton: {
    backgroundColor: Colors.Primary.default,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  shareButtonText: {
    color: Colors.Text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  contactsCard: {
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Glass.whiteLight,
  },
  contactRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactLabel: {
    fontSize: 16,
    color: Colors.Text.secondary,
  },
  contactValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  feedbackList: {
    marginBottom: 16,
  },
  feedbackCard: {
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.Glass.whiteLight,
  },
  feedbackHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackSender: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.Primary.default,
  },
  feedbackPreview: {
    fontSize: 14,
    color: Colors.Text.secondary,
    lineHeight: 20,
  },
});
