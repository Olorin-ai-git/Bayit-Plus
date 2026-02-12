import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#000000',
    overflow: 'hidden',
    marginBottom: 20,
  },
  clipCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clipCardSelected: {
    borderColor: 'rgba(99,102,241,0.6)',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  clipDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  vocabularyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  vocabularyTag: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vocabularyText: {
    fontSize: 13,
    color: '#A5B4FC',
    fontWeight: '500',
  },
  clipList: {
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
