import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  levelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#E5C07B',
    marginTop: 8,
  },
  xpBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginTop: 16,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#61AFEF',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 24,
  },
  perkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  perkItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: 100,
    alignItems: 'center',
  },
  perkIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  perkName: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  activitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
});
