/**
 * Styles for ProfileScreen and its tab components.
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { isTV } from '../../utils/platform';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
  },
  sidebar: {
    width: isTV ? 280 : 200,
    marginLeft: spacing.xl,
  },
  sidebarCard: {
    padding: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  tabIcon: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  tabLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  logoutLabel: {
    fontSize: 16,
    color: colors.error,
  },
  mainContent: {
    flex: 1,
  },
  contentCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  fieldValue: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldValueText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
  editButton: {
    marginTop: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  notificationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  notificationDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityInfo: {
    flex: 1,
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  securityDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  // Billing styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 28,
    marginLeft: spacing.md,
  },
  cardDetails: {
    marginLeft: spacing.sm,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  cardExpiry: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBadge: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardActionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  billingTable: {
    marginBottom: spacing.lg,
  },
  billingHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  billingHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'right',
  },
  billingRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  billingCell: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  statusBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusPaid: {},
  statusText: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 12,
    fontWeight: '500',
    overflow: 'hidden',
  },
  downloadInvoice: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  downloadInvoiceText: {
    color: colors.primary,
    fontSize: 14,
  },
  addressCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  editAddressButton: {
    alignSelf: 'flex-start',
  },
  // Subscription styles
  currentPlanCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  currentPlanStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  renewalDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  noPlanCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  noPlanIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  noPlanText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
    marginTop: -spacing.md,
  },
  plansGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  planCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planCardRecommended: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
  },
  planCardCurrent: {
    borderColor: colors.success,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  recommendedText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planCardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  planCardPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  planFeatures: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureCheck: {
    fontSize: 16,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  selectPlanButton: {
    marginTop: 'auto',
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
  },
  cancelNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'right',
  },
});
