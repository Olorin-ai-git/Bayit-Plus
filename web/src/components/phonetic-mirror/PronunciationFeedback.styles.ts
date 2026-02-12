import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 16,
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  wordText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scoreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issueTag: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  wordDetails: {
    alignItems: 'flex-end',
  },
});
