import { StyleSheet } from 'react-native';

export const RARITY_COLORS: Record<string, string> = {
  common: '#ABB2BF',
  uncommon: '#98C379',
  rare: '#61AFEF',
  epic: '#C678DD',
  legendary: '#E5C07B',
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  balance: { color: '#E5C07B', fontSize: 18, fontWeight: '600' },
  errorRow: { paddingHorizontal: 16, paddingBottom: 8 },
  errorText: { color: '#E06C75', fontSize: 14 },
  grid: { padding: 8 },
  outfitCard: {
    flex: 1,
    margin: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: '31%',
  },
  outfitCardSelected: { borderColor: '#61AFEF', borderWidth: 2 },
  outfitImage: { width: 80, height: 80, borderRadius: 8, marginBottom: 8 },
  outfitPlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 8 },
  rarityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  rarityText: { color: '#1E1E2E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  outfitName: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  priceText: { color: '#E5C07B', fontSize: 12, marginTop: 2 },
  ownedText: { color: '#98C379', fontSize: 11, marginTop: 2 },
  purchaseBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  purchaseText: { color: '#fff', fontSize: 16, flex: 1, marginRight: 12 },
});
