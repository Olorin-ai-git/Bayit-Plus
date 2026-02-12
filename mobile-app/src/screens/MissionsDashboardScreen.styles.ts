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
    color: Colors.Text.primary,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.Special.gold,
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
    backgroundColor: Colors.Primary.default,
    borderRadius: 6,
  },
  xpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 12,
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: Colors.Text.primary,
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
    color: Colors.Text.primary,
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  retryButton: {
    marginTop: 16,
  },
});
