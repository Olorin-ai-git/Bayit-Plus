import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#ABB2BF', fontSize: 16, textAlign: 'center' },
  grid: { padding: 8 },
  snapCard: {
    flex: 1,
    margin: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: '48%',
  },
  snapCardSelected: { borderColor: '#61AFEF', borderWidth: 2 },
  snapImage: { width: '100%', aspectRatio: 1, backgroundColor: '#282C34' },
  snapPlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  snapTemplate: { color: '#fff', fontSize: 12, fontWeight: '600', padding: 8, paddingBottom: 2, textTransform: 'capitalize' },
  snapCharacters: { color: '#ABB2BF', fontSize: 11, paddingHorizontal: 8, paddingBottom: 8 },
  detailBar: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  shareRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pinOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  pinCard: {
    backgroundColor: '#282C34', borderRadius: 16, padding: 24,
    width: 300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pinTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  pinInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12,
    color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pinActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
