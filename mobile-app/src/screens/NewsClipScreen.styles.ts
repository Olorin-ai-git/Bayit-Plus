import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.elevated,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.Text.muted,
    marginTop: 4,
  },
  clipDetail: {
    marginBottom: 24,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.black,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scriptText: {
    fontSize: 18,
    color: Colors.Text.primary,
    fontWeight: '600',
    marginBottom: 12,
  },
  vocabularyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  vocabTag: {
    backgroundColor: Colors.Glass.purpleLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vocabText: {
    fontSize: 13,
    color: Colors.Primary.p400,
    fontWeight: '500',
  },
  featuredCount: {
    fontSize: 12,
    color: Colors.Text.disabled,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  clipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  clipCardSelected: {
    borderColor: Colors.Glass.borderFocus,
    backgroundColor: Colors.Glass.purpleLight,
  },
  clipCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 4,
  },
  clipCardDate: {
    fontSize: 12,
    color: Colors.Text.disabled,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.Text.disabled,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  errorText: {
    color: Colors.Error.default,
    marginTop: 12,
    textAlign: 'center',
  },
  pinModalContent: {
    gap: 12,
  },
  pinDescription: {
    fontSize: 15,
    color: Colors.Text.secondary,
  },
  pinCharCount: {
    fontSize: 12,
    color: Colors.Text.muted,
    textAlign: 'right',
  },
  pinActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  pinActionBtn: {
    flex: 1,
  },
});
