/**
 * ProfileScreen Styles - Shared styles for all profile tab components.
 *
 * Used by: ProfileTab, SecurityTab, SubscriptionTab, BillingTab, NotificationsTab
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Shared layout
  contentCard: {
    padding: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },

  // ProfileTab
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  fieldValue: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldValueText: {
    color: '#ffffff',
    fontSize: 16,
  },
  ltrText: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  editButton: {
    marginTop: 16,
  },

  // SecurityTab
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  securityInfo: {
    flex: 1,
  },
  securityLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    marginLeft: 12,
  },

  // NotificationsTab
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },

  // BillingTab - Payment Methods
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(126,34,206,0.2)',
  },
  addButtonText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardDetails: {
    gap: 2,
  },
  cardType: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardExpiry: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cardActionText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '500',
  },

  // BillingTab - Billing History
  billingTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  billingHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  billingHeaderText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  billingCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  statusBadge: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statusPaid: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadInvoice: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  downloadInvoiceText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },

  // BillingTab - Address
  addressCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  editAddressButton: {
    marginTop: 4,
  },

  // SubscriptionTab - Current Plan
  currentPlanCard: {
    backgroundColor: 'rgba(126,34,206,0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(126,34,206,0.3)',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  currentPlanName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  currentPlanStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  renewalDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 8,
  },
  noPlanCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPlanIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noPlanText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },

  // SubscriptionTab - Plans Grid
  upgradeSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 20,
  },
  plansGrid: {
    gap: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  planCardRecommended: {
    borderColor: 'rgba(126,34,206,0.5)',
    backgroundColor: 'rgba(126,34,206,0.08)',
  },
  planCardCurrent: {
    borderColor: 'rgba(16,185,129,0.3)',
    opacity: 0.7,
  },
  recommendedBadge: {
    backgroundColor: '#7e22ce',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  recommendedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  planCardName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  planCardPrice: {
    color: '#a855f7',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheck: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  selectPlanButton: {
    marginTop: 4,
  },

  // SubscriptionTab - Cancel
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
