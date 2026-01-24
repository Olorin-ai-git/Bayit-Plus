/**
 * Footer Component Styles
 * React Native StyleSheet for cross-platform compatibility
 */

import { StyleSheet } from 'react-native';

export const footerStyles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  splitterHandle: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  splitterHandleDragging: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  gripIconContainer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -10 }],
    paddingVertical: 4,
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  handleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyrightCollapsed: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandedContainer: {
    flex: 1,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 24,
  },
  mainContentMobile: {
    flexDirection: 'column',
  },
  rightColumn: {
    minWidth: 200,
    gap: 16,
    alignItems: 'flex-start',
  },
  rightColumnMobile: {
    alignItems: 'center',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftBottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copyrightText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  poweredBySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  olorinLink: {
    fontSize: 10,
    color: '#a855f7',
    fontWeight: '500',
  },
  rightBottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  link: {
    textDecorationLine: 'none',
  },
  linkText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
});
