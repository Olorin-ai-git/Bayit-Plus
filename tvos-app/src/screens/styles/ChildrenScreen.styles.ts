import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  safeModeBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  safeModeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  filtersContent: {
    gap: 12,
    marginBottom: 24,
  },
  filterButton: {
    marginRight: 12,
  },
  filter: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  cardWrapper: {
    position: 'relative',
  },
  educationalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  educationalText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});
